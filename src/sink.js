
var through = require('through2'),
    BatchManager = require('./BatchManager');

function streamFactory(){

  var manager = new BatchManager();

  var stream = through.obj( function( item, enc, next ){
    manager.push( item, next );
  }, function(){
    manager.flush();
  });

  return stream;
}

module.exports = streamFactory;