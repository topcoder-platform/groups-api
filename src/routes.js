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
      scopes: ['read:groups', 'write:groups', 'all:groups', 'all:resources']
    },
    post: {
      controller: 'GroupController',
      method: 'createGroup',
      auth: 'jwt',
      access: [constants.UserRoles.Admin],
      scopes: ['write:groups', 'all:groups', 'all:resources', 'all:resources']
    }
  },
  '/groups/internal/jobs/clean':{
    post: {
      controller: 'CleanUpController',
      method: 'cleanUpTestData',
      auth: 'jwt',
      access: [constants.UserRoles.Admin],
      scopes: ['all:groups', 'all:resources']
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
      scopes: ['read:groups', 'write:groups', 'all:groups', 'all:resources']
    },
    put: {
      controller: 'GroupController',
      method: 'updateGroup',
      auth: 'jwt',
      access: [constants.UserRoles.Admin],
      scopes: ['write:groups', 'all:groups', 'all:resources']
    },
    delete: {
      controller: 'GroupController',
      method: 'deleteGroup',
      auth: 'jwt',
      access: [constants.UserRoles.Admin],
      scopes: ['write:groups', 'all:groups', 'all:resources']
    }
  },
  '/groups/oldId/:oldId': {
    get: {
      controller: 'GroupController',
      method: 'getGroupByOldId',
      auth: 'jwt',
      access: [constants.UserRoles.Admin, constants.UserRoles.User],
      scopes: ['read:groups', 'write:groups', 'all:groups', 'all:resources']
    }
  },
  '/groups/:groupId/members': {
    get: {
      controller: 'GroupMembershipController',
      method: 'getGroupMembers',
      auth: 'jwt',
      access: [constants.UserRoles.Admin, constants.UserRoles.User],
      scopes: ['read:groups', 'write:groups', 'all:groups', 'all:resources']
    },
    post: {
      controller: 'GroupMembershipController',
      method: 'addGroupMember',
      auth: 'jwt',
      access: [constants.UserRoles.Admin, constants.UserRoles.User],
      scopes: ['write:groups', 'all:groups', 'all:resources']
    },
    delete: {
      controller: 'GroupMembershipController',
      method: 'deleteGroupMember',
      auth: 'jwt',
      access: [constants.UserRoles.Admin, constants.UserRoles.User],
      scopes: ['write:groups', 'all:groups', 'all:resources']
    }
  },
  '/groups/:groupId/members/:memberId': {
    get: {
      controller: 'GroupMembershipController',
      method: 'getGroupMember',
      auth: 'jwt',
      access: [constants.UserRoles.Admin, constants.UserRoles.User],
      scopes: ['read:groups', 'write:groups', 'all:groups', 'all:resources']
    },
    delete: {
      controller: 'GroupMembershipController',
      method: 'deleteGroupMember',
      auth: 'jwt',
      access: [constants.UserRoles.Admin, constants.UserRoles.User],
      scopes: ['write:groups', 'all:groups', 'all:resources']
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
      scopes: ['write:groups', 'all:groups', 'all:resources']
    }
  },
  '/groups/:groupId/subGroup/:subGroupId': {
    delete: {
      controller: 'SubGroupController',
      method: 'deleteSubGroup',
      auth: 'jwt',
      access: [constants.UserRoles.Admin, constants.UserRoles.User],
      scopes: ['write:groups', 'all:groups', 'all:resources']
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
      scopes: ['read:groups', 'all:resources']
    }
  },
  '/group-roles/users/:userId': {
    get: {
      controller: 'GroupRoleController',
      method: 'getGroupRoles',
      auth: 'jwt',
      access: [constants.UserRoles.Admin],
      scopes: ['read:groups', 'write:groups', 'all:groups', 'all:resources']
    },
    post: {
      controller: 'GroupRoleController',
      method: 'addGroupRole',
      auth: 'jwt',
      access: [constants.UserRoles.Admin],
      scopes: ['write:groups', 'all:groups', 'all:resources']
    },
    delete: {
      controller: 'GroupRoleController',
      method: 'deleteGroupRole',
      auth: 'jwt',
      access: [constants.UserRoles.Admin],
      scopes: ['write:groups', 'all:groups', 'all:resources']
    }
  },
  '/health': {
    get: {
      controller: 'HealthController',
      method: 'checkHealth'
    }
  }
}
