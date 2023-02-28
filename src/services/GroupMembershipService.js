/**
 * This service provides operations of group memberships
 */
const _ = require('lodash')
const config = require('config')
const Joi = require('joi')
const uuid = require('uuid')
const helper = require('../common/helper')
const logger = require('../common/logger')
const errors = require('../common/errors')
const validate = require('uuid-validate')
const constants = require('../../app-constants')

const GroupService = require('./GroupService')

/**
 * Add group member.
 * @param {Object} currentUser the current user
 * @param {String} groupId the id of group to add member
 * @param {Object} data the data to add member
 * @returns {Object} the added group membership
 */
async function addGroupMember(currentUser, groupId, data) {
  logger.debug(`Enter in addGroupMember - Group = ${groupId} Criteria = ${data}`)
  const session = helper.createDBSession()
  const tx = session.beginTransaction()
  const isAdmin = currentUser === 'M2M' || helper.hasAdminRole(currentUser)

  try {
    logger.debug(`Check for groupId ${groupId} exist or not`)
    const group = await helper.ensureExists(
      tx,
      'Group',
      groupId,
      currentUser !== 'M2M' && helper.hasAdminRole(currentUser)
    )

    data.oldId = group.oldId
    groupId = group.id

    if (!group.oldId || group.oldId.length <= 0) {
      throw new errors.ForbiddenError('Parent group is not ready yet, try after sometime')
    }

    const memberId = data.memberId ? data.memberId : data.universalUID

    if (
      !isAdmin &&
      !(await helper.hasGroupRole(tx, groupId, currentUser.userId, ['groupManager', 'groupAdmin'])) &&
      !(
        group.selfRegister &&
        data.membershipType === config.MEMBERSHIP_TYPES.User &&
        Number(currentUser.userId) === Number(memberId)
      )
    ) {
      throw new errors.ForbiddenError('You are not allowed to perform this action!')
    }

    if (data.membershipType === config.MEMBERSHIP_TYPES.Group) {
      if (memberId === groupId) {
        throw new errors.BadRequestError('A group can not add to itself.')
      }
      logger.debug(`Check for groupId ${memberId} exist or not`)
      const childGroup = await helper.ensureExists(tx, 'Group', memberId)

      data.memberOldId = childGroup.oldId
      // if parent group is private, the sub group must be private too
      if (group.privateGroup && !childGroup.privateGroup) {
        throw new errors.ConflictError('Parent group is private, the child group must be private too.')
      }

      // update the cache
      const redisClient = await helper.acquireRedisClient()
      let cachedGroup = JSON.parse(await redisClient.get(`Group:${group.id}`))

      if (!cachedGroup) {
        await GroupService.getGroup(currentUser, group.id, { includeSubGroups: true })
        cachedGroup = JSON.parse(await redisClient.get(`Group:${group.id}`))
      }

      cachedGroup.subGroups.push(childGroup)
      cachedGroup.flattenGroupIdTree.push(childGroup.id)
      await redisClient.set(`Group:${group.id}`, JSON.stringify(cachedGroup), { EX: config.CACHE_TTL })
    } else {
      logger.debug(`Check for memberId ${memberId} exist or not`)
      await helper.ensureExists(tx, 'User', memberId)
    }

    logger.debug(`check member ${memberId} is part of group ${groupId}`)
    const targetObjectType = data.membershipType === config.MEMBERSHIP_TYPES.Group ? 'Group' : 'User'

    let memberCheckRes
    if (data.universalUID) {
      memberCheckRes = await tx.run(
        `MATCH (g:Group {id: {groupId}})-[r:GroupContains]->(o:${targetObjectType} {universalUID: {memberId}}) RETURN o`,
        { groupId, memberId }
      )
    } else {
      memberCheckRes = await tx.run(
        `MATCH (g:Group {id: {groupId}})-[r:GroupContains]->(o:${targetObjectType} {id: {memberId}}) RETURN o`,
        { groupId, memberId: data.memberId }
      )
    }

    if (memberCheckRes.records.length > 0) {
      throw new errors.ConflictError('The member is already in the group')
    }

    // check cyclical reference
    if (data.membershipType === config.MEMBERSHIP_TYPES.Group) {
      const pathRes = await tx.run(
        'MATCH p=shortestPath( (g1:Group {id: {fromId}})-[*]->(g2:Group {id: {toId}}) ) RETURN p',
        { fromId: data.memberId, toId: groupId }
      )
      if (pathRes.records.length > 0) {
        throw new errors.ConflictError('There is cyclical group reference')
      }
    }

    // add membership
    const membershipId = uuid.v4()
    const createdAt = new Date().toISOString()

    let query
    if (validate(memberId, 4) && data.universalUID) {
      query = 'MATCH (g:Group {id: {groupId}}) MATCH (o:User {universalUID: {memberId}}) CREATE (g)-[r:GroupContains {id: {membershipId}, type: {membershipType}, createdAt: {createdAt}, createdBy: {createdBy}}]->(o) RETURN r'
    } else {
      query = `MATCH (g:Group {id: {groupId}}) MATCH (o:${targetObjectType} {id: {memberId}}) CREATE (g)-[r:GroupContains {id: {membershipId}, type: {membershipType}, createdAt: {createdAt}, createdBy: {createdBy}}]->(o) RETURN r`
    }

    const params = {
      groupId,
      memberId,
      membershipId,
      membershipType: data.membershipType,
      createdAt,
      createdBy: currentUser === 'M2M' ? '00000000' : currentUser.userId
    }

    logger.debug(`quey for adding membership ${query} with params ${JSON.stringify(params)}`)
    await tx.run(query, params)

    const result = {
      id: membershipId,
      groupId,
      oldId: data.oldId,
      name: group.name,
      createdAt,
      ...(currentUser === 'M2M' ? {} : { createdBy: currentUser.userId }),
      ...(data.memberId ? { memberId: data.memberId } : {}),
      ...(data.universalUID ? { universalUID: data.universalUID } : {}),
      ...(data.memberOldId ? { memberOldId: data.memberOldId } : {}),
      membershipType: data.membershipType
    }

    logger.debug(`sending message ${JSON.stringify(result)} to kafka topic ${config.KAFKA_GROUP_MEMBER_ADD_TOPIC}`)
    await helper.postBusEvent(config.KAFKA_GROUP_MEMBER_ADD_TOPIC, result)

    await tx.commit()
    return result
  } catch (error) {
    logger.error(error)
    logger.debug('Transaction Rollback')
    await tx.rollback()
    throw error
  } finally {
    logger.debug('Session Close')
    await session.close()
  }
}

