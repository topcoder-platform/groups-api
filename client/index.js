var fs = require('fs');
var CodeGen = require('swagger-js-codegen').CodeGen;
var file = 'swagger.json';
var swagger = JSON.parse(fs.readFileSync(file, 'UTF-8'));
var nodeJSClientCode = CodeGen.getNodeCode({ className: 'Client', swagger: swagger });
console.log(nodeJSClientCode);
