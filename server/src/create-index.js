/**
 * Create index.
 */
require('../app-bootstrap')
const logger = require('./common/logger')
const helper = require('./common/helper')

logger.info('Create index.')

const createIndex = async () => {
  const session = helper.createDBSession()
  // clear data
  await session.run('CREATE INDEX ON :Group (id)')
  await session.run('CREATE INDEX ON :Group (name)')
  await session.run('CREATE INDEX ON :User (id)')

  session.close()
}

createIndex().then(() => {
  logger.info('Done!')
  process.exit()
}).catch((e) => {
  logger.logFullError(e)
  process.exit(1)
})
