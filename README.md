# New Groups API

The new Groups API

### To Generate Server
  npm install -g swagger-node-codegen
  snc swagger.yaml -o ./tc-groups-apiserver

### To Start The SERVER
  cd tc-groups-apiserver
  NOTE: The version is changed from v5 to 5.0.0 to meet package.json versioning standards
  npm install
  npm start

  Server will start running on port 3000
  For Eg: Access an api like http://localhost:3000/groups/1/members


### To Generate Client Code
  Converted YAML to JSON
  JSON structure Modified to meet code-gen specifications and please find Swagger.JSON
  npm install
  node index.js, This is written to Client.js
  The client code is available in tc-groups-client/Client.js


### To Run client
  1.node clientTest.js

  2.In the generated Client.js, the dynamic routes is to be modified to include passed parameters.
  For Eg:  Line 104 is to be changed from  path = '/groups/{groupId}/members'; to
  path = '/groups/'+parameters["groupId"]+'/members';

  3.Then the promise will be in pending state since the generated servercode is not serving JSON response but the client is expecting JSON. To overcome this, need to modify src/api/routes/groups.js
  For Eg, Line 23: res.status(result.status || 200).send(result.data); to res.status(result.status || 200).json(result.data)

  When we run clientTest.js now, it will be resolved successfully.

### Where to change
  To write custom business logic, need to src/api/routes and src/api/services