addGroupMember.schema = Joi.alternatives().try(
  Joi.object().keys({
    currentUser: Joi.any(),
    groupId: Joi.id(), // defined in app-bootstrap
    data: Joi.object()
      .keys({
        memberId: Joi.id(),
        membershipType: Joi.string().valid(_.values(config.MEMBERSHIP_TYPES)).required()
      })
      .required()
  }),
  Joi.object().keys({
    currentUser: Joi.any(),
    groupId: Joi.id(), // defined in app-bootstrap
    data: Joi.object()
      .keys({
        universalUID: Joi.id(),
        membershipType: Joi.string().valid(_.values(config.MEMBERSHIP_TYPES)).required()
      })
      .required()
  })
)

/**
 * Add group members in bulk.
 * @param {Object} currentUser the current user
 * @param {String} groupId the id of group to add member
 * @param {Array} data the data for members to add
 * @returns {Object} the added group membership
 */
async function addGroupMemberBulk(currentUser, groupId, data) {
  logger.debug(`Enter in addGroupMemberBulk - Group = ${groupId} Data = ${JSON.stringify(data)}`)

  const membersAddRes = await Promise.allSettled(data.members.map(member => addGroupMember(currentUser, groupId, member)))

  const result = {}
  result.groupId = groupId

  const members = data.members.map((member, i) => {
    if (membersAddRes[i].status === 'fulfilled') {
      return {
        memberId: member.memberId,
        status: 'success'
      }
    } else {
      return {
        memberId: member.memberId,
        status: 'failed',
        message: membersAddRes[i].reason.message
      }
    }
  })

  result.members = members

  return result
}

