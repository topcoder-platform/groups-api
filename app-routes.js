/**
 * Configure all routes for express app
 */
const _ = require('lodash')
const config = require('config')
const HttpStatus = require('http-status-codes')
const helper = require('./src/common/helper')
const errors = require('./src/common/errors')
const routes = require('./src/routes')
const authenticator = require('tc-core-library-js').middleware.jwtAuthenticator

/**
 * Configure all routes for express app
 * @param app the express app
 */
module.exports = (app) => {
  // Load all routes
  _.each(routes, (verbs, path) => {
    _.each(verbs, (def, verb) => {
      const controllerPath = `./src/controllers/${def.controller}`
      const method = require(controllerPath)[def.method] // eslint-disable-line
      if (!method) {
        throw new Error(`${def.method} is undefined`)
      }

      const actions = []
      actions.push((req, res, next) => {
        req.signature = `${def.controller}#${def.method}`
        next()
      })

      let access = []
      // add Authenticator check if route has auth
      if (def.auth) {
        // default access roles
        access = def.access || []
        actions.push((req, res, next) => {
          authenticator(_.pick(config, ['AUTH_SECRET', 'VALID_ISSUERS']))(req, res, next)
        })
        actions.push((req, res, next) => {
          if (!req.authUser) {
            return next(new errors.UnauthorizedError('Action is not allowed for invalid token'))
          }
          req.authUser.userId = String(req.authUser.userId)
          req.auth = req.authUser
          req.auth.sub = req.auth.userId
          if (req.authUser.roles) {
            // all access are allowed
            if (_.isEmpty(access)) {
              next()
            } else if (!helper.checkIfExists(access, req.authUser.roles)) {
              res.forbidden = true
              next(new errors.ForbiddenError('You are not allowed to perform this action'))
            } else {
              next()
            }
          } else if (req.authUser.scopes) {
            if (_.isNil(def.scopes) || _.isEmpty(def.scopes)) {
              next()
            } else if (!helper.checkIfExists(def.scopes, req.authUser.scopes)) {
              next(new errors.ForbiddenError('You are not allowed to perform this action!'))
            } else {
              next()
            }
          } else if ((_.isArray(def.access) && def.access.length > 0) || (_.isArray(def.scopes) && def.scopes.length > 0)) {
            next(new errors.UnauthorizedError('You are not authorized to perform this action'))
          } else {
            next()
          }
        })
      }

      actions.push(method)
      app[verb](`${config.API_PREFIX}${path}`, helper.autoWrapExpress(actions))
    })
  })

  // Check if the route is not found or HTTP method is not supported
  app.use('*', (req, res) => {
    const route = routes[req.baseUrl]
    if (route) {
      res.status(HttpStatus.METHOD_NOT_ALLOWED).json({ message: 'The requested HTTP method is not supported.' })
    } else {
      res.status(HttpStatus.NOT_FOUND).json({ message: 'The requested resource cannot be found.' })
    }
  })
}
