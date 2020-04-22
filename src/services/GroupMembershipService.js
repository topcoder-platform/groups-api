/**
 * This service provides operations of group memberships
 */
const _ = require('lodash')
const config = require('config')
const Joi = require('joi')
const uuid = require('uuid/v4')
const helper = require('../common/helper')
const logger = require('../common/logger')
const errors = require('../common/errors')
const validate = require('uuid-validate')
const constants = require('../../app-constants')

/**
 * Add group member.
 * @param {Object} currentUser the current user
 * @param {String} groupId the id of group to add member
 * @param {Object} data the data to add member
 * @returns {Object} the added group membership
 */
async function addGroupMember(currentUser, groupId, data) {
  logger.debug(`Enter in addGroupMember - Group = ${groupId} Criteria = ${data}`)
  let session = helper.createDBSession()
  let tx = session.beginTransaction()

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

    if (
      currentUser !== 'M2M' &&
      !helper.hasAdminRole(currentUser) &&
      !(
        group.selfRegister &&
        data.membershipType === config.MEMBERSHIP_TYPES.User &&
        Number(currentUser.userId) === Number(data.memberId)
      )
    ) {
      throw new errors.ForbiddenError('You are not allowed to perform this action!')
    }

    if (data.membershipType === config.MEMBERSHIP_TYPES.Group) {
      if (data.memberId === groupId) {
        throw new errors.BadRequestError('A group can not add to itself.')
      }
      logger.debug(`Check for groupId ${data.memberId} exist or not`)
      const childGroup = await helper.ensureExists(tx, 'Group', data.memberId)

      data.memberOldId = childGroup.oldId
      // if parent group is private, the sub group must be private too
      if (group.privateGroup && !childGroup.privateGroup) {
        throw new errors.ConflictError('Parent group is private, the child group must be private too.')
      }
    } else {
      logger.debug(`Check for memberId ${data.memberId} exist or not`)
      await helper.ensureExists(tx, 'User', data.memberId)
    }

    logger.debug(`check member ${data.memberId} is part of group ${groupId}`)
    const targetObjectType = data.membershipType === config.MEMBERSHIP_TYPES.Group ? 'Group' : 'User'
    const memberCheckRes = await tx.run(
      `MATCH (g:Group {id: {groupId}})-[r:GroupContains]->(o:${targetObjectType} {id: {memberId}}) RETURN o`,
      { groupId, memberId: data.memberId }
    )
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
    const membershipId = uuid()
    const createdAt = new Date().toISOString()
    const query = `MATCH (g:Group {id: {groupId}}) MATCH (o:${targetObjectType} {id: {memberId}}) CREATE (g)-[r:GroupContains {id: {membershipId}, type: {membershipType}, createdAt: {createdAt}, createdBy: {createdBy}}]->(o) RETURN r`

    const params = {
      groupId,
      memberId: data.memberId,
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
      memberId: data.memberId,
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

addGroupMember.schema = {
  currentUser: Joi.any(),
  groupId: Joi.id(), // defined in app-bootstrap
  data: Joi.object()
    .keys({
      memberId: Joi.id(),
      membershipType: Joi.string().valid(_.values(config.MEMBERSHIP_TYPES)).required()
    })
    .required()
}

/**
 * Delete group member.
 * @param {Object} currentUser the current user
 * @param {String} groupId the group id
 * @param {String} memberId the member id
 * @returns {Object} the deleted group membership
 */
async function deleteGroupMember(currentUser, groupId, memberId) {
  logger.debug(`Enter in deleteGroupMember - Group = ${groupId} memberId = ${memberId}`)
  let session = helper.createDBSession()
  let tx = session.beginTransaction()

  try {
    logger.debug(`Check for groupId ${groupId} exist or not`)
    const group = await helper.ensureExists(
      tx,
      'Group',
      groupId,
      currentUser !== 'M2M' && helper.hasAdminRole(currentUser)
    )
    groupId = group.id
    const oldId = group.oldId
    const name = group.name

    if (
      currentUser !== 'M2M' &&
      !helper.hasAdminRole(currentUser) &&
      !(group.selfRegister && currentUser.userId === memberId)
    ) {
      throw new errors.ForbiddenError('You are not allowed to perform this action!')
    }

    // delete membership
    const query = 'MATCH (g:Group {id: {groupId}})-[r:GroupContains]->(o {id: {memberId}}) DELETE r'
    await tx.run(query, { groupId, memberId })

    if (validate(memberId, 4)) {
      const getMember = await helper.ensureExists(tx, 'Group', memberId)
      memberId = getMember.oldId
    }

    const result = {
      groupId,
      name,
      oldId,
      memberId
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
  memberId: Joi.id()
}

/**
 * Get group members
 * @param {Object} currentUser the current user
 * @param {String} groupId the id of group to get members
 * @param {Object} criteria the search criteria
 * @returns {Object} the search result
 */
async function getGroupMembers(currentUser, groupId, criteria) {
  const session = helper.createDBSession()

  try {
    const group = await helper.ensureExists(
      session,
      'Group',
      groupId,
      currentUser !== 'M2M' && helper.hasAdminRole(currentUser)
    )
    groupId = group.id

    // if the group is private, the user needs to be a member of the group, or an admin
    if (group.privateGroup && currentUser !== 'M2M' && !helper.hasAdminRole(currentUser)) {
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
  const session = helper.createDBSession()
  try {
    const group = await helper.ensureExists(
      session,
      'Group',
      groupId,
      currentUser !== 'M2M' && helper.hasAdminRole(currentUser)
    )
    if (group.privateGroup && currentUser !== 'M2M' && !helper.hasAdminRole(currentUser)) {
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
      queryToExecute = 'MATCH (g:Group {id: {groupId}})-[r:GroupContains*1..10]->(o:User) RETURN COUNT(o) AS count'
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
  groupId: Joi.id(), // defined in app-bootstrap
  query: Joi.object().keys({
    includeSubGroups: Joi.boolean().default(false)
  })
}

/**
 * Get member groups
 * @param {Object} currentUser the current user
 * @param {Object} memberId
 * @param {Object} criteria the search criteria
 * @returns {Object} the search result
 */
async function getMemberGroups(currentUser, memberId) {
  const session = helper.createDBSession()
  try {
    const res = await session.run(
      `MATCH (g:Group)-[r:GroupContains*1..]->(o {id: "${memberId}"}) WHERE exists(g.oldId) AND g.status = '${constants.GroupStatus.Active}' RETURN g.oldId order by g.oldId`
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
  currentUser: Joi.any(),
  memberId: Joi.id()
}

module.exports = {
  getGroupMembers,
  addGroupMember,
  getGroupMember,
  deleteGroupMember,
  getGroupMembersCount,
  getMemberGroups
}

logger.buildService(module.exports)
