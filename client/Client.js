/*jshint -W069 */
/**
 *
 * @class Client
 * @param {(string|object)} [domainOrOptions] - The project domain or options object. If object, see the object's optional properties.
 * @param {string} [domainOrOptions.domain] - The project domain
 * @param {object} [domainOrOptions.token] - auth token - object with value property and optional headerOrQueryName and isQuery properties
 */
var Client = (function() {
    'use strict';

    var request = require('request');
    var Q = require('q');

    function Client(options) {
        var domain = (typeof options === 'object') ? options.domain : options;
        this.domain = domain ? domain : '';
        if (this.domain.length === 0) {
            throw new Error('Domain parameter must be specified as a string.');
        }
    }

    function mergeQueryParams(parameters, queryParameters) {
        if (parameters.$queryParameters) {
            Object.keys(parameters.$queryParameters)
                .forEach(function(parameterName) {
                    var parameter = parameters.$queryParameters[parameterName];
                    queryParameters[parameterName] = parameter;
                });
        }
        return queryParameters;
    }

    /**
     * HTTP Request
     * @method
     * @name Client#request
     * @param {string} method - http method
     * @param {string} url - url to do request
     * @param {object} parameters
     * @param {object} body - body parameters / object
     * @param {object} headers - header parameters
     * @param {object} queryParameters - querystring parameters
     * @param {object} form - form data object
     * @param {object} deferred - promise object
     */
    Client.prototype.request = function(method, url, parameters, body, headers, queryParameters, form, deferred) {
        var req = {
            method: method,
            uri: url,
            qs: queryParameters,
            headers: headers,
            body: body
        };
        if (Object.keys(form).length > 0) {
            req.form = form;
        }
        if (typeof(body) === 'object' && !(body instanceof Buffer)) {
            req.json = true;
        }
        request(req, function(error, response, body) {
            if (error) {
                deferred.reject(error);
            } else {
                if (/^application\/(.*\\+)?json/.test(response.headers['content-type'])) {
                    try {
                        body = JSON.parse(body);
                    } catch (e) {}
                }
                if (response.statusCode === 204) {
                    deferred.resolve({
                        response: response
                    });
                } else if (response.statusCode >= 200 && response.statusCode <= 299) {
                    deferred.resolve({
                        response: response,
                        body: body
                    });
                } else {
                    deferred.reject({
                        response: response,
                        body: body
                    });
                }
            }
        });
    };

    /**
     *
     * @method
     * @name Client#listMembersByGroup
     * @param {object} parameters - method options and parameters
     * @param {} parameters. -
     * @param {} parameters. -
     * @param {} parameters. -
     */
    Client.prototype.listMembersByGroup = function(parameters) {
        if (parameters === undefined) {
            parameters = {};
        }
        var deferred = Q.defer();
        var domain = this.domain,
            path = '/groups/'+parameters['groupId']+'/members';
        var body = parameters.$body || {},
            queryParameters = {},
            headers = parameters.$headers || {},
            form = {};

        queryParameters = mergeQueryParams(parameters, queryParameters);

        this.request('GET', domain + path, parameters, body, headers, queryParameters, form, deferred);

        return deferred.promise;
    };
    /**
     *
     * @method
     * @name Client#addMember
     * @param {object} parameters - method options and parameters
     * @param {} parameters. -
     */
    Client.prototype.addMember = function(parameters) {
        if (parameters === undefined) {
            parameters = {};
        }
        var deferred = Q.defer();
        var domain = this.domain,
            path = '/groups/' + parameters.groupId + '/members';
        var body = parameters.$body || {},
            queryParameters = {},
            headers = parameters.$headers || {},
            form = {};

        queryParameters = mergeQueryParams(parameters, queryParameters);

        this.request('POST', domain + path, parameters, body, headers, queryParameters, form, deferred);

        return deferred.promise;
    };
    /**
     *
     * @method
     * @name Client#getMembershipByGroupIdnMemberId
     * @param {object} parameters - method options and parameters
     * @param {} parameters. -
     * @param {} parameters. -
     */
    Client.prototype.getMembershipByGroupIdnMemberId = function(parameters) {
        if (parameters === undefined) {
            parameters = {};
        }
        var deferred = Q.defer();
        var domain = this.domain,
            path = '/groups/' + parameters.groupId + '/members/' + parameters.memberId;
        var body = parameters.$body || {},
            queryParameters = {},
            headers = parameters.$headers || {},
            form = {};

        queryParameters = mergeQueryParams(parameters, queryParameters);

        this.request('get', domain + path, parameters, body, headers, queryParameters, form, deferred);

        return deferred.promise;
    };
    /**
     *
     * @method
     * @name Client#removeMemberFromGroup
     * @param {object} parameters - method options and parameters
     * @param {} parameters. -
     * @param {} parameters. -
     */
    Client.prototype.removeMemberFromGroup = function(parameters) {
        if (parameters === undefined) {
            parameters = {};
        }
        var deferred = Q.defer();
        var domain = this.domain,
            path = '/groups/' + parameters.groupId + '/members/' + parameters.memberId;
        var body = parameters.$body || {},
            queryParameters = {},
            headers = parameters.$headers || {},
            form = {};

        queryParameters = mergeQueryParams(parameters, queryParameters);

        this.request('delete', domain + path, parameters, body, headers, queryParameters, form, deferred);

        return deferred.promise;
    };
    /**
     *
     * @method
     * @name Client#getMembersCount
     * @param {object} parameters - method options and parameters
     * @param {} parameters. -
     * @param {} parameters. -
     */
    Client.prototype.getMembersCount = function(parameters) {
        if (parameters === undefined) {
            parameters = {};
        }
        var deferred = Q.defer();
        var domain = this.domain,
            path = '/groups/' + parameters.groupId + '/membersCount';
        var body = parameters.$body || {},
            queryParameters = {},
            headers = parameters.$headers || {},
            form = {};

        queryParameters = mergeQueryParams(parameters, queryParameters);

        this.request('GET', domain + path, parameters, body, headers, queryParameters, form, deferred);

        return deferred.promise;
    };
    /**
     *
     * @method
     * @name Client#getGroup
     * @param {object} parameters - method options and parameters
         * @param {} parameters. -
         * @param {} parameters. -
         * @param {} parameters. -
         * @param {} parameters. -
         * @param {} parameters.fields - fields=fieldName1,fieldName2,...,fieldN  - parameter for
    choosing which fields of group that will be included in response.

    + id
    + createdAt
    + createdBy
    + updatedAt
    + updatedBy
    + name
    + description

     */
    Client.prototype.getGroup = function(parameters) {
        if (parameters === undefined) {
            parameters = {};
        }
        var deferred = Q.defer();
        var domain = this.domain,
            path = '/groups/' + parameters.groupId;
        var body = parameters.$body || {},
            queryParameters = {},
            headers = parameters.$headers || {},
            form = {};

        queryParameters = mergeQueryParams(parameters, queryParameters);

        this.request('GET', domain + path, parameters, body, headers, queryParameters, form, deferred);

        return deferred.promise;
    };
    /**
     *
     * @method
     * @name Client#deleteGroup
     * @param {object} parameters - method options and parameters
     * @param {} parameters. -
     */
    Client.prototype.deleteGroup = function(parameters) {
        if (parameters === undefined) {
            parameters = {};
        }
        var deferred = Q.defer();
        var domain = this.domain,
            path = '/groups/' + parameters.groupId;
        var body = parameters.$body || {},
            queryParameters = {},
            headers = parameters.$headers || {},
            form = {};

        queryParameters = mergeQueryParams(parameters, queryParameters);

        this.request('delete', domain + path, parameters, body, headers, queryParameters, form, deferred);

        return deferred.promise;
    };
    /**
     *
     * @method
     * @name Client#updateGroup
     * @param {object} parameters - method options and parameters
     * @param {} parameters. -
     */
    Client.prototype.updateGroup = function(parameters) {
        if (parameters === undefined) {
            parameters = {};
        }
        var deferred = Q.defer();
        var domain = this.domain,
            path = '/groups/' + parameters.groupId;
        var body = parameters.$body || {},
            queryParameters = {},
            headers = parameters.$headers || {},
            form = {};

        queryParameters = mergeQueryParams(parameters, queryParameters);

        this.request('put', domain + path, parameters, body, headers, queryParameters, form, deferred);

        return deferred.promise;
    };
    /**
     *
     * @method
     * @name Client#fetchGroupsByUserORGroup
     * @param {object} parameters - method options and parameters
     * @param {} parameters. -
     * @param {} parameters. -
     * @param {} parameters.memberId - id of membership
     * @param {} parameters.membershipType - membership type. Use 'group' if memberId is an id of a group, otherwise 'user'
     */
    Client.prototype.fetchGroupsByUserORGroup = function(parameters) {
        if (parameters === undefined) {
            parameters = {};
        }
        var deferred = Q.defer();
        var domain = this.domain,
            path = '/groups';
        var body = parameters.$body || {},
            queryParameters = {},
            headers = parameters.$headers || {},
            form = {};

        queryParameters = mergeQueryParams(parameters, queryParameters);

        this.request('GET', domain + path, parameters, body, headers, queryParameters, form, deferred);

        return deferred.promise;
    };
    /**
     *
     * @method
     * @name Client#createNewGroup
     * @param {object} parameters - method options and parameters
     */
    Client.prototype.createNewGroup = function(parameters) {
        if (parameters === undefined) {
            parameters = {};
        }
        var deferred = Q.defer();
        var domain = this.domain,
            path = '/groups';
        var body = parameters.$body || {},
            queryParameters = {},
            headers = parameters.$headers || {},
            form = {};

        queryParameters = mergeQueryParams(parameters, queryParameters);

        this.request('POST', domain + path, parameters, body, headers, queryParameters, form, deferred);

        return deferred.promise;
    };
    /**
     *
     * @method
     * @name Client#createNewSecurityGroup
     * @param {object} parameters - method options and parameters
     */
    Client.prototype.createNewSecurityGroup = function(parameters) {
        if (parameters === undefined) {
            parameters = {};
        }
        var deferred = Q.defer();
        var domain = this.domain,
            path = '/groups/securityGroups';
        var body = parameters.$body || {},
            queryParameters = {},
            headers = parameters.$headers || {},
            form = {};

        queryParameters = mergeQueryParams(parameters, queryParameters);

        this.request('POST', domain + path, parameters, body, headers, queryParameters, form, deferred);

        return deferred.promise;
    };

    return Client;
})();

exports.Client = Client;
