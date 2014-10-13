
var through = require('through2'),
    BatchManager = require('./BatchManager');

function streamFactory(){

  var manager = new BatchManager();

  var stream = through.obj( function( item, enc, next ){
    
    // push to batch manager
    manager.push( item, next );
  
  }, function(){
    
    // clear remaining partial batch
    manager._next();
  
  });

  return stream;
}

module.exports = streamFactory;