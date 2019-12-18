const sinon = require('sinon')
require('../../src/common/helper')
const stubbedBus = sinon.stub(require.cache[require.resolve('../../src/common/helper')].exports, 'postBusEvent').callsFake(() => {})

require('morgan')
sinon.stub(require.cache[require.resolve('morgan')], 'exports').callsFake((type, options) => {
  return function (req, res, next) {
    if (options.skip instanceof Function) {
      options.skip(req, res)
    }
    next()
  }
})

const _ = require('lodash')
const jwt = require('jsonwebtoken')
require('tc-core-library-js')
sinon.stub(require.cache[require.resolve('tc-core-library-js')].exports.middleware, 'jwtAuthenticator').callsFake(() => {
  return function (req, res, next) {
    // check header
    var token
    if (req.headers.authorization && req.headers.authorization.split(' ')[0] === 'Bearer') {
      token = req.headers.authorization.split(' ')[1]
    }
    // decode token
    if (token) {
      const decoded = jwt.decode(token, { complete: true }).payload
      req.authUser = decoded
      req.authUser.userId = _.parseInt(_.find(req.authUser, (value, key) => {
        return (key.indexOf('userId') !== -1)
      }))
      req.authUser.handle = _.find(req.authUser, (value, key) => {
        return (key.indexOf('handle') !== -1)
      })
      req.authUser.roles = _.find(req.authUser, (value, key) => {
        return (key.indexOf('roles') !== -1)
      })

      const scopes = _.find(req.authUser, (value, key) => {
        return (key.indexOf('scope') !== -1)
      })
      if (scopes) {
        req.authUser.scopes = scopes.split(' ')

        const grantType = _.find(decoded, (value, key) => {
          return (key.indexOf('gty') !== -1)
        })
        if (grantType === 'client-credentials' &&
            !req.authUser.userId &&
            !req.authUser.roles) {
          req.authUser.isMachine = true
        }
      }

      next()
    } else {
      // if there is no token
      // return an error
      res.status(403)
      res.send()
    }
  }
})

const logger = require('../../src/common/logger')
sinon.stub(logger, 'info')
sinon.stub(logger, 'debug')
sinon.stub(logger, 'warn')
sinon.stub(logger, 'error')

const { createDBSession, ensureExists } = require('../../src/common/helper')

function createGroup (group) {
  const session = createDBSession()
  return session.run(
    'CREATE (group:Group {id: {id}, name: {name}, oldId: {oldId}, description: {description}, privateGroup: {privateGroup}, selfRegister: {selfRegister}, createdAt: {createdAt}, createdBy: {createdBy}, domain: {domain}, ssoId: {ssoId}, status: {status}}) RETURN group',
    group
  )
}

function createUser (user) {
  const session = createDBSession()
  return session.run('CREATE (user:User {id: {user}}) RETURN user', { user })
}

function createGroups (groups) {
  return Promise.all(groups.map(group => createGroup(group)))
}

function createUsers (users) {
  return Promise.all(users.map(user => createUser(user)))
}

function clearDB () {
  const session = createDBSession()
  return session.run('MATCH (n) DETACH DELETE n;')
}

function addMemberToGroup (data, targetObjectType) {
  const session = createDBSession()
  const query = `MATCH (g:Group {id: {groupId}}) MATCH (o:${targetObjectType} {id: {memberId}}) CREATE (g)-[r:GroupContains {id: {membershipId}, type: {membershipType}, createdAt: {createdAt}, createdBy: {createdBy}}]->(o) RETURN r`
  return session.run(query, data)
}

function addUserToGroup (data) {
  return addMemberToGroup(data, 'User')
}

function addGroupToGroup (data) {
  return addMemberToGroup(data, 'Group')
}

function addMembersToGroup (memberships, targetObjectType) {
  return Promise.all(memberships.map(membership => addMemberToGroup(membership, targetObjectType)))
}

function getGroup (id) {
  const session = createDBSession()
  return ensureExists(session, 'Group', id)
}

async function getAllGroups () {
  const session = createDBSession()
  const allGroups = await session.run('MATCH (a:Group) Return a')
  return allGroups.records
}

async function isGroupMember (memberId, groupId, type) {
  const session = createDBSession()
  const query = `MATCH (g:Group {id: {groupId}})-[r:GroupContains]->(o:${type} {id: {memberId}}) RETURN o`
  const res = await session.run(query, { groupId, memberId })
  return res.records.length > 0
}

module.exports = {
  stubbedBus,
  createGroups,
  createUsers,
  addUserToGroup,
  addGroupToGroup,
  addMemberToGroup,
  addMembersToGroup,
  getGroup,
  getAllGroups,
  isGroupMember,
  clearDB
}
