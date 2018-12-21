var Client = require('./Client').Client;
var tcGroupsAPIClient=new Client("http://localhost:3000");
const options = {
  groupId: 1,
  page: 2,
  perPage: 3
};

tcGroupsAPIClient.listMembersByGroup(options).then(function(res){
console.log(" members list is ", res.body);
});
