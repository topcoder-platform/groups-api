const axios = require('axios')
const config = require('config')
const fs = require('node:fs/promises')
const helper = require('./src/common/helper')
const logger = require('./src/common/logger')
const uuid = require('uuid')
const { forEach, sampleSize, shuffle, random, range, pick, max, min, mean } = require('lodash')

// Perf test context struct
const CONTEXT = {
  // Members to add, fetched from members API.
  members: [],
  // Added members
  membersAdded: new Set(),
  // Http headers to send when calling group API. Will add auth token in setup method.
  headers: {
    'Content-Type': 'application/json'
  },
  // Id of the test group
  groupId: null,
  // API calls made to the API
  apiCalls: [],
}

/**
 * Add API call result
 * @param url - url
 * @param method - http method
 * @param timeInMs - time spent in ms
 * @param success - true/false
 * @param data - other data of interest
 */
function addApiCallResult (url, method, timeInMs, success, data) {
  CONTEXT.apiCalls.push({
    method, url, success, timeInMs, ...data,
    overTimeLimit: timeInMs > config.API_CALL_TIME_LIMIT_MS
  })
}

/**
 * Get members from members API
 * @param page - page number
 * @param pageSize - page size
 * @returns {Promise<void>}
 */
async function getMembers (page, pageSize) {
  const resp = await axios.get(config.MEMBERS_API_URL, {
    headers: CONTEXT.headers,
    params: {
      page,
      perPage: pageSize,
      fields: 'userId'
    }
  })
  return resp.data
}

/**
 * Get n members from members API.
 * @param n - number of members
 * @returns {Promise<void>}
 */
async function getNMembers (n) {
  logger.info(`Reading ${n} members from Members API...`)
  const maxPageSize = 100
  const members = []
  let page = 1
  while (members.length < n) {
    logger.info(`Reading page ${page}... members ${members.length}/${n}`)
    const diff = n - members.length
    if (diff <= maxPageSize) {
      members.push(...await getMembers(page, diff))
    } else {
      members.push(...await getMembers(page, maxPageSize))
      page++
    }
  }
  return members.map(m => {
    return {
      memberId: `${m.userId}`,
      membershipType: 'user'
    }
  })
}

/**
 * Create test group with random group name, returns group id.
 * @returns {Promise<String>} group id
 */
async function createTestGroup () {
  const resp = await axios.post(`${config.GROUPS_API_URL}/groups`, {
    name: `TestGroup-${uuid.v4()}`,
    description: 'Test group for perf test',
    privateGroup: false,
    selfRegister: false
  }, { headers: CONTEXT.headers })
  if (resp.status !== 200) {
    throw new Error(`Failed to create test group: ${resp.data}`)
  }
  await patchTestGroup(resp.data.id)
  return resp.data.id
}

/**
 * Update group oldId to random uuid. This step is needed to pass the validation during add member operation.
 * @param groupId - id of the group to set the oldId
 * @returns {Promise<void>}
 */
async function patchTestGroup (groupId) {
  const resp = await axios.patch(`${config.GROUPS_API_URL}/groups/${groupId}`, {
    oldId: uuid.v4()
  }, { headers: CONTEXT.headers })
  if (resp.status !== 200) {
    throw new Error(`Failed to patch test group ${groupId}: ${resp.data}`)
  }
}

/**
 * Delete test group
 * @param groupId id of the group to delete
 * @returns {Promise<any>} - deleted group data
 */
async function deleteTestGroup (groupId) {
  const resp = await axios.delete(`${config.GROUPS_API_URL}/groups/${groupId}`, { headers: CONTEXT.headers })
  if (resp.status !== 200) {
    throw new Error(`Failed to delete test group ${groupId}: ${resp.data}`)
  }
  return resp.data
}

/**
 * Update test group
 * @param data - data to update
 * @returns {Promise<void>}
 */
async function updateTestGroup(data) {
  const st = new Date().getTime()
  const url = `${config.GROUPS_API_URL}/groups/${CONTEXT.groupId}`
  const resp = await axios.put(url, data, {headers: CONTEXT.headers})
  const et = new Date().getTime()
  const success = resp.status === 200
  addApiCallResult(url, 'PUT', et - st, success, {
    status: resp.status,
    groupSize: CONTEXT.membersAdded.size
  })
  return resp.data
}

/**
 * Bulk add members to group.
 * @param members - members to add.
 * @param isSetup - is this call part of the setup
 * @returns {Promise<{}>}
 */
