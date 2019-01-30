/**
 * Data migration
 */
global.Promise = require('bluebird')
const uuid = require('uuid/v4')
const config = require('./config')
const logger = require('./logger')
const request = require('superagent')
const neo4j = require('neo4j-driver').v1

const driver = neo4j.driver(config.GRAPH_DB_URI, neo4j.auth.basic(config.GRAPH_DB_USER, config.GRAPH_DB_PASSWORD))
const rateLimit = 5

async function getRequest (path) {
  return request
    .get(`${config.V3_API_URL}${path}`)
    .set('Authorization', `Bearer ${config.TOKEN}`)
    .set('Content-Type', 'application/json')
    .set('Accept', 'application/json')
}

const groups = new Map()
const userIds = new Map()

async function insertGroups (list) {
  const session = driver.session()
  let i

  try {
    for (i = 0; i < list.length; i++) {
      list[i].uuid = uuid()
      groups.set(list[i].id, list[i])
      let extra = ''
      if (list[i].createdAt !== null && list[i].createdAt !== undefined) {
        extra = extra + ', createdAt: {createdAt}'
      }
      if (list[i].createdBy !== null && list[i].createdBy !== undefined) {
        extra = extra + ', createdBy: {createdBy}'
      }
      if (list[i].modifiedAt !== null && list[i].modifiedAt !== undefined) {
        extra = extra + ', updatedAt: {modifiedAt}'
      }
      if (list[i].modifiedBy !== null && list[i].modifiedBy !== undefined) {
        extra = extra + ', updatedBy: {modifiedBy}'
      }
      const query = `CREATE (g:Group {id: {uuid}, oldId: {id}, name: {name}, description: {description}, privateGroup: {privateGroup}, selfRegister: {selfRegister}${extra}}) RETURN g`
      await session.run(query, list[i])

      if (i % 10 === 0) {
        process.stdout.write(`${Number(i / list.length * 100).toFixed(2)}% complete... \r`)
      }
    }
  } catch (error) {
    logger.error(`Error occur when inserting Group(id: ${list[i].id})`)
    throw error
  } finally {
    session.close()
  }
}

async function ensureUserExisted (session, userId) {
  if (userIds.get(userId) === undefined) {
    userIds.set(userId, true)
    await session.run(`CREATE (u:User {id: "${userId}"}) RETURN u`)
  }
}

async function insertMembers (members) {
  const session = driver.session()
  let i

  try {
    for (i = 0; i < members.length; i++) {
      members[i].groupId = String(members[i].groupId)
      members[i].memberId = String(members[i].memberId)
      if (members[i].membershipType === 'user') {
        await ensureUserExisted(session, members[i].memberId)
      }
      const data = {}
      data.id = uuid()
      data.groupId = groups.get(members[i].groupId).uuid
      data.oldId = members[i].id
      data.type = members[i].membershipType
      let extra = ''
      if (members[i].createdAt !== null) {
        data.createdAt = members[i].createdAt
        extra = extra + ', createdAt: {createdAt}'
      }
      if (members[i].createdBy !== null) {
        data.createdBy = members[i].createdBy
        extra = extra + ', createdBy: {createdBy}'
      }
      if (data.type === 'user') {
        data.memberId = members[i].memberId
      } else {
        if (groups.get(members[i].memberId) === undefined) {
          throw new Error(`Group(id: ${members[i].memberId}) doesn't exist`)
        }
        data.memberId = groups.get(members[i].memberId).uuid
      }
      const targetObjectType = data.type === 'user' ? 'User' : 'Group'
      const query = `MATCH (g:Group {id: {groupId}}) MATCH (o:${
        targetObjectType
      } {id: {memberId}}) CREATE (g)-[r:GroupContains {id: {id}, type: {type}${extra}}]->(o) RETURN r`
      await session.run(query, data)
    }
  } catch (error) {
    logger.error(`Error occur when inserting Group Member`)
    console.error(members[i])
    throw error
  } finally {
    session.close()
  }
}

async function migrateDate () {
  logger.info('retrieve groups')
  const res = await getRequest('groups')
  const list = res.body.result.content
  logger.info('retrieve groups finish')

  logger.info('insert groups')
  await insertGroups(list)
  logger.info('insert groups finish')

  logger.info('process group members')
  const total = Math.floor((list.length - 1) / rateLimit) + 1
  for (let time = 0; time < total; time++) {
    const start = time * rateLimit
    const end = Math.min(start + rateLimit - 1, list.length - 1)
    const requests = []
    for (let i = start; i <= end; i++) {
      requests.push(getRequest(`groups/${list[i].id}/members`))
    }
    const responses = await Promise.all(requests)
    for (let i = 0; i < end - start + 1; i++) {
      const members = responses[i].body.result.content
      await insertMembers(members)
    }
    process.stdout.write(`${Number((time + 1) / total * 100).toFixed(2)}% complete... \r`)
  }
  logger.info('process group members finish')
}

migrateDate().then(() => {
  logger.info('Done!')
  process.exit()
}).catch((e) => {
  logger.logFullError(e)
  process.exit(1)
})
