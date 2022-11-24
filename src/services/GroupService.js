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
async function searchGroups (criteria, isAdmin) {
  logger.debug(`START: searchGroups - Criteria - ${JSON.stringify(criteria)}`)

  if (criteria.memberId && !criteria.membershipType) {
    throw new errors.BadRequestError('The membershipType parameter should be provided if memberId is provided.')
  }
  if (!criteria.memberId && criteria.membershipType) {
    throw new errors.BadRequestError('The memberId parameter should be provided if membershipType is provided.')
  }

  const session = helper.createDBSession()

  try {
    let matchClause

    if (criteria.memberId) {
      matchClause = `MATCH (g:Group)-[r:GroupContains {type: "${criteria.membershipType}"}]->(o {id: "${criteria.memberId}"})`
    } else {
      matchClause = 'MATCH (g:Group)'
    }

    const filterCriterias = []

    filterCriterias.push('exists(g.oldId)')

    if (criteria.oldId) {
      filterCriterias.push(`g.oldId = '${criteria.oldId}'`)
    }

    if (criteria.name) {
      filterCriterias.push(`toLower(g.name) CONTAINS '${criteria.name.toLowerCase()}'`)
    }

    if (criteria.ssoId) {
      filterCriterias.push(`toLower(g.ssoId) = '${criteria.ssoId.toLowerCase()}'`)
    }

    if (criteria.organizationId) {
      filterCriterias.push(`toLower(g.organizationId) = '${criteria.organizationId.toLowerCase()}'`)
    }

    if (criteria.selfRegister !== undefined) {
      filterCriterias.push(`g.selfRegister = ${criteria.selfRegister}`)
    }

    if (criteria.privateGroup !== undefined) {
      filterCriterias.push(`g.privateGroup = ${criteria.privateGroup}`)
    }

    if (!isAdmin) {
      filterCriterias.push(`g.status = '${constants.GroupStatus.Active}'`)
    }

    const whereClause = filterCriterias.join(' AND ')

    // query total record count
    const totalRes = await session.run(`${matchClause} WHERE ${whereClause} RETURN COUNT(g)`)
    const total = totalRes.records[0].get(0).low || 0

    console.log(`${matchClause} WHERE ${whereClause} RETURN g ORDER BY g.oldId SKIP ${(criteria.page - 1) * criteria.perPage} LIMIT ${criteria.perPage}`)

    // query page of records
    let result = []
    if (criteria.page <= Math.ceil(total / criteria.perPage)) {
      const pageRes = await session.run(
        `${matchClause} WHERE ${whereClause} RETURN g ORDER BY g.oldId SKIP ${(criteria.page - 1) * criteria.perPage} LIMIT ${
          criteria.perPage
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
          group.parentGroups = await helper.getParentGroups(session, group.id)
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
async function createGroup (currentUser, data) {
  logger.debug(`START: createGroup - data - ${JSON.stringify(data)}`)
  const session = helper.createDBSession()
  const tx = session.beginTransaction()
  try {
    const group = await helper.createGroup(tx, data, currentUser)

    logger.debug(`Group Created = ${JSON.stringify(group)}`)

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
async function updateGroup (currentUser, groupId, data) {
  logger.debug(`START: updateGroup - data - ${JSON.stringify(data)}`)
  const session = helper.createDBSession()
  const tx = session.beginTransaction()
  try {
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
        'MATCH (g:Group {id: $id}) SET g.name=$name, g.description=$description, g.privateGroup=$privateGroup, g.selfRegister=$selfRegister, g.updatedAt=$updatedAt, g.updatedBy=$updatedBy, g.domain=$domain, g.ssoId=$ssoId, g.organizationId=$organizationId, g.oldId=$oldId, g.status=$status RETURN g',
        groupData
      )
    } else {
      updateRes = await tx.run(
        'MATCH (g:Group {id: $id}) SET g.name=$name, g.description=$description, g.privateGroup=$privateGroup, g.selfRegister=$selfRegister, g.updatedAt=$updatedAt, g.updatedBy=$updatedBy, g.domain=$domain, g.ssoId=$ssoId, g.organizationId=$organizationId, g.oldId=$oldId RETURN g',
        groupData
      )
    }

    const updatedGroup = updateRes.records[0].get(0).properties
    updatedGroup.oldName = group.name
    logger.debug(`Group Updated = ${JSON.stringify(updatedGroup)}`)

    await helper.postBusEvent(config.KAFKA_GROUP_UPDATE_TOPIC, updatedGroup)
    await tx.commit()
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

updateGroup.schema = {
  currentUser: Joi.any(),
  groupId: Joi.string(), // defined in app-bootstrap
  data: createGroup.schema.data.keys({
    oldId: Joi.string(),
    status: Joi.string().valid([constants.GroupStatus.Active, constants.GroupStatus.InActive])
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
  logger.debug(`START: getGroup - groupId - ${groupId} , criteria - ${JSON.stringify(criteria)}`)
  const isAdmin = currentUser === 'M2M' || helper.hasAdminRole(currentUser)

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

  try {
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
    if (criteria.includeSubGroups || criteria.includeParentGroup) {
      pending.push(group)
      while (pending.length > 0) {
        const groupToExpand = pending.shift()
        const found = _.find(expanded, (g) => g.id === groupToExpand.id)
        if (found) {
          // this group was already expanded, so re-use the fields
          groupToExpand.subGroups = found.subGroups
          groupToExpand.parentGroups = found.parentGroups
          continue
        }
        expanded.push(groupToExpand)
        if (criteria.includeSubGroups) {
          // find child groups
          groupToExpand.subGroups = await helper.getChildGroups(session, groupToExpand.id)
          // add child groups to pending if needed
          if (!criteria.oneLevel) {
            _.forEach(groupToExpand.subGroups, (g) => pending.push(g))
          }
        } else {
          // find parent groups
          groupToExpand.parentGroups = await helper.getParentGroups(session, groupToExpand.id)
          // add parent groups to pending if needed
          if (!criteria.oneLevel) {
            _.forEach(groupToExpand.parentGroups, (g) => pending.push(g))
          }
        }
      }
    }

    if (fieldNames) {
      fieldNames.push('subGroups')
      fieldNames.push('parentGroups')
      group = _.pick(group, fieldNames)
    }
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
async function deleteGroup (groupId, isAdmin) {
  logger.debug(`START: deleteGroup - ${groupId}`)
  const session = helper.createDBSession()
  const tx = session.beginTransaction()
  try {
    const group = await helper.ensureExists(tx, 'Group', groupId, isAdmin)

    const groupsToDelete = await helper.deleteGroup(tx, group)

    const kafkaPayload = {}
    kafkaPayload.groups = groupsToDelete
    await helper.postBusEvent(config.KAFKA_GROUP_DELETE_TOPIC, kafkaPayload)
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

deleteGroup.schema = {
  isAdmin: Joi.boolean().required(),
  groupId: Joi.id() // defined in app-bootstrap
}

module.exports = {
  searchGroups,
  createGroup,
  updateGroup,
  getGroup,
  deleteGroup
}

logger.buildService(module.exports)
