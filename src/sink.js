
var through = require('through2'),
    BatchManager = require('./BatchManager'),
    winston = require( 'pelias-logger' ).get( 'dbclient' );

function streamFactory( opts ){
  opts = opts || {};
  if( !opts.client ){ opts.client = require('./client')(); }

  var manager = new BatchManager( opts );

  var stream = through.obj( function( item, enc, next ){
    manager.push( item, next );
  }, function(){
    manager.end();
  });

  // export client
  stream.client = opts.client;

  return stream;
}

module.exports = streamFactory;