addGroupMemberBulk.schema = Joi.object().keys({
  currentUser: Joi.any(),
  groupId: Joi.id(), // defined in app-bootstrap
  data: Joi.object()
    .keys({
      members: Joi.array().items(
        Joi.object({
          memberId: Joi.id(),
          membershipType: Joi.string().valid(_.values(config.MEMBERSHIP_TYPES)).required()
        })
      )
        .required()
    })
})

/**
 * Delete group member.
 * @param {Object} currentUser the current user
 * @param {String} groupId the group id
 * @param {String} memberId the member id
 * @returns {Object} the deleted group membership
 */
async function deleteGroupMember(currentUser, groupId, memberId, query) {
  logger.debug(`Enter in deleteGroupMember - Group = ${groupId} memberId = ${memberId}`)
  const session = helper.createDBSession()
  const tx = session.beginTransaction()
  const isAdmin = currentUser === 'M2M' || helper.hasAdminRole(currentUser)

  try {
    logger.debug(`Check for groupId ${groupId} exist or not`)
    const group = await helper.ensureExists(
      tx,
      'Group',
      groupId,
      isAdmin
    )
    groupId = group.id
    const oldId = group.oldId
    const name = group.name
    const universalUID = query ? query.universalUID : null

    if (
      !isAdmin &&
      !(await helper.hasGroupRole(tx, groupId, currentUser.userId, ['groupManager', 'groupAdmin'])) &&
      !(group.selfRegister && currentUser.userId === memberId)
    ) {
      throw new errors.ForbiddenError('You are not allowed to perform this action!')
    }

    // delete membership
    if (universalUID) {
      const query = 'MATCH (g:Group {id: {groupId}})-[r:GroupContains]->(o {universalUID: {universalUID}}) DELETE r'
      await tx.run(query, { groupId, universalUID })

      const matchClause = 'MATCH (u:User {universalUID: {universalUID}})'
      const params = { universalUID }

      const res = await tx.run(`${matchClause} RETURN u.id as memberId`, params)
      memberId = _.head(_.head(res.records)._fields)
    } else {
      const query = 'MATCH (g:Group {id: {groupId}})-[r:GroupContains]->(o {id: {memberId}}) DELETE r'
      await tx.run(query, { groupId, memberId })
    }

    if (validate(memberId, 4)) {
      const getMember = await helper.ensureExists(tx, 'Group', memberId)
      memberId = getMember.oldId
    }

    const result = {
      groupId,
      name,
      oldId,
      memberId,
      universalUID
    }

    logger.debug(`sending message ${JSON.stringify(result)} to kafka topic ${config.KAFKA_GROUP_MEMBER_DELETE_TOPIC}`)
    await helper.postBusEvent(config.KAFKA_GROUP_MEMBER_DELETE_TOPIC, result)

    await tx.commit()
    return result
  } catch (error) {
    logger.error(error)
    logger.debug('Transaction Rollback')
    await tx.rollback()
    throw error
  } finally {
    logger.debug('Session Close')
    await session.close()
  }
}

deleteGroupMember.schema = {
  currentUser: Joi.any(),
  groupId: Joi.id(), // defined in app-bootstrap
  memberId: Joi.optionalId().allow('', null),
  query: Joi.object().allow('', null)
}

/**
 * Delete group members in bulk.
 * @param {Object} currentUser the current user
 * @param {String} groupId the id of group from members to delete
 * @param {Array} data the data for members to delete
 * @returns {Object} the deleted group membership
 */
