const jwt = require('jsonwebtoken')
const newman = require('newman')
const _ = require('lodash')
const envHelper = require('./envHelper.js')

const requests = [
  {
    folder: 'health check'
  },
  {
    folder: 'create group by admin',
    iterationData: require('./testData/group/create-group-by-admin.json')
  },
  {
    folder: 'create group by m2m',
    iterationData: require('./testData/group/create-group-by-m2m.json')
  },
  {
    folder: 'create sub group by admin',
    iterationData: require('./testData/sub-group/create-sub-group-by-admin.json')
  },
  {
    folder: 'create sub group by m2m',
    iterationData: require('./testData/sub-group/create-sub-group-by-m2m.json')
  },
  {
    folder: 'create sub group invalid id 404'
  },
  {
    folder: 'create sub group with all kinds of invalid request body',
    iterationData: require('./testData/sub-group/create-sub-group-with-invalid-data.json')
  },
  {
    folder: 'create sub group with all kinds of invalid token',
    iterationData: require('./testData/sub-group/create-sub-group-with-invalid-tokens.json')
  },
  {
    folder: 'create group with all kinds of invalid token',
    iterationData: require('./testData/group/create-group-with-invalid-tokens.json')
  },
  {
    folder: 'create group with all kinds of invalid request body',
    iterationData: require('./testData/group/create-group-with-invalid-data.json')
  },
  {
    folder: 'create group membership by admin',
    iterationData: require('./testData/group-membership/create-group-membership-by-admin.json')
  },
  {
    folder: 'create group role by admin',
    iterationData: require('./testData/group-role/create-group-role-by-admin.json')
  },
  {
    folder: 'delete group role by admin',
    iterationData: require('./testData/group-role/delete-group-role-by-admin.json')
  },
  {
    folder: 'create group role with all kinds of invalid token',
    iterationData: require('./testData/group-role/create-group-role-with-invalid-tokens.json')
  },
  {
    folder: 'create group role by m2m',
    iterationData: require('./testData/group-role/create-group-role-by-m2m.json')
  },
  {
    folder: 'create group role with all kinds of invalid request body',
    iterationData: require('./testData/group-role/create-group-role-with-invalid-data.json')
  },
  {
    folder: 'search group role by admin'
  },
  {
    folder: 'search group role by m2m'
  },
  {
    folder: 'search group role with valid parameters',
    iterationData: require('./testData/group-role/search-group-role-with-valid-parameters.json')
  },
  {
    folder: 'search group role with all kinds of invalid parameter',
    iterationData: require('./testData/group-role/search-group-role-with-invalid-parameters.json')
  },
  {
    folder: 'search group role with all kinds of invalid token',
    iterationData: require('./testData/group-role/search-group-role-with-invalid-tokens.json')
  },
  {
    folder: 'delete group role by m2m',
    iterationData: require('./testData/group-role/delete-group-role-by-m2m.json')
  },
  {
    folder: 'delete group role with all kinds of invalid token',
    iterationData: require('./testData/group-role/delete-group-role-with-invalid-tokens.json')
  },
  {
    folder: 'create group membership by m2m',
    iterationData: require('./testData/group-membership/create-group-membership-by-m2m.json')
  },
  {
    folder: 'update group by m2m',
    iterationData: require('./testData/group/update-group-by-m2m.json')
  },
  {
    folder: 'create group membership with all kinds of invalid request body',
    iterationData: require('./testData/group-membership/create-group-membership-with-invalid-data.json')
  },
  {
    folder: 'delete group membership by admin'
  },
  {
    folder: 'create group membership by user',
    iterationData: require('./testData/group-membership/create-group-membership-by-user.json')
  },
  {
    folder: 'update group by admin',
    iterationData: require('./testData/group/update-group-by-admin.json')
  },
  {
    folder: 'update group with all kinds of invalid request body',
    iterationData: require('./testData/group/update-group-with-invalid-data.json')
  },
  {
    folder: 'update group with all kinds of invalid token',
    iterationData: require('./testData/group/update-group-with-invalid-tokens.json')
  },
  {
    folder: 'update group invalid id 404'
  },
  {
    folder: 'get group by admin',
    iterationData: require('./testData/group/get-group-by-admin.json')
  },
  {
    folder: 'get group by m2m',
    iterationData: require('./testData/group/get-group-by-m2m.json')
  },
  {
    folder: 'get group by user',
    iterationData: require('./testData/group/get-group-by-user.json')
  },
  {
    folder: 'get group with valid parameters',
    iterationData: require('./testData/group/get-group-with-valid-parameters')
  },
  {
    folder: 'get group with all kinds of invalid token',
    iterationData: require('./testData/group/get-group-with-invalid-tokens.json')
  },
  {
    folder: 'get group with all kinds of invalid parameter',
    iterationData: require('./testData/group/get-group-with-invalid-parameters.json')
  },
  {
    folder: 'get group invalid id 404'
  },
  {
    folder: 'get group with old id by admin'
  },
  {
    folder: 'get group with old id by m2m'
  },
  {
    folder: 'get group with old id by user'
  },
  {
    folder: 'get group with old id with valid parameters',
    iterationData: require('./testData/group/get-group-by-old-id-with-valid-parameters')
  },
  {
    folder: 'get group with old id with all kinds of invalid token',
    iterationData: require('./testData/group/get-group-by-old-id-with-invalid-tokens.json')
  },
  {
    folder: 'get group with old id with all kinds of invalid parameter',
    iterationData: require('./testData/group/get-group-by-old-id-with-invalid-parameters.json')
  },
  {
    folder: 'search group by admin'
  },
  {
    folder: 'search group by m2m'
  },
  {
    folder: 'search group by user'
  },
  {
    folder: 'search group with valid parameters',
    iterationData: require('./testData/group/search-group-with-valid-parameters.json')
  },
  {
    folder: 'search group with all kinds of invalid parameter',
    iterationData: require('./testData/group/search-group-with-invalid-parameters.json')
  },
  {
    folder: 'search group with all kinds of invalid token',
    iterationData: require('./testData/group/search-group-with-invalid-tokens.json')
  },
  {
    folder: 'create group membership with all kinds of invalid token',
    iterationData: require('./testData/group-membership/create-group-membership-with-invalid-tokens.json')
  },
  {
    folder: 'get group member groups by admin'
  },
  {
    folder: 'get group member groups by m2m'
  },
  {
    folder: 'get group member groups by user'
  },
  {
    folder: 'get group member groups with all kinds of invalid token',
    iterationData: require('./testData/group-membership/get-group-membership-member-groups-with-invalid-tokens.json')
  },
  {
    folder: 'search group membership by admin'
  },
  {
    folder: 'search group membership by m2m'
  },
  {
    folder: 'search group membership by user'
  },
  {
    folder: 'search group membership with valid parameters',
    iterationData: require('./testData/group-membership/search-group-membership-with-valid-parameters.json')
  },
  {
    folder: 'search group membership with all kinds of invalid parameter',
    iterationData: require('./testData/group-membership/search-group-membership-with-invalid-parameters.json')
  },
  {
    folder: 'search group membership with all kinds of invalid token',
    iterationData: require('./testData/group-membership/search-group-membership-with-invalid-tokens.json')
  },
  {
    folder: 'get group membership by admin'
  },
  {
    folder: 'get group membership by m2m'
  },
  {
    folder: 'get group membership by user'
  },
  {
    folder: 'get group membership with all kinds of invalid token',
    iterationData: require('./testData/group-membership/get-group-membership-with-invalid-tokens.json')
  },
  {
    folder: 'get group membership invalid id 404'
  },
  {
    folder: 'get group membership count without parameters'
  },
  {
    folder: 'get group membership count invalid id 404'
  },
  {
    folder: 'get group membership count with invalid parameters',
    iterationData: require('./testData/group-membership/get-group-membership-count-with-invalid-parameters.json')
  },
  {
    folder: 'get group membership count with valid parameters',
    iterationData: require('./testData/group-membership/get-group-membership-count-with-valid-parameters.json')
  },
  {
    folder: 'get group members list without parameters'
  },
  {
    folder: 'get group members list with valid parameters',
    iterationData: require('./testData/group-membership/get-group-members-list-with-valid-parameters.json')
  },
  {
    folder: 'get group members list with invalid parameters',
    iterationData: require('./testData/group-membership/get-group-members-list-with-invalid-parameters.json')
  },
  {
    folder: 'delete sub group by admin'
  },
  {
    folder: 'delete sub group by m2m'
  },
  {
    folder: 'delete sub group invalid id 404',
    iterationData: require('./testData/sub-group/delete-sub-group-not-found.json')

  },
  {
    folder: 'delete sub group with all kinds of invalid token',
    iterationData: require('./testData/sub-group/delete-sub-group-with-invalid-tokens.json')
  },
  {
    folder: 'delete group membership (group)'
  },
  {
    folder: 'delete group membership invalid id 404'
  },
  {
    folder: 'delete group membership with all kinds of invalid token',
    iterationData: require('./testData/group-membership/delete-group-membership-with-invalid-tokens.json')
  },
  {
    folder: 'delete group membership by m2m'
  },
  {
    folder: 'delete group membership by user'
  },
  {
    folder: 'delete group membership (group)'
  },
  {
    folder: 'delete group with all kinds of invalid token',
    iterationData: require('./testData/group/delete-group-with-invalid-tokens.json')
  },
  {
    folder: 'delete group invalid id 404'
  },
  {
    folder: 'delete group by admin'
  },
  {
    folder: 'delete group by m2m'
  }
]

