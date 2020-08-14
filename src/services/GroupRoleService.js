/**
 * This service provides operations of groups
 */
const _ = require('lodash')
const config = require('config')
const Joi = require('joi')
const helper = require('../common/helper')
const logger = require('../common/logger')
const errors = require('../common/errors')
const constants = require('../../app-constants')

/**
 * Get the groups and roles of the user
 * @param {String} userId the user id
 * @param {Object} criteria the pagination properties
 * @returns {Object} an object contains an array of objects, where the object has two properties: the groupId and the role
 */
async function getGroupRole (userId, criteria) {
  logger.debug(`Get Group Role - UserId - ${userId} , Criteria - ${JSON.stringify(criteria)}`)
  const session = helper.createDBSession()
  try {
    const matchClause = `MATCH (g:Group)-[r:GroupContains {type: "${config.MEMBERSHIP_TYPES.User}"}]->(o {id: "${userId}"}) UNWIND r.roles as role`
    const totalRes = await session.run(`${matchClause} RETURN COUNT(role)`)
    const total = totalRes.records[0].get(0).low || 0

    const pageRes = await session.run(
       `${matchClause} RETURN g.id, role ORDER BY g.id, role SKIP ${(criteria.page - 1) * criteria.perPage} LIMIT ${
        criteria.perPage
      }`
    )

    const result = _.map(pageRes.records, (record) => ({ groupId: record._fields[0], ...JSON.parse(record._fields[1]) }))
    return { result, total, perPage: criteria.perPage, page: criteria.page }
  } catch (error) {
    logger.error(error)
    throw error
  } finally {
    logger.debug('Session Close')
    await session.close()
  }
}

getGroupRole.schema = {
  userId: Joi.id(),
  criteria: Joi.object().keys({
    page: Joi.page(),
    perPage: Joi.perPage()
  })
}

/**
 * Add a new combination of role and group to the group roles for the user
 * @param {Object} currentUser the current user
 * @param {String} userId the id of user to add role
 * @param {String} groupId the id of group to add role
 * @param {String} role the name of role to add
 * @returns {Object} the added role
 */
async function addGroupRole (currentUser, userId, groupId, role) {
  logger.debug(`Add Group Role - user - ${userId} , group - ${groupId}, role - ${role}`)
  const session = helper.createDBSession()
  const tx = session.beginTransaction()
  try {
    await helper.ensureExists(tx, 'Group', groupId, currentUser !== 'M2M' && helper.hasAdminRole(currentUser))
    await helper.ensureExists(tx, 'User', userId, currentUser !== 'M2M' && helper.hasAdminRole(currentUser))

    const res = await tx.run(`MATCH (g:Group {id: "${groupId}"})-[r:GroupContains {type: "${config.MEMBERSHIP_TYPES.User}"}]->(o {id: "${userId}"}) return r`)

    if (res.records.length === 0) {
      throw new errors.BadRequestError(`Not found Relation between member: ${userId} and Group: ${groupId}`)
    }
    const membership = res.records[0]._fields[0].properties
    const roles = membership.roles || []

    if (_.some(roles, r => JSON.parse(r).role === role)) {
      throw new errors.ConflictError(`The group role: ${role} of the member: ${userId} is already in the group: ${groupId}`)
    }
    const roleObject = {
      role,
      createdAt: new Date().toISOString(),
      createdBy: currentUser === 'M2M' ? '00000000' : currentUser.userId
    }
    roles.push(JSON.stringify(roleObject, ['role', 'createdAt', 'createdBy']))

    logger.debug(`Membership ${JSON.stringify(membership)} to add role ${role}`)

    await tx.run('MATCH (:Group)-[r:GroupContains {type: {type}, id: {id}}]-> () SET r.roles={roles} RETURN r', { type: config.MEMBERSHIP_TYPES.User, id: membership.id, roles })

    await helper.postBusEvent(config.KAFKA_GROUP_MEMBER_ROLE_ADD_TOPIC, { id: membership.id, userId, groupId, role })
    await tx.commit()
    return membership
  } catch (error) {
    logger.error(error)
    logger.debug('Transaction Rollback')
    await tx.rollback()
    if (error.name === 'NotFoundError') {
      throw new errors.BadRequestError(`Not found Group of id ${groupId}`)
    } else {
      throw error
    }
  } finally {
    logger.debug('Session Close')
    await session.close()
  }
}

addGroupRole.schema = {
  currentUser: Joi.any(),
  userId: Joi.id(),
  groupId: Joi.id(),
  role: Joi.string().valid(constants.GroupRoleName).required()
}

/**
 * Delete group role
 * @param {String} userId the user id
 * @param {String} groupId the group id
 * @param {String} role the role name
 * @param {Boolean} isAdmin flag indicating whether the current user is an admin or not
 * @returns {Object} the deleted group role
 */
async function deleteGroupRole (userId, groupId, role, isAdmin) {
  const session = helper.createDBSession()
  const tx = session.beginTransaction()
  try {
    logger.debug(`Delete Group Role - user - ${userId} , group - ${groupId}, role - ${role}`)
    await helper.ensureExists(tx, 'Group', groupId, isAdmin)
    await helper.ensureExists(tx, 'User', userId, isAdmin)

    const res = await tx.run(`MATCH (g:Group {id: "${groupId}"})-[r:GroupContains {type: "${config.MEMBERSHIP_TYPES.User}"}]->(o {id: "${userId}"}) return r`)

    if (res.records.length === 0) {
      throw new errors.BadRequestError(`Not found Group Role: ${role} of Member: ${userId} in the Group ${groupId}`)
    }
    const membership = res.records[0]._fields[0].properties
    const roles = membership.roles || []

    if (!_.some(roles, r => JSON.parse(r).role === role)) {
      throw new errors.BadRequestError(`Not found Group Role: ${role} of Member: ${userId} in the Group ${groupId}`)
    }
    _.remove(roles, r => JSON.parse(r).role === role)

    logger.debug(`Membership ${JSON.stringify(membership)} to delete role ${role}`)

    await tx.run('MATCH (:Group)-[r:GroupContains {type: {type}, id: {id}}]-> () SET r.roles={roles} RETURN r', { type: config.MEMBERSHIP_TYPES.User, id: membership.id, roles })

    await helper.postBusEvent(config.KAFKA_GROUP_MEMBER_ROLE_DELETE_TOPIC, { id: membership.id, userId, groupId, role })
    await tx.commit()
    return membership
  } catch (error) {
    logger.error(error)
    logger.debug('Transaction Rollback')
    await tx.rollback()
    if (error.name === 'NotFoundError') {
      throw new errors.BadRequestError(`Not found Group of id ${groupId}`)
    } else {
      throw error
    }
  } finally {
    logger.debug('Session Close')
    await session.close()
  }
}

deleteGroupRole.schema = {
  groupId: Joi.id(),
  userId: Joi.id(),
  role: Joi.string().valid(constants.GroupRoleName).required(),
  isAdmin: Joi.boolean().required()
}

module.exports = {
  getGroupRole,
  addGroupRole,
  deleteGroupRole
}

logger.buildService(module.exports)
