const config = require('./config')
const Client = require('./Client').Client
const tcGroupsAPIClient = new Client(config.API_URL)
const options = {
  groupId: '11ab038e-48da-123b-96e8-8d3b99b6d183',
  $queryParameters: {
    page: 1,
    perPage: 5
  }
}

tcGroupsAPIClient
  .listMembersByGroup(options)
  .then((res) => {
    console.log('Members list: ', JSON.stringify(res.body, null, 4))
  })
  .catch((e) => console.log(e))
