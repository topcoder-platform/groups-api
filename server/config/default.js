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
  GRAPH_DB_PASSWORD: process.env.GRAPH_DB_PASSWORD || process.env.GRAPHENEDB_BOLT_PASSWORD || '123456'
}
