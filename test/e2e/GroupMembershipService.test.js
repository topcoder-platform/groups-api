/* eslint-env mocha */
/* eslint-disable no-unused-expressions */

const config = require('config')
const _ = require('lodash')
const chai = require('chai')
const chaiHttp = require('chai-http')
const should = chai.should() // eslint-disable-line
const sinonChai = require('sinon-chai')
const chaiAsPromised = require('chai-as-promised')

const groups = require('../common/data/groups.json')
const members = require('../common/data/members.json')
const tokens = require('../common/data/tokens.json')
const helper = require('../common/helper')

const app = require('../../app')

chai.use(chaiHttp)
chai.use(sinonChai)
chai.use(chaiAsPromised)

const createAttrs = ['createdBy', 'createdAt', 'id']
const validateMembershipResponse = (res, membership, options = {}) => {
  const { isCreate, isM2M } = options
  let keys = Object.keys(membership)

  if (isCreate) {
    keys = _.concat(keys, createAttrs)
    res.body.name.should.be.eql(membership.name)
  } else {
    keys = _.difference(keys, ['membershipId'])
    keys = _.concat(keys, ['id', 'groupName'])
  }

  if (isM2M) {
    keys = _.without(keys, 'createdBy')
  }

  res.body.should.have.all.keys(keys)
  res.body.groupId.should.be.eql(membership.groupId)
  res.body.memberId.should.be.eql(membership.memberId)
  res.body.membershipType.should.be.eql(membership.membershipType)
}

