# TopCoder Groups API Verification

- import Postman collection and environment in the docs folder to Postman
- note that the Postman tests depend on the test data, so you must first run `npm run init-db` and `npm run test-data` to setup test data
- for tests of groups:
  call `create group` before other groups tests, the former will set created `GROUP_ID` to be used by the latter tests

- there are unit tests for the API, see client/README.md for details, note that the unit tests also depend on the test data
