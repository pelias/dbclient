
var elasticsearch = require('elasticsearch'),
    settings = require('pelias-config').generate();

var singleton = null;

module.exports = function(){

  // Create new esclient with settings
  if( !singleton ){
    singleton = new elasticsearch.Client( settings.esclient || {} );
  }

  return singleton;
};
