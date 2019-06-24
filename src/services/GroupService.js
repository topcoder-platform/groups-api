/**
 * This service provides operations of groups
 */
const _ = require('lodash');
const config = require('config');
const Joi = require('joi');
const uuid = require('uuid/v4');
const helper = require('../common/helper');
const logger = require('../common/logger');
const errors = require('../common/errors');
let validate = require('uuid-validate');

/**
 * Search groups
 * @param {Object} criteria the search criteria
 * @returns {Object} the search result
 */
async function searchGroups(criteria) {
  logger.debug(`Search Group - Criteria - ${JSON.stringify(criteria)}`);

  if (criteria.memberId && !criteria.membershipType) {
    throw new errors.BadRequestError('The membershipType parameter should be provided if memberId is provided.');
  }
  if (!criteria.memberId && criteria.membershipType) {
    throw new errors.BadRequestError('The memberId parameter should be provided if membershipType is provided.');
  }

  const session = helper.createDBSession();
  let matchClause;
  if (criteria.memberId) {
    matchClause = `MATCH (g:Group)-[r:GroupContains {type: "${criteria.membershipType}"}]->(o {id: "${
      criteria.memberId
    }"})`;
  } else {
    matchClause = `MATCH (g:Group)`;
  }

  let whereClause = '';
  if (criteria.oldId) {
    whereClause = ` WHERE g.oldId = "${criteria.oldId}"`;
  }
  if (criteria.selfRegister !== undefined) {
    if (whereClause === '') {
      whereClause = ` WHERE g.selfRegister = ${criteria.selfRegister}`;
    } else {
      whereClause = whereClause.concat(` AND g.selfRegister = ${criteria.selfRegister}`);
    }
  }
  if (criteria.privateGroup !== undefined) {
    if (whereClause === '') {
      whereClause = ` WHERE g.privateGroup = ${criteria.privateGroup}`;
    } else {
      whereClause = whereClause.concat(` AND g.privateGroup = ${criteria.privateGroup}`);
    }
  }

  // query total record count
  const totalRes = await session.run(`${matchClause}${whereClause} RETURN COUNT(g)`);
  const total = totalRes.records[0].get(0).low || 0;

  // query page of records
  let result = [];
  if (criteria.page <= Math.ceil(total / criteria.perPage)) {
    const pageRes = await session.run(
      `${matchClause}${whereClause} RETURN g ORDER BY g.name SKIP ${(criteria.page - 1) * criteria.perPage} LIMIT ${
        criteria.perPage
      }`
    );
    result = _.map(pageRes.records, record => record.get(0).properties);
    // populate parent/sub groups
    for (let i = 0; i < result.length; i += 1) {
      const group = result[i];
      group.parentGroups = await helper.getParentGroups(session, group.id);
      group.subGroups = await helper.getChildGroups(session, group.id);
    }
  }

  session.close();
  return result;
}

searchGroups.schema = {
  criteria: Joi.object().keys({
    memberId: Joi.optionalId(), // defined in app-bootstrap
    membershipType: Joi.string().valid(_.values(config.MEMBERSHIP_TYPES)),
    page: Joi.page(),
    perPage: Joi.perPage(),
    oldId: Joi.string(),
    selfRegister: Joi.boolean(),
    privateGroup: Joi.boolean()
  })
};

/**
 * Create group.
 * @param {Object} currentUser the current user
 * @param {Object} data the data to create group
 * @returns {Object} the created group
 */
async function createGroup(currentUser, data) {
  let session = helper.createDBSession();
  let tx = session.beginTransaction();
  try {
    logger.debug(`Create Group - user - ${currentUser} , data -  ${JSON.stringify(data)}`);

    // check whether group name is already used
    const nameCheckRes = await tx.run('MATCH (g:Group {name: {name}}) RETURN g LIMIT 1', {
      name: data.param.name
    });
    if (nameCheckRes.records.length > 0) {
      throw new errors.ConflictError(`The group name ${data.param.name} is already used`);
    }

    // create group
    const groupData = data.param;

    // generate next group id
    groupData.id = uuid();
    groupData.createdAt = new Date().toISOString();
    if (currentUser !== 'M2M') {
      groupData.createdBy = currentUser.userId;
    }

    const createRes = await tx.run(
      `CREATE (group:Group {id: {id}, name: {name}, description: {description}, privateGroup: {privateGroup}, selfRegister: {selfRegister}, createdAt: {createdAt}${
        currentUser !== 'M2M' ? ', createdBy: {createdBy}' : ''
      }${groupData.domain ? ', domain: {domain}' : ''}}) RETURN group`,
      groupData
    );

    const group = createRes.records[0]._fields[0].properties;
    logger.debug(`Group = ${JSON.stringify(group)}`);

    // post bus event
    await helper.postBusEvent(config.KAFKA_GROUP_CREATE_TOPIC, group);
    await tx.commit();
    return group;
  } catch (error) {
    logger.error(error);
    logger.debug('Transaction Rollback');
    await tx.rollback();
    throw error;
  } finally {
    logger.debug('Session Close');
    session.close();
  }
}

