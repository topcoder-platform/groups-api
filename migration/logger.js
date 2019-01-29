/**
 * This module contains the winston logger.
 */

const util = require('util')
const { createLogger, format, transports } = require('winston')

const logger = createLogger({
  level: 'debug',
  transports: [
    new transports.Console({
      format: format.combine(
        format.colorize(),
        format.simple()
      )
    })
  ]
})

/**
 * Log error details with signature
 * @param err the error
 * @param signature the signature
 */
logger.logFullError = (err, signature) => {
  if (!err) {
    return
  }
  logger.error(util.inspect(err))
  if (!err.logged) {
    logger.error(err.stack)
    err.logged = true
  }
}

module.exports = logger
