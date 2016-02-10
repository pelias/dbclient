var fs = require( 'fs' );
var readline = require( 'byline' );

var dbclient = require('../../index');
var through = require( 'through2' );
var sink = require( 'through2-sink' );

var batch_size = 1500;

var test_file = "./test/data/importer.out";

var lineStream = readline.createStream();
var dataStream = fs.createReadStream(test_file);
var outStream = process.stdout;

var i = 0;

var parseStream = through({ objectMode: true, highWaterMark: 10000}, function(chunk, enc, next) {
  var obj = JSON.parse(chunk);

  var bulk = {
    index: { _id: obj._id, _type: obj._type, _index: obj._index}
  };

  var query = JSON.stringify(bulk) + "\n";
  query = query + JSON.stringify(obj.data) + "\n";
  return next(null, query);
});

var bulk_count = 0;

var store = [];

function makeBulk() {
  var command = 'curl -s http://localhost:9200/_bulk --data-binary \'@bulk/bulkData' + bulk_count +'\'; echo\n\n';

  var data = store.join('');

  fs.appendFile('./bulk/bulkData' + bulk_count, data);
  bulk_count++;

  return command;
}


var aggregateStream = through.obj(function(chunk, enc, next) {
  store.push(chunk);

  if (store.length === batch_size) {
    this.push(makeBulk());
    store = [];
  }

  return next(null);
}, function(next) {
  if (store.length > 0) {
    this.push(makeBulk());
  }
});

dataStream.pipe(lineStream)
  .pipe(parseStream)
  .pipe(aggregateStream)
  .pipe(outStream)
