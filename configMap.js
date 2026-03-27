const _ = require('lodash');

/**
 * This module is responsible for mapping betwen the legacy `npm elasticsearch`
 * config format and the modern `npm @elastic/elasticsearch` format.
 * 
 * legacy: https://www.elastic.co/guide/en/elasticsearch/client/elasticsearch-js/16.x/config-options.html
 * modern: https://www.elastic.co/docs/reference/elasticsearch/clients/javascript/basic-config#maxretries
 */

const modernToLegacy = (modern) => {
  const legacy = {};

  // modern config allows for *either* the key 'node' (string) or 'nodes' ([]string)
  const nodes = _.has(modern, 'nodes') ? _.get(modern, 'nodes') : [_.get(modern, 'node', {})];
  _.set(legacy, 'hosts', nodes);

  // map basic configuration options
  _.set(legacy, 'maxRetries', _.get(modern, 'maxRetries', undefined));
  _.set(legacy, 'requestTimeout', _.get(modern, 'requestTimeout', undefined));

  return legacy;
};

const legacyToModern = (legacy) => {
  const modern = {};

  // legacy config allows for *either* the key 'host' (string) or 'hosts' ([]string|[]Object)
  const hosts = _.has(legacy, 'hosts') ? _.get(legacy, 'hosts') : [_.get(legacy, 'host', {})];
  _.set(modern, 'nodes', hosts.map(host => {
    if (_.isObject(host)) { host = `${host.protocol}://${host.host}:${host.port}`; }
    return host;
  }));

  // map basic configuration options
  _.set(modern, 'maxRetries', _.get(legacy, 'maxRetries', undefined));
  _.set(modern, 'requestTimeout', _.get(legacy, 'requestTimeout', undefined));

  return modern;
};

module.exports = { modernToLegacy, legacyToModern };