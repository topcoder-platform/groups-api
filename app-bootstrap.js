/**
 * App bootstrap
 */
// commenting this as need to use the pure Promise features
// global.Promise = require('bluebird')
const Joi = require('joi')

Joi.optionalId = () => Joi.string()
Joi.id = () => Joi.optionalId().required()
Joi.page = () => Joi.number().integer().min(1).default(1)
Joi.perPage = () => Joi.number().integer().min(1).default(20)
