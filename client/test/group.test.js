/**
 * Unit tests for TopCoder group APIs
 */

const expect = require('chai').expect
const helper = require('./helper')
const config = require('../config')
const Client = require('../Client').Client
const apiClient = new Client(config.API_URL)

const TEST_GROUP_ID = '11ab038e-48da-123b-96e8-8d3b99b6d183'
const TEST_GROUP_NAME = 'test-group-1'
const PRIVATE_GROUP_ID = '11ab038e-48da-123b-96e8-8d3b99b6d185'
const PARENT_GROUP_ID = '11ab038e-48da-123b-96e8-8d3b99b6d182'
const m2mReadToken = config.TOKEN.M2M_R
const m2mWriteToken = config.TOKEN.M2M_W
const user1Token = config.TOKEN.ADMIN.USER1
const user2Token = config.TOKEN.USER.USER2
const user4Token = config.TOKEN.USER.USER4

describe('TC Group Unit tests', function () {
  this.timeout(helper.testTimeout)
  before(async () => {
    // runs before all tests in this block
    await helper.initDB()
  })

  let groupId
  let groupId2

  it('Create group successfully', async () => {
    // random name
    const name = `some-group-name-${new Date().getTime()}`
    const res = await apiClient.createNewGroup({
      $headers: {
        Authorization: `Bearer ${user1Token}`
      },
      $body: {
        param: {
          name,
          description: 'desc1',
          privateGroup: false,
          selfRegister: true,
          domain: 'test_domain'
        }
      }
    })
    expect(res.body.result.name).to.equal(name)
    expect(res.body.result.description).to.equal('desc1')
    expect(res.body.result.privateGroup).to.equal(false)
    expect(res.body.result.selfRegister).to.equal(true)
    expect(res.body.result.domain).to.equal('test_domain')
    expect(res.body.result.id).to.exist // eslint-disable-line
    expect(res.body.result.createdAt).to.exist // eslint-disable-line
    expect(res.body.result.createdBy).to.exist // eslint-disable-line

    groupId = res.body.result.id
  })

  it('Create group via M2M write token successfully', async () => {
    // random name
    const name = `some-group-name-m2m-${new Date().getTime()}`
    const res = await apiClient.createNewGroup({
      $headers: {
        Authorization: `Bearer ${m2mWriteToken}`
      },
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
    expect(res.body.result.createdBy).to.be.undefined // eslint-disable-line

    groupId2 = res.body.result.id
  })

  it('Create group via user forbidden', async () => {
    // random name
    const name = `fail-group-name-${new Date().getTime()}`
    try {
      await apiClient.createNewGroup({
        $headers: {
          Authorization: `Bearer ${user2Token}`
        },
        $body: {
          param: {
            name,
            description: 'desc1',
            privateGroup: false,
            selfRegister: true
          }
        }
      })
    } catch (err) {
      expect(err.response.statusCode).to.equal(403)
      return
    }
    throw new Error('should not throw error here')
  })

  it('Create group via M2M read token forbidden', async () => {
    // random name
    const name = `fail-group-name-${new Date().getTime()}`
    try {
      await apiClient.createNewGroup({
        $headers: {
          Authorization: `Bearer ${m2mReadToken}`
        },
        $body: {
          param: {
            name,
            description: 'desc1',
            privateGroup: false,
            selfRegister: true
          }
        }
      })
    } catch (err) {
      expect(err.response.statusCode).to.equal(403)
      return
    }
    throw new Error('should not throw error here')
  })

  it('Create group - missing name', async () => {
    try {
      await apiClient.createNewGroup({
        $headers: {
          Authorization: `Bearer ${m2mWriteToken}`
        },
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
        $headers: {
          Authorization: `Bearer ${m2mWriteToken}`
        },
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
        $headers: {
          Authorization: `Bearer ${m2mWriteToken}`
        },
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
        $headers: {
          Authorization: `Bearer ${m2mWriteToken}`
        },
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
    const name = `some-group-name-update1-${new Date().getTime()}`
    const res = await apiClient.updateGroup({
      groupId,
      $headers: {
        Authorization: `Bearer ${user1Token}`
      },
      $body: {
        param: {
          name,
          description: 'desc2',
          privateGroup: true,
          selfRegister: false,
          domain: 'new_domain'
        }
      }
    })
    expect(res.body.result.name).to.equal(name)
    expect(res.body.result.description).to.equal('desc2')
    expect(res.body.result.privateGroup).to.equal(true)
    expect(res.body.result.selfRegister).to.equal(false)
    expect(res.body.result.domain).to.equal('new_domain')
    expect(res.body.result.id).to.exist // eslint-disable-line
    expect(res.body.result.createdAt).to.exist // eslint-disable-line
    expect(res.body.result.createdBy).to.exist // eslint-disable-line
    expect(res.body.result.updatedAt).to.exist // eslint-disable-line
    expect(res.body.result.updatedBy).to.exist // eslint-disable-line
  })

  it('Update group via M2M successfully', async () => {
    // random name
    const name = `some-group-name-update2-${new Date().getTime()}`
    const res = await apiClient.updateGroup({
      groupId: groupId2,
      $headers: {
        Authorization: `Bearer ${m2mWriteToken}`
      },
      $body: {
        param: {
          name,
          description: 'desc2',
          privateGroup: false,
          selfRegister: false
        }
      }
    })
    expect(res.body.result.name).to.equal(name)
    expect(res.body.result.description).to.equal('desc2')
    expect(res.body.result.privateGroup).to.equal(false)
    expect(res.body.result.selfRegister).to.equal(false)
    expect(res.body.result.id).to.exist // eslint-disable-line
    expect(res.body.result.createdAt).to.exist // eslint-disable-line
    expect(res.body.result.createdBy).to.be.undefined // eslint-disable-line
    expect(res.body.result.updatedAt).to.exist // eslint-disable-line
    expect(res.body.result.updatedBy).to.be.undefined // eslint-disable-line
  })

  it('Update group via user forbidden', async () => {
    try {
      // random name
      const name = `fail-group-name-${new Date().getTime()}`
      await apiClient.updateGroup({
        groupId,
        $headers: {
          Authorization: `Bearer ${user4Token}`
        },
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
      expect(err.response.statusCode).to.equal(403)
      return
    }
    throw new Error('should not throw error here')
  })

  it('Update group via M2M Read token forbidden', async () => {
    try {
      // random name
      const name = `fail-group-name-${new Date().getTime()}`
      await apiClient.updateGroup({
        groupId,
        $headers: {
          Authorization: `Bearer ${m2mReadToken}`
        },
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
      expect(err.response.statusCode).to.equal(403)
      return
    }
    throw new Error('should not throw error here')
  })

  it('Update group - not found', async () => {
    try {
      // random name
      const name = `some-group-name-${new Date().getTime()}`
      await apiClient.updateGroup({
        groupId: 'asdflkjsdklfj293847928734',
        $headers: {
          Authorization: `Bearer ${m2mWriteToken}`
        },
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
        $headers: {
          Authorization: `Bearer ${m2mWriteToken}`
        },
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
        $headers: {
          Authorization: `Bearer ${m2mWriteToken}`
        },
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

  it('Get group via admin successfully', async () => {
    const res = await apiClient.getGroup({
      $headers: {
        Authorization: `Bearer ${user1Token}`
      },
      groupId
    })
    expect(res.body.result.description).to.equal('desc2')
    expect(res.body.result.privateGroup).to.equal(true)
    expect(res.body.result.selfRegister).to.equal(false)
    expect(res.body.result.domain).to.equal('new_domain')
    expect(res.body.result.id).to.exist // eslint-disable-line
    expect(res.body.result.createdAt).to.exist // eslint-disable-line
    expect(res.body.result.createdBy).to.exist // eslint-disable-line
    expect(res.body.result.updatedAt).to.exist // eslint-disable-line
    expect(res.body.result.updatedBy).to.exist // eslint-disable-line
  })

  it('Get group via user2 successfully', async () => {
    const res = await apiClient.getGroup({
      $headers: {
        Authorization: `Bearer ${user2Token}`
      },
      groupId: groupId2
    })
    expect(res.body.result.description).to.equal('desc2')
    expect(res.body.result.privateGroup).to.equal(false)
    expect(res.body.result.selfRegister).to.equal(false)
    expect(res.body.result.id).to.exist // eslint-disable-line
  })

  it('Get group via M2M read token successfully', async () => {
    const res = await apiClient.getGroup({
      $headers: {
        Authorization: `Bearer ${m2mReadToken}`
      },
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

  it('Get private group via user4 successfully', async () => {
    const res = await apiClient.getGroup({
      $headers: {
        Authorization: `Bearer ${user4Token}`
      },
      groupId: PRIVATE_GROUP_ID
    })
    expect(res.body.result.name).to.equal('test-group-5')
    expect(res.body.result.description).to.equal('desc')
    expect(res.body.result.privateGroup).to.equal(true)
    expect(res.body.result.selfRegister).to.equal(true)
    expect(res.body.result.id).to.exist // eslint-disable-line
  })

  it('Get private group via user2 forbidden', async () => {
    try {
      await apiClient.getGroup({
        $headers: {
          Authorization: `Bearer ${user2Token}`
        },
        groupId: PRIVATE_GROUP_ID
      })
    } catch (err) {
      expect(err.response.statusCode).to.equal(403)
      return
    }
    throw new Error('should not throw error here')
  })

  it('Get group - not found', async () => {
    try {
      await apiClient.getGroup({
        $headers: {
          Authorization: `Bearer ${m2mWriteToken}`
        },
        groupId: 'asdflkjsdklfj293847928734'
      })
    } catch (err) {
      expect(err.response.statusCode).to.equal(404)
      return
    }
    throw new Error('should not throw error here')
  })

  it('Get group by old id via admin successfully', async () => {
    const res = await apiClient.getGroupByOldId({
      $headers: {
        Authorization: `Bearer ${user1Token}`
      },
      oldId: '12346'
    })
    expect(res.body.result.name).to.equal('test-group-9')
    expect(res.body.result.description).to.equal('desc')
    expect(res.body.result.privateGroup).to.equal(false)
    expect(res.body.result.selfRegister).to.equal(false)
    expect(res.body.result.id).to.exist // eslint-disable-line
  })

  it('Get group by old id via user2 successfully', async () => {
    const res = await apiClient.getGroupByOldId({
      $headers: {
        Authorization: `Bearer ${user2Token}`
      },
      oldId: '12346'
    })
    expect(res.body.result.name).to.equal('test-group-9')
    expect(res.body.result.description).to.equal('desc')
    expect(res.body.result.privateGroup).to.equal(false)
    expect(res.body.result.selfRegister).to.equal(false)
    expect(res.body.result.id).to.exist // eslint-disable-line
  })

  it('Get group by old id via M2M read token successfully', async () => {
    const res = await apiClient.getGroupByOldId({
      $headers: {
        Authorization: `Bearer ${m2mReadToken}`
      },
      oldId: '12346'
    })
    expect(res.body.result.name).to.equal('test-group-9')
    expect(res.body.result.description).to.equal('desc')
    expect(res.body.result.privateGroup).to.equal(false)
    expect(res.body.result.selfRegister).to.equal(false)
    expect(res.body.result.id).to.exist // eslint-disable-line
  })

  it('Get private group by old id via user4 successfully', async () => {
    const res = await apiClient.getGroupByOldId({
      $headers: {
        Authorization: `Bearer ${user4Token}`
      },
      oldId: '12345'
    })
    expect(res.body.result.name).to.equal('test-group-8')
    expect(res.body.result.description).to.equal('desc')
    expect(res.body.result.privateGroup).to.equal(true)
    expect(res.body.result.selfRegister).to.equal(false)
    expect(res.body.result.id).to.exist // eslint-disable-line
  })

  it('Get private group via user2 forbidden', async () => {
    try {
      await apiClient.getGroupByOldId({
        $headers: {
          Authorization: `Bearer ${user2Token}`
        },
        oldId: '12345'
      })
    } catch (err) {
      expect(err.response.statusCode).to.equal(403)
      return
    }
    throw new Error('should not throw error here')
  })

  it('Get group - not found', async () => {
    try {
      await apiClient.getGroup({
        $headers: {
          Authorization: `Bearer ${m2mWriteToken}`
        },
        oldId: '11111111'
      })
    } catch (err) {
      expect(err.response.statusCode).to.equal(404)
      return
    }
    throw new Error('should not throw error here')
  })

  it('Search groups successfully 1', async () => {
    const res = await apiClient.fetchGroupsByUserORGroup({
      $headers: {
        Authorization: `Bearer ${m2mWriteToken}`
      },
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
      $headers: {
        Authorization: `Bearer ${user1Token}`
      },
      $queryParameters: {
        page: 1,
        perPage: 3
      }
    })
    expect(res.body.result.length).to.equal(3)
    expect(res.response.headers['x-page']).to.equal('1')
    expect(res.response.headers['x-per-page']).to.equal('3')
    expect(res.response.headers['x-total']).to.equal('11')
    expect(res.response.headers['x-total-pages']).to.equal('4')
    expect(res.response.headers['x-next-page']).to.equal('2')
    expect(res.response.headers['link']).to.exist // eslint-disable-line
    expect(res.response.headers['link'].indexOf('"first"') >= 0).to.equal(true)
    expect(res.response.headers['link'].indexOf('"last') >= 0).to.equal(true)
    expect(res.response.headers['link'].indexOf('"prev"') >= 0).to.equal(false)
    expect(res.response.headers['link'].indexOf('"next"') >= 0).to.equal(true)
  })

  it('Search groups successfully 3', async () => {
    const res = await apiClient.fetchGroupsByUserORGroup({
      $headers: {
        Authorization: `Bearer ${user4Token}`
      },
      $queryParameters: {
        page: 1,
        perPage: 10,
        oldId: '12345'
      }
    })
    expect(res.body.result.length).to.equal(1)
    expect(res.response.headers['x-page']).to.equal('1')
    expect(res.response.headers['x-per-page']).to.equal('10')
    expect(res.response.headers['x-total']).to.equal('1')
    expect(res.response.headers['x-total-pages']).to.equal('1')
    expect(res.response.headers['link']).to.exist // eslint-disable-line
    expect(res.response.headers['link'].indexOf('"first"') >= 0).to.equal(true)
    expect(res.response.headers['link'].indexOf('"last') >= 0).to.equal(true)
    expect(res.response.headers['link'].indexOf('"prev"') >= 0).to.equal(false)
    expect(res.response.headers['link'].indexOf('"next"') >= 0).to.equal(false)
    expect(res.body.result[0].name).to.equal('test-group-8')
  })

  it('Search groups successfully 4', async () => {
    const res = await apiClient.fetchGroupsByUserORGroup({
      $headers: {
        Authorization: `Bearer ${user1Token}`
      },
      $queryParameters: {
        page: 1,
        perPage: 10,
        privateGroup: false,
        selfRegister: true
      }
    })
    expect(res.body.result.length).to.equal(5)
    expect(res.response.headers['x-page']).to.equal('1')
    expect(res.response.headers['x-per-page']).to.equal('10')
    expect(res.response.headers['x-total']).to.equal('5')
    expect(res.response.headers['x-total-pages']).to.equal('1')
    expect(res.response.headers['link']).to.exist // eslint-disable-line
    expect(res.response.headers['link'].indexOf('"first"') >= 0).to.equal(true)
    expect(res.response.headers['link'].indexOf('"last') >= 0).to.equal(true)
    expect(res.response.headers['link'].indexOf('"prev"') >= 0).to.equal(false)
    expect(res.response.headers['link'].indexOf('"next"') >= 0).to.equal(false)
  })

  it('Search groups via user', async () => {
    const res = await apiClient.fetchGroupsByUserORGroup({
      $headers: {
        Authorization: `Bearer ${user4Token}`
      },
      $queryParameters: {
        page: 1,
        perPage: 3,
        memberId: '11ab038e-48da-123b-96e8-8d3b99b6d183',
        membershipType: 'group'
      }
    })
    expect(res.body.result.length).to.equal(3)
    expect(res.response.headers['x-page']).to.equal('1')
    expect(res.response.headers['x-per-page']).to.equal('3')
    expect(res.response.headers['x-total']).to.equal('3')
    expect(res.response.headers['x-total-pages']).to.equal('1')
  })

  it('Search groups - invalid membershipType', async () => {
    try {
      await apiClient.fetchGroupsByUserORGroup({
        $headers: {
          Authorization: `Bearer ${m2mWriteToken}`
        },
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
        $headers: {
          Authorization: `Bearer ${m2mWriteToken}`
        },
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
        $headers: {
          Authorization: `Bearer ${m2mWriteToken}`
        },
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
        $headers: {
          Authorization: `Bearer ${m2mWriteToken}`
        },
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
      $headers: {
        Authorization: `Bearer ${user1Token}`
      },
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

  it('Delete group via M2M write token successfully', async () => {
    const res = await apiClient.deleteGroup({
      $headers: {
        Authorization: `Bearer ${m2mWriteToken}`
      },
      groupId: groupId2
    })
    expect(res.body.result.description).to.equal('desc2')
    expect(res.body.result.privateGroup).to.equal(false)
    expect(res.body.result.selfRegister).to.equal(false)
    expect(res.body.result.id).to.exist // eslint-disable-line
  })

  it('Delete group via user forbidden', async () => {
    try {
      await apiClient.deleteGroup({
        $headers: {
          Authorization: `Bearer ${user2Token}`
        },
        groupId2
      })
    } catch (err) {
      expect(err.response.statusCode).to.equal(403)
      return
    }
    throw new Error('should not throw error here')
  })

  it('Delete group via M2M read token forbidden', async () => {
    try {
      await apiClient.deleteGroup({
        $headers: {
          Authorization: `Bearer ${m2mReadToken}`
        },
        groupId2
      })
    } catch (err) {
      expect(err.response.statusCode).to.equal(403)
      return
    }
    throw new Error('should not throw error here')
  })

  it('Delete group - not found', async () => {
    try {
      await apiClient.deleteGroup({
        $headers: {
          Authorization: `Bearer ${m2mWriteToken}`
        },
        groupId: 'asdflkjsdklfj293847928734'
      })
    } catch (err) {
      expect(err.response.statusCode).to.equal(404)
      return
    }
    throw new Error('should not throw error here')
  })

  /**
   * Create security group tests
   */

  /**
  * Utility function to create a group
  */
  async function createGroup () {
    // random name
    const name = `some-group-name-${new Date().getTime()}`
    const res = await apiClient.createNewGroup({
      $headers: {
        Authorization: `Bearer ${user1Token}`
      },
      $body: {
        param: {
          name,
          description: 'desc1',
          privateGroup: false,
          selfRegister: true
        }
      }
    })

    return res.body.result
  }

  it('Create security group successfully', async () => {
    const newGroup = await createGroup()
    const res = await apiClient.createNewSecurityGroup({
      $headers: {
        Authorization: `Bearer ${user1Token}`
      },
      $body: {
        param: {
          id: newGroup.id,
          name: newGroup.name
        }
      }
    })
    expect(res.body.result.name).to.equal(newGroup.name)
    expect(res.body.result.id).to.equal(newGroup.id) // eslint-disable-line
    expect(res.body.result.createdAt).to.exist // eslint-disable-line
    expect(res.body.result.createdBy).to.exist // eslint-disable-line
  })

  it('Create security group via M2M write token successfully', async () => {
    const newGroup = await createGroup()
    const res = await apiClient.createNewSecurityGroup({
      $headers: {
        Authorization: `Bearer ${m2mWriteToken}`
      },
      $body: {
        param: {
          id: newGroup.id,
          name: newGroup.name
        }
      }
    })
    expect(res.body.result.name).to.equal(newGroup.name)
    expect(res.body.result.id).to.equal(newGroup.id) // eslint-disable-line
    expect(res.body.result.createdAt).to.exist // eslint-disable-line
    expect(res.body.result.createdBy).to.be.undefined // eslint-disable-line
  })

  it('Create security group via user forbidden', async () => {
    try {
      await apiClient.createNewSecurityGroup({
        $headers: {
          Authorization: `Bearer ${user2Token}`
        },
        $body: {
          // no body required cause it will fail.
        }
      })
    } catch (err) {
      expect(err.response.statusCode).to.equal(403)
      return
    }
    throw new Error('should not throw error here')
  })

  it('Create security group via M2M read token forbidden', async () => {
    // random name
    try {
      await apiClient.createNewSecurityGroup({
        $headers: {
          Authorization: `Bearer ${m2mReadToken}`
        },
        $body: {
          // no body required cause it will fail.
        }
      })
    } catch (err) {
      expect(err.response.statusCode).to.equal(403)
      return
    }
    throw new Error('should not throw error here')
  })

  it('Create security group - missing name', async () => {
    try {
      await apiClient.createNewSecurityGroup({
        $headers: {
          Authorization: `Bearer ${m2mWriteToken}`
        },
        $body: {
          param: {
            id: TEST_GROUP_ID
          }
        }
      })
    } catch (err) {
      expect(err.response.statusCode).to.equal(400)
      return
    }
    throw new Error('should not throw error here')
  })

  it('Create security group - missing id', async () => {
    try {
      await apiClient.createNewSecurityGroup({
        $headers: {
          Authorization: `Bearer ${m2mWriteToken}`
        },
        $body: {
          param: {
            name: ''
          }
        }
      })
    } catch (err) {
      expect(err.response.statusCode).to.equal(400)
      return
    }
    throw new Error('should not throw error here')
  })

  it('Create security group - invalid id', async () => {
    try {
      await apiClient.createNewSecurityGroup({
        $headers: {
          Authorization: `Bearer ${m2mWriteToken}`
        },
        $body: {
          param: {
            id: '123',
            name: ''
          }
        }
      })
    } catch (err) {
      expect(err.response.statusCode).to.equal(400)
      return
    }
    throw new Error('should not throw error here')
  })

  it('Create security group - name already used', async () => {
    try {
      await apiClient.createNewSecurityGroup({
        $headers: {
          Authorization: `Bearer ${m2mWriteToken}`
        },
        $body: {
          param: {
            id: TEST_GROUP_ID,
            name: TEST_GROUP_NAME
          }
        }
      })
    } catch (err) {
      expect(err.response.statusCode).to.equal(409)
      return
    }
    throw new Error('should not throw error here')
  })

  it('Create security group - id already used', async () => {
    try {
      await apiClient.createNewSecurityGroup({
        $headers: {
          Authorization: `Bearer ${m2mWriteToken}`
        },
        $body: {
          param: {
            id: PARENT_GROUP_ID,
            name: 'group1'
          }
        }
      })
    } catch (err) {
      expect(err.response.statusCode).to.equal(409)
      return
    }
    throw new Error('should not throw error here')
  })
})