createGroup.schema = {
  currentUser: Joi.any(),
  data: Joi.object()
    .keys({
      param: Joi.object()
        .keys({
          name: Joi.string()
            .min(3)
            .max(150)
            .required(),
          description: Joi.string()
            .min(3)
            .max(2048),
          privateGroup: Joi.boolean().required(),
          selfRegister: Joi.boolean().required(),
          domain: Joi.string()
        })
        .required()
    })
    .required()
};

/**
 * Update group
 * @param {Object} currentUser the current user
 * @param {String} groupId the id of group to update
 * @param {Object} data the data to update group
 * @returns {Object} the updated group
 */
async function updateGroup(currentUser, groupId, data) {
  let session = helper.createDBSession();
  let tx = session.beginTransaction();
  try {
    logger.debug(`Update Group - user - ${currentUser} , data -  ${JSON.stringify(data)}`);
    const group = await helper.ensureExists(tx, 'Group', groupId);

    const groupData = data.param;
    groupData.id = groupId;
    groupData.updatedAt = new Date().toISOString();
    if (currentUser !== 'M2M') {
      groupData.updatedBy = currentUser.userId;
    }

    if (data.param.domain) {
      groupData.domain = data.param.domain;
    } else {
      groupData.domain = '';
    }

    const updateRes = await tx.run(
      `MATCH (g:Group {id: {id}}) SET g.name={name}, g.description={description}, g.privateGroup={privateGroup}, g.selfRegister={selfRegister}, g.updatedAt={updatedAt}, g.updatedBy={updatedBy}, g.domain={domain} RETURN g`,
      groupData
    );

    let updatedGroup = updateRes.records[0].get(0).properties;
    updatedGroup.oldName = group.name;
    logger.debug(`Group = ${JSON.stringify(updatedGroup)}`);

    await helper.postBusEvent(config.KAFKA_GROUP_UPDATE_TOPIC, updatedGroup);
    await tx.commit();
    return updatedGroup;
  } catch (error) {
    logger.error(error);
    logger.debug('Transaction Rollback');
    await tx.rollback();
    throw error;
  } finally {
    logger.debug('Session Close');
    session.close();
  }
}

updateGroup.schema = {
  currentUser: Joi.any(),
  groupId: Joi.string(), // defined in app-bootstrap
  data: createGroup.schema.data
};

/**
 * Get group.
 * @param {Object} currentUser the current user
 * @param {String} groupId the id of group to get
 * @param {Object} criteria the query criteria
 * @returns {Object} the group
 */
async function getGroup(currentUser, groupId, criteria) {
  logger.debug(`Get Group - user - ${currentUser} , groupId - ${groupId} , criteria -  ${JSON.stringify(criteria)}`);

  if (criteria.includeSubGroups && criteria.includeParentGroup) {
    throw new errors.BadRequestError('includeSubGroups and includeParentGroup can not be both true');
  }
  if (_.isNil(criteria.oneLevel)) {
    if (criteria.includeSubGroups) {
      criteria.oneLevel = false;
    } else if (criteria.includeParentGroup) {
      criteria.oneLevel = true;
    }
  }

  let fieldNames = null;
  if (criteria.fields) {
    fieldNames = criteria.fields.split(',');
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
      'oldId'
    ];
    for (let i = 0; i < fieldNames.length; i += 1) {
      if (!_.includes(allowedFieldNames, fieldNames[i])) {
        throw new errors.BadRequestError(
          `Field name ${fieldNames[i]} is not allowed, allowed field names: ${JSON.stringify(
            allowedFieldNames,
            null,
            4
          )}`
        );
      }
      for (let j = i + 1; j < fieldNames.length; j += 1) {
        if (fieldNames[i] === fieldNames[j]) {
          throw new errors.BadRequestError(`There are duplicate field names: ${fieldNames[i]}`);
        }
      }
    }
  }

  const session = helper.createDBSession();

  let group = validate(groupId, 4)
    ? await helper.ensureExists(session, 'Group', groupId)
    : await retrieveGroupByOldId(session, groupId);

  // if the group is private, the user needs to be a member of the group, or an admin
  if (group.privateGroup && currentUser !== 'M2M' && !helper.hasAdminRole(currentUser)) {
    await helper.ensureGroupMember(session, group.id, currentUser.userId);
  }

  // get parent or sub groups using breadth first search algorithm,
  // this is equivalent to recursive algorithm, but more efficient than latter,
  // see https://en.wikipedia.org/wiki/Breadth-first_search
  // handled group will be reused, won't be handled duplicately

  // pending group to expand
  const pending = [];
  const expanded = [];
  if (criteria.includeSubGroups || criteria.includeParentGroup) {
    pending.push(group);
    while (pending.length > 0) {
      const groupToExpand = pending.shift();
      const found = _.find(expanded, g => g.id === groupToExpand.id);
      if (found) {
        // this group was already expanded, so re-use the fields
        groupToExpand.subGroups = found.subGroups;
        groupToExpand.parentGroups = found.parentGroups;
        continue;
      }
      expanded.push(groupToExpand);
      if (criteria.includeSubGroups) {
        // find child groups
        groupToExpand.subGroups = await helper.getChildGroups(session, groupToExpand.id);
        // add child groups to pending if needed
        if (!criteria.oneLevel) {
          _.forEach(groupToExpand.subGroups, g => pending.push(g));
        }
      } else {
        // find parent groups
        groupToExpand.parentGroups = await helper.getParentGroups(session, groupToExpand.id);
        // add parent groups to pending if needed
        if (!criteria.oneLevel) {
          _.forEach(groupToExpand.parentGroups, g => pending.push(g));
        }
      }
    }
  }

  if (fieldNames) {
    fieldNames.push('subGroups');
    fieldNames.push('parentGroups');
    group = _.pick(group, fieldNames);
  }

  session.close();
  return group;
}

