/**
 * Controller for group role endpoints
 */
const service = require('../services/GroupRoleService')
const helper = require('../common/helper')

/**
 * Get the groups and roles of the user
 * @param req the request
 * @param res the response
 */
async function getGroupRoles (req, res) {
  const criteria = req.query
  const result = await service.getGroupRole(req.params.userId, criteria)
  helper.setResHeaders(req, res, result)
  res.send(result.result)
}

/**
 * Add a new combination of role and group to the group roles for the user
 * @param req the request
 * @param res the response
 */
async function addGroupRole (req, res) {
  await service.addGroupRole(req.authUser.isMachine ? 'M2M' : req.authUser,
    req.params.userId,
    req.body.groupId,
    req.body.role)
  res.status(201).end()
}

/**
 * Deletes the role and the groupId combination for the user
 * @param req the request
 * @param res the response
 */
async function deleteGroupRole (req, res) {
  await service.deleteGroupRole(req.params.userId,
    req.body.groupId,
    req.body.role,
    req.authUser.isMachine || helper.hasAdminRole(req.authUser))
  res.sendStatus(204)
}

module.exports = {
  getGroupRoles,
  addGroupRole,
  deleteGroupRole
}
