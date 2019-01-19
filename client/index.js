const fs = require('fs')
const CodeGen = require('swagger-js-codegen').CodeGen
const file = 'swagger.json'
const swagger = JSON.parse(fs.readFileSync(file, 'UTF-8'))
const nodeJSClientCode = CodeGen.getNodeCode({ className: 'Client', swagger: swagger })
console.log(nodeJSClientCode)
