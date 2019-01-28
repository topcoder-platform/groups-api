# TopCoder Groups API

## Prerequisites

- NodeJS (v8+)
- Neo4j Desktop (v1.1.13) https://neo4j.com/download/, it includes Neo4j 3.5
- git
- Heroku CLI
- Heroku account


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


## Local graph database setup

- download the Neo4j Desktop https://neo4j.com/download/
- install the tool
- follow (https://neo4j.com/download-thanks-desktop/?edition=desktop&flavour=winstall64&release=1.1.13&offline=true) to add graph database
- configure graph database connection details in config file


## Local Deployment

- Install dependencies `npm install`
- Run lint `npm run lint`
- Run lint fix `npm run lint:fix`
- Clear and init db `npm run init-db`
- Add index db `npm run create-index`
- Insert test data `npm run test-data`
- Start app `npm start`
- App is running at `http://localhost:3000`


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
- to initialize db, run `heroku run npm run init-db`
- to insert test data, run `heroku run npm run test-data`


I deployed the code to:
https://lit-earth-25873.herokuapp.com


## Graph Database Structure

The graph database consists of two node types: Group and User, and one relation type: GroupContains.
The GroupContains relation links from a group to a child group or user.

### Group node

The group node contains these fields:

- id: the group UUID
- name: the group name, should be unique
- description: the group description
- privateGroup: flag whether group is private
- selfRegister: flag whether group allows self register
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
- createdAt: the created at date string
- createdBy: the created by user id


## Notes

- the generated server code is not in good practice, so I totally re-write them
- security is not ready yet, a mock admin is set as current user, see src/common/auth.js,
  to test different user role, change the role in the mock user

