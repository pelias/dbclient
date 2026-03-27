const through = require('through2');

function streamFactory( opts ){
  opts = opts || {};
  if( !opts.client ){ opts.client = require('./client')(); }

  // passthrough stream
  const stream = through.obj();

  stream.bulk = opts.client.helpers.bulk({
    datasource: stream,
    onDocument (doc) { return doc; }
  });

  return stream;
}

module.exports = streamFactory;
