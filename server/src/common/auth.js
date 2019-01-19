/**
 * Authentication and authorization middleware
 */
const constants = require('../../app-constants')

/**
 * Check if the request is authenticated/authorized.
 * @param {Array} roles the allowed roles, optional
 */
function auth (roles) {
  return function authMiddleware (req, res, next) {
    // at present, simply hard code a mock admin user as the current user
    req.user = { id: '10ba038e-48da-123b-96e8-8d3b99b6d18a', handle: 'admin', role: constants.UserRoles.Admin }
    next()
  }
}

module.exports = auth
