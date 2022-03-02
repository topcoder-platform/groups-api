/**
 * Contains all routes
 */

const constants = require('../app-constants')

module.exports = {
  '/groups': {
    get: {
      controller: 'GroupController',
      method: 'searchGroups',
      auth: 'jwt',
      access: [constants.UserRoles.Admin, constants.UserRoles.User],
      scopes: ['read:groups', 'write:groups', 'all:groups']
    },
    post: {
      controller: 'GroupController',
      method: 'createGroup',
      auth: 'jwt',
      access: [constants.UserRoles.Admin],
      scopes: ['write:groups', 'all:groups']
    }
  },
  '/groups/health': {
    get: {
      controller: 'HealthController',
      method: 'checkHealth'
    }
  },
  '/groups/:groupId': {
    get: {
      controller: 'GroupController',
      method: 'getGroup',
      auth: 'jwt',
      access: [constants.UserRoles.Admin, constants.UserRoles.User],
      scopes: ['read:groups', 'write:groups', 'all:groups']
    },
    put: {
      controller: 'GroupController',
      method: 'updateGroup',
      auth: 'jwt',
      access: [constants.UserRoles.Admin],
      scopes: ['write:groups', 'all:groups']
    },
    delete: {
      controller: 'GroupController',
      method: 'deleteGroup',
      auth: 'jwt',
      access: [constants.UserRoles.Admin],
      scopes: ['write:groups', 'all:groups']
    }
  },
  '/groups/oldId/:oldId': {
    get: {
      controller: 'GroupController',
      method: 'getGroupByOldId',
      auth: 'jwt',
      access: [constants.UserRoles.Admin, constants.UserRoles.User],
      scopes: ['read:groups', 'write:groups', 'all:groups']
    }
  },
  '/groups/:groupId/members': {
    get: {
      controller: 'GroupMembershipController',
      method: 'getGroupMembers',
      auth: 'jwt',
      access: [constants.UserRoles.Admin, constants.UserRoles.User],
      scopes: ['read:groups', 'write:groups', 'all:groups']
    },
    post: {
      controller: 'GroupMembershipController',
      method: 'addGroupMember',
      auth: 'jwt',
      access: [constants.UserRoles.Admin, constants.UserRoles.User],
      scopes: ['write:groups', 'all:groups']
    },
    delete: {
      controller: 'GroupMembershipController',
      method: 'deleteGroupMember',
      auth: 'jwt',
      access: [constants.UserRoles.Admin, constants.UserRoles.User],
      scopes: ['write:groups', 'all:groups']
    }
  },
  '/groups/:groupId/members/:memberId': {
    get: {
      controller: 'GroupMembershipController',
      method: 'getGroupMember',
      auth: 'jwt',
      access: [constants.UserRoles.Admin, constants.UserRoles.User],
      scopes: ['read:groups', 'write:groups', 'all:groups']
    },
    delete: {
      controller: 'GroupMembershipController',
      method: 'deleteGroupMember',
      auth: 'jwt',
      access: [constants.UserRoles.Admin, constants.UserRoles.User],
      scopes: ['write:groups', 'all:groups']
    }
  },
  '/groups/:groupId/membersCount': {
    get: {
      controller: 'GroupMembershipController',
      method: 'getGroupMembersCount'
    }
  },
  '/groups/validityCheck/:memberId/:groupId': {
    get: {
      controller: 'GroupMembershipController',
      method: 'groupValidityCheck'
    }
  },
  '/groups/:groupId/subGroup': {
    post: {
      controller: 'SubGroupController',
      method: 'createSubGroup',
      auth: 'jwt',
      access: [constants.UserRoles.Admin, constants.UserRoles.User],
      scopes: ['write:groups', 'all:groups']
    }
  },
  '/groups/:groupId/subGroup/:subGroupId': {
    delete: {
      controller: 'SubGroupController',
      method: 'deleteSubGroup',
      auth: 'jwt',
      access: [constants.UserRoles.Admin, constants.UserRoles.User],
      scopes: ['write:groups', 'all:groups']
    }
  },
  '/groups/memberGroups/groupMembersCount': {
    get: {
      controller: 'GroupMembershipController',
      method: 'listGroupsMemberCount'
    }
  },
  '/groups/memberGroups/:memberId': {
    get: {
      controller: 'GroupMembershipController',
      method: 'getMemberGroups',
      auth: 'jwt',
      access: [constants.UserRoles.Admin, constants.UserRoles.User],
      scopes: ['read:groups']
    }
  },
  '/groups/memberGroups/': {
    get: {
      controller: 'GroupMembershipController',
      method: 'searchMemberGroups',
      auth: 'jwt',
      access: [constants.UserRoles.Admin, constants.UserRoles.User],
      scopes: ['read:groups']
    }
  },
  '/groupRoles/users/:userId': {
    get: {
      controller: 'GroupRoleController',
      method: 'getGroupRoles',
      auth: 'jwt',
      access: [constants.UserRoles.Admin],
      scopes: ['read:groups', 'write:groups', 'all:groups']
    },
    post: {
      controller: 'GroupRoleController',
      method: 'addGroupRole',
      auth: 'jwt',
      access: [constants.UserRoles.Admin],
      scopes: ['write:groups', 'all:groups']
    },
    delete: {
      controller: 'GroupRoleController',
      method: 'deleteGroupRole',
      auth: 'jwt',
      access: [constants.UserRoles.Admin],
      scopes: ['write:groups', 'all:groups']
    }
  },
  '/health': {
    get: {
      controller: 'HealthController',
      method: 'checkHealth'
    }
  }
}
