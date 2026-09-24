
var through = require('through2'),
    BatchManager = require('./BatchManager'),
    omitUnmappedFields = require('./omitUnmappedFields');

function streamFactory( opts ){
  opts = opts || {};
  if( !opts.client ){ opts.client = require('./client')(); }

  var manager = new BatchManager( opts );
  var omitUnmapped = omitUnmappedFields( opts.unmappedFields );

  var stream = through.obj( function( item, enc, next ){
    manager.push( Object.assign( {}, item, { data: omitUnmapped( item.data ) } ), next );
  }, function(next) {
    manager.end(next);
  });

  // export client
  stream.client = opts.client;

  return stream;
}

module.exports = streamFactory;
