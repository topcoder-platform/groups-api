/**
 * App bootstrap
 */
global.Promise = require('bluebird')
const Joi = require('joi')

Joi.optionalId = () => Joi.alternatives().try(Joi.number(), Joi.string());
Joi.id = () => Joi.optionalId().required()
Joi.page = () => Joi.number().integer().min(1).default(1)
Joi.perPage = () => Joi.number().integer().min(1).default(20)