describe('Group Membership Service Tests', () => {
  beforeEach(async function () {
    await helper.createGroups(Object.values(groups.PRE_CREATED))
    const users = _.uniq(members.PRE_CREATED.User.map(membership => membership.memberId))
    await helper.createUsers(users)
    await Promise.all(
      Object.entries(members.PRE_CREATED)
        .map(pair => helper.addMembersToGroup(pair[1], pair[0]))
    )
  })
  afterEach(async function () {
    await helper.clearDB()
  })

  describe('POST /groups/:groupId/members', () => {
    it('adding member to non-existing group should return 404', async () => {
      const memberId = members.VALID
      const membershipType = config.MEMBERSHIP_TYPES.User

      const res = await chai.request(app)
        .post(`/groups/${groups.NON_EXISTENT_ID}/members`)
        .set('Authorization', `Bearer ${tokens.User.Admin}`)
        .send({ memberId, membershipType })

      res.should.have.status(404)
    })
    it('adding existing member again to the same group should return 409', async () => {
      const groupId = members.PRE_CREATED.User[0].groupId
      const memberId = members.PRE_CREATED.User[0].memberId
      const membershipType = config.MEMBERSHIP_TYPES.User

      const res = await chai.request(app)
        .post(`/groups/${groupId}/members`)
        .set('Authorization', `Bearer ${tokens.User.Admin}`)
        .send({ memberId, membershipType })

      res.should.have.status(409)
    })
    it('adding one existing group to another existing group with admin user token should be successful', async () => {
      const group = groups.PRE_CREATED.PUBLIC
      const memberId = groups.PRE_CREATED.SELF_REGISTER.id
      const membershipType = config.MEMBERSHIP_TYPES.Group

      const res = await chai.request(app)
        .post(`/groups/${group.id}/members`)
        .set('Authorization', `Bearer ${tokens.User.Admin}`)
        .send({ memberId, membershipType })

      res.should.have.status(200)
      validateMembershipResponse(res, {
        name: group.name,
        groupId: group.id,
        oldId: group.oldId,
        memberId,
        memberOldId: groups.PRE_CREATED.SELF_REGISTER.oldId,
        membershipType
      }, { isCreate: true })

      helper.isGroupMember(memberId, group.id, 'Group').should.eventually.be.true
    })
    it('adding non-existing group to existing group should return 404', async () => {
      const group = groups.PRE_CREATED.PUBLIC
      const memberId = groups.NON_EXISTENT_ID
      const membershipType = config.MEMBERSHIP_TYPES.Group

      const res = await chai.request(app)
        .post(`/groups/${group.id}/members`)
        .set('Authorization', `Bearer ${tokens.User.Admin}`)
        .send({ memberId, membershipType })

      res.should.have.status(404)
    })
    it('adding existing group to self should return 400', async () => {
      const group = groups.PRE_CREATED.PUBLIC
      const memberId = groups.PRE_CREATED.PUBLIC.id
      const membershipType = config.MEMBERSHIP_TYPES.Group

      const res = await chai.request(app)
        .post(`/groups/${group.id}/members`)
        .set('Authorization', `Bearer ${tokens.User.Admin}`)
        .send({ memberId, membershipType })

      res.should.have.status(400)
    })
    it('adding public group to a private group should return 409', async () => {
      const group = groups.PRE_CREATED.PRIVATE
      const memberId = groups.PRE_CREATED.PUBLIC.id
      const membershipType = config.MEMBERSHIP_TYPES.Group

      const res = await chai.request(app)
        .post(`/groups/${group.id}/members`)
        .set('Authorization', `Bearer ${tokens.User.Admin}`)
        .send({ memberId, membershipType })

      res.should.have.status(409)
    })
    it('adding parent group to a child group should return 409', async () => {
      const group = groups.PRE_CREATED.PUBLIC_CHILD
      const memberId = groups.PRE_CREATED.PUBLIC.id
      const membershipType = config.MEMBERSHIP_TYPES.Group

      const res = await chai.request(app)
        .post(`/groups/${group.id}/members`)
        .set('Authorization', `Bearer ${tokens.User.Admin}`)
        .send({ memberId, membershipType })

      res.should.have.status(409)
    })
    it('non-admin user should be able to add self as member of self-registerable group', async () => {
      const group = groups.PRE_CREATED.SELF_REGISTER2
      const memberId = members.USER_TOKEN_MEMBER
      const membershipType = config.MEMBERSHIP_TYPES.User

      const res = await chai.request(app)
        .post(`/groups/${group.id}/members`)
        .set('Authorization', `Bearer ${tokens.User.User}`)
        .send({ memberId, membershipType })

      res.should.have.status(200)
      validateMembershipResponse(res, {
        name: group.name,
        groupId: group.id,
        oldId: group.oldId,
        memberId,
        membershipType
      }, { isCreate: true })
      helper.isGroupMember(memberId, group.id, 'User').should.eventually.be.true
    })
    it('non-admin user should not be able to add self as member of non-self-registerable group', async () => {
      const group = groups.PRE_CREATED.PUBLIC_CHILD
      const memberId = members.USER_TOKEN_MEMBER
      const membershipType = config.MEMBERSHIP_TYPES.User

      const res = await chai.request(app)
        .post(`/groups/${group.id}/members`)
        .set('Authorization', `Bearer ${tokens.User.User}`)
        .send({ memberId, membershipType })

      res.should.have.status(403)
      helper.isGroupMember(memberId, group.id, 'User').should.eventually.be.false
    })
    it('non-admin user should not be able to add another user as member of self-registerable group', async () => {
      const group = groups.PRE_CREATED.SELF_REGISTER
      const memberId = members.VALID
      const membershipType = config.MEMBERSHIP_TYPES.User

      const res = await chai.request(app)
        .post(`/groups/${group.id}/members`)
        .set('Authorization', `Bearer ${tokens.User.User}`)
        .send({ memberId, membershipType })

      res.should.have.status(403)
      helper.isGroupMember(memberId, group.id, 'User').should.eventually.be.false
    })
    it('non-admin user should not be able to add one group as member of another group', async () => {
      const group = groups.PRE_CREATED.PUBLIC
      const memberId = groups.PRE_CREATED.SELF_REGISTER.id
      const membershipType = config.MEMBERSHIP_TYPES.Group

      const res = await chai.request(app)
        .post(`/groups/${group.id}/members`)
        .set('Authorization', `Bearer ${tokens.User.User}`)
        .send({ memberId, membershipType })

      res.should.have.status(403)
      helper.isGroupMember(memberId, group.id, 'Group').should.eventually.be.false
    })
    it('adding user member to existing group with admin user token should be successful', async () => {
      const group = groups.PRE_CREATED.PUBLIC
      const memberId = members.VALID
      const membershipType = config.MEMBERSHIP_TYPES.User

      const res = await chai.request(app)
        .post(`/groups/${group.id}/members`)
        .set('Authorization', `Bearer ${tokens.User.Admin}`)
        .send({ memberId, membershipType })

      res.should.have.status(200)
      validateMembershipResponse(res, {
        name: group.name,
        groupId: group.id,
        oldId: group.oldId,
        memberId,
        membershipType
      }, { isCreate: true })
      helper.isGroupMember(memberId, group.id, 'User').should.eventually.be.true
    })
    it('adding member to group with M2M read token should return 403', async () => {
      const group = groups.PRE_CREATED.PUBLIC
      const memberId = members.VALID
      const membershipType = config.MEMBERSHIP_TYPES.User

      const res = await chai.request(app)
        .post(`/groups/${group.id}/members`)
        .set('Authorization', `Bearer ${tokens.M2M.R}`)
        .send({ memberId, membershipType })

      res.should.have.status(403)
      helper.isGroupMember(memberId, group.id, 'User').should.eventually.be.false
    })
    it('adding member to group with M2M write token should be successful', async () => {
      const group = groups.PRE_CREATED.PUBLIC
      const memberId = members.VALID
      const membershipType = config.MEMBERSHIP_TYPES.User

      const res = await chai.request(app)
        .post(`/groups/${group.id}/members`)
        .set('Authorization', `Bearer ${tokens.M2M.W}`)
        .send({ memberId, membershipType })

      res.should.have.status(200)
      validateMembershipResponse(res, {
        name: group.name,
        groupId: group.id,
        oldId: group.oldId,
        memberId,
        membershipType
      }, { isCreate: true, isM2M: true })
      helper.isGroupMember(memberId, group.id, 'User').should.eventually.be.true
    })
    it('adding member to group with M2M all:groups token should be successful', async () => {
      const group = groups.PRE_CREATED.PUBLIC
      const memberId = members.VALID
      const membershipType = config.MEMBERSHIP_TYPES.User

      const res = await chai.request(app)
        .post(`/groups/${group.id}/members`)
        .set('Authorization', `Bearer ${tokens.M2M.ALL}`)
        .send({ memberId, membershipType })

      res.should.have.status(200)
      validateMembershipResponse(res, {
        name: group.name,
        groupId: group.id,
        oldId: group.oldId,
        memberId,
        membershipType
      }, { isCreate: true, isM2M: true })
      helper.isGroupMember(memberId, group.id, 'User').should.eventually.be.true
    })
  })

  describe('GET /groups/:groupId/members/:memberId', () => {
    it('fetching member from non-existent group should return 404', async () => {
      const groupId = groups.NON_EXISTENT_ID
      const memberId = members.PRE_CREATED.User[0].memberId

      const res = await chai.request(app)
        .get(`/groups/${groupId}/members/${memberId}`)
        .set('Authorization', `Bearer ${tokens.User.Admin}`)

      res.should.have.status(404)
    })
    it('fetching non-existent member from group should return 404', async () => {
      const groupId = members.PRE_CREATED.User[0].groupId
      const memberId = members.NON_EXISTENT_ID

      const res = await chai.request(app)
        .get(`/groups/${groupId}/members/${memberId}`)
        .set('Authorization', `Bearer ${tokens.User.Admin}`)

      res.should.have.status(404)
    })
    it('fetching existing member from group which it is not a part of should return 404', async () => {
      const groupId = members.PRE_CREATED.User[0].groupId
      const memberId = members.PRE_CREATED.User[1].memberId

      const res = await chai.request(app)
        .get(`/groups/${groupId}/members/${memberId}`)
        .set('Authorization', `Bearer ${tokens.User.Admin}`)

      res.should.have.status(404)
    })
    it('fetching existing member from existing group with admin token should be successful', async () => {
      const { groupId, memberId } = members.PRE_CREATED.User[0]
      const res = await chai.request(app)
        .get(`/groups/${groupId}/members/${memberId}`)
        .set('Authorization', `Bearer ${tokens.User.Admin}`)

      res.should.have.status(200)
      validateMembershipResponse(res, members.PRE_CREATED.User[0])
    })
    it('fetching existing member from private group with admin token should be successful', async () => {
      const { groupId, memberId } = members.PRE_CREATED.User[1]
      const res = await chai.request(app)
        .get(`/groups/${groupId}/members/${memberId}`)
        .set('Authorization', `Bearer ${tokens.User.Admin}`)

      res.should.have.status(200)
      validateMembershipResponse(res, members.PRE_CREATED.User[1])
    })
    it('fetching existing member from existing group with M2M token should be successful', async () => {
      const { groupId, memberId } = members.PRE_CREATED.User[0]
      const res = await chai.request(app)
        .get(`/groups/${groupId}/members/${memberId}`)
        .set('Authorization', `Bearer ${tokens.M2M.R}`)

      res.should.have.status(200)
      validateMembershipResponse(res, members.PRE_CREATED.User[0])
    })
    it('fetching existing member from private group with M2M token should be successful', async () => {
      const { groupId, memberId } = members.PRE_CREATED.User[1]
      const res = await chai.request(app)
        .get(`/groups/${groupId}/members/${memberId}`)
        .set('Authorization', `Bearer ${tokens.M2M.R}`)

      res.should.have.status(200)
      validateMembershipResponse(res, members.PRE_CREATED.User[1])
    })
    it('fetching member from group with non-admin token that is not part of the group should return 403', async () => {
      const { groupId, memberId } = members.PRE_CREATED.User[1]
      const res = await chai.request(app)
        .get(`/groups/${groupId}/members/${memberId}`)
        .set('Authorization', `Bearer ${tokens.User.User}`)

      res.should.have.status(403)
    })
    it('fetching member from group with non-admin token that is part of the group should be successful', async () => {
      const { groupId, memberId } = members.PRE_CREATED.Group[0]
      const res = await chai.request(app)
        .get(`/groups/${groupId}/members/${memberId}`)
        .set('Authorization', `Bearer ${tokens.User.User}`)

      res.should.have.status(200)
      validateMembershipResponse(res, members.PRE_CREATED.Group[0])
    })
  })

  describe('DELETE /groups/:groupId/members/:memberId', () => {
    describe('deleting a member from a group', () => {
      it('that does not exist should return 404', async () => {
        const { memberId } = members.PRE_CREATED.User[1]
        const groupId = groups.NON_EXISTENT_ID
        const res = await chai.request(app)
          .delete(`/groups/${groupId}/members/${memberId}`)
          .set('Authorization', `Bearer ${tokens.User.Admin}`)

        res.should.have.status(404)
      })
    })
    describe('deleting a user member from a group', () => {
      it('with non-admin user token of another user should return 403', async () => {
        const { groupId, memberId } = members.PRE_CREATED.User[1]
        const res = await chai.request(app)
          .delete(`/groups/${groupId}/members/${memberId}`)
          .set('Authorization', `Bearer ${tokens.User.User}`)

        res.should.have.status(403)
        helper.isGroupMember(memberId, groupId, 'User').should.eventually.be.true
      })
      it('with non-admin user token of the same user should return 403 if the group is not self-registerable', async () => {
        const { groupId, memberId } = members.PRE_CREATED.User[0]
        const res = await chai.request(app)
          .delete(`/groups/${groupId}/members/${memberId}`)
          .set('Authorization', `Bearer ${tokens.User.User}`)

        res.should.have.status(403)
        helper.isGroupMember(memberId, groupId, 'User').should.eventually.be.true
      })
      it('with non-admin user token of the same user should be successful if the group is self-registerable', async () => {
        const { groupId, memberId } = members.PRE_CREATED.User[3]
        const res = await chai.request(app)
          .delete(`/groups/${groupId}/members/${memberId}`)
          .set('Authorization', `Bearer ${tokens.User.User}`)

        res.should.have.status(200)
        helper.isGroupMember(memberId, groupId, 'User').should.eventually.be.false
      })
      it('with admin token should be successful', async () => {
        const { groupId, memberId } = members.PRE_CREATED.User[0]
        const res = await chai.request(app)
          .delete(`/groups/${groupId}/members/${memberId}`)
          .set('Authorization', `Bearer ${tokens.User.Admin}`)

        res.should.have.status(200)
        helper.isGroupMember(memberId, groupId, 'User').should.eventually.be.false
      })
      it('with M2M write token should be successful', async () => {
        const { groupId, memberId } = members.PRE_CREATED.User[0]
        const res = await chai.request(app)
          .delete(`/groups/${groupId}/members/${memberId}`)
          .set('Authorization', `Bearer ${tokens.M2M.W}`)

        res.should.have.status(200)
        helper.isGroupMember(memberId, groupId, 'User').should.eventually.be.false
      })
      it('with M2M all:groups token should be successful', async () => {
        const { groupId, memberId } = members.PRE_CREATED.User[0]
        const res = await chai.request(app)
          .delete(`/groups/${groupId}/members/${memberId}`)
          .set('Authorization', `Bearer ${tokens.M2M.ALL}`)

        res.should.have.status(200)
        helper.isGroupMember(memberId, groupId, 'User').should.eventually.be.false
      })
      it('with M2M read token should return 403', async () => {
        const { groupId, memberId } = members.PRE_CREATED.User[0]
        const res = await chai.request(app)
          .delete(`/groups/${groupId}/members/${memberId}`)
          .set('Authorization', `Bearer ${tokens.M2M.R}`)

        res.should.have.status(403)
        helper.isGroupMember(memberId, groupId, 'User').should.eventually.be.true
      })
    })
    describe('deleting a child group from a group', () => {
      it('with non-admin user token should return 403', async () => {
        const { groupId, memberId } = members.PRE_CREATED.Group[0]
        const res = await chai.request(app)
          .delete(`/groups/${groupId}/members/${memberId}`)
          .set('Authorization', `Bearer ${tokens.User.User}`)

        res.should.have.status(403)
        helper.isGroupMember(memberId, groupId, 'Group').should.eventually.be.true
      })
      it('with admin token should be successful', async () => {
        const { groupId, memberId } = members.PRE_CREATED.Group[0]
        const res = await chai.request(app)
          .delete(`/groups/${groupId}/members/${memberId}`)
          .set('Authorization', `Bearer ${tokens.User.Admin}`)

        res.should.have.status(200)
        helper.isGroupMember(memberId, groupId, 'Group').should.eventually.be.false
      })
      it('with M2M write token should be successful', async () => {
        const { groupId, memberId } = members.PRE_CREATED.Group[0]
        const res = await chai.request(app)
          .delete(`/groups/${groupId}/members/${memberId}`)
          .set('Authorization', `Bearer ${tokens.M2M.W}`)

        res.should.have.status(200)
        helper.isGroupMember(memberId, groupId, 'Group').should.eventually.be.false
      })
      it('with M2M all:groups token should be successful', async () => {
        const { groupId, memberId } = members.PRE_CREATED.Group[0]
        const res = await chai.request(app)
          .delete(`/groups/${groupId}/members/${memberId}`)
          .set('Authorization', `Bearer ${tokens.M2M.ALL}`)

        res.should.have.status(200)
        helper.isGroupMember(memberId, groupId, 'Group').should.eventually.be.false
      })
      it('with M2M read token should return 403', async () => {
        const { groupId, memberId } = members.PRE_CREATED.Group[0]
        const res = await chai.request(app)
          .delete(`/groups/${groupId}/members/${memberId}`)
          .set('Authorization', `Bearer ${tokens.M2M.R}`)

        res.should.have.status(403)
        helper.isGroupMember(memberId, groupId, 'Group').should.eventually.be.true
      })
    })
  })

  describe('GET /groups/:groupId/membersCount', () => {
    it('fetching member count for public group with admin token should be successful', async () => {
      const { id: groupId } = groups.PRE_CREATED.PUBLIC
      const res = await chai.request(app)
        .get(`/groups/${groupId}/membersCount`)
        .set('Authorization', `Bearer ${tokens.User.Admin}`)

      res.should.have.status(200)
      res.body.count.should.be.eql(1)
    })
    it('fetching member count for private group with admin token should be successful', async () => {
      const { id: groupId } = groups.PRE_CREATED.PRIVATE
      const res = await chai.request(app)
        .get(`/groups/${groupId}/membersCount`)
        .set('Authorization', `Bearer ${tokens.User.Admin}`)

      res.should.have.status(200)
      res.body.count.should.be.eql(1)
    })
    it('fetching member count for public group with M2M token should be successful', async () => {
      const { id: groupId } = groups.PRE_CREATED.PUBLIC
      const res = await chai.request(app)
        .get(`/groups/${groupId}/membersCount`)
        .set('Authorization', `Bearer ${tokens.M2M.R}`)

      res.should.have.status(200)
      res.body.count.should.be.eql(1)
    })
    it('fetching member count for private group with M2M token should be successful', async () => {
      const { id: groupId } = groups.PRE_CREATED.PRIVATE
      const res = await chai.request(app)
        .get(`/groups/${groupId}/membersCount`)
        .set('Authorization', `Bearer ${tokens.M2M.R}`)

      res.should.have.status(200)
      res.body.count.should.be.eql(1)
    })
    it('fetching member count for public group with non-admin user token of which user is a part of should be successful', async () => {
      const { id: groupId } = groups.PRE_CREATED.PUBLIC
      const res = await chai.request(app)
        .get(`/groups/${groupId}/membersCount`)
        .set('Authorization', `Bearer ${tokens.User.User}`)

      res.should.have.status(200)
      res.body.count.should.be.eql(1)
    })
    it('fetching member count for public group with non-admin user token of which user is not a part of should be successful', async () => {
      const { id: groupId } = groups.PRE_CREATED.PUBLIC_CHILD
      const res = await chai.request(app)
        .get(`/groups/${groupId}/membersCount`)
        .set('Authorization', `Bearer ${tokens.User.User}`)

      res.should.have.status(200)
      res.body.count.should.be.eql(1)
    })
    it('fetching member count for private group with non-admin user token of which user is a part of should be successful', async () => {
      const { id: groupId } = groups.PRE_CREATED.PRIVATE2
      const res = await chai.request(app)
        .get(`/groups/${groupId}/membersCount`)
        .set('Authorization', `Bearer ${tokens.User.User}`)

      res.should.have.status(200)
      res.body.count.should.be.eql(1)
    })
    it('fetching member count for private group with non-admin user token of which user is a part of should be successful', async () => {
      const { id: groupId } = groups.PRE_CREATED.PRIVATE
      const res = await chai.request(app)
        .get(`/groups/${groupId}/membersCount`)
        .set('Authorization', `Bearer ${tokens.User.User}`)

      res.should.have.status(200)
      res.body.count.should.be.eql(1)
    })
    it('fetching member count for group with includeSubGroups flag set should return count of subgorups as well', async () => {
      const { id: groupId } = groups.PRE_CREATED.PUBLIC
      const res = await chai.request(app)
        .get(`/groups/${groupId}/membersCount?includeSubGroups=true`)
        .set('Authorization', `Bearer ${tokens.User.Admin}`)

      res.should.have.status(200)
      res.body.count.should.be.eql(2)
    })
  })

  describe('GET /groups/:groupId/members', async () => {
    it('fetching public group members with admin token should be successful', async () => {
      const group = groups.PRE_CREATED.PUBLIC
      const res = await chai.request(app)
        .get(`/groups/${group.id}/members`)
        .set('Authorization', `Bearer ${tokens.User.Admin}`)

      res.should.have.status(200)
      res.body.should.have.length(2)
      res.body.should.deep.include(
        {
          ..._.omit(members.PRE_CREATED.User[0], 'membershipId'),
          groupName: group.name,
          id: members.PRE_CREATED.User[0].membershipId
        }
      )
    })
    it('fetching public group members with M2M token should be successful', async () => {
      const group = groups.PRE_CREATED.PUBLIC
      const res = await chai.request(app)
        .get(`/groups/${group.id}/members`)
        .set('Authorization', `Bearer ${tokens.M2M.R}`)

      res.should.have.status(200)
      res.body.should.have.length(2)
      res.body.should.deep.include(
        {
          ..._.omit(members.PRE_CREATED.User[0], 'membershipId'),
          groupName: group.name,
          id: members.PRE_CREATED.User[0].membershipId
        }
      )
    })
    it('fetching private group members with admin token should be successful', async () => {
      const group = groups.PRE_CREATED.PRIVATE
      const res = await chai.request(app)
        .get(`/groups/${group.id}/members`)
        .set('Authorization', `Bearer ${tokens.User.Admin}`)

      res.should.have.status(200)
      res.body.should.have.length(1)
      res.body[0].should.be.eql(
        {
          ..._.omit(members.PRE_CREATED.User[1], 'membershipId'),
          groupName: group.name,
          id: members.PRE_CREATED.User[1].membershipId
        }
      )
    })
    it('fetching private group members with M2M token should be successful', async () => {
      const group = groups.PRE_CREATED.PRIVATE
      const res = await chai.request(app)
        .get(`/groups/${group.id}/members`)
        .set('Authorization', `Bearer ${tokens.M2M.R}`)

      res.should.have.status(200)
      res.body.should.have.length(1)
      res.body[0].should.be.eql(
        {
          ..._.omit(members.PRE_CREATED.User[1], 'membershipId'),
          groupName: group.name,
          id: members.PRE_CREATED.User[1].membershipId
        }
      )
    })
    it('fetching private group members with non-admin user token of which user is not a part of should return 403', async () => {
      const group = groups.PRE_CREATED.PRIVATE
      const res = await chai.request(app)
        .get(`/groups/${group.id}/members`)
        .set('Authorization', `Bearer ${tokens.User.User}`)

      res.should.have.status(403)
    })
    it('fetching public group members with non-admin user token of which user is not a part of should be successful', async () => {
      const group = groups.PRE_CREATED.PUBLIC_CHILD
      const res = await chai.request(app)
        .get(`/groups/${group.id}/members`)
        .set('Authorization', `Bearer ${tokens.User.User}`)

      res.should.have.status(200)
      res.body.should.have.length(2)
      res.body.should.deep.include(
        {
          ..._.omit(members.PRE_CREATED.User[2], 'membershipId'),
          groupName: group.name,
          id: members.PRE_CREATED.User[2].membershipId
        }
      )
    })
    it('fetching private group members with non-admin user token of which user is a part of should be successful', async () => {
      const group = groups.PRE_CREATED.PRIVATE2
      const res = await chai.request(app)
        .get(`/groups/${group.id}/members`)
        .set('Authorization', `Bearer ${tokens.User.User}`)

      res.should.have.status(200)
      res.body.should.have.length(1)
      res.body[0].should.be.eql(
        {
          ..._.omit(members.PRE_CREATED.User[4], 'membershipId'),
          groupName: group.name,
          id: members.PRE_CREATED.User[4].membershipId
        }
      )
    })
  })

  describe('Failure to post events to Bus API should rollback membership', () => {
    before(() => {
      helper.stubbedBus.callsFake(() => {
        throw new Error('Posting to Bus API Failed')
      })
    })
    after(() => {
      helper.stubbedBus.callsFake(() => {})
    })

    it('creation', async () => {
      const group = groups.PRE_CREATED.PUBLIC
      const memberId = groups.PRE_CREATED.SELF_REGISTER.id
      const membershipType = config.MEMBERSHIP_TYPES.Group

      const res = await chai.request(app)
        .post(`/groups/${group.id}/members`)
        .set('Authorization', `Bearer ${tokens.User.Admin}`)
        .send({ memberId, membershipType })

      res.should.have.status(500)
      helper.isGroupMember(memberId, group.id, 'Group').should.eventually.be.false
    })
    it('deletion', async () => {
      const { groupId, memberId } = members.PRE_CREATED.User[0]
      const res = await chai.request(app)
        .delete(`/groups/${groupId}/members/${memberId}`)
        .set('Authorization', `Bearer ${tokens.User.Admin}`)

      res.should.have.status(500)
      helper.isGroupMember(memberId, groupId, 'User').should.eventually.be.true
    })
  })
})
