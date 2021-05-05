/**
 * The configuration file.
 */

module.exports = {
  AUTH_V2_URL: process.env.AUTH_V2_URL || 'https://topcoder-dev.auth0.com/oauth/ro',
  AUTH_V2_CLIENT_ID: process.env.AUTH_V2_CLIENT_ID || '',
  AUTH_V3_URL: process.env.AUTH_V3_URL || 'https://api.topcoder-dev.com/v3/authorizations',
  ADMIN_CREDENTIALS_USERNAME: process.env.ADMIN_CREDENTIALS_USERNAME || '',
  ADMIN_CREDENTIALS_PASSWORD: process.env.ADMIN_CREDENTIALS_PASSWORD || '',
  USER_CREDENTIALS_USERNAME: process.env.USER_CREDENTIALS_USERNAME || '',
  USER_CREDENTIALS_PASSWORD: process.env.USER_CREDENTIALS_PASSWORD || ''
}
