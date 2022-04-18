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
  const result = await service.getMemberGroups(req.params.memberId, req.query)
  helper.setResHeaders(req, res, result)
  res.send(result)
}

/**
* Group Validity Check for Member
* @param {*} req
* @param {*} res
*/
async function groupValidityCheck (req, res) {
  const result = await service.groupValidityCheck(req.params.memberId, req.params.groupId)
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
  groupValidityCheck
}
