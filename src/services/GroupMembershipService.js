/**
 * This service provides operations of group memberships
 */
const _ = require('lodash');
const config = require('config');
const Joi = require('joi');
const uuid = require('uuid/v4');
const helper = require('../common/helper');
const logger = require('../common/logger');
const errors = require('../common/errors');

/**
 * Get group members
 * @param {Object} currentUser the current user
 * @param {String} groupId the id of group to get members
 * @param {Object} criteria the search criteria
 * @returns {Object} the search result
 */
async function getGroupMembers(currentUser, groupId, criteria) {
  const session = helper.createDBSession();
  const group = await helper.ensureExists(session, 'Group', groupId);

  // if the group is private, the user needs to be a member of the group, or an admin
  if (group.privateGroup && currentUser !== 'M2M' && !helper.hasAdminRole(currentUser)) {
    await helper.ensureGroupMember(session, groupId, currentUser.userId);
  }

  const matchClause = 'MATCH (g:Group {id: {groupId}})-[r:GroupContains]->(o)';
  const params = { groupId };

  // query total record count
  const totalRes = await session.run(`${matchClause} RETURN COUNT(o)`, params);
  const total = totalRes.records[0].get(0).low || 0;

  // query page of records
  let result = [];
  if (criteria.page <= Math.ceil(total / criteria.perPage)) {
    const pageRes = await session.run(
      `${matchClause} RETURN r, o SKIP ${(criteria.page - 1) * criteria.perPage} LIMIT ${criteria.perPage}`,
      params
    );
    result = _.map(pageRes.records, record => {
      const r = record.get(0).properties;
      const o = record.get(1).properties;
      return {
        id: r.id,
        groupId,
        groupName: group.name,
        createdAt: r.createdAt,
        createdBy: r.createdBy,
        memberId: o.id,
        membershipType: r.type
      };
    });
  }

  session.close();

  return { total, page: criteria.page, perPage: criteria.perPage, result };
}

getGroupMembers.schema = {
  currentUser: Joi.any(),
  groupId: Joi.id(), // defined in app-bootstrap
  criteria: Joi.object().keys({
    page: Joi.page(),
    perPage: Joi.perPage()
  }),
  isAnonymous: Joi.boolean()
};

/**
 * Add group member.
 * @param {Object} currentUser the current user
 * @param {String} groupId the id of group to add member
 * @param {Object} data the data to add member
 * @returns {Object} the added group membership
 */
async function addGroupMember(currentUser, groupId, data) {
  logger.debug('Started adding member to group');
  logger.debug(currentUser);
  logger.debug(groupId);
  logger.debug(JSON.stringify(data));
  const session = helper.createDBSession();
  const group = await helper.ensureExists(session, 'Group', groupId);
  // only admins or self registering users are allowed (if the group allows self register)
  if (
    currentUser !== 'M2M' &&
    !helper.hasAdminRole(currentUser) &&
    !(
      group.selfRegister &&
      data.param.membershipType === config.MEMBERSHIP_TYPES.User &&
      currentUser.userId === data.param.memberId
    )
  ) {
    throw new errors.ForbiddenError('You are not allowed to perform this action!');
  }

  if (data.param.membershipType === config.MEMBERSHIP_TYPES.Group) {
    if (data.param.memberId === groupId) {
      throw new errors.BadRequestError('A group can not add to itself.');
    }
    const childGroup = await helper.ensureExists(session, 'Group', data.param.memberId);
    // if parent group is private, the sub group must be private too
    if (group.privateGroup && !childGroup.privateGroup) {
      throw new errors.ConflictError('Parent group is private, the child group must be private too.');
    }
  } else {
    await helper.ensureExists(session, 'User', data.param.memberId);
  }

  // check whether member is already in group
  const targetObjectType = data.param.membershipType === config.MEMBERSHIP_TYPES.Group ? 'Group' : 'User';
  const memberCheckRes = await session.run(
    `MATCH (g:Group {id: {groupId}})-[r:GroupContains]->(o:${targetObjectType} {id: {memberId}}) RETURN o`,
    { groupId, memberId: data.param.memberId }
  );
  if (memberCheckRes.records.length > 0) {
    throw new errors.ConflictError('The member is already in the group');
  }

  // check cyclical reference
  if (data.param.membershipType === config.MEMBERSHIP_TYPES.Group) {
    const pathRes = await session.run(
      'MATCH p=shortestPath( (g1:Group {id: {fromId}})-[*]->(g2:Group {id: {toId}}) ) RETURN p',
      { fromId: data.param.memberId, toId: groupId }
    );
    if (pathRes.records.length > 0) {
      throw new errors.ConflictError('There is cyclical group reference');
    }
  }

  // add membership
  const membershipId = uuid();
  const createdAt = new Date().toISOString();
  const query = `MATCH (g:Group {id: {groupId}}) MATCH (o:${targetObjectType} {id: {memberId}}) CREATE (g)-[r:GroupContains {id: {membershipId}, type: {membershipType}, createdAt: {createdAt}${
    currentUser !== 'M2M' ? ', createdBy: {createdBy}' : ''
  }}]->(o) RETURN r`;
  await session.run(query, {
    groupId,
    memberId: data.param.memberId,
    membershipId,
    membershipType: data.param.membershipType,
    createdAt,
    createdBy: currentUser === 'M2M' ? undefined : currentUser.userId
  });

  session.close();

  const result = {
    id: membershipId,
    groupId,
    groupName: group.name,
    createdAt,
    createdBy: currentUser === 'M2M' ? undefined : currentUser.userId,
    memberId: data.param.memberId,
    membershipType: data.param.membershipType
  };

  // post bus event
  await helper.postBusEvent(config.KAFKA_GROUP_MEMBER_ADD_TOPIC, result);
  return result;
}

