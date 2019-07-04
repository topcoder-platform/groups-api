/**
 * App constants
 */
const UserRoles = {
  Admin: 'Administrator',
  User: 'Topcoder User'
};

const MembershipTypes = {
  Group: 'group',
  User: 'user'
};

const EVENT_ORIGINATOR = 'topcoder-groups-api';

const EVENT_MIME_TYPE = 'application/json';

// using a testing topc, should be changed to use real topics in comments when they are created
const Topics = {
  GroupCreated: 'test.new.bus.events', // 'user.action.group.created',
  GroupUpdated: 'test.new.bus.events', // 'user.action.group.updated',
  GroupDeleted: 'test.new.bus.events', // 'user.action.group.deleted',
  GroupMemberCreated: 'test.new.bus.events', // 'user.action.group.member.created',
  GroupMemberDeleted: 'test.new.bus.events' // 'user.action.group.member.deleted'
};

module.exports = {
  UserRoles,
  MembershipTypes,
  EVENT_ORIGINATOR,
  EVENT_MIME_TYPE,
  Topics
};
