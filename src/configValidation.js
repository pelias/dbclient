'use strict';

const Joi = require('@hapi/joi');
const elasticsearch = require('elasticsearch');

// Schema Configuration
// dbclient.statFrequency: populated by defaults if not overridden
// esclient: object, validation performed by elasticsearch module
const schema = Joi.object().keys({
  dbclient: Joi.object().required().keys({
    statFrequency: Joi.number().integer().min(0).required()
  }),
  esclient: Joi.object().required().keys({
    requestTimeout: Joi.number().integer().min(0)
  }).unknown(true),
  schema: Joi.object().keys({
    indexName: Joi.string().required(),
    typeName: Joi.string().required()
  })
}).unknown(true);

module.exports = {
  validate: function validate(config) {
    const validate = schema.validate(config);
    if (validate.error) {
      throw new Error(validate.error.details[0].message);
    }

    // now verify that the index exists
    const esclient = new elasticsearch.Client(config.esclient);

    // callback that throws an error if the index doesn't exist
    const existsCallback = (error, exists) => {
      if (!exists) {
        console.error(`ERROR: Elasticsearch index ${config.schema.indexName} does not exist`);
        console.error('You must use the pelias-schema tool (https://github.com/pelias/schema/) to create the index first');
        console.error('For full instructions on setting up Pelias, see http://pelias.io/install.html');

        throw new Error(`elasticsearch index ${config.schema.indexName} does not exist`);
      }
    };

    // can also be done with promises but it's hard to test mixing the paradigms
    esclient.indices.exists({ index: config.schema.indexName }, existsCallback);
  }
};
