/**
 * Unit tests for TopCoder group APIs
 */

const expect = require('chai').expect
const config = require('../config')
const Client = require('../Client').Client
const apiClient = new Client(config.API_URL)

const TEST_GROUP_ID = '11ab038e-48da-123b-96e8-8d3b99b6d183'
const PARENT_GROUP_ID = '11ab038e-48da-123b-96e8-8d3b99b6d182'

describe('TC Group Unit tests', () => {
  let groupId

  it('Create group successfully', async () => {
    // random name
    const name = `some-group-name-${new Date().getTime()}`
    const res = await apiClient.createNewGroup({
      $body: {
        param: {
          name,
          description: 'desc1',
          privateGroup: false,
          selfRegister: true
        }
      }
    })
    expect(res.body.result.name).to.equal(name)
    expect(res.body.result.description).to.equal('desc1')
    expect(res.body.result.privateGroup).to.equal(false)
    expect(res.body.result.selfRegister).to.equal(true)
    expect(res.body.result.id).to.exist // eslint-disable-line
    expect(res.body.result.createdAt).to.exist // eslint-disable-line
    expect(res.body.result.createdBy).to.exist // eslint-disable-line

    groupId = res.body.result.id
  })

  it('Create group - missing name', async () => {
    try {
      await apiClient.createNewGroup({
        $body: {
          param: {
            description: 'desc1',
            privateGroup: false,
            selfRegister: true
          }
        }
      })
    } catch (err) {
      expect(err.response.statusCode).to.equal(400)
      return
    }
    throw new Error('should not throw error here')
  })

  it('Create group - invalid privateGroup', async () => {
    try {
      const name = `some-group-name-${new Date().getTime()}`
      await apiClient.createNewGroup({
        $body: {
          param: {
            name,
            description: 'desc1',
            privateGroup: 123,
            selfRegister: true
          }
        }
      })
    } catch (err) {
      expect(err.response.statusCode).to.equal(400)
      return
    }
    throw new Error('should not throw error here')
  })

  it('Create group - missing selfRegister', async () => {
    try {
      const name = `some-group-name-${new Date().getTime()}`
      await apiClient.createNewGroup({
        $body: {
          param: {
            name,
            description: 'desc1',
            privateGroup: false
          }
        }
      })
    } catch (err) {
      expect(err.response.statusCode).to.equal(400)
      return
    }
    throw new Error('should not throw error here')
  })

  it('Create group - name already used', async () => {
    try {
      await apiClient.createNewGroup({
        $body: {
          param: {
            name: 'test-group-1',
            description: 'desc1',
            privateGroup: false,
            selfRegister: true
          }
        }
      })
    } catch (err) {
      expect(err.response.statusCode).to.equal(409)
      return
    }
    throw new Error('should not throw error here')
  })

  it('Update group successfully', async () => {
    // random name
    const name = `some-group-name-${new Date().getTime()}`
    const res = await apiClient.updateGroup({
      groupId,
      $body: {
        param: {
          name,
          description: 'desc2',
          privateGroup: true,
          selfRegister: false
        }
      }
    })
    expect(res.body.result.name).to.equal(name)
    expect(res.body.result.description).to.equal('desc2')
    expect(res.body.result.privateGroup).to.equal(true)
    expect(res.body.result.selfRegister).to.equal(false)
    expect(res.body.result.id).to.exist // eslint-disable-line
    expect(res.body.result.createdAt).to.exist // eslint-disable-line
    expect(res.body.result.createdBy).to.exist // eslint-disable-line
    expect(res.body.result.updatedAt).to.exist // eslint-disable-line
    expect(res.body.result.updatedBy).to.exist // eslint-disable-line
  })

  it('Update group - not found', async () => {
    try {
      // random name
      const name = `some-group-name-${new Date().getTime()}`
      await apiClient.updateGroup({
        groupId: 'asdflkjsdklfj293847928734',
        $body: {
          param: {
            name,
            description: 'desc2',
            privateGroup: true,
            selfRegister: false
          }
        }
      })
    } catch (err) {
      expect(err.response.statusCode).to.equal(404)
      return
    }
    throw new Error('should not throw error here')
  })

  it('Update group - invalid name', async () => {
    try {
      await apiClient.updateGroup({
        groupId,
        $body: {
          param: {
            name: 123,
            description: 'desc2',
            privateGroup: true,
            selfRegister: false
          }
        }
      })
    } catch (err) {
      expect(err.response.statusCode).to.equal(400)
      return
    }
    throw new Error('should not throw error here')
  })

  it('Update group - invalid description', async () => {
    try {
      // random name
      const name = `some-group-name-${new Date().getTime()}`
      await apiClient.updateGroup({
        groupId,
        $body: {
          param: {
            name,
            description: ['desc2'],
            privateGroup: true,
            selfRegister: false
          }
        }
      })
    } catch (err) {
      expect(err.response.statusCode).to.equal(400)
      return
    }
    throw new Error('should not throw error here')
  })

  it('Get group successfully', async () => {
    const res = await apiClient.getGroup({
      groupId
    })
    expect(res.body.result.description).to.equal('desc2')
    expect(res.body.result.privateGroup).to.equal(true)
    expect(res.body.result.selfRegister).to.equal(false)
    expect(res.body.result.id).to.exist // eslint-disable-line
    expect(res.body.result.createdAt).to.exist // eslint-disable-line
    expect(res.body.result.createdBy).to.exist // eslint-disable-line
    expect(res.body.result.updatedAt).to.exist // eslint-disable-line
    expect(res.body.result.updatedBy).to.exist // eslint-disable-line
  })

  it('Get group - not found', async () => {
    try {
      await apiClient.getGroup({
        groupId: 'asdflkjsdklfj293847928734'
      })
    } catch (err) {
      expect(err.response.statusCode).to.equal(404)
      return
    }
    throw new Error('should not throw error here')
  })

  it('Search groups successfully 1', async () => {
    const res = await apiClient.fetchGroupsByUserORGroup({
      $queryParameters: {
        memberId: TEST_GROUP_ID,
        membershipType: 'group',
        page: 1,
        perPage: 5
      }
    })
    expect(res.body.result.length).to.equal(1)
    expect(res.body.result[0].id).to.equal(PARENT_GROUP_ID)
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

  it('Search groups successfully 2', async () => {
    const res = await apiClient.fetchGroupsByUserORGroup({
      $queryParameters: {
        page: 1,
        perPage: 3
      }
    })
    expect(res.body.result.length).to.equal(3)
    expect(res.response.headers['x-page']).to.equal('1')
    expect(res.response.headers['x-per-page']).to.equal('3')
    expect(res.response.headers['x-total']).to.equal('7')
    expect(res.response.headers['x-total-pages']).to.equal('3')
    expect(res.response.headers['x-next-page']).to.equal('2')
    expect(res.response.headers['link']).to.exist // eslint-disable-line
    expect(res.response.headers['link'].indexOf('"first"') >= 0).to.equal(true)
    expect(res.response.headers['link'].indexOf('"last') >= 0).to.equal(true)
    expect(res.response.headers['link'].indexOf('"prev"') >= 0).to.equal(false)
    expect(res.response.headers['link'].indexOf('"next"') >= 0).to.equal(true)
  })

  it('Search groups - invalid membershipType', async () => {
    try {
      await apiClient.fetchGroupsByUserORGroup({
        $queryParameters: {
          memberId: TEST_GROUP_ID,
          membershipType: 'invalid',
          page: 1,
          perPage: 5
        }
      })
    } catch (err) {
      expect(err.response.statusCode).to.equal(400)
      return
    }
    throw new Error('should not throw error here')
  })

  it('Search groups - missing memberId', async () => {
    try {
      await apiClient.fetchGroupsByUserORGroup({
        $queryParameters: {
          membershipType: 'group',
          page: 1,
          perPage: 5
        }
      })
    } catch (err) {
      expect(err.response.statusCode).to.equal(400)
      return
    }
    throw new Error('should not throw error here')
  })

  it('Search groups - invalid page', async () => {
    try {
      await apiClient.fetchGroupsByUserORGroup({
        $queryParameters: {
          memberId: TEST_GROUP_ID,
          membershipType: 'group',
          page: 0,
          perPage: 5
        }
      })
    } catch (err) {
      expect(err.response.statusCode).to.equal(400)
      return
    }
    throw new Error('should not throw error here')
  })

  it('Search groups - invalid perPage', async () => {
    try {
      await apiClient.fetchGroupsByUserORGroup({
        $queryParameters: {
          memberId: TEST_GROUP_ID,
          membershipType: 'group',
          page: 1,
          perPage: -5
        }
      })
    } catch (err) {
      expect(err.response.statusCode).to.equal(400)
      return
    }
    throw new Error('should not throw error here')
  })

  it('Delete group successfully', async () => {
    const res = await apiClient.deleteGroup({
      groupId
    })
    expect(res.body.result.description).to.equal('desc2')
    expect(res.body.result.privateGroup).to.equal(true)
    expect(res.body.result.selfRegister).to.equal(false)
    expect(res.body.result.id).to.exist // eslint-disable-line
    expect(res.body.result.createdAt).to.exist // eslint-disable-line
    expect(res.body.result.createdBy).to.exist // eslint-disable-line
    expect(res.body.result.updatedAt).to.exist // eslint-disable-line
    expect(res.body.result.updatedBy).to.exist // eslint-disable-line
  })

  it('Delete group - not found', async () => {
    try {
      await apiClient.deleteGroup({
        groupId: 'asdflkjsdklfj293847928734'
      })
    } catch (err) {
      expect(err.response.statusCode).to.equal(404)
      return
    }
    throw new Error('should not throw error here')
  })
})
