
var elasticsearch = require('elasticsearch'),
    settings = require('pelias-config').generate();

module.exports = function(){

  // Create new esclient with settings
  var client = new elasticsearch.Client( settings.export().esclient || {} );
  
  return client;
};