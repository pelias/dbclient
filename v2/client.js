const _ = require('lodash');
const { Client } = require('@elastic/elasticsearch');
const config = require('pelias-config').generate();
const { legacyToModern } = require('../configMap');

module.exports = function(){

  // use modern config
  if (_.has(config, 'elasticsearch.client')) {
    return new Client(config.elasticsearch.client);
  }

  // check for legacy config
  if (_.has(config, 'esclient')) {
    return new Client(legacyToModern(config.esclient));
  }

  // no config specified
  return new Client({});
};
