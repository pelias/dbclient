
var through = require('through2'),
    BatchManager = require('./BatchManager');

function streamFactory( opts ){

  var manager = new BatchManager( opts );

  var stream = through.obj( function( item, enc, next ){
    manager.push( item, next );
  }, function(){
    manager.end();
  });

  return stream;
}

module.exports = streamFactory;