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
- AUTH0_URL: AUTH0 URL, used to get M2M token
- AUTH0_PROXY_SERVER_URL: AUTH0 proxy server URL, used to get M2M token
- AUTH0_AUDIENCE: AUTH0 audience, used to get M2M token
- TOKEN_CACHE_TIME: AUTH0 token cache time, used to get M2M token
- AUTH0_CLIENT_ID: AUTH0 client id, used to get M2M token
- AUTH0_CLIENT_SECRET: AUTH0 client secret, used to get M2M token
- BUSAPI_URL: Bus API URL
- KAFKA_ERROR_TOPIC: Kafka error topic used by bus API wrapper
- HEALTH_CHECK_TIMEOUT: health check timeout in milliseconds


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

## Running tests

### Configuration

Test configuration is at `config/test.js`. You don't need to change them.

The following test parameters can be set in config file or in env variables:

- AUTH_V2_URL: The auth v2 url
- AUTH_V2_CLIENT_ID: The auth v2 client id
- AUTH_V3_URL: The auth v3 url
- ADMIN_CREDENTIALS_USERNAME: The user's username with admin role
- ADMIN_CREDENTIALS_PASSWORD: The user's password with admin role
- USER_CREDENTIALS_USERNAME: The user's username with user role
- USER_CREDENTIALS_PASSWORD: The user's password with user role

### Prepare

- Start Local Neo4j.
- Various config parameters should be properly set.

### Running E2E tests with Postman

`Start` the app server before running e2e tests. You may need to set the env variables by calling `source env.sh` before calling `NODE_ENV=test npm start`.

To run postman e2e tests run:

```bash
npm run test:newman
```

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

