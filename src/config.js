const _ = require('lodash');
const config = require('pelias-config');

/**
 * config.js contains convenience methods for
 * loading/reloading/retrieving values from
 * pelias/config.
 *
 * the reload method is intended to be used during
 * testing where the PELIAS_CONFIG env var has
 * been set/updated.
 */

var state;

const get = (path, defaultValue) => _.get(state, path, defaultValue);
const reload = function(){ state = _.get(config.generate(), 'dbclient', {}); };

// initialize state
reload();

module.exports = { get, reload };
