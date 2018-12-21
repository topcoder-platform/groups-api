/**
 * @param {Object} options
 * @param {String} options.groupId The group id.
 * @param {Integer} options.page The page number.
 * @param {Integer} options.perPage The number of entities shown in one page.
 * @throws {Error}
 * @return {Promise}
 */
module.exports.getGroupsByGroupIdMembers = async (options) => {
  // Implement your business logic here...
  //
  // This function should return as follows:
  //
  // return {
  //   status: 200, // Or another success code.
  //   data: [] // Optional. You can put whatever you want here.
  // };
  //
  // If an error happens during your business logic implementation,
  // you should throw an error as follows:
  //
  // throw new Error({
  //   status: 500, // Or another error code.
  //   error: 'Server Error' // Or another error message.
  // });

  return {
    status: 200,
    data: 'getGroupsByGroupIdMembers ok!'
  };
};

/**
 * @param {Object} options
 * @param {String} options.groupId The group id.
 * @throws {Error}
 * @return {Promise}
 */
module.exports.postGroupsByGroupIdMembers = async (options) => {
  // Implement your business logic here...
  //
  // This function should return as follows:
  //
  // return {
  //   status: 200, // Or another success code.
  //   data: [] // Optional. You can put whatever you want here.
  // };
  //
  // If an error happens during your business logic implementation,
  // you should throw an error as follows:
  //
  // throw new Error({
  //   status: 500, // Or another error code.
  //   error: 'Server Error' // Or another error message.
  // });

  return {
    status: 200,
    data: 'postGroupsByGroupIdMembers ok!'
  };
};

/**
 * @param {Object} options
 * @param {String} options.groupId The group id.
 * @param {String} options.memberId The member id.
 * @throws {Error}
 * @return {Promise}
 */
module.exports.getGroupsByGroupIdMembersByMemberId = async (options) => {
  // Implement your business logic here...
  //
  // This function should return as follows:
  //
  // return {
  //   status: 200, // Or another success code.
  //   data: [] // Optional. You can put whatever you want here.
  // };
  //
  // If an error happens during your business logic implementation,
  // you should throw an error as follows:
  //
  // throw new Error({
  //   status: 500, // Or another error code.
  //   error: 'Server Error' // Or another error message.
  // });

  return {
    status: 200,
    data: 'getGroupsByGroupIdMembersByMemberId ok!'
  };
};

/**
 * @param {Object} options
 * @param {String} options.groupId The group id.
 * @param {String} options.memberId The member id.
 * @throws {Error}
 * @return {Promise}
 */
module.exports.deleteGroupsByGroupIdMembersByMemberId = async (options) => {
  // Implement your business logic here...
  //
  // This function should return as follows:
  //
  // return {
  //   status: 200, // Or another success code.
  //   data: [] // Optional. You can put whatever you want here.
  // };
  //
  // If an error happens during your business logic implementation,
  // you should throw an error as follows:
  //
  // throw new Error({
  //   status: 500, // Or another error code.
  //   error: 'Server Error' // Or another error message.
  // });

  return {
    status: 200,
    data: 'deleteGroupsByGroupIdMembersByMemberId ok!'
  };
};

/**
 * @param {Object} options
 * @param {String} options.groupId The group id.
 * @param {Boolean} options.includeSubGroups a flag to indicate whether or not include the sub groups, default to falseincludeSubGroups and includeParentGroups could not be true at the same time
 * @throws {Error}
 * @return {Promise}
 */
module.exports.getGroupsByGroupIdMembersCount = async (options) => {
  // Implement your business logic here...
  //
  // This function should return as follows:
  //
  // return {
  //   status: 200, // Or another success code.
  //   data: [] // Optional. You can put whatever you want here.
  // };
  //
  // If an error happens during your business logic implementation,
  // you should throw an error as follows:
  //
  // throw new Error({
  //   status: 500, // Or another error code.
  //   error: 'Server Error' // Or another error message.
  // });

  return {
    status: 200,
    data: 'getGroupsByGroupIdMembersCount ok!'
  };
};

/**
 * @param {Object} options
 * @param {String} options.groupId The group id.
 * @param {Boolean} options.includeSubGroups a flag to indicate whether or not include the sub groups, default to falseincludeSubGroups and includeParentGroups could not be true at the same time
 * @param {Boolean} options.includeParentGroup a flag to indicate whether to include parent groups, default to falseincludeSubGroups and includeParentGroups could not be true at the same time
 * @param {Boolean} options.oneLevel when includeSubGroups is true, it&#x27;s a flag to indicate whether or not get one level of sub groups or all the sub groups recursively, default to falsewhen includeParentGroups is true, it&#x27;s a flag to indicate whether or not get one level of parent groups or all the parent groups recursively, default to trueincludeSubGroups and includeParentGroups could not be true at the same time
 * @param {String} options.fields fields&#x3D;fieldName1,fieldName2,...,fieldN  - parameter forchoosing which fields of group that will be included in response.+ id+ createdAt+ createdBy+ updatedAt+ updatedBy+ name+ description
 * @throws {Error}
 * @return {Promise}
 */
