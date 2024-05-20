# TopCoder Groups API

## Prerequisites

- NodeJS (v8+)
- Neo4j Desktop (v1.1.13) https://neo4j.com/download/, it includes Neo4j 3.5
- git
- Heroku CLI
- Heroku account

### Additional prerequisites for local performance testing
- Docker Desktop to run neo4j and redis locally. Though you can use Neo4j Desktop to run neo4j 3.x I'd still recommend using docker to maintain feature parity as the prod setup.


## Configuration

Configuration for the application is at `config/default.js` and `config/production.js`.
The following parameters can be set in config files or in env variables:

- LOG_LEVEL: the log level, default is 'debug', in production default is 'info'
- PORT: the server port, default is 3000
- API_PREFIX: the API path prefix, default is empty string ''
- GRAPH_DB_URI: Graph DB URI, default is local db URI 'bolt://localhost:7687'
- GRAPH_DB_USER: Graph DB user, default is 'neo4j'
- GRAPH_DB_PASSWORD: Graph DB password, default is '123456', you probably need to change it
- AUTH_SECRET: The authorization secret used during token verification.
- VALID_ISSUERS: The valid issuer of tokens.
- AUTH0_URL: AUTH0 URL, used to get M2M token
- AUTH0_PROXY_SERVER_URL: AUTH0 proxy server URL, used to get M2M token
- AUTH0_AUDIENCE: AUTH0 audience, used to get M2M token
- TOKEN_CACHE_TIME: AUTH0 token cache time, used to get M2M token
- AUTH0_CLIENT_ID: AUTH0 client id, used to get M2M token
- AUTH0_CLIENT_SECRET: AUTH0 client secret, used to get M2M token
- BUSAPI_URL: Bus API URL
- KAFKA_ERROR_TOPIC: Kafka error topic used by bus API wrapper
- HEALTH_CHECK_TIMEOUT: health check timeout in milliseconds

### Performance test specific configuration

Configuration for performance testing is at `config/default.js` and `config/perftest.js`.
The following parameters can be set in config files or in env variables:

- MOCK_BUSAPI_POST_EVENT: whether to mock bus api post event calls, by default set to true if NODE_ENV=perftest
- GROUPS_API_URL: Groups API server url, default: `http://localhost:3000`, change this to test a remote server
- MEMBERS_API_URL: Members API server url, default: `https://api.topcoder-dev.com/v5/members`
- TOTAL_MEMBER_SIZE: Total number of members to fetch from the members api. default: 10000. This is the complete members pool we can use when generating load on groups api.
- INITIAL_MEMBERS: Number of members to add to the test group initially before running test iterations, default: 9000.
- NUM_ITERATIONS: Number of iterations to run, the script will call bulk add members once with randomly chosen payload, default 1000.
- MEMBERS_MIN: Min number of members to add in each iteration, default 1.
- MEMBERS_MAX: Max number of members to add in each iteration, default 100.
- USE_FAKE_MEMBER: Use fake member id instead of reading from members api, default: false.
- API_CALL_TIME_LIMIT_MS: Api call time limit, default 30 seconds. Over limit API calls will be marked.

## Local graph database setup

