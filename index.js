
var through = require('through2');

function streamFactory(){

  var stream = through.obj( function( item, enc, next ){

    item.test = 'test1';
    this.push(item);

    next();

  });

  return stream;

}

module.exports = streamFactory;