async function bulkAddMembersToGroup (members, isSetup = false) {
  const st = new Date().getTime()
  const url = `${config.GROUPS_API_URL}/groups/${CONTEXT.groupId}/members`
  const resp = await axios.post(url, {
    members
  }, { headers: CONTEXT.headers })
  const et = new Date().getTime()
  const success = resp.status === 200
  const failedMembers = []
  if (success) {
    forEach(resp.data.members, (m) => {
      if (m.status === 'success' || m.message === 'The member is already in the group') {
        CONTEXT.membersAdded.add(m.memberId)
      } else {
        failedMembers.push(m)
      }
    })
  }
  addApiCallResult(url, 'POST', et - st, success, {
    status: resp.status,
    totalMembers: members.length,
    failedMembers: failedMembers.length,
    groupSize: CONTEXT.membersAdded.size,
    isSetup,
  })
  return resp.data
}

/**
 * Bulk delete members from group.
 * @param members - members to remove
 * @returns {Promise<{}>}
 */
async function bulkDeleteMemberFromGroup (members){
  const st = new Date().getTime()
  const url = `${config.GROUPS_API_URL}/groups/${CONTEXT.groupId}/members`
  const resp = await axios.delete(url, {
    headers: CONTEXT.headers,
    data: { members }
  })
  const et = new Date().getTime()
  const success = resp.status === 200
  const failedMembers = []
  if (success) {
    forEach(resp.data.members, (m) => {
      if (m.status === 'success') {
        CONTEXT.membersAdded.delete(m.memberId.memberId)
      } else {
        failedMembers.push(m)
      }
    })
  }
  addApiCallResult(url, 'DELETE', et - st, success, {
    status: resp.status,
    totalMembers: members.length,
    failedMembers: failedMembers.length,
    groupSize: CONTEXT.membersAdded.size,
  })
  return resp.data
}

/**
 * Call bulk add members in chunks.
 * @param members - array of members: {"memberId": "string", "membershipType": "user|group"}
 * @param chunkSize - maximum size of each chunk
 * @returns {Promise<void>}
 */
async function addMembersToGroupChunked (members, chunkSize) {
  for (let i = 0; i < members.length; i += chunkSize) {
    const chunk = members.slice(i, i + chunkSize)
    await bulkAddMembersToGroup(chunk, true)
    logger.info(`Added chunk ${i}..${i + chunkSize}.`)
  }
}

/**
 * Setup the test context, initialize resources.
 * @returns {Promise<void>}
 */
async function setup () {
  if (config.MEMBERS_MIN <= 0) {
    throw new Error(`Invalid MEMBERS_MIN ${config.MEMBERS_MIN} should be positive int.`)
  }
  if (config.MEMBERS_MAX < config.MEMBERS_MIN) {
    throw new Error(`Invalid MEMBERS_MAX ${config.MEMBERS_MAX} should be greater or equal to ${config.MEMBERS_MIN}.`)
  }
  const accessToken = await helper.getM2Mtoken()
  CONTEXT.headers.Authorization = `Bearer ${accessToken}`
  if (config.USE_FAKE_MEMBER) {
    logger.info(`USE_FAKE_MEMBER set to true, generating fake members ${config.TOTAL_MEMBER_SIZE}.`)
    CONTEXT.members = range(0, config.TOTAL_MEMBER_SIZE).map(i => {
      return {
        memberId: `${i}`,
        membershipType: 'user'
      }
    })
  } else {
    CONTEXT.members = await getNMembers(config.TOTAL_MEMBER_SIZE)
  }
  CONTEXT.groupId = await createTestGroup()

  logger.info(`Groups API URL: ${config.GROUPS_API_URL}`)
  logger.info(`Total members: ${CONTEXT.members.length}`)
  logger.info(`Test Group Id: ${CONTEXT.groupId}`)
}

/**
 * Randomly select members to add for each iteration.
 * @returns {[{memberId,membershipType}]}
 */
function selectMembersForIteration () {
  const n = random(config.MEMBERS_MIN, config.MEMBERS_MAX)
  const notInGroup = CONTEXT.members.filter(m => !CONTEXT.membersAdded.has(m.memberId))
  const inGroup = CONTEXT.members.filter(m => CONTEXT.membersAdded.has(m.memberId))
  if (notInGroup.length === 0) {
    return sampleSize(CONTEXT.members, n)
  }
  if (n <= notInGroup.length) {
    return sampleSize(notInGroup, n)
  }
  return [...notInGroup, ...sampleSize(inGroup, n - notInGroup.length)]
}

/**
 * Clean up test data
 * @returns {Promise<void>}
 */
