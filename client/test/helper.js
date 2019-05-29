/**
 * Contains helper methods for the tests
 */

const childProcess = require('child_process')
const path = require('path')

const helper = {
  // this is needed to wait for the DB initialization
  testTimeout: 10000
}

/**
 * Initialize the DB
 */
helper.initDB = () => {
  const scriptPath = path.join(__dirname, '../../server/src')
  console.log('Initialize DB - Start ...')
  childProcess.execSync('npm run init-db', { cwd: scriptPath })
  console.log('Initialize DB - Done.')

  console.log('Fill DB - Start ...')
  childProcess.execSync('npm run test-data', { cwd: scriptPath })
  console.log('Fill DB - Done.')
}

module.exports = helper
