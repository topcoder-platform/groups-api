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
  let query = 'CREATE (user:User {id: {id}, handle: {handle}}) RETURN user'
  await session.run(query, { id: '12345', handle: 'user1' })
  await session.run(query, { id: '12346', handle: 'user2' })
  await session.run(query, { id: '12347', handle: 'user3' })
  await session.run(query, { id: '12348', handle: 'user4' })

  // create groups
  query = 'CREATE (g:Group {id: {id}, name: {name}, description: "desc", privateGroup: {privateGroup}, selfRegister: {selfRegister}}) RETURN g'
  await session.run(query, { id: '11ab038e-48da-123b-96e8-8d3b99b6d181', name: 'test-group-1', privateGroup: false, selfRegister: true })
  await session.run(query, { id: '11ab038e-48da-123b-96e8-8d3b99b6d182', name: 'test-group-2', privateGroup: false, selfRegister: true })
  await session.run(query, { id: '11ab038e-48da-123b-96e8-8d3b99b6d183', name: 'test-group-3', privateGroup: false, selfRegister: true })
  await session.run(query, { id: '11ab038e-48da-123b-96e8-8d3b99b6d184', name: 'test-group-4', privateGroup: false, selfRegister: true })
  await session.run(query, { id: '11ab038e-48da-123b-96e8-8d3b99b6d185', name: 'test-group-5', privateGroup: true, selfRegister: true })
  await session.run(query, { id: '11ab038e-48da-123b-96e8-8d3b99b6d186', name: 'test-group-6', privateGroup: false, selfRegister: true })
  await session.run(query, { id: '11ab038e-48da-123b-96e8-8d3b99b6d187', name: 'test-group-7', privateGroup: true, selfRegister: false })

  // create security groups
  query = 'CREATE (g:SecurityGroup {id: {id}, name: {name}}) RETURN g'
  await session.run(query, { id: '11ab038e-48da-123b-96e8-8d3b99b6d181', name: 'test-group-1' })
  await session.run(query, { id: '11ab038e-48da-123b-96e8-8d3b99b6d182', name: 'test-group-2' })

  // create groups with old id
  query = 'CREATE (g:Group {id: {id}, name: {name}, description: "desc", privateGroup: {privateGroup}, selfRegister: {selfRegister}, oldId: {oldId}}) RETURN g'
  await session.run(query, { id: '11ab038e-48da-123b-96e8-8d3b99b6d188', name: 'test-group-8', privateGroup: true, selfRegister: false, oldId: '12345' })
  await session.run(query, { id: '11ab038e-48da-123b-96e8-8d3b99b6d189', name: 'test-group-9', privateGroup: false, selfRegister: false, oldId: '12346' })

  // create relationships
  query = 'MATCH (g:Group {id: {groupId}}) MATCH (u:User {id: {userId}}) CREATE (g)-[r:GroupContains {id: {membershipId}, type: {membershipType}}]->(u) RETURN r'
  // user1 belongs to test-group-3
  await session.run(query, {
    groupId: '11ab038e-48da-123b-96e8-8d3b99b6d183',
    userId: '12345',
    membershipId: '13ba112e-48da-123b-96e8-8d3b99b6d181',
    membershipType: constants.MembershipTypes.User
  })
  // user4 belongs to test-group-5
  await session.run(query, {
    groupId: '11ab038e-48da-123b-96e8-8d3b99b6d185',
    userId: '12348',
    membershipId: '13ba112e-48da-123b-96e8-8d3b99b6d182',
    membershipType: constants.MembershipTypes.User
  })
  // user4 belongs to test-group-7
  await session.run(query, {
    groupId: '11ab038e-48da-123b-96e8-8d3b99b6d187',
    userId: '12348',
    membershipId: '13ba112e-48da-123b-96e8-8d3b99b6d183',
    membershipType: constants.MembershipTypes.User
  })
  // user4 belongs to test-group-8
  await session.run(query, {
    groupId: '11ab038e-48da-123b-96e8-8d3b99b6d188',
    userId: '12348',
    membershipId: '13ba112e-48da-123b-96e8-8d3b99b6d184',
    membershipType: constants.MembershipTypes.User
  })
  query = 'MATCH (g:Group {id: {groupId}}) MATCH (c:Group {id: {childId}}) CREATE (g)-[r:GroupContains {id: {membershipId}, type: {membershipType}}]->(c) RETURN r'
  // test-group-1 contains test-group-2
  await session.run(query, {
    groupId: '11ab038e-48da-123b-96e8-8d3b99b6d181',
    childId: '11ab038e-48da-123b-96e8-8d3b99b6d182',
    membershipId: '13ba112e-48da-123b-96e8-8d3b99b6d185',
    membershipType: constants.MembershipTypes.Group
  })
  // test-group-2 contains test-group-3
  await session.run(query, {
    groupId: '11ab038e-48da-123b-96e8-8d3b99b6d182',
    childId: '11ab038e-48da-123b-96e8-8d3b99b6d183',
    membershipId: '13ba112e-48da-123b-96e8-8d3b99b6d186',
    membershipType: constants.MembershipTypes.Group
  })
  // test-group-3 contains test-group-4
  await session.run(query, {
    groupId: '11ab038e-48da-123b-96e8-8d3b99b6d183',
    childId: '11ab038e-48da-123b-96e8-8d3b99b6d184',
    membershipId: '13ba112e-48da-123b-96e8-8d3b99b6d187',
    membershipType: constants.MembershipTypes.Group
  })
  // test-group-4 contains test-group-5
  await session.run(query, {
    groupId: '11ab038e-48da-123b-96e8-8d3b99b6d184',
    childId: '11ab038e-48da-123b-96e8-8d3b99b6d185',
    membershipId: '13ba112e-48da-123b-96e8-8d3b99b6d188',
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