const options = {
  collection: require('./groups-api.postman_collection.json'),
  exportEnvironment: 'test/postman/groups-api.postman_environment.json',
  reporters: 'cli'
}
const runner = (options) =>
  new Promise((resolve, reject) => {
    newman.run(options, function (err, results) {
      if (err) {
        reject(err)
        return
      }
      resolve(results)
    })
  });

(async () => {
  const m2mToken = await envHelper.getM2MToken()
  const adminToken = await envHelper.getAdminToken()
  const userToken = await envHelper.getUserToken()
  const userId = jwt.decode(userToken).userId
  const adminId = jwt.decode(adminToken).userId

  const originalEnvVars = [
    { key: 'M2M_TOKEN', value: m2mToken },
    { key: 'admin_token', value: adminToken },
    { key: 'user_token', value: userToken },
    { key: 'USER_ID', value: userId },
    { key: 'ADMIN_ID', value: adminId }
  ]

  for (const request of requests) {
    options.envVar = [
      ...originalEnvVars,
      ..._.map(_.keys(request.iterationData || {}), (key) => ({
        key,
        value: request.iterationData[key]
      }))
    ]
    delete require.cache[
      require.resolve('./groups-api.postman_environment.json')
    ]
    options.environment = require('./groups-api.postman_environment.json')
    options.folder = request.folder
    options.iterationData = request.iterationData
    try {
      const results = await runner(options)
      if (_.get(results, 'run.failures.length', 0) > 0) {
        process.exit(-1)
      }
    } catch (err) {
      console.log(err)
    }
  }
})()
  .then(() => {
    console.log('newman test completed!')
    process.exit(0)
  })
  .catch((err) => {
    console.log(err)
    process.exit(1)
  })