getGroup.schema = {
  currentUser: Joi.any(),
  groupId: Joi.id(), // defined in app-bootstrap
  criteria: Joi.object().keys({
    includeSubGroups: Joi.boolean().default(false),
    includeParentGroup: Joi.boolean().default(false),
    oneLevel: Joi.boolean(),
    fields: Joi.string()
  }),
  isOldId: Joi.boolean()
};

/**
 * Retrieve group by old id. Throw error if not exist.
 * @param {Object} session the db session
 * @param {String} oldId the old id
 * @returns {Object} the found entity
 */
async function retrieveGroupByOldId(session, oldId) {
  logger.debug(`retrieveGroupByOldId - ${oldId}`);

  const res = await session.run(`MATCH (g:Group {oldId: {oldId}}) RETURN g`, {
    oldId
  });
  if (!res || res.records.length === 0 || !res.records[0] || !res.records[0].get(0)) {
    throw new errors.NotFoundError(`Not found Group with old id ${oldId}`);
  }
  return res.records[0].get(0).properties;
}

/**
 * Delete group
 * @param {String} groupId the group id
 * @returns {Object} the deleted group
 */
async function deleteGroup(groupId) {
  let session = helper.createDBSession();
  let tx = session.beginTransaction();
  try {
    logger.debug(`Delete Group - ${groupId}`);
    const group = await helper.ensureExists(tx, 'Group', groupId);

    const groupsToDelete = [group];
    let index = 0;
    while (index < groupsToDelete.length) {
      const g = groupsToDelete[index];
      index += 1;

      const childGroups = await helper.getChildGroups(tx, g.id);
      for (let i = 0; i < childGroups.length; i += 1) {
        const child = childGroups[i];
        if (_.find(groupsToDelete, gtd => gtd.id === child.id)) {
          // the child was checked, ignore duplicate processing
          continue;
        }
        // delete child if it doesn't belong to other group
        const parents = await helper.getParentGroups(tx, child.id);
        if (parents.length <= 1) {
          groupsToDelete.push(child);
        }
      }
    }

    logger.debug(`Groups to delete ${JSON.stringify(groupsToDelete)}`);

    for (let i = 0; i < groupsToDelete.length; i += 1) {
      const id = groupsToDelete[i].id;
      // delete group's relationships
      await tx.run('MATCH (g:Group {id: {groupId}})-[r]-() DELETE r', {
        groupId: id
      });

      // delete group
      await tx.run('MATCH (g:Group {id: {groupId}}) DELETE g', {
        groupId: id
      });
    }

    const kafkaPayload = {};
    kafkaPayload.groups = groupsToDelete;
    await helper.postBusEvent(config.KAFKA_GROUP_DELETE_TOPIC, kafkaPayload);
    await tx.commit();
    return group;
  } catch (error) {
    logger.error(error);
    logger.debug('Transaction Rollback');
    await tx.rollback();
    throw error;
  } finally {
    logger.debug('Session Close');
    session.close();
  }
}

deleteGroup.schema = {
  groupId: Joi.id() // defined in app-bootstrap
};

module.exports = {
  searchGroups,
  createGroup,
  updateGroup,
  getGroup,
  deleteGroup
};

logger.buildService(module.exports);
