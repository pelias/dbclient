
var sink = require('./src/sink')();
var byline = require('byline');
var through = require('through2');

process.stdin.on( 'error', function(){
  console.error('something broke', arguments);
  process.exit(1);
});

process.stdin
  .pipe( byline.createStream() )
  .pipe( through.obj(function( line, _, next ){

    var chunk;
     // process.stdout.write('.');

     try {
       line = line.toString('utf8');
       chunk = JSON.parse( line );
       // console.log( chunk );
     }
     catch( e ){
        console.error('-----------------');
        console.error('-----------------');
        console.error('line>',line,'<line');
        console.error('-----------------');
        throw new Error( 'json error: ' + e.message );
     }

     // chunk.center_pointy = {
     //   lat: chunk.lat,
     //   lon: chunk.lon
     // };

      var index = chunk._index;
      var type = chunk._type;
      var id = chunk._id;

      delete chunk._index;
      delete chunk._type;
      // delete chunk.id;
      delete chunk._id;

     sink.write({
      _index: index,
      _type: type,
      _id: id,
      data: chunk.data
     });

     next();

  },function( line, _, next ){
    sink.end();
  }));