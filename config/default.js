/**
 * The configuration file.
 */

module.exports = {
  LOG_LEVEL: process.env.LOG_LEVEL || 'debug',
  PORT: process.env.PORT || 3000,
  // it is configured to be empty at present, but may add prefix like '/api/v5'
  API_PREFIX: process.env.API_PREFIX || '',
  GRAPH_DB_URI: process.env.GRAPH_DB_URI || process.env.GRAPHENEDB_BOLT_URL || 'bolt://localhost:7687',
  GRAPH_DB_USER: process.env.GRAPH_DB_USER || process.env.GRAPHENEDB_BOLT_USER || 'neo4j',
  GRAPH_DB_PASSWORD: process.env.GRAPH_DB_PASSWORD || process.env.GRAPHENEDB_BOLT_PASSWORD || '123456',
  AUTH_SECRET: process.env.AUTH_SECRET || 'mysecret',
  VALID_ISSUERS: process.env.VALID_ISSUERS
    ? process.env.VALID_ISSUERS.replace(/\\"/g, '')
    : '["https://api.topcoder-dev.com", "https://api.topcoder.com","https://topcoder-dev.auth0.com/"]',

  // Auth0 config params
  AUTH0_URL: process.env.AUTH0_URL || 'https://topcoder-dev.auth0.com/oauth/token',
  AUTH0_PROXY_SERVER_URL: process.env.AUTH0_PROXY_SERVER_URL,
  AUTH0_AUDIENCE: process.env.AUTH0_AUDIENCE || 'https://m2m.topcoder-dev.com/',
  TOKEN_CACHE_TIME: process.env.TOKEN_CACHE_TIME || '86400000',
  AUTH0_CLIENT_ID: process.env.AUTH0_CLIENT_ID,
  AUTH0_CLIENT_SECRET: process.env.AUTH0_CLIENT_SECRET,

  // bus API config params
  BUSAPI_URL: process.env.BUSAPI_URL || 'https://api.topcoder-dev.com/v5',
  KAFKA_ERROR_TOPIC: process.env.KAFKA_ERROR_TOPIC || 'common.error.reporting',

  // health check timeout in milliseconds
  HEALTH_CHECK_TIMEOUT: process.env.HEALTH_CHECK_TIMEOUT || 3000,

  //Kafka Topics
  KAFKA_GROUP_CREATE_TOPIC: process.env.KAFKA_GROUP_CREATE_TOPIC,
  KAFKA_GROUP_UPDATE_TOPIC: process.env.KAFKA_GROUP_UPDATE_TOPIC,
  KAFKA_GROUP_DELETE_TOPIC: process.env.KAFKA_GROUP_DELETE_TOPIC,
  KAFKA_GROUP_MEMBER_ADD_TOPIC: process.env.KAFKA_GROUP_MEMBER_ADD_TOPIC,
  KAFKA_GROUP_MEMBER_DELETE_TOPIC: process.env.KAFKA_GROUP_MEMBER_DELETE_TOPIC,

  USER_ROLES: {
    Admin: 'Administrator',
    User: 'Topcoder User'
  },

  MEMBERSHIP_TYPES: {
    Group: 'group',
    User: 'user'
  }
};
