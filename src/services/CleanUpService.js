/**
 * This service provides operations to clean up the environment for running automated tests.
 */

 const _ = require('lodash')
 const config = require('config')
 const helper = require('../common/helper')
 const logger = require('../common/logger')
 

 

 
 /**
  * Clear the postman test data. The main function of this class.
  * @returns {Promise<void>}
  */
 const cleanUpTestData = async () => {
   logger.info('clear the test data from postman test!')
   const session = await helper.createDBSession()
   try {

    // delete groups 
    await session.run(`MATCH (g:Group)-[r:GroupContains]->(o) WHERE g.name =~ '(?i)${config.AUTOMATED_TESTING_NAME_PREFIX}.*' DELETE g,r,o`)

    // delete empty test groups
    await session.run(`MATCH (g:Group) WHERE g.name =~ '(?i)${config.AUTOMATED_TESTING_NAME_PREFIX}.*' DELETE g`)

    // delete users with no relations
    await session.run(`MATCH (u:User) WHERE NOT (:Group)-[:GroupContains]->(u) DELETE u`)

    logger.info('clear the test data from postman test completed!')
   }
   catch(err) {
    logger.debug('could not complete cleanup process')
    logger.error(err)
   }
 }
 
 module.exports = {
   cleanUpTestData
 }

 logger.buildService(module.exports)