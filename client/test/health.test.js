/**
 * Unit tests for TopCoder groups health API
 */

const expect = require('chai').expect
const config = require('../config')
const Client = require('../Client').Client
const apiClient = new Client(config.API_URL)

describe('TC Group Health Unit tests', () => {
  it('Check health successfully', async () => {
    const res = await apiClient.checkHealth()
    expect(res.body.checksRun).to.exist // eslint-disable-line
    expect(res.body.checksRun > 0).to.equal(true)
  })
})
