
'use strict';

const fs = require('fs');
const path = require('path');
const through = require('through2');
const pelias_logger = require('pelias-logger');
const Stats = require('./stats');
const excludeFields = require('./excludeFields');

function fileSinkFactory(outputDirectory, opts) {
  opts = opts || {};
  const logger = pelias_logger.get(opts.name ? `dbclient-${opts.name}` : 'dbclient');
  const stats = new Stats(logger);
  const exclude = excludeFields(opts.excludedFields);

  const prefix = opts.name ? `pelias_${opts.name}` : 'pelias';
  const filename = `${prefix}_${Date.now()}.ndjson`;
  const filepath = path.join(outputDirectory, filename);
  let writeStream = null;

  function getWriteStream() {
    if (!writeStream) {
      writeStream = fs.createWriteStream(filepath, { flags: 'a' });
      logger.info(`fileSink: writing documents to ${filepath}`);
    }
    return writeStream;
  }

  return through.obj(function(item, enc, next) {
    const line = JSON.stringify(exclude(item.data)) + '\n';
    getWriteStream().write(line, function(err) {
      if (err) {
        logger.error('fileSink write error', err);
        stats.inc('write_error', 1);
      } else {
        stats.inc('indexed', 1);
        stats.inc(item.data.layer || 'default', 1);
      }
      next();
    });
  }, function(next) {
    if (!writeStream) {
      stats.end();
      return next();
    }
    writeStream.end(function() {
      stats.end();
      next();
    });
  });
}

module.exports = fileSinkFactory;
