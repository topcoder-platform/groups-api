/**
 * Insert test data to database.
 */
require('../app-bootstrap')
const logger = require('./common/logger')
const helper = require('./common/helper')
const constants = require('../app-constants')

logger.info('Insert test data into database.')

const insertData = async () => {
  const session = helper.createDBSession()
  // create users
  let query = 'CREATE (user:User {id: {id}, handle: {handle}, role: {role}}) RETURN user'
  await session.run(query, { id: '10ba038e-48da-123b-96e8-8d3b99b6d18a', handle: 'user1', role: constants.UserRoles.Admin })
  await session.run(query, { id: '10ba038e-48da-123b-96e8-8d3b99b6d18b', handle: 'user2', role: constants.UserRoles.User })
  await session.run(query, { id: '10ba038e-48da-123b-96e8-8d3b99b6d18c', handle: 'user3', role: constants.UserRoles.Admin })
  await session.run(query, { id: '10ba038e-48da-123b-96e8-8d3b99b6d18d', handle: 'user4', role: constants.UserRoles.User })

  // create groups
  query = 'CREATE (g:Group {id: {id}, name: {name}, description: "desc", privateGroup: false, selfRegister: true}) RETURN g'
  await session.run(query, { id: '11ab038e-48da-123b-96e8-8d3b99b6d181', name: 'test-group-1' })
  await session.run(query, { id: '11ab038e-48da-123b-96e8-8d3b99b6d182', name: 'test-group-2' })
  await session.run(query, { id: '11ab038e-48da-123b-96e8-8d3b99b6d183', name: 'test-group-3' })
  await session.run(query, { id: '11ab038e-48da-123b-96e8-8d3b99b6d184', name: 'test-group-4' })
  await session.run(query, { id: '11ab038e-48da-123b-96e8-8d3b99b6d185', name: 'test-group-5' })
  await session.run(query, { id: '11ab038e-48da-123b-96e8-8d3b99b6d186', name: 'test-group-6' })

  // create relationships
  query = 'MATCH (g:Group {id: {groupId}}) MATCH (u:User {id: {userId}}) CREATE (g)-[r:GroupContains {id: {membershipId}, type: {membershipType}}]->(u) RETURN r'
  // user1 belongs to test-group-3
  await session.run(query, {
    groupId: '11ab038e-48da-123b-96e8-8d3b99b6d183',
    userId: '10ba038e-48da-123b-96e8-8d3b99b6d18a',
    membershipId: '13ba112e-48da-123b-96e8-8d3b99b6d181',
    membershipType: constants.MembershipTypes.User
  })
  // user4 belongs to test-group-5
  await session.run(query, {
    groupId: '11ab038e-48da-123b-96e8-8d3b99b6d185',
    userId: '10ba038e-48da-123b-96e8-8d3b99b6d18d',
    membershipId: '13ba112e-48da-123b-96e8-8d3b99b6d182',
    membershipType: constants.MembershipTypes.User
  })
  query = 'MATCH (g:Group {id: {groupId}}) MATCH (c:Group {id: {childId}}) CREATE (g)-[r:GroupContains {id: {membershipId}, type: {membershipType}}]->(c) RETURN r'
  // test-group-1 contains test-group-2
  await session.run(query, {
    groupId: '11ab038e-48da-123b-96e8-8d3b99b6d181',
    childId: '11ab038e-48da-123b-96e8-8d3b99b6d182',
    membershipId: '13ba112e-48da-123b-96e8-8d3b99b6d183',
    membershipType: constants.MembershipTypes.Group
  })
  // test-group-2 contains test-group-3
  await session.run(query, {
    groupId: '11ab038e-48da-123b-96e8-8d3b99b6d182',
    childId: '11ab038e-48da-123b-96e8-8d3b99b6d183',
    membershipId: '13ba112e-48da-123b-96e8-8d3b99b6d184',
    membershipType: constants.MembershipTypes.Group
  })
  // test-group-3 contains test-group-4
  await session.run(query, {
    groupId: '11ab038e-48da-123b-96e8-8d3b99b6d183',
    childId: '11ab038e-48da-123b-96e8-8d3b99b6d184',
    membershipId: '13ba112e-48da-123b-96e8-8d3b99b6d185',
    membershipType: constants.MembershipTypes.Group
  })
  // test-group-4 contains test-group-5
  await session.run(query, {
    groupId: '11ab038e-48da-123b-96e8-8d3b99b6d184',
    childId: '11ab038e-48da-123b-96e8-8d3b99b6d185',
    membershipId: '13ba112e-48da-123b-96e8-8d3b99b6d186',
    membershipType: constants.MembershipTypes.Group
  })

  session.close()
}

insertData().then(() => {
  logger.info('Done!')
  process.exit()
}).catch((e) => {
  logger.logFullError(e)
  process.exit(1)
})