async function deleteGroupMemberBulk(currentUser, groupId, data) {
  logger.debug(`Enter in deleteGroupMemberBulk - Group = ${groupId} Data = ${JSON.stringify(data)}`)

  const membersAddRes = await Promise.allSettled(data.members.map(member => deleteGroupMember(currentUser, groupId, member)))

  const result = {}
  result.groupId = groupId

  const members = data.members.map((member, i) => {
    if (membersAddRes[i].status === 'fulfilled') {
      return {
        memberId: member,
        status: 'success'
      }
    } else {
      return {
        memberId: member,
        status: 'failed',
        message: membersAddRes[i].reason.message
      }
    }
  })

  result.members = members

  return result
}

deleteGroupMemberBulk.schema = Joi.object().keys({
  currentUser: Joi.any(),
  groupId: Joi.id(), // defined in app-bootstrap
  data: Joi.object()
    .keys({
      members: Joi.array().required()
    })
})

/**
 * Get group members
 * @param {Object} currentUser the current user
 * @param {String} groupId the id of group to get members
 * @param {Object} criteria the search criteria
 * @returns {Object} the search result
 */
async function getGroupMembers(currentUser, groupId, criteria) {
  const session = helper.createDBSession()
  const isAdmin = currentUser === 'M2M' || helper.hasAdminRole(currentUser)

  try {
    const group = await helper.ensureExists(
      session,
      'Group',
      groupId,
      isAdmin
    )
    groupId = group.id

    // if the group is private, the user needs to be a member of the group, or an admin
    if (group.privateGroup && !isAdmin) {
      await helper.ensureGroupMember(session, groupId, currentUser.userId)
    }

    const matchClause = 'MATCH (g:Group {id: {groupId}})-[r:GroupContains]->(o)'
    const params = { groupId }

    // query total record count
    const totalRes = await session.run(`${matchClause} RETURN COUNT(o)`, params)
    const total = totalRes.records[0].get(0).low || 0

    // query page of records
    let result = []
    if (criteria.page <= Math.ceil(total / criteria.perPage)) {
      const pageRes = await session.run(
        `${matchClause} RETURN r, o SKIP ${(criteria.page - 1) * criteria.perPage} LIMIT ${criteria.perPage}`,
        params
      )
      result = _.map(pageRes.records, (record) => {
        const r = record.get(0).properties
        const o = record.get(1).properties
        return {
          id: r.id,
          groupId,
          groupName: group.name,
          createdAt: r.createdAt,
          createdBy: r.createdBy,
          memberId: o.id,
          universalUID: o.universalUID,
          membershipType: r.type
        }
      })
    }

    result.total = total
    result.perPage = criteria.perPage
    result.page = criteria.page

    return result
  } catch (error) {
    logger.error(error)
    throw error
  } finally {
    logger.debug('Session Close')
    await session.close()
  }
}

getGroupMembers.schema = {
  currentUser: Joi.any(),
  groupId: Joi.id(), // defined in app-bootstrap
  criteria: Joi.object().keys({
    page: Joi.page(),
    perPage: Joi.perPage()
  })
}

/**
 * Get group member with db session.
 * @param {Object} session db session
 * @param {String} groupId the group id
 * @param {String} memberId the member id
 * @returns {Object} the group membership
 */
async function getGroupMemberWithSession(session, groupId, memberId) {
  try {
    const group = await helper.ensureExists(session, 'Group', groupId)
    groupId = group.id

    const query = 'MATCH (g:Group {id: {groupId}})-[r:GroupContains]->(o {id: {memberId}}) RETURN r'
    const membershipRes = await session.run(query, { groupId, memberId })
    if (membershipRes.records.length === 0) {
      throw new errors.NotFoundError('The member is not in the group')
    }
    const r = membershipRes.records[0].get(0).properties
    return {
      id: r.id,
      groupId,
      groupName: group.name,
      createdAt: r.createdAt,
      createdBy: r.createdBy,
      memberId,
      membershipType: r.type
    }
  } catch (error) {
    logger.error(error)
    throw error
  }
}

