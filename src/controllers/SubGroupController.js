/**
 * Controller for sub group endpoints
 */
const service = require('../services/SubGroupService')

/**
 * Create group
 * @param req the request
 * @param res the response
 */
async function createSubGroup (req, res) {
  const result = await service.createSubGroup(req.authUser.isMachine ? 'M2M' : req.authUser,
    req.params.groupId,
    req.body
  )
  res.send(result)
}

/**
 * Delete sub group
 * @param req the request
 * @param res the response
 */
async function deleteSubGroup (req, res) {
  await service.deleteSubGroup(req.authUser.isMachine ? 'M2M' : req.authUser,
    req.params.groupId,
    req.params.subGroupId
  )
  res.sendStatus(204)
}

module.exports = {
  createSubGroup,
  deleteSubGroup
}