module.exports.getGroupsByGroupId = async (options) => {
  // Implement your business logic here...
  //
  // This function should return as follows:
  //
  // return {
  //   status: 200, // Or another success code.
  //   data: [] // Optional. You can put whatever you want here.
  // };
  //
  // If an error happens during your business logic implementation,
  // you should throw an error as follows:
  //
  // throw new Error({
  //   status: 500, // Or another error code.
  //   error: 'Server Error' // Or another error message.
  // });

  return {
    status: 200,
    data: 'getGroupsByGroupId ok!'
  };
};

/**
 * @param {Object} options
 * @param {String} options.groupId The group id.
 * @throws {Error}
 * @return {Promise}
 */
module.exports.deleteGroupsByGroupId = async (options) => {
  // Implement your business logic here...
  //
  // This function should return as follows:
  //
  // return {
  //   status: 200, // Or another success code.
  //   data: [] // Optional. You can put whatever you want here.
  // };
  //
  // If an error happens during your business logic implementation,
  // you should throw an error as follows:
  //
  // throw new Error({
  //   status: 500, // Or another error code.
  //   error: 'Server Error' // Or another error message.
  // });

  return {
    status: 200,
    data: 'deleteGroupsByGroupId ok!'
  };
};

/**
 * @param {Object} options
 * @param {String} options.groupId The group id.
 * @throws {Error}
 * @return {Promise}
 */
module.exports.putGroupsByGroupId = async (options) => {
  // Implement your business logic here...
  //
  // This function should return as follows:
  //
  // return {
  //   status: 200, // Or another success code.
  //   data: [] // Optional. You can put whatever you want here.
  // };
  //
  // If an error happens during your business logic implementation,
  // you should throw an error as follows:
  //
  // throw new Error({
  //   status: 500, // Or another error code.
  //   error: 'Server Error' // Or another error message.
  // });

  return {
    status: 200,
    data: 'putGroupsByGroupId ok!'
  };
};

/**
 * @param {Object} options
 * @param {Integer} options.page The page number.
 * @param {Integer} options.perPage The number of entities shown in one page.
 * @param {String} options.memberId id of membership
 * @param {String} options.membershipType membership type. Use &#x27;group&#x27; if memberId is an id of a group, otherwise &#x27;user&#x27;
 * @throws {Error}
 * @return {Promise}
 */
module.exports.getGroups = async (options) => {
  // Implement your business logic here...
  //
  // This function should return as follows:
  //
  // return {
  //   status: 200, // Or another success code.
  //   data: [] // Optional. You can put whatever you want here.
  // };
  //
  // If an error happens during your business logic implementation,
  // you should throw an error as follows:
  //
  // throw new Error({
  //   status: 500, // Or another error code.
  //   error: 'Server Error' // Or another error message.
  // });

  return {
    status: 200,
    data: 'getGroups ok!'
  };
};

/**
 * @param {Object} options
 * @throws {Error}
 * @return {Promise}
 */
module.exports.postGroups = async (options) => {
  // Implement your business logic here...
  //
  // This function should return as follows:
  //
  // return {
  //   status: 200, // Or another success code.
  //   data: [] // Optional. You can put whatever you want here.
  // };
  //
  // If an error happens during your business logic implementation,
  // you should throw an error as follows:
  //
  // throw new Error({
  //   status: 500, // Or another error code.
  //   error: 'Server Error' // Or another error message.
  // });

  return {
    status: 200,
    data: 'postGroups ok!'
  };
};

/**
 * @param {Object} options
 * @throws {Error}
 * @return {Promise}
 */
module.exports.postGroupsSecurityGroups = async (options) => {
  // Implement your business logic here...
  //
  // This function should return as follows:
  //
  // return {
  //   status: 200, // Or another success code.
  //   data: [] // Optional. You can put whatever you want here.
  // };
  //
  // If an error happens during your business logic implementation,
  // you should throw an error as follows:
  //
  // throw new Error({
  //   status: 500, // Or another error code.
  //   error: 'Server Error' // Or another error message.
  // });

  return {
    status: 200,
    data: 'postGroupsSecurityGroups ok!'
  };
};

