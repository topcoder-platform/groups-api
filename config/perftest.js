/**
 * Perf testing configuration file
 */

module.exports = {
  // Mock BusAPI post event, default true
  MOCK_BUSAPI_POST_EVENT: (process.env.MOCK_BUSAPI_POST_EVENT || 'true') === 'true',
  // Group API server to test, default: http://localhost:3000
  GROUPS_API_URL: process.env.GROUPS_API_URL || 'http://localhost:3000',
  // Members API server to fetch members from, default: https://api.topcoder-dev.com/v5/members
  MEMBERS_API_URL: process.env.MEMBERS_API_URL || 'https://api.topcoder-dev.com/v5/members',
  // Total number of members for the test, default: 10000
  TOTAL_MEMBER_SIZE: parseInt(process.env.TOTAL_MEMBER_SIZE || '10000'),
  // Initial number of members to add to the test group, default: 9000
  INITIAL_MEMBERS: parseInt(process.env.INITIAL_MEMBERS || '9000'),
  // Chunk size to use when adding initial members to group, default: 1000
  INITIAL_ADD_MEMBERS_CHUNK_SIZE: parseInt(process.env.INITIAL_ADD_MEMBERS_CHUNK_SIZE || '1000'),
  // Iterations to run bulk add members after initial members added, default: 1000
  NUM_ITERATIONS: parseInt(process.env.NUM_ITERATIONS || '1000'),
  // Min number of members to add in each iteration, default 1.
  MEMBERS_MIN: parseInt(process.env.MEMBERS_MIN || '1'),
  // Max number of members to add in each iteration, default 100.
  MEMBERS_MAX: parseInt(process.env.MEMBERS_MAX || '100'),
  // Use fake member id instead of reading from members api, default false.
  USE_FAKE_MEMBER: (process.env.USE_FAKE_MEMBER || 'false') === 'true',
  // Api call time limit, default 30 seconds
  API_CALL_TIME_LIMIT_MS: parseInt(process.env.API_CALL_TIME_LIMIT_MS || 30000),
  // Auth0 credentials to generate m2m token
  AUTH0_CLIENT_ID: process.env.AUTH0_CLIENT_ID,
  AUTH0_CLIENT_SECRET: process.env.AUTH0_CLIENT_SECRET,
}