addGroupMember.schema = {
  currentUser: Joi.any(),
  groupId: Joi.id(), // defined in app-bootstrap
  data: Joi.object()
    .keys({
      param: Joi.object()
        .keys({
          memberId: Joi.id(),
          membershipType: Joi.string()
            .valid(_.values(config.MEMBERSHIP_TYPES))
            .required()
        })
        .required()
    })
    .required()
};

/**
 * Get group member with db session.
 * @param {Object} session db session
 * @param {String} groupId the group id
 * @param {String} memberId the member id
 * @returns {Object} the group membership
 */
async function getGroupMemberWithSession(session, groupId, memberId) {
  const group = await helper.ensureExists(session, 'Group', groupId);

  const query = 'MATCH (g:Group {id: {groupId}})-[r:GroupContains]->(o {id: {memberId}}) RETURN r';
  const membershipRes = await session.run(query, { groupId, memberId });
  if (membershipRes.records.length === 0) {
    throw new errors.NotFoundError('The member is not in the group');
  }
  const r = membershipRes.records[0].get(0).properties;
  return {
    id: r.id,
    groupId,
    groupName: group.name,
    createdAt: r.createdAt,
    createdBy: r.createdBy,
    memberId,
    membershipType: r.type
  };
}

/**
 * Get group member.
 * @param {Object} currentUser the current user
 * @param {String} groupId the group id
 * @param {String} memberId the member id
 * @returns {Object} the group membership
 */
async function getGroupMember(currentUser, groupId, memberId) {
  const session = helper.createDBSession();
  const group = await helper.ensureExists(session, 'Group', groupId);
  if (group.privateGroup && currentUser !== 'M2M' && !helper.hasAdminRole(currentUser)) {
    await helper.ensureGroupMember(session, groupId, currentUser.userId);
  }
  const membership = await getGroupMemberWithSession(session, groupId, memberId);

  session.close();
  return membership;
}

getGroupMember.schema = {
  currentUser: Joi.any(),
  groupId: Joi.id(), // defined in app-bootstrap
  memberId: Joi.id()
};

/**
 * Delete group member.
 * @param {Object} currentUser the current user
 * @param {String} groupId the group id
 * @param {String} memberId the member id
 * @returns {Object} the deleted group membership
 */
async function deleteGroupMember(currentUser, groupId, memberId) {
  const session = helper.createDBSession();

  // get existing membership to ensure it exists
  const membership = await getGroupMemberWithSession(session, groupId, memberId);
  if (membership.membershipType === config.MEMBERSHIP_TYPES.User) {
    const group = await helper.ensureExists(session, 'Group', groupId);
    // only admins or self registering users are allowed (if the group allows self register)
    if (
      currentUser !== 'M2M' &&
      !helper.hasAdminRole(currentUser) &&
      !(group.selfRegister && currentUser.userId === memberId)
    ) {
      throw new errors.ForbiddenError('You are not allowed to perform this action!');
    }
  } else {
    if (currentUser !== 'M2M' && !helper.hasAdminRole(currentUser)) {
      throw new errors.ForbiddenError('You are not allowed to perform this action!');
    }
  }

  // delete membership
  const query = 'MATCH (g:Group {id: {groupId}})-[r:GroupContains]->(o {id: {memberId}}) DELETE r';
  await session.run(query, { groupId, memberId });

  session.close();

  // post bus event
  await helper.postBusEvent(config.KAFKA_GROUP_MEMBER_DELETE_TOPIC, membership);
  return membership;
}

deleteGroupMember.schema = {
  currentUser: Joi.any(),
  groupId: Joi.id(), // defined in app-bootstrap
  memberId: Joi.id()
};

/**
 * Get all group members.
 * @param {String} groupId the group id
 * @returns {Array} all group members
 */
async function getAllGroupMembers(session, groupId) {
  const query = 'MATCH (g:Group {id: {groupId}})-[r:GroupContains]->(o) RETURN r, o';
  const res = await session.run(query, { groupId });
  return _.map(res.records, record => {
    const r = record.get(0).properties;
    const o = record.get(1).properties;
    return {
      memberId: o.id,
      membershipType: r.type
    };
  });
}

/**
 * Get distinct user members count of given group. Optionally may include sub groups.
 * @param {String} groupId the group id
 * @param {Object} query the query parameters
 * @returns {Object} the group members count data
 */
async function getGroupMembersCount(groupId, query) {
  const session = helper.createDBSession();
  await helper.ensureExists(session, 'Group', groupId);

  // get distinct users using breadth first search algorithm,
  // this is equivalent to recursive algorithm, but more efficient than latter,
  // see https://en.wikipedia.org/wiki/Breadth-first_search
  const groupIds = [groupId];
  const userIds = [];
  let index = 0;
  while (index < groupIds.length) {
    const gId = groupIds[index];
    index += 1;
    const members = await getAllGroupMembers(session, gId);
    _.forEach(members, member => {
      if (member.membershipType === config.MEMBERSHIP_TYPES.User) {
        if (!_.includes(userIds, member.memberId)) {
          userIds.push(member.memberId);
        }
      } else if (!_.includes(groupIds, member.memberId) && query.includeSubGroups) {
        // only handle group that was not handled yet, reduce duplicate processing
        groupIds.push(member.memberId);
      }
    });
  }

  session.close();
  return { count: userIds.length };
}

getGroupMembersCount.schema = {
  groupId: Joi.id(), // defined in app-bootstrap
  query: Joi.object().keys({
    includeSubGroups: Joi.boolean().default(false)
  })
};

module.exports = {
  getGroupMembers,
  addGroupMember,
  getGroupMember,
  deleteGroupMember,
  getGroupMembersCount
};

logger.buildService(module.exports);