async function teardown () {
  if (CONTEXT.groupId) {
    await deleteTestGroup(CONTEXT.groupId)
    CONTEXT.groupId = undefined
  }
}

/**
 * Perf test report
 * @returns {Promise<void>}
 */
async function report () {
  function printSummary (title, calls) {
    logger.info('')
    logger.info(title)
    const times = calls.map(call => call.timeInMs)
    logger.info(`  Total: ${calls.length}`)
    logger.info(`  Successful: ${calls.filter(call => call.success).length}`)
    logger.info(`  Failed: ${calls.filter(call => !call.success).length}`)
    logger.info(`  Max time ms: ${max(times)}`)
    logger.info(`  Min time ms: ${min(times)}`)
    logger.info(`  Mean time ms: ${mean(times)}`)
    logger.info('')
  }

  logger.info(`Total time ms: ${CONTEXT.endTime - CONTEXT.startTime}`)

  const overTimeLimitCalls = CONTEXT.apiCalls.filter(call => call.overTimeLimit)
  logger.info(`Over time limit API calls: ${overTimeLimitCalls.length}`)
  if (overTimeLimitCalls.length > 0) {
    logger.info(JSON.stringify(overTimeLimitCalls.slice(0, 5), null, 2))
  }

  const setupCalls = CONTEXT.apiCalls.filter(call => call.isSetup)
  printSummary('Setup calls summary', setupCalls)

  const memberCalls = CONTEXT.apiCalls.filter(call => !call.isSetup && call.url.endsWith(`/groups/${CONTEXT.groupId}/members`))
  printSummary('Iteration add member calls summary', memberCalls.filter(call => call.method === 'POST'))
  printSummary('Iteration remove member calls summary', memberCalls.filter(call => call.method === 'DELETE'))
  const updateGroupCalls = CONTEXT.apiCalls.filter(call => !call.isSetup && call.url.endsWith(`/groups/${CONTEXT.groupId}`) && call.method === 'PUT')
  printSummary('Iteration update group calls summary', updateGroupCalls)



  const fileName = `perf-test-${new Date().toISOString()}.json`
  await fs.writeFile(fileName, JSON.stringify({
    ...pick(config, ['TOTAL_MEMBER_SIZE', 'INITIAL_MEMBERS', 'NUM_ITERATIONS', 'MEMBERS_MIN', 'MEMBERS_MAX', 'USE_FAKE_MEMBER', 'API_CALL_TIME_LIMIT_MS']),
    apiCalls: CONTEXT.apiCalls
  }, null, 2))
  logger.info(`Result written to ${fileName}`)
}

async function main () {
  await setup()
  try {
    CONTEXT.startTime = new Date().getTime()
    logger.info(`Adding initial ${config.INITIAL_MEMBERS} members...`)
    await addMembersToGroupChunked(CONTEXT.members.slice(0, config.INITIAL_MEMBERS), config.INITIAL_ADD_MEMBERS_CHUNK_SIZE)
    logger.info(`Successfully added ${CONTEXT.membersAdded.size} members.`)

    for (let i = 0; i < config.NUM_ITERATIONS; ++i) {
      logger.info(`Iteration ${i + 1}/${config.NUM_ITERATIONS}`)
      let members = selectMembersForIteration()
      logger.info(`Adding ${members.length} to group.`)
      let prevMembersCount = CONTEXT.membersAdded.size
      let resp = await bulkAddMembersToGroup(members)
      logger.info(`Successfully added ${CONTEXT.membersAdded.size - prevMembersCount}`)

      logger.info(`Updating test group.`)

      resp = await updateTestGroup({
        name: `TestGroup-${uuid.v4()}`,
        description: `TestGroup description ${uuid.v4()}`,
        privateGroup: true,
        selfRegister: false,
        status: 'active',
        ssoId: uuid.v4(),
        organizationId: uuid.v4(),
        oldId: uuid.v4(),
      })

      logger.info(`Updated test group: ${JSON.stringify(resp)}.`)

      members = selectMembersForIteration()
      logger.info(`Removing ${members.length} from group.`)
      prevMembersCount = CONTEXT.membersAdded.size
      resp = await bulkDeleteMemberFromGroup(members)
      logger.info(`Successfully removed ${prevMembersCount - CONTEXT.membersAdded.size}`)

      logger.info(`Iteration ${i + 1}/${config.NUM_ITERATIONS} finished.`)
    }

    CONTEXT.endTime = new Date().getTime()
    await report()
  } finally {
    logger.info('Cleaning up.')
    await teardown()
  }
}

main().then(() => {
  logger.info('Perf test finished.')
})