/**
 * Get group member.
 * @param {Object} currentUser the current user
 * @param {String} groupId the group id
 * @param {String} memberId the member id
 * @returns {Object} the group membership
 */
async function getGroupMember(currentUser, groupId, memberId) {
  const isAdmin = currentUser === 'M2M' || helper.hasAdminRole(currentUser)
  const session = helper.createDBSession()
  try {
    const group = await helper.ensureExists(
      session,
      'Group',
      groupId,
      isAdmin
    )
    if (group.privateGroup && !isAdmin) {
      await helper.ensureGroupMember(session, groupId, currentUser.userId)
    }
    const membership = await getGroupMemberWithSession(session, groupId, memberId)

    return membership
  } catch (error) {
    logger.error(error)
    throw error
  } finally {
    logger.debug('Session Close')
    await session.close()
  }
}

getGroupMember.schema = {
  currentUser: Joi.any(),
  groupId: Joi.id(), // defined in app-bootstrap
  memberId: Joi.id()
}

/**
 * Get distinct user members count of given group. Optionally may include sub groups.
 * @param {String} groupId the group id
 * @param {Object} query the query parameters
 * @returns {Object} the group members count data
 */
async function getGroupMembersCount(groupId, query) {
  const session = helper.createDBSession()
  try {
    const group = await helper.ensureExists(session, 'Group', groupId)
    groupId = group.id

    let queryToExecute = ''
    if (query.includeSubGroups) {
      queryToExecute = 'MATCH (g:Group {id: {groupId}})-[r:GroupContains*1..]->(o:User) RETURN COUNT(o) AS count'
    } else {
      queryToExecute = 'MATCH (g:Group {id: {groupId}})-[r:GroupContains]->(o:User) RETURN COUNT(o) AS count'
    }

    const res = await session.run(queryToExecute, { groupId })

    return { count: res.records[0]._fields[0].low }
  } catch (error) {
    logger.error(error)
    throw error
  } finally {
    logger.debug('Session Close')
    await session.close()
  }
}

getGroupMembersCount.schema = {
  groupId: Joi.optionalId(), // defined in app-bootstrap
  query: Joi.object().keys({
    includeSubGroups: Joi.boolean().default(false)
  })
}

/**
 * Get list of groups for specified user and member count of those groups. Optionally may include sub groups.
 * @param {Object} query the query parameters
 * @returns {Object} list of groupId and memberCount mapping
 */
async function listGroupsMemberCount(query) {
  const session = helper.createDBSession()
  try {
    let queryToExecute = ''

    if (query.includeSubGroups) {
      queryToExecute =
        'MATCH (g:Group)-[r:GroupContains*1..]->(o:User) WHERE exists(g.oldId) AND g.status = {status} RETURN g.oldId, g.id, COUNT(o) AS count order by g.oldId'
    } else {
      queryToExecute =
        'MATCH (g:Group)-[r:GroupContains]->(o:User) WHERE exists(g.oldId) AND g.status = {status} RETURN g.oldId, g.id, COUNT(o) AS count order by g.oldId'
    }
    let res = await session.run(queryToExecute, { status: constants.GroupStatus.Active })

    const groupsMemberCount = []
    res.records.forEach(function (record) {
      const groupMemberCount = {
        id: record._fields[1],
        oldId: record._fields[0],
        count: record._fields[2].low
      }
      groupsMemberCount.push(groupMemberCount)
    })

    if (query.includeSubGroups) {
      if (query.universalUID) {
        queryToExecute =
          'MATCH (g:Group)-[r:GroupContains*1..]->(o:User {universalUID: {universalUID}}) WHERE exists(g.oldId) AND g.status = {status} RETURN DISTINCT g.oldId order by g.oldId'
        res = await session.run(queryToExecute, {
          universalUID: query.universalUID,
          status: constants.GroupStatus.Active
        })
      }

      if (query.organizationId) {
        queryToExecute =
          'MATCH (g:Group)-[r:GroupContains*1..]->(o:User) WHERE g.organizationId = {organizationId} AND exists(g.oldId) AND g.status = {status} RETURN DISTINCT g.oldId order by g.oldId'
        res = await session.run(queryToExecute, {
          organizationId: query.organizationId,
          status: constants.GroupStatus.Active
        })
      }
    } else {
      if (query.universalUID) {
        queryToExecute =
          'MATCH (g:Group)-[r:GroupContains]->(o:User {universalUID: {universalUID}}) WHERE exists(g.oldId) AND g.status = {status} RETURN DISTINCT g.oldId order by g.oldId'
        res = await session.run(queryToExecute, {
          universalUID: query.universalUID,
          status: constants.GroupStatus.Active
        })
      }

      if (query.organizationId) {
        queryToExecute =
          'MATCH (g:Group)-[r:GroupContains]->(o:User) WHERE g.organizationId = {organizationId} AND exists(g.oldId) AND g.status = {status} RETURN DISTINCT g.oldId order by g.oldId'
        res = await session.run(queryToExecute, {
          organizationId: query.organizationId,
          status: constants.GroupStatus.Active
        })
      }
    }

    const groupList = _.flatten(_.map(res.records, '_fields'))
    const finalRes = _.filter(groupsMemberCount, function (n) {
      return _.includes(groupList, n.oldId)
    })

    return finalRes
  } catch (error) {
    logger.error(error)
    throw error
  } finally {
    logger.debug('Session Close')
    await session.close()
  }
}

listGroupsMemberCount.schema = {
  query: Joi.object().keys({
    includeSubGroups: Joi.boolean().default(false),
    universalUID: Joi.optionalId(),
    organizationId: Joi.optionalId()
  })
}

/**
 * Get member groups
 * @param {Object} memberId
 * @param {Object} query the search criteria
 * @returns {Object} the search result
 */
async function getMemberGroups(memberId, query) {
  const session = helper.createDBSession()
  try {
    const returnUuid = query.uuid
    const res = await session.run(
      `MATCH (g:Group)-[r:GroupContains*1..]->(o {id: "${memberId}"}) WHERE exists(g.oldId) AND g.status = '${constants.GroupStatus.Active}' RETURN ${returnUuid ? 'g.id order by g.id' : 'g.oldId order by g.oldId'}`
    )

    return _.uniq(_.map(res.records, (record) => record.get(0)))
  } catch (error) {
    logger.error(error)
    throw error
  } finally {
    logger.debug('Session Close')
    await session.close()
  }
}

getMemberGroups.schema = {
  memberId: Joi.id(),
  query: Joi.object().keys({
    uuid: Joi.boolean().default(false)
  })
}

async function groupValidityCheck(memberId, groupId) {
  const session = helper.createDBSession()
  try {
    const res = await session.run(
      `MATCH (g:Group)-[r:GroupContains*1..]->(o {id: "${memberId}"}) WHERE exists(g.oldId) AND g.status = '$constants.GroupStatus.Active}' RETURN g.oldId order by g.oldId`
    )

    const validOrNot = _.includes(_.uniq(_.map(res.records, (record) => record.get(0))), groupId)

    return { check: validOrNot }
  } catch (error) {
    logger.error(error)
    throw error
  } finally {
    logger.debug('Session Close')
    await session.close()
  }
}

groupValidityCheck.schema = {
  memberId: Joi.id(),
  groupId: Joi.id()
}

module.exports = {
  getGroupMembers,
  addGroupMember,
  getGroupMember,
  deleteGroupMember,
  getGroupMembersCount,
  listGroupsMemberCount,
  getMemberGroups,
  groupValidityCheck,
  addGroupMemberBulk,
  deleteGroupMemberBulk
}

logger.buildService(module.exports)