- download the Neo4j Desktop https://neo4j.com/download/
- install the tool
- follow (https://neo4j.com/download-thanks-desktop/?edition=desktop&flavour=winstall64&release=1.1.13&offline=true) to add graph database
- configure graph database connection details in config file

## Local Deployment

- Install dependencies `npm install`
- Run lint `npm run lint`
- Run lint fix `npm run lint:fix`
- Start app `npm start`
- App will be running at `http://localhost:3000`
- Application can be run in development mode using the command `npm run dev`

## Performance Testing on local deployment

- Run neo4j and redis `docker compose up -d neo4j redis`
- Install dependencies `npm install`
- Update config file `config/perftest.js` to add `AUTH0_CLIENT_ID` and `AUTH0_CLIENT_SECRET`, or set the env variable.
- Start app in perf test mode: `npm run server-for-perf-test`
- In another terminal, run the perf test script `npm run perf-test` (set the environment if needed)
- The script will do the following:
  - Fetch members from from members api
  - Run initial bulk add members to bring the member count to INITIAL_MEMBERS
  - Run NUM_ITERATIONS individual bulk add/remove members and update group call with randomly chosen members
  - Print a summary in the end
  - Write result to a json fle.

### Notes
- API tested: 
  - addGroupMemberBulk, `POST /groups/{groupId}/members`
  - deleteGroupMemberBulk, `DELETE /groups/{groupId}/members`
  - updateGroup, `PUT /groups/{groupId}`
- Due to a defect in Members API, we can only fetch at most 10000 members at the moment, this limits how many members we can add to the group.
  - Set `USE_FAKE_MEMBERS=true` in environment or perftest.js config is a way to work around this limit, and we can reach the 50000 target.
- One bottleneck detected during the test is the BusApi post event call, this can significantly increase the response time if not addressed.
  - By default `MOCK_BUSAPI_POST_EVENT` is set to true for perf test to avoid this issue. See `config/perftest.js` for details.
  - Solution: Make this call non-blocking or send the notifications in batch to increase performance.
  - With the current setup, the response time is linearly correlated with the number of members in the payload, ~1 second per member.
- Docker image Neo4j:3.5.5-enterprise has memory and performance issues on Apple silicone, try to run the performance test on Linux or Intel MacBook.

### Results

#### Mock BUS API

- Total members: 10000
- Initial members: 9000 (chunk size 1000)
- Iterations: 1000
- Members to add in each iteration: 1-100 randomly chosen from the remaining 1000 (total - initial).

The following is the output of one test:

```
...
info: Total time ms: 518626
info: Over time limit API calls: 0
info: 
info: Setup calls summary
info:   Total: 9
info:   Successful: 9
info:   Failed: 0
info:   Max time ms: 11714
info:   Min time ms: 5781
info:   Mean time ms: 8705.222222222223
info: 
info: 
info: Iteration add member calls summary
info:   Total: 1000
info:   Successful: 1000
info:   Failed: 0
info:   Max time ms: 1367
info:   Min time ms: 23
info:   Mean time ms: 234.992
info: 
info: 
info: Iteration remove member calls summary
info:   Total: 1000
info:   Successful: 1000
info:   Failed: 0
info:   Max time ms: 1103
info:   Min time ms: 16
info:   Mean time ms: 182.891
info: 
info: 
info: Iteration update group calls summary
info:   Total: 1000
info:   Successful: 1000
info:   Failed: 0
info:   Max time ms: 147
info:   Min time ms: 10
info:   Mean time ms: 16.533
info: 
info: Result written to perf-test-2024-05-15T10:56:23.111Z.json
```

- Note there's zero API call that's over the 30s time limit.
- Setup add members has significantly higher response time due to the larger payload (1000 members vs. 1-100 members).
- Average response time for adding small number of members is 234ms
- Average response time for removing small number of members is 182ms
- Average response time for updating group is 16ms 
- A report is also written to `perf-test-2024-05-15T10:56:23.111Z.json` for further analysis. 

#### Real BUS API

- Total members: 200
- Initial members: 180 (chunk size 30)
- Iterations: 20
- Members to add in each iteration: 1-20 randomly chosen from the remaining 20 (total - initial).

```
...
info: Total time ms: 261636
info: Over time limit API calls: 6
info: [
  {
    "method": "POST",
    "url": "http://localhost:3000/groups/9815cb58-2c1d-49ff-bfc1-cc1838e2247f/members",
    "success": true,
    "timeInMs": 33747,
    "status": 200,
    "totalMembers": 30,
    "failedMembers": 0,
    "groupSize": 30,
    "isSetup": true,
    "overTimeLimit": true
  },
  {
    "method": "POST",
    "url": "http://localhost:3000/groups/9815cb58-2c1d-49ff-bfc1-cc1838e2247f/members",
    "success": true,
    "timeInMs": 31440,
    "status": 200,
    "totalMembers": 30,
    "failedMembers": 0,
    "groupSize": 60,
    "isSetup": true,
    "overTimeLimit": true
  },
  {
    "method": "POST",
    "url": "http://localhost:3000/groups/9815cb58-2c1d-49ff-bfc1-cc1838e2247f/members",
    "success": true,
    "timeInMs": 32496,
    "status": 200,
    "totalMembers": 30,
    "failedMembers": 0,
    "groupSize": 90,
    "isSetup": true,
    "overTimeLimit": true
  },
  {
    "method": "POST",
    "url": "http://localhost:3000/groups/9815cb58-2c1d-49ff-bfc1-cc1838e2247f/members",
    "success": true,
    "timeInMs": 31740,
    "status": 200,
    "totalMembers": 30,
    "failedMembers": 0,
    "groupSize": 120,
    "isSetup": true,
    "overTimeLimit": true
  },
  {
    "method": "POST",
    "url": "http://localhost:3000/groups/9815cb58-2c1d-49ff-bfc1-cc1838e2247f/members",
    "success": true,
    "timeInMs": 31451,
    "status": 200,
    "totalMembers": 30,
    "failedMembers": 0,
    "groupSize": 150,
    "isSetup": true,
    "overTimeLimit": true
  }
]
info: 
info: Setup calls summary
info:   Total: 6
info:   Successful: 6
info:   Failed: 0
info:   Max time ms: 33747
info:   Min time ms: 31440
info:   Mean time ms: 32274
info: 
info: 
info: Iteration add member calls summary
info:   Total: 20
info:   Successful: 20
info:   Failed: 0
info:   Max time ms: 11510
info:   Min time ms: 16
info:   Mean time ms: 1082.55
info: 
info: 
info: Iteration remove member calls summary
info:   Total: 20
info:   Successful: 20
info:   Failed: 0
info:   Max time ms: 2154
info:   Min time ms: 1016
info:   Mean time ms: 1208.05
info: 
info: 
info: Iteration update group calls summary
info:   Total: 20
info:   Successful: 20
info:   Failed: 0
info:   Max time ms: 2101
info:   Min time ms: 952
info:   Mean time ms: 1107.65
info: 
info: Result written to perf-test-2024-05-15T11:06:34.049Z.json
info: Cleaning up.
info: Perf test finished.
```

- 6 setup calls are over time.
- Min time in adding 30 members to a group is 32.27s 
- Mean response time is 1.08s with 1-20 members to add and 1.2s to delete.
- Update group mean time is 1.1s


## Heroku deployment
- git init
- git add .
- git commit -m 'message'
- heroku login
- heroku create [application-name] // choose a name, or leave it empty to use generated one
- heroku addons:create graphenedb:dev-free // create graph database add-on, it may need several minutes to get ready
- to set some environment variables in heroku, run command like:
  `heroku config:set LOG_LEVEL=info`
- git push heroku master // push code to Heroku

## Graph Database Structure

The graph database consists of 3 node types: Group and User, and one relation type: GroupContains.
The GroupContains relation links from a group to a child group or user.

### Group node

The group node contains these fields:

- id: the group UUID
- name: the group name, should be unique
- description: the group description
- privateGroup: flag whether group is private
- selfRegister: flag whether group allows self register
- oldId: the old id, optional
- createdAt: the created at date string
- createdBy: the created by user id
- updatedAt: the updated at date string
- updatedBy: the updated by user id


### User node

The user node contains these fields:

- id: the user UUID
- handle: the user handle, should be unique

### GroupContains relation

The GroupContains relation contains these fields:

- id: the relationship UUID
- type: the relationship type, 'group' or 'user'
- roles: the roles of the user in the group
- createdAt: the created at date string
- createdBy: the created by user id

## Swagger UI

- the swagger UI may be browsed at `http://localhost:3000/groups/docs`

