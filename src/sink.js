
var through = require('through2'),
    BatchManager = require('./BatchManager'),
    excludeFields = require('./excludeFields');

function streamFactory( opts ){
  opts = opts || {};
  if( !opts.client ){ opts.client = require('./client')(); }

  var manager = new BatchManager( opts );
  var exclude = excludeFields( opts.excludedFields );

  var stream = through.obj( function( item, enc, next ){
    manager.push( Object.assign( {}, item, { data: exclude( item.data ) } ), next );
  }, function(next) {
    manager.end(next);
  });

  // export client
  stream.client = opts.client;

  return stream;
}

module.exports = streamFactory;
