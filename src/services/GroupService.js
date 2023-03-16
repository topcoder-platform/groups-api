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
 * Search groups
 * @param {Object} criteria the search criteria
 * @param {Boolean} isAdmin flag indicating whether the current user is an admin or not
 * @returns {Object} the search result
 */
async function searchGroups(criteria, isAdmin) {
  logger.debug(`Search Group - Criteria - ${JSON.stringify(criteria)}`)

  if ((criteria.memberId || criteria.universalUID) && !criteria.membershipType) {
    throw new errors.BadRequestError('The membershipType parameter should be provided if memberId is provided.')
  }
  if (!(criteria.memberId || criteria.universalUID) && criteria.membershipType) {
    throw new errors.BadRequestError('The memberId or universalUID parameter should be provided if membershipType is provided.')
  }

  const session = helper.createDBSession()
  try {
    let matchClause

    if (criteria.memberId) {
      matchClause = `MATCH (g:Group)-[r:GroupContains {type: "${criteria.membershipType}"}]->(o {id: "${criteria.memberId}"})`
    } else if (criteria.universalUID) {
      matchClause = `MATCH (g:Group)-[r:GroupContains {type: "${criteria.membershipType}"}]->(o {universalUID: "${criteria.universalUID}"})`
    } else {
      matchClause = 'MATCH (g:Group)'
    }

    let whereClause = ''
    if (criteria.oldId) {
      whereClause = ` WHERE g.oldId = "${criteria.oldId}"`
    }

    if (criteria.name) {
      if (whereClause === '') {
        whereClause = ` WHERE LOWER(g.name) CONTAINS "${criteria.name.toLowerCase()}"`
      } else {
        whereClause = whereClause.concat(` AND LOWER(g.name) CONTAINS "${criteria.name.toLowerCase()}"`)
      }
    }

    if (criteria.ssoId) {
      if (whereClause === '') {
        whereClause = ` WHERE LOWER(g.ssoId) = "${criteria.ssoId.toLowerCase()}"`
      } else {
        whereClause = whereClause.concat(` AND LOWER(g.ssoId) = "${criteria.ssoId.toLowerCase()}"`)
      }
    }

    if (criteria.organizationId) {
      if (whereClause === '') {
        whereClause = ` WHERE LOWER(g.organizationId) = "${criteria.organizationId.toLowerCase()}"`
      } else {
        whereClause = whereClause.concat(` AND LOWER(g.organizationId) = "${criteria.organizationId.toLowerCase()}"`)
      }
    }

    if (criteria.selfRegister !== undefined) {
      if (whereClause === '') {
        whereClause = ` WHERE g.selfRegister = ${criteria.selfRegister}`
      } else {
        whereClause = whereClause.concat(` AND g.selfRegister = ${criteria.selfRegister}`)
      }
    }

    if (criteria.privateGroup !== undefined) {
      if (whereClause === '') {
        whereClause = ` WHERE g.privateGroup = ${criteria.privateGroup}`
      } else {
        whereClause = whereClause.concat(` AND g.privateGroup = ${criteria.privateGroup}`)
      }
    }

    if (whereClause === '') {
      whereClause = ' WHERE exists(g.oldId)'
    } else {
      whereClause = whereClause.concat(' AND exists(g.oldId)')
    }

    if (!isAdmin) {
      if (whereClause === '') {
        whereClause = ` WHERE g.status = '${constants.GroupStatus.Active}'`
      } else {
        whereClause = whereClause.concat(` AND g.status = '${constants.GroupStatus.Active}'`)
      }
    }

    // query total record count
    const totalRes = await session.run(`${matchClause}${whereClause} RETURN COUNT(g)`)
    const total = totalRes.records[0].get(0).low || 0

    logger.debug(`${matchClause}${whereClause} RETURN g ORDER BY g.oldId SKIP ${(criteria.page - 1) * criteria.perPage} 
    LIMIT ${criteria.perPage}`)

    // query page of records
    let result = []
    if (criteria.page <= Math.ceil(total / criteria.perPage)) {
      const pageRes = await session.run(
        `${matchClause}${whereClause} RETURN g ORDER BY g.oldId SKIP ${(criteria.page - 1) * criteria.perPage} LIMIT ${criteria.perPage
        }`
      )
      result = _.map(pageRes.records, (record) => record.get(0).properties)

      if (!isAdmin) {
        for (let i = 0; i < result.length; i += 1) {
          const group = result[i]
          delete group.status
        }
      }

      // populate parent/sub groups
      if (criteria.includeParentGroup) {
        for (let i = 0; i < result.length; i += 1) {
          const group = result[i]
          group.parentGroups = await helper.getParentGroups(group.id)
        }
      }

      if (criteria.includeSubGroups) {
        for (let i = 0; i < result.length; i += 1) {
          const group = result[i]
          group.subGroups = await helper.getChildGroups(session, group.id)
        }
      }
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

searchGroups.schema = {
  isAdmin: Joi.boolean(),
  criteria: Joi.object().keys({
    memberId: Joi.optionalId(), // defined in app-bootstrap
    universalUID: Joi.optionalId(),
    membershipType: Joi.string().valid(_.values(config.MEMBERSHIP_TYPES)),
    name: Joi.string(),
    page: Joi.page(),
    perPage: Joi.perPage(),
    oldId: Joi.string(),
    ssoId: Joi.string(),
    organizationId: Joi.optionalId(),
    selfRegister: Joi.boolean(),
    privateGroup: Joi.boolean(),
    includeSubGroups: Joi.boolean().default(false),
    includeParentGroup: Joi.boolean().default(false),
    oneLevel: Joi.boolean(),
    status: Joi.string()
      .valid([constants.GroupStatus.Active, constants.GroupStatus.InActive])
      .default(constants.GroupStatus.Active)
  })
}

/**
 * Create group.
 * @param {Object} currentUser the current user
 * @param {Object} data the data to create group
 * @returns {Object} the created group
 */
async function createGroup(currentUser, data) {
  const session = helper.createDBSession()
  const tx = session.beginTransaction()
  try {
    logger.debug(`Create Group - user - ${currentUser} , data -  ${JSON.stringify(data)}`)

    const group = await helper.createGroup(tx, data, currentUser)

    logger.debug(`Group = ${JSON.stringify(group)}`)

    // post bus event
    await helper.postBusEvent(config.KAFKA_GROUP_CREATE_TOPIC, group)
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

createGroup.schema = {
  currentUser: Joi.any(),
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
 * Update group
 * @param {Object} currentUser the current user
 * @param {String} groupId the id of group to update
 * @param {Object} data the data to update group
 * @returns {Object} the updated group
 */
async function updateGroup(currentUser, groupId, data) {
  const session = helper.createDBSession()
  const tx = session.beginTransaction()
  try {
    logger.debug(`Update Group - user - ${currentUser} , data -  ${JSON.stringify(data)}`)
    const group = await helper.ensureExists(
      tx,
      'Group',
      groupId,
      currentUser === 'M2M' || helper.hasAdminRole(currentUser)
    )

    const groupData = data
    groupData.id = groupId
    groupData.updatedAt = new Date().toISOString()
    groupData.updatedBy = currentUser === 'M2M' ? '00000000' : currentUser.userId
    groupData.domain = data.domain ? data.domain : ''
    groupData.ssoId = data.ssoId ? data.ssoId : ''
    groupData.organizationId = data.organizationId ? data.organizationId : ''
    groupData.oldId = data.oldId ? data.oldId : ''

    let updateRes
    if (groupData.status) {
      updateRes = await tx.run(
        'MATCH (g:Group {id: {id}}) SET g.name={name}, g.description={description}, g.privateGroup={privateGroup}, g.selfRegister={selfRegister}, g.updatedAt={updatedAt}, g.updatedBy={updatedBy}, g.domain={domain}, g.ssoId={ssoId}, g.organizationId={organizationId}, g.oldId={oldId}, g.status={status} RETURN g',
        groupData
      )
    } else {
      updateRes = await tx.run(
        'MATCH (g:Group {id: {id}}) SET g.name={name}, g.description={description}, g.privateGroup={privateGroup}, g.selfRegister={selfRegister}, g.updatedAt={updatedAt}, g.updatedBy={updatedBy}, g.domain={domain}, g.ssoId={ssoId}, g.organizationId={organizationId}, g.oldId={oldId} RETURN g',
        groupData
      )
    }

    const updatedGroup = updateRes.records[0].get(0).properties
    updatedGroup.oldName = group.name
    logger.debug(`Group = ${JSON.stringify(updatedGroup)}`)

    await helper.postBusEvent(config.KAFKA_GROUP_UPDATE_TOPIC, updatedGroup)
    await tx.commit()

    await helper.invalidateCache(updatedGroup)

    return updatedGroup
  } catch (error) {
    logger.debug('Transaction Rollback')
    await tx.rollback()
    throw error
  } finally {
    logger.debug('Session Close')
    await session.close()
  }
}

updateGroup.schema = {
  currentUser: Joi.any(),
  groupId: Joi.string(), // defined in app-bootstrap
  data: createGroup.schema.data.keys({
    oldId: Joi.string(),
    status: Joi.string().valid([constants.GroupStatus.Active, constants.GroupStatus.InActive])
  })
}

/**
 * Patch group
 * @param {Object} currentUser the current user
 * @param {String} groupId the id of group to update
 * @param {Object} data the data to update group
 * @returns {Object} the updated group
 */
async function patchGroup(currentUser, groupId, data) {
  const session = helper.createDBSession()
  const tx = session.beginTransaction()
  try {
    logger.debug(`Patch Group - user - ${currentUser} , data -  ${JSON.stringify(data)}`)
    const group = await helper.ensureExists(
      tx,
      'Group',
      groupId,
      currentUser === 'M2M' || helper.hasAdminRole(currentUser)
    )

    const groupData = data
    groupData.id = groupId
    groupData.updatedAt = new Date().toISOString()
    groupData.updatedBy = currentUser === 'M2M' ? '00000000' : currentUser.userId
    groupData.oldId = data.oldId ? data.oldId : ''

    await tx.run(
      'MATCH (g:Group {id: {id}}) SET g.updatedAt={updatedAt}, g.updatedBy={updatedBy}, g.oldId={oldId} RETURN g',
      groupData
    )
    await tx.commit()

    const updatedGroup = await getGroup(currentUser, groupId, { includeSubGroups: true, flattenGroupIdTree: true, skipCache: true })

    // update the cache
    await helper.invalidateCache(updateGroup)

    return updatedGroup
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

patchGroup.schema = {
  currentUser: Joi.any(),
  groupId: Joi.string(), // defined in app-bootstrap
  data: Joi.object().required()
    .keys({
      oldId: Joi.string().required(),
    })
}

/**
 * Get group.
 * @param {Object} currentUser the current user
 * @param {String} groupId the id of group to get
 * @param {Object} criteria the query criteria
 * @returns {Object} the group
 */

async function getGroup (currentUser, groupId, criteria) {
  const isAdmin = currentUser === 'M2M' || helper.hasAdminRole(currentUser)
  logger.debug(
    `Get Group - admin - ${isAdmin} - user - ${currentUser} , groupId - ${groupId} , criteria -  ${JSON.stringify(
      criteria
    )}`
  )

  if (criteria.includeSubGroups && criteria.includeParentGroup) {
    throw new errors.BadRequestError('includeSubGroups and includeParentGroup can not be both true')
  }

  if (_.isNil(criteria.oneLevel)) {
    if (criteria.includeSubGroups) {
      criteria.oneLevel = false
    } else if (criteria.includeParentGroup) {
      criteria.oneLevel = true
    }
  }

  let fieldNames = null
  if (criteria.fields) {
    fieldNames = criteria.fields.split(',')

    const allowedFieldNames = [
      'id',
      'createdAt',
      'createdBy',
      'updatedAt',
      'updatedBy',
      'name',
      'description',
      'privateGroup',
      'selfRegister',
      'domain',
      'organizationId',
      'oldId'
    ]

    for (let i = 0; i < fieldNames.length; i += 1) {
      if (!_.includes(allowedFieldNames, fieldNames[i])) {
        throw new errors.BadRequestError(
          `Field name ${fieldNames[i]} is not allowed, allowed field names: ${JSON.stringify(
            allowedFieldNames,
            null,
            4
          )}`
        )
      }
      for (let j = i + 1; j < fieldNames.length; j += 1) {
        if (fieldNames[i] === fieldNames[j]) {
          throw new errors.BadRequestError(`There are duplicate field names: ${fieldNames[i]}`)
        }
      }
    }
  }

  const session = helper.createDBSession()
  const redisClient = await helper.acquireRedisClient()

  try {
    const cacheCriteria = await helper.getCacheKey(criteria)
    const cacheKey = `group:${groupId}:${cacheCriteria}`

    // logger.debug(redisClient.exists(cacheKey))
    if (!criteria.skipCache && await redisClient.exists(cacheKey)) {
      logger.debug('returning from cache')
      // check for the availibility of the group in cache
      return JSON.parse(await redisClient.get(cacheKey))
    }

    let group = await helper.ensureExists(session, 'Group', groupId, isAdmin)

    if (!isAdmin) delete group.status

    // if the group is private, the user needs to be a member of the group, or an admin
    if (group.privateGroup && currentUser !== 'M2M' && !helper.hasAdminRole(currentUser)) {
      await helper.ensureGroupMember(session, group.id, currentUser.userId)
    }

    // get parent or sub groups using breadth first search algorithm,
    // this is equivalent to recursive algorithm, but more efficient than latter,
    // see https://en.wikipedia.org/wiki/Breadth-first_search
    // handled group will be reused, won't be handled duplicately

    // pending group to expand
    const pending = []
    const expanded = []
    if (criteria.includeSubGroups || criteria.includeParentGroup || criteria.flattenGroupIdTree) {
      pending.push(group)

      let flattenGroupIdTree = []
      while (pending.length > 0) {
        const groupIdTree = []
        const groupToExpand = pending.shift()
        const found = _.find(expanded, (g) => g.id === groupToExpand.id)
        if (found) {
          // this group was already expanded, so re-use the fields
          groupToExpand.subGroups = found.subGroups
          groupToExpand.parentGroups = found.parentGroups
          continue
        }
        expanded.push(groupToExpand)
        if (criteria.includeSubGroups || criteria.flattenGroupIdTree) {
          // find child groups
          groupToExpand.subGroups = await helper.getChildGroups(session, groupToExpand.id)
          _.forEach(groupToExpand.subGroups, (g) => groupIdTree.push(g.id))
          groupToExpand.flattenGroupIdTree = groupIdTree
          // add child groups to pending if needed
          if (!criteria.oneLevel) {
            _.forEach(groupToExpand.subGroups, (g) => pending.push(g))
          }
        } else {
          // find parent groups
          groupToExpand.parentGroups = await helper.getParentGroups(groupToExpand.id)
          // add parent groups to pending if needed
          if (!criteria.oneLevel) {
            _.forEach(groupToExpand.parentGroups, (g) => pending.push(g))
          }
        }

        flattenGroupIdTree = flattenGroupIdTree.concat(groupIdTree)
      }
      group.flattenGroupIdTree = flattenGroupIdTree
    }

    if (fieldNames) {
      fieldNames.push('subGroups')
      fieldNames.push('parentGroups')
      
      group = _.pick(group, fieldNames)
    }

    // set the value in redis with UUID
    await redisClient.set(`group:${group.id}:${cacheCriteria}`, JSON.stringify(group), { EX: config.CACHE_TTL })
    
    // set the value in redis with OldID
    if (group.oldId)
      await redisClient.set(`group:${group.oldId}:${cacheCriteria}`, JSON.stringify(group), { EX: config.CACHE_TTL })

    return group
  } catch (error) {
    logger.error(error)
    throw error
  } finally {
    logger.debug('Session Close')
    await session.close()
  }
}

getGroup.schema = {
  currentUser: Joi.any(),
  groupId: Joi.id(), // defined in app-bootstrap
  criteria: Joi.object().keys({
    includeSubGroups: Joi.boolean().default(false),
    includeParentGroup: Joi.boolean().default(false),
    flattenGroupIdTree: Joi.boolean().default(false),
    skipCache: Joi.boolean().default(false),
    oneLevel: Joi.boolean(),
    fields: Joi.string()
  })
}

/**
 * Delete group
 * @param {String} groupId the group id
 * @param {Boolean} isAdmin flag indicating whether the current user is an admin or not
 * @returns {Object} the deleted group
 */
async function deleteGroup(groupId, isAdmin) {
  const session = helper.createDBSession()
  const tx = session.beginTransaction()
  try {
    logger.debug(`Delete Group - ${groupId}`)
    const group = await helper.ensureExists(tx, 'Group', groupId, isAdmin)

    const groupsToDelete = await helper.deleteGroup(tx, group)

    const kafkaPayload = {}
    kafkaPayload.groups = groupsToDelete
    await helper.postBusEvent(config.KAFKA_GROUP_DELETE_TOPIC, kafkaPayload)
    await tx.commit()

    groupsToDelete.forEach(async group => await helper.invalidateCache(group))

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

deleteGroup.schema = {
  isAdmin: Joi.boolean().required(),
  groupId: Joi.id() // defined in app-bootstrap
}

module.exports = {
  searchGroups,
  createGroup,
  updateGroup,
  patchGroup,
  getGroup,
  deleteGroup
}

logger.buildService(module.exports)
