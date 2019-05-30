/**
 * Controller for group endpoints
 */
const service = require("../services/GroupService");
const helper = require("../common/helper");
const logger = require("../common/logger");
const constants = require("../../app-constants");

/**
 * Search groups
 * @param req the request
 * @param res the response
 */
async function searchGroups(req, res) {
  let criteria = req.query;
  if (
    !req.authUser.isMachine &&
    !helper.hasAdminRole(req.authUser) &&
    criteria
  ) {
    criteria.memberId = req.authUser.userId;
    criteria.membershipType = constants.MembershipTypes.User;
  }
  const result = await service.searchGroups(criteria);
  helper.setResHeaders(req, res, result);
  res.send(result);
}

/**
 * Create group
 * @param req the request
 * @param res the response
 */
async function createGroup(req, res) {
  const result = await service.createGroup(
    req.authUser.isMachine ? "M2M" : req.authUser,
    req.body
  );
  res.send({ result });
}

/**
 * Update group
 * @param req the request
 * @param res the response
 */
async function updateGroup(req, res) {
  const result = await service.updateGroup(
    req.authUser.isMachine ? "M2M" : req.authUser,
    req.params.groupId,
    req.body
  );
  res.send(result);
}

/**
 * Get group
 * @param req the request
 * @param res the response
 */
async function getGroup(req, res) {
  logger.debug(`Get group details for req = ${req}`);
  const result = await service.getGroup(
    req.authUser.isMachine ? "M2M" : req.authUser,
    req.params.groupId,
    req.query,
    false
  );
  logger.debug(`Group Details = ${JSON.stringify(result)}`);
  res.send(result);
}

/**
 * Delete group
 * @param req the request
 * @param res the response
 */
async function deleteGroup(req, res) {
  const result = await service.deleteGroup(req.params.groupId);
  res.send({ result });
}

/**
 * Get group
 * @param req the request
 * @param res the response
 */
async function getGroupByOldId(req, res) {
  const result = await service.getGroup(
    req.authUser.isMachine ? "M2M" : req.authUser,
    req.params.oldId,
    req.query,
    true
  );
  res.send(result);
}

/**
 * Create security group
 * @param req the request
 * @param res the response
 */
async function createSecurityGroup(req, res) {
  const result = await service.createSecurityGroup(
    req.authUser.isMachine ? "M2M" : req.authUser,
    req.body
  );
  res.send(result);
}

module.exports = {
  searchGroups,
  createGroup,
  updateGroup,
  getGroup,
  deleteGroup,
  getGroupByOldId,
  createSecurityGroup
};
