/**
 * App constants
 */
const UserRoles = {
  Admin: 'Administrator',
  User: 'Topcoder User'
}

const MembershipTypes = {
  Group: 'group',
  User: 'user'
}

const EVENT_ORIGINATOR = 'topcoder-groups-api'

const EVENT_MIME_TYPE = 'application/json'

const GroupStatus = {
  Active: 'active',
  InActive: 'inactive'
}

module.exports = {
  UserRoles,
  MembershipTypes,
  EVENT_ORIGINATOR,
  EVENT_MIME_TYPE,
  GroupStatus
}
