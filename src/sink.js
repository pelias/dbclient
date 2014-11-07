
var through = require('through2'),
    BatchManager = require('./BatchManager'),
    client;

function streamFactory( opts ){

  opts = opts || {};
  if( !opts.client ){ client = require('./client'); }

  var manager = new BatchManager( opts );

  var stream = through.obj( function( item, enc, next ){
    manager.push( item, next );
  }, function(){
    manager.end();
  });

  // export client
  stream.client = client;

  return stream;
}

module.exports = streamFactory;