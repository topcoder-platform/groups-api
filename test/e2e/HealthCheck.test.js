/* eslint-env mocha */
/* eslint-disable no-unused-expressions */

const chai = require('chai')
const chaiHttp = require('chai-http')
const should = chai.should() // eslint-disable-line
const sinon = require('sinon')
const sinonChai = require('sinon-chai')

const config = require('config')

require('../common/helper')
require('../../app-bootstrap')
require('../.././src/services/GroupService')
const groupServiceStub = sinon.stub(require.cache[require.resolve('../../src/services/GroupService')].exports, 'searchGroups').callsFake(() => {})
const app = require('../../app')

chai.use(chaiHttp)
chai.use(sinonChai)

describe('Health Check', () => {
  after(() => {
    groupServiceStub.restore()
  })
  it('should return count for successful check', async () => {
    const res = await chai.request(app)
      .get('/groups/health')

    res.should.have.status(200)
    res.body.checksRun.should.be.eql(1)
  })
  it('should return 503 if DB connection throws an error', async () => {
    groupServiceStub.callsFake(() => { throw new Error() })
    const res = await chai.request(app)
      .get('/groups/health')

    res.should.have.status(503)
  })
  it('should return 503 if DB response time crosses threshold', async () => {
    config.HEALTH_CHECK_TIMEOUT = 200
    groupServiceStub.callsFake(() => {
      return new Promise((resolve, reject) => {
        setTimeout(resolve, config.HEALTH_CHECK_TIMEOUT + 100)
      })
    })
    const res = await chai.request(app)
      .get('/groups/health')

    res.should.have.status(503)
  }).timeout(4000)
})
