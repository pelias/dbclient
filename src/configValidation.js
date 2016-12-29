'use strict';

const Joi = require('joi');

// Schema Configuration
// dbclient.statFrequency: populated by defaults if not overridden
// esclient: object, validation performed by elasticsearch module
const schema = Joi.object().keys({
  dbclient: {
    statFrequency: Joi.number().integer().min(0)
  },
  esclient: Joi.object()
}).requiredKeys('dbclient', 'dbclient.statFrequency', 'esclient').unknown(true);

module.exports = {
  validate: function validate(config) {
    Joi.validate(config, schema, (err, value) => {
      if (err) {
        throw new Error(err.details[0].message);
      }
    });
  }

};
