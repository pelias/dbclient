const _ = require('lodash');
const elasticsearch = require('elasticsearch');
const config = require('pelias-config').generate();
const { modernToLegacy } = require('../configMap');

module.exports = function(){

  // use legacy config
  if (_.has(config, 'esclient')) {
    return new elasticsearch.Client(config.esclient);
  }

  // check for modern config
  if (_.has(config, 'elasticsearch.client')) {
    return new elasticsearch.Client(modernToLegacy(config.elasticsearch.client));
  }

  // no config specified
  return new elasticsearch.Client({});
};
