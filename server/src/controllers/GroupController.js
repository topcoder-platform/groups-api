/**
 * Controller for group endpoints
 */
const service = require('../services/GroupService')
const helper = require('../common/helper')

/**
 * Search groups
 * @param req the request
 * @param res the response
 */
async function searchGroups (req, res) {
  const result = await service.searchGroups(req.query)
  helper.setResHeaders(req, res, result)
  res.send({ result: result.result })
}

/**
 * Create group
 * @param req the request
 * @param res the response
 */
async function createGroup (req, res) {
  const result = await service.createGroup(req.user, req.body)
  res.send({ result })
}

/**
 * Update group
 * @param req the request
 * @param res the response
 */
async function updateGroup (req, res) {
  const result = await service.updateGroup(req.user, req.params.groupId, req.body)
  res.send({ result })
}

/**
 * Get group
 * @param req the request
 * @param res the response
 */
async function getGroup (req, res) {
  const result = await service.getGroup(req.user, req.params.groupId, req.query)
  res.send({ result })
}

/**
 * Delete group
 * @param req the request
 * @param res the response
 */
async function deleteGroup (req, res) {
  const result = await service.deleteGroup(req.params.groupId)
  res.send({ result })
}

module.exports = {
  searchGroups,
  createGroup,
  updateGroup,
  getGroup,
  deleteGroup
}
