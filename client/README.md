# TopCoder Groups API Client and Tests

## Prerequisites

- NodeJS (v8+)


## Configuration

Configuration for the application is at `config.js`.
The following parameters can be set in config files or in env variables:

- API_URL: the base URL of TC groups API to test, default value is 'http://localhost:3000'


## To Generate Client Code

- Convert swagger YAML to JSON, you may use http://editor.swagger.io/
- Modify JSON structure to meet code-gen specifications
- npm install
- node index.js, generated client code is written to console, you may run `node index.js > Client.js` to write it to Client.js
- In the generated Client.js, the dynamic routes need to be modified to include passed parameters.
  For Eg:  Line 104 is to be changed from `path = '/groups/{groupId}/members';` to
  `path = '/groups/'+parameters["groupId"]+'/members';`
- In the generated Client.js, the request bodies need to be modified to include passed parameters.
  For Eg:  Line 105 is to be changed from `var body = {}` to
  `var body = parameters.$body || {}`
- In the generated Client.js, the request headers need to be modified to include passed headers.
  For Eg: Line 107 is to be changed from `headers = {},` to
  `headers = parameters.$headers || {},`
- If there is future change to swagger, it is suggested to directly modify the Client.js to suit the changes,
  this is easier than doing above changes


## Server Setup

The below demo call and unit tests depend on server test data,
follow server/READMD.md to initialize database, create index, insert test data, start server app, then do below tests.


## To Run Client Demo Call

- `node clientTest.js` or `npm start`


## Unit Tests

- run unit tests: `npm run test`
- run unit tests with coverage report: `npm run cov`

