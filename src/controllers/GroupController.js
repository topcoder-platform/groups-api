/**
 * Controller for group endpoints
 */
const config = require('config')
const service = require('../services/GroupService')
const helper = require('../common/helper')
const logger = require('../common/logger')

/**
 * Search groups
 * @param req the request
 * @param res the response
 */
async function searchGroups(req, res) {
  const criteria = req.query || {}
  const isAdmin = req.authUser.isMachine || helper.hasAdminRole(req.authUser)
  if (!isAdmin) {
    criteria.memberId = req.authUser.userId
    criteria.membershipType = config.MEMBERSHIP_TYPES.User
  }
  const result = await service.searchGroups(criteria, isAdmin)
  helper.setResHeaders(req, res, result)
  res.send(result)
}

/**
 * Create group
 * @param req the request
 * @param res the response
 */
async function createGroup(req, res) {
  const result = await service.createGroup(req.authUser.isMachine ? 'M2M' : req.authUser, req.body)
  res.send(result)
}

/**
 * Update group
 * @param req the request
 * @param res the response
 */
async function updateGroup(req, res) {
  const result = await service.updateGroup(req.authUser.isMachine ? 'M2M' : req.authUser, req.params.groupId, req.body)
  res.send(result)
}

/**
 * Patch group
 * @param req the request
 * @param res the response
 */
async function patchGroup(req, res) {
  const result = await service.patchGroup(req.authUser.isMachine ? 'M2M' : req.authUser, req.params.groupId, req.body)
  res.send(result)
}

/**
 * Get group
 * @param req the request
 * @param res the response
 */
async function getGroup(req, res) {
  logger.debug(`Get group details for req = ${req}`)
  const result = await service.getGroup(req.authUser.isMachine ? 'M2M' : req.authUser, req.params.groupId, req.query)
  res.send(result)
}

/**
 * Delete group
 * @param req the request
 * @param res the response
 */
async function deleteGroup(req, res) {
  const result = await service.deleteGroup(
    req.params.groupId,
    req.authUser.isMachine || helper.hasAdminRole(req.authUser)
  )
  result.statusCode ? res.status(result.statusCode).send(result.data) : res.send(result)
}

/**
 * Get group
 * @param req the request
 * @param res the response
 */
async function getGroupByOldId(req, res) {
  const result = await service.getGroup(
    req.authUser.isMachine ? 'M2M' : req.authUser,
    req.params.oldId,
    req.query
  )
  res.send(result)
}

/**
 * flush cache
 * @param req the request
 * @param res the response
 */
async function flushCache(req, res) {
  const redisClient = await helper.acquireRedisClient()
  await redisClient.FLUSHALL()

  res.send({
    message: 'all cached data has been removed'
  })
}

module.exports = {
  searchGroups,
  createGroup,
  updateGroup,
  patchGroup,
  getGroup,
  deleteGroup,
  getGroupByOldId,
  flushCache
}
