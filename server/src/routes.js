/**
 * Contains all routes
 */

const constants = require('../app-constants')

module.exports = {
  '/groups': {
    get: { controller: 'GroupController', method: 'searchGroups', roles: [constants.UserRoles.Admin] },
    post: { controller: 'GroupController', method: 'createGroup', roles: [constants.UserRoles.Admin] }
  },
  '/groups/:groupId': {
    get: { controller: 'GroupController', method: 'getGroup' },
    put: { controller: 'GroupController', method: 'updateGroup', roles: [constants.UserRoles.Admin] },
    delete: { controller: 'GroupController', method: 'deleteGroup', roles: [constants.UserRoles.Admin] }
  },

  '/groups/:groupId/members': {
    get: { controller: 'GroupMembershipController', method: 'getGroupMembers' },
    post: { controller: 'GroupMembershipController', method: 'addGroupMember' }
  },
  '/groups/:groupId/members/:memberId': {
    get: { controller: 'GroupMembershipController', method: 'getGroupMember' },
    delete: { controller: 'GroupMembershipController', method: 'deleteGroupMember', roles: [constants.UserRoles.Admin] }
  },
  '/groups/:groupId/membersCount': {
    get: { controller: 'GroupMembershipController', method: 'getGroupMembersCount' }
  }
}
