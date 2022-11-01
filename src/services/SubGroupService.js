/**
 * This service provides operations of sub groups
 */
const config = require('config')
const Joi = require('joi')
const uuid = require('uuid/v4')
const helper = require('../common/helper')
const logger = require('../common/logger')
const errors = require('../common/errors')
const constants = require('../../app-constants')

/**
 * Create sub group.
 * @param {Object} currentUser the current user
 * @param {String} groupId the parent group id
 * @param {Object} data the sub group data to create group
 * @returns {Object} the created group
 */
async function createSubGroup (currentUser, groupId, data) {
  logger.debug(`Create Sub Group - user - ${currentUser} , groupId - ${groupId} , data -  ${JSON.stringify(data)}`)

  const session = helper.createDBSession()
  const tx = session.beginTransaction()
  const isAdmin = currentUser === 'M2M' || helper.hasAdminRole(currentUser)
  try {
    if (
      !isAdmin &&
      !(await helper.hasGroupRole(tx, groupId, currentUser.userId, ['groupAdmin']))
    ) {
      throw new errors.ForbiddenError('You are not allowed to perform this action!')
    }

    await helper.ensureExists(
      tx,
      'Group',
      groupId,
      isAdmin
    )

    const subGroup = await helper.createGroup(tx, data, currentUser)

    logger.debug(`SubGroup = ${JSON.stringify(subGroup)}`)

    const membershipId = uuid()

    await tx.run('MATCH (g:Group {id: {groupId}}) MATCH (o:Group {id: {subGroupId}}) CREATE (g)-[r:GroupContains {id: {membershipId}, type: {membershipType}, createdAt: {createdAt}, createdBy: {createdBy}}]->(o) RETURN r',
      { groupId, subGroupId: subGroup.id, membershipId, membershipType: config.MEMBERSHIP_TYPES.Group, createdAt: new Date().toISOString(), createdBy: currentUser === 'M2M' ? '00000000' : currentUser.userId })

    const result = {
      id: membershipId,
      groupId,
      subGroup
    }

    // post bus event
    await helper.postBusEvent(config.KAFKA_SUBGROUP_CREATE_TOPIC, result)
    await tx.commit()
    return subGroup
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

createSubGroup.schema = {
  currentUser: Joi.any(),
  groupId: Joi.string().required(),
  data: Joi.object()
    .keys({
      name: Joi.string().min(3).max(150).required(),
      description: Joi.string().min(3).max(2048),
      privateGroup: Joi.boolean().required(),
      selfRegister: Joi.boolean().required(),
      domain: Joi.string(),
      ssoId: Joi.string(),
      organizationId: Joi.optionalId(),
      status: Joi.string()
        .valid([constants.GroupStatus.Active, constants.GroupStatus.InActive])
        .default(constants.GroupStatus.Active)
    })
    .required()
}

/**
 * Delete sub group
 * @param {Object} currentUser the current user
 * @param {String} groupId the group id
 * @param {String} subGroupId the sub group id
 * @returns {Object} the deleted group
 */
async function deleteSubGroup (currentUser, groupId, subGroupId) {
  logger.debug(`Delete Sub Group - ${groupId}, Sub Group - ${subGroupId}`)
  const session = helper.createDBSession()
  const tx = session.beginTransaction()
  const isAdmin = currentUser === 'M2M' || helper.hasAdminRole(currentUser)
  try {
    if (
      !isAdmin &&
      !(await helper.hasGroupRole(tx, groupId, currentUser.userId, ['groupAdmin']))
    ) {
      throw new errors.ForbiddenError('You are not allowed to perform this action!')
    }

    const group = await helper.ensureExists(tx, 'Group', groupId, isAdmin)
    const subGroup = await helper.ensureExists(tx, 'Group', subGroupId, isAdmin)

    const res = await tx.run(`MATCH (g:Group {id: "${groupId}"})-[r:GroupContains {type: "${config.MEMBERSHIP_TYPES.Group}"}]->(o {id: "${subGroupId}"}) return r`)
    if (res.records.length === 0) {
      throw new errors.BadRequestError(`The Gourp: ${subGroupId} is not the child of Group: ${subGroupId}`)
    }

    // delete relationship
    await tx.run('MATCH (g:Group {id: {groupId}})-[r:GroupContains]->(o {id: {subGroupId}}) DELETE r', { groupId, subGroupId })

    // delete sub group
    const groupsToDelete = await helper.deleteGroup(tx, subGroup)

    const kafkaPayload = {
      groupId,
      subGroup: groupsToDelete
    }
    await helper.postBusEvent(config.KAFKA_SUBGROUP_DELETE_TOPIC, kafkaPayload)
    await tx.commit()
    return group
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

deleteSubGroup.schema = {
  currentUser: Joi.any(),
  groupId: Joi.string().required(),
  subGroupId: Joi.string().required()
}

module.exports = {
  createSubGroup,
  deleteSubGroup
}

logger.buildService(module.exports, {
  validators: { enabled: false },
  logging: { enabled: false },
  tracing: { enabled: true, annotations: [], metadata: [] }
})

