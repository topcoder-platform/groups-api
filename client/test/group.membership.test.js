/**
 * Unit tests for TopCoder group membership APIs
 */

const expect = require('chai').expect
const config = require('../config')
const Client = require('../Client').Client
const apiClient = new Client(config.API_URL)

const PARENT_GROUP_ID = '11ab038e-48da-123b-96e8-8d3b99b6d181'
const TEST_GROUP_ID = '11ab038e-48da-123b-96e8-8d3b99b6d182'
const CHILD_GROUP_ID = '11ab038e-48da-123b-96e8-8d3b99b6d183'
const TEST_MEMBER_ID = '10ba038e-48da-123b-96e8-8d3b99b6d18c'

describe('TC Group Membership Unit tests', () => {
  it('Get group members successfully', async () => {
    const res = await apiClient.listMembersByGroup({
      groupId: TEST_GROUP_ID,
      $queryParameters: {
        page: 1,
        perPage: 5
      }
    })
    expect(res.body.result.length).to.equal(1)
    expect(res.body.result[0].groupId).to.equal(TEST_GROUP_ID)
    expect(res.body.result[0].memberId).to.equal(CHILD_GROUP_ID)
    expect(res.body.result[0].membershipType).to.equal('group')
    expect(res.response.headers['x-page']).to.equal('1')
    expect(res.response.headers['x-per-page']).to.equal('5')
    expect(res.response.headers['x-total']).to.equal('1')
    expect(res.response.headers['x-total-pages']).to.equal('1')
    expect(!!res.response.headers['x-next-page']).to.equal(false)
    expect(res.response.headers['link']).to.exist // eslint-disable-line
    expect(res.response.headers['link'].indexOf('"first"') >= 0).to.equal(true)
    expect(res.response.headers['link'].indexOf('"last') >= 0).to.equal(true)
    expect(res.response.headers['link'].indexOf('"prev"') >= 0).to.equal(false)
    expect(res.response.headers['link'].indexOf('"next"') >= 0).to.equal(false)
  })

  it('Get group members - not found', async () => {
    try {
      await apiClient.listMembersByGroup({
        groupId: 'fhuhdfudhf8748374834',
        $queryParameters: {
          page: 1,
          perPage: 5
        }
      })
    } catch (err) {
      expect(err.response.statusCode).to.equal(404)
      return
    }
    throw new Error('should not throw error here')
  })

  it('Get group members - invalid page', async () => {
    try {
      await apiClient.listMembersByGroup({
        groupId: TEST_GROUP_ID,
        $queryParameters: {
          page: 'abc',
          perPage: 5
        }
      })
    } catch (err) {
      expect(err.response.statusCode).to.equal(400)
      return
    }
    throw new Error('should not throw error here')
  })

  it('Get group members - invalid perPage', async () => {
    try {
      await apiClient.listMembersByGroup({
        groupId: TEST_GROUP_ID,
        $queryParameters: {
          page: 1,
          perPage: 0
        }
      })
    } catch (err) {
      expect(err.response.statusCode).to.equal(400)
      return
    }
    throw new Error('should not throw error here')
  })

  it('Add group member successfully', async () => {
    const res = await apiClient.addMember({
      groupId: TEST_GROUP_ID,
      $body: {
        param: {
          memberId: TEST_MEMBER_ID,
          membershipType: 'user'
        }
      }
    })
    expect(res.body.result.id).to.exist // eslint-disable-line
    expect(res.body.result.groupId).to.equal(TEST_GROUP_ID)
    expect(res.body.result.memberId).to.equal(TEST_MEMBER_ID)
    expect(res.body.result.membershipType).to.equal('user')
    expect(res.body.result.createdBy).to.exist // eslint-disable-line
    expect(res.body.result.createdAt).to.exist // eslint-disable-line
  })

  it('Add group member - cyclical reference 1', async () => {
    try {
      await apiClient.addMember({
        groupId: TEST_GROUP_ID,
        $body: {
          param: {
            memberId: PARENT_GROUP_ID,
            membershipType: 'group'
          }
        }
      })
    } catch (err) {
      expect(err.response.statusCode).to.equal(409)
      return
    }
    throw new Error('should not throw error here')
  })

  it('Add group member - cyclical reference 2', async () => {
    try {
      await apiClient.addMember({
        groupId: CHILD_GROUP_ID,
        $body: {
          param: {
            memberId: PARENT_GROUP_ID,
            membershipType: 'group'
          }
        }
      })
    } catch (err) {
      expect(err.response.statusCode).to.equal(409)
      return
    }
    throw new Error('should not throw error here')
  })

  it('Add group member - not found', async () => {
    try {
      await apiClient.addMember({
        groupId: TEST_GROUP_ID,
        $body: {
          param: {
            memberId: '126381726378aaabc',
            membershipType: 'user'
          }
        }
      })
    } catch (err) {
      expect(err.response.statusCode).to.equal(404)
      return
    }
    throw new Error('should not throw error here')
  })

  it('Add group member - invalid membershipType', async () => {
    try {
      await apiClient.addMember({
        groupId: TEST_GROUP_ID,
        $body: {
          param: {
            memberId: TEST_MEMBER_ID,
            membershipType: 'invalid'
          }
        }
      })
    } catch (err) {
      expect(err.response.statusCode).to.equal(400)
      return
    }
    throw new Error('should not throw error here')
  })

  it('Add group member - missing membershipType', async () => {
    try {
      await apiClient.addMember({
        groupId: TEST_GROUP_ID,
        $body: {
          param: {
            memberId: TEST_MEMBER_ID
          }
        }
      })
    } catch (err) {
      expect(err.response.statusCode).to.equal(400)
      return
    }
    throw new Error('should not throw error here')
  })

  it('Get group member successfully', async () => {
    const res = await apiClient.getMembershipByGroupIdnMemberId({
      groupId: TEST_GROUP_ID,
      memberId: TEST_MEMBER_ID
    })
    expect(res.body.result.id).to.exist // eslint-disable-line
    expect(res.body.result.groupId).to.equal(TEST_GROUP_ID)
    expect(res.body.result.memberId).to.equal(TEST_MEMBER_ID)
    expect(res.body.result.membershipType).to.equal('user')
    expect(res.body.result.createdBy).to.exist // eslint-disable-line
    expect(res.body.result.createdAt).to.exist // eslint-disable-line
  })

  it('Get group member - member not found', async () => {
    try {
      await apiClient.getMembershipByGroupIdnMemberId({
        groupId: TEST_GROUP_ID,
        memberId: '123123987abcaa'
      })
    } catch (err) {
      expect(err.response.statusCode).to.equal(404)
      return
    }
    throw new Error('should not throw error here')
  })

  it('Get group member - group not found', async () => {
    try {
      await apiClient.getMembershipByGroupIdnMemberId({
        groupId: '123123abc',
        memberId: TEST_MEMBER_ID
      })
    } catch (err) {
      expect(err.response.statusCode).to.equal(404)
      return
    }
    throw new Error('should not throw error here')
  })

  it('Delete group member successfully', async () => {
    const res = await apiClient.removeMemberFromGroup({
      groupId: TEST_GROUP_ID,
      memberId: TEST_MEMBER_ID
    })
    expect(res.body.result.id).to.exist // eslint-disable-line
    expect(res.body.result.groupId).to.equal(TEST_GROUP_ID)
    expect(res.body.result.memberId).to.equal(TEST_MEMBER_ID)
    expect(res.body.result.membershipType).to.equal('user')
    expect(res.body.result.createdBy).to.exist // eslint-disable-line
    expect(res.body.result.createdAt).to.exist // eslint-disable-line
  })

  it('Delete group member - group not found', async () => {
    try {
      await apiClient.removeMemberFromGroup({
        groupId: '123123abc',
        memberId: TEST_MEMBER_ID
      })
    } catch (err) {
      expect(err.response.statusCode).to.equal(404)
      return
    }
    throw new Error('should not throw error here')
  })

  it('Delete group member - member not found', async () => {
    try {
      await apiClient.removeMemberFromGroup({
        groupId: TEST_GROUP_ID,
        memberId: '123123abc'
      })
    } catch (err) {
      expect(err.response.statusCode).to.equal(404)
      return
    }
    throw new Error('should not throw error here')
  })

  it('Get group member count successfully 1', async () => {
    const res = await apiClient.getMembersCount({
      groupId: TEST_GROUP_ID
    })
    expect(res.body.result.count).to.equal(0)
  })

  it('Get group member count successfully 2', async () => {
    const res = await apiClient.getMembersCount({
      groupId: TEST_GROUP_ID,
      $queryParameters: {
        includeSubGroups: true
      }
    })
    expect(res.body.result.count).to.equal(2)
  })

  it('Get group member count - not found', async () => {
    try {
      await apiClient.getMembersCount({
        groupId: '89723746234abasab'
      })
    } catch (err) {
      expect(err.response.statusCode).to.equal(404)
      return
    }
    throw new Error('should not throw error here')
  })
})
