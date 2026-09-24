'use strict';

const path = require('path');
const proxyquire = require('proxyquire').noCallThru();
const through = require('through2');
const config = require('../src/config');

module.exports.tests = {};

module.exports.tests.functional_example = function(test, common) {
  const factory = proxyquire('../index', {
    './src/configValidation': {
      validate: () => {}
    }
  });

  test('functional example', function(t) {

    // the fake bulk response below is invalid, so the batch is retried until
    // the limit is reached: use short backoff delays so the test isn't slow
    process.env.PELIAS_CONFIG = path.resolve(__dirname + '/retry-config.json');
    config.reload();

    let finished = false;

    t.plan(2);

    var assertStream = through.obj( function( chunk, enc, next ) {
      t.fail('should not be called since we don\'t provide any output');
      next();
    });

    assertStream.on('finish', () => {
      t.equal(finished, true, 'assertStream finishes after bulk operation');
    });

    var client = {
      bulk: function( batch, cb ){
        setTimeout( function(){
          finished = true;
          cb(null);
        }, 10 );
      },
      close: function(){
        t.equal( true, true, 'client closed' );
      }
    };

    var stream = factory({ client: client });
    assertStream.on('finish', () => {
      delete process.env.PELIAS_CONFIG;
      config.reload();
    });

    stream.pipe(assertStream);
    stream.write({
      _index: 'foo',
      _id: 'foo',
      data: {}
    });

    stream.end();

  });

  test('unmapped fields are removed before bulk indexing', function(t) {
    var client = {
      bulk: function( batch, cb ){
        t.deepEqual(batch.body[1], { name: 'foo' }, 'popularity removed from document');
        setImmediate(() => cb(null, { items: [ { index: { status: 201 } } ] }));
      },
      close: function(){}
    };

    var stream = factory({ client: client, unmappedFields: ['popularity'] });
    stream.on('finish', () => t.end());
    stream.write({ _index: 'foo', _id: 'foo', data: { name: 'foo', popularity: 10 } });
    stream.end();
  });
};

module.exports.all = function (tape, common) {

  function test(name, testFunction) {
    return tape('stream: ' + name, testFunction);
  }

  for( var testCase in module.exports.tests ){
    module.exports.tests[testCase](test, common);
  }
};
