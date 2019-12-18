/* eslint-env mocha */
/* eslint-disable no-unused-expressions */

const chai = require('chai')
const chaiHttp = require('chai-http')
const should = chai.should() // eslint-disable-line

chai.use(chaiHttp)

const tokens = require('../common/data/tokens.json')
require('../common/helper')
const app = require('../../app')

describe('Invalid Requests', () => {
  it('calling an unknown route should return 404', async () => {
    const res = await chai.request(app)
      .get('/groups/invalid')
      .set('Authorization', `Bearer ${tokens.User.Admin}`)

    res.should.have.status(404)
  })
  it('calling a known route with unsupported method should return 405', async () => {
    const res = await chai.request(app)
      .patch('/groups')
      .set('Authorization', `Bearer ${tokens.User.Admin}`)

    res.should.have.status(405)
  })
})
