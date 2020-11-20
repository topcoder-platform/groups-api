/**
 * Controller for group membership endpoints
 */
const service = require('../services/GroupMembershipService')
const helper = require('../common/helper')

/**
 * Get group members
 * @param req the request
 * @param res the response
 */
async function getGroupMembers (req, res) {
  const result = await service.getGroupMembers(
    req.authUser.isMachine ? 'M2M' : req.authUser,
    req.params.groupId,
    req.query
  )
  helper.setResHeaders(req, res, result)
  res.send(result)
}

/**
 * Add group member
 * @param req the request
 * @param res the response
 */
async function addGroupMember (req, res) {
  const result = await service.addGroupMember(
    req.authUser.isMachine ? 'M2M' : req.authUser,
    req.params.groupId,
    req.body
  )
  res.send(result)
}

/**
 * Get group member
 * @param req the request
 * @param res the response
 */
async function getGroupMember (req, res) {
  const result = await service.getGroupMember(
    req.authUser.isMachine ? 'M2M' : req.authUser,
    req.params.groupId,
    req.params.memberId
  )
  res.send(result)
}

/**
 * Delete group member
 * @param req the request
 * @param res the response
 */
async function deleteGroupMember (req, res) {
  const result = await service.deleteGroupMember(
    req.authUser.isMachine ? 'M2M' : req.authUser,
    req.params.groupId,
    req.params.memberId ? req.params.memberId : null,
    Object.keys(req.query).length !== 0 ? req.query : null
  )
  res.send(result)
}

/**
 * Get group members count
 * @param req the request
 * @param res the response
 */
async function getGroupMembersCount (req, res) {
  const result = await service.getGroupMembersCount(req.params.groupId, req.query)
  res.send(result)
}

/**
 * Get list of mapping of groups and members count
 * @param req the request
 * @param res the response
 */
async function listGroupsMemberCount (req, res) {
  const result = await service.listGroupsMemberCount(req.query)
  res.send(result)
}

/**
 * Get group members
 * @param req the request
 * @param res the response
 */
async function getMemberGroups (req, res) {
  const result = await service.getMemberGroups(req.params.memberId)
  helper.setResHeaders(req, res, result)
  res.send(result)
}

/**
 * Get group members
 * @param req the request
 * @param res the response
 */
async function searchMemberGroups (req, res) {
  console.log('sssss')
  console.log(JSON.stringify(req.query))
  // ! This seems suspect. The function used expects a memberId, while we are not providing it here at all
  // ! We are no longer passing the user type - removed it at the time of writing this comment, since the function
  // ! did not make use of it at all, but the other arguments seem weird...
  const result = await service.getMemberGroups(req.authUser.isMachine ? 'M2M' : req.authUser, {}, req.query)
  helper.setResHeaders(req, res, result)
  res.send(result)
}

module.exports = {
  getGroupMembers,
  addGroupMember,
  getGroupMember,
  deleteGroupMember,
  getGroupMembersCount,
  listGroupsMemberCount,
  getMemberGroups,
  searchMemberGroups
}
