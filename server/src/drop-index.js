/**
 * Drop index.
 */
require('../app-bootstrap')
const logger = require('./common/logger')
const helper = require('./common/helper')

logger.info('Drop index.')

const createIndex = async () => {
  const session = helper.createDBSession()
  // clear data
  await session.run('DROP INDEX ON :Group (id)')
  await session.run('DROP INDEX ON :Group (name)')
  await session.run('DROP INDEX ON :User (id)')
  await session.run('DROP INDEX ON :SecurityGroup (id)')
  await session.run('DROP INDEX ON :SecurityGroup (name)')

  session.close()
}

createIndex().then(() => {
  logger.info('Done!')
  process.exit()
}).catch((e) => {
  logger.logFullError(e)
  process.exit(1)
})
