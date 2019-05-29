/**
 * Controller for health endpoint
 */
const config = require("config");
const errors = require("../common/errors");
const service = require("../services/GroupService");

// the topcoder-healthcheck-dropin library returns checksRun count,
// here it follows that to return such count
let checksRun = 0;

/**
 * Get app health status
 * @param req the request
 * @param res the response
 */
async function checkHealth(req, res) {
  // perform a quick database access operation, if there is no error and is quick, then consider it healthy;
  // it will search any single group, this should be efficient operation
  checksRun += 1;
  const timestampMS = new Date().getTime();
  try {
    await service.searchGroups({ page: 1, perPage: 1 });
  } catch (e) {
    throw new errors.ServiceUnavailableError(
      `There is database operation error, ${e.message}`
    );
  }
  if (
    new Date().getTime() - timestampMS >
    Number(config.HEALTH_CHECK_TIMEOUT)
  ) {
    throw new errors.ServiceUnavailableError("Database operation is slow.");
  }
  // there is no error, and it is quick, then return checks run count
  res.send({ checksRun });
}

module.exports = {
  checkHealth
};
