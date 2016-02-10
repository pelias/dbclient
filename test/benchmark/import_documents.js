var fs = require( 'fs' );
var readline = require( 'byline' );

var dbclient = require('../../index');
var through = require( 'through2' );
var sink = require( 'through2-sink' );


var test_file = "./test/data/importer.out";
var lineStream = readline.createStream();
var dataStream = fs.createReadStream(test_file);
var esStream = dbclient();

var i = 0;

var parseStream = through({ objectMode: true, highWaterMark: 10000}, function(chunk, enc, next) {
  var obj = JSON.parse(chunk);
  return next(null, obj);
});

dataStream.pipe(lineStream)
  .pipe(parseStream)
  .pipe(esStream)
  .on('end', function() {
    console.log("done");
  });
