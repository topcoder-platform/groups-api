/**
 * Initialize database tables. All data will be cleared.
 */

require('../app-bootstrap')
const logger = require('../src/common/logger')
const helper = require('../src/common/helper')

logger.info('Initialize database.')

const initDB = async () => {
  const session = helper.createDBSession()
  // clear data
  await session.run('MATCH (g)-[r]-(o) DELETE r')
  await session.run('MATCH (o) DELETE o')
  session.close()
}

initDB().then(() => {
  logger.info('Done!')
  process.exit()
}).catch((e) => {
  logger.logFullError(e)
  process.exit(1)
})