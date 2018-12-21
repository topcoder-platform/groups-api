const express = require('express');
const groups = require('../services/groups');

const router = new express.Router();

/**
 * Get members by group id
 *
 *
 * If the group is private, the user needs to be a member of
 * the group, or an admin.
 *
 */
router.get('/:groupId/members', async (req, res, next) => {
  const options = {
    groupId: req.params.groupId,
    page: req.query.page,
    perPage: req.query.perPage
  };

  try {
    const result = await groups.getGroupsByGroupIdMembers(options);
    res.status(result.status || 200).json(result.data);
  } catch (err) {
    return res.status(err.status).send({
      status: err.status,
      error: err.error
    });
  }
});

/**
 * Add a member to the specified group
 *
 *
 * If the group is private, the user needs to be a member of
 * the group, or an admin.
 *
 */
router.post('/:groupId/members', async (req, res, next) => {
  const options = {
    groupId: req.params.groupId
  };

  try {
    const result = await groups.postGroupsByGroupIdMembers(options);
    res.status(result.status || 200).send(result.data);
  } catch (err) {
    return res.status(err.status).send({
      status: err.status,
      error: err.error
    });
  }
});

/**
 * Get membership by group id and member id
 */
router.get('/:groupId/members/:memberId', async (req, res, next) => {
  const options = {
    groupId: req.params.groupId,
    memberId: req.params.memberId
  };

  try {
    const result = await groups.getGroupsByGroupIdMembersByMemberId(options);
    res.status(result.status || 200).send(result.data);
  } catch (err) {
    return res.status(err.status).send({
      status: err.status,
      error: err.error
    });
  }
});

/**
 * Remove a member from specified group
 *
 *
 * The user has to have admin role and the group allows self
 * registration.
 *
 */
router.delete('/:groupId/members/:memberId', async (req, res, next) => {
  const options = {
    groupId: req.params.groupId,
    memberId: req.params.memberId
  };

  try {
    const result = await groups.deleteGroupsByGroupIdMembersByMemberId(options);
    res.status(result.status || 200).send(result.data);
  } catch (err) {
    return res.status(err.status).send({
      status: err.status,
      error: err.error
    });
  }
});

/**
 * Get members count by group id
 */
router.get('/:groupId/membersCount', async (req, res, next) => {
  const options = {
    groupId: req.params.groupId,
    includeSubGroups: req.query.includeSubGroups
  };

  try {
    const result = await groups.getGroupsByGroupIdMembersCount(options);
    res.status(result.status || 200).send(result.data);
  } catch (err) {
    return res.status(err.status).send({
      status: err.status,
      error: err.error
    });
  }
});

/**
 * Fetch a particular group
 *
 *
 * If the group is private, the user needs to be a member of
 * the group, or an admin.
 *
 */
router.get('/:groupId', async (req, res, next) => {
  const options = {
    groupId: req.params.groupId,
    includeSubGroups: req.query.includeSubGroups,
    includeParentGroup: req.query.includeParentGroup,
    oneLevel: req.query.oneLevel,
    fields: req.query.fields
  };

  try {
    const result = await groups.getGroupsByGroupId(options);
    res.status(result.status || 200).send(result.data);
  } catch (err) {
    return res.status(err.status).send({
      status: err.status,
      error: err.error
    });
  }
});

/**
 * Delete a group
 *
 *
 * The user has to have admin role.
 *
 */
router.delete('/:groupId', async (req, res, next) => {
  const options = {
    groupId: req.params.groupId
  };

  try {
    const result = await groups.deleteGroupsByGroupId(options);
    res.status(result.status || 200).send(result.data);
  } catch (err) {
    return res.status(err.status).send({
      status: err.status,
      error: err.error
    });
  }
});

/**
 * Update group
 *
 *
 * The user has to have admin role.
 *
 */
router.put('/:groupId', async (req, res, next) => {
  const options = {
    groupId: req.params.groupId
  };

  try {
    const result = await groups.putGroupsByGroupId(options);
    res.status(result.status || 200).send(result.data);
  } catch (err) {
    return res.status(err.status).send({
      status: err.status,
      error: err.error
    });
  }
});

/**
 * Fetch groups by user or group. Omit the query parameters to
 * fetch all groups.
 *
 *
 * The user has to have admin role.
 *
 */
router.get('/', async (req, res, next) => {
  const options = {
    page: req.query.page,
    perPage: req.query.perPage,
    memberId: req.query.memberId,
    membershipType: req.query.membershipType
  };

  try {
    const result = await groups.getGroups(options);
    res.status(result.status || 200).send(result.data);
  } catch (err) {
    return res.status(err.status).send({
      status: err.status,
      error: err.error
    });
  }
});

/**
 * Creation of new group
 *
 *
 * The user has to have admin role.
 *
 */
router.post('/', async (req, res, next) => {
  const options = {
  };

  try {
    const result = await groups.postGroups(options);
    res.status(result.status || 200).send(result.data);
  } catch (err) {
    return res.status(err.status).send({
      status: err.status,
      error: err.error
    });
  }
});

/**
 * Creation of new security group
 *
 *
 * The user has to have admin role.
 *
 */
router.post('/securityGroups', async (req, res, next) => {
  const options = {
  };

  try {
    const result = await groups.postGroupsSecurityGroups(options);
    res.status(result.status || 200).send(result.data);
  } catch (err) {
    return res.status(err.status).send({
      status: err.status,
      error: err.error
    });
  }
});

module.exports = router;
