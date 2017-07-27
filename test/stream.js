'use strict';

const proxyquire = require('proxyquire').noCallThru();
const through = require('through2');

module.exports.tests = {};

module.exports.tests.functional_example = function(test, common) {
  const factory = proxyquire('../index', {
    './src/configValidation': {
      validate: () => {}
    }
  });

  test('functional example', function(t) {

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
        }, 500 );
      },
      close: function(){
        t.equal( true, true, 'client closed' );
      }
    };

    var stream = factory({ client: client });

    stream.pipe(assertStream);
    stream.write({
      _index: 'foo',
      _type: 'foo',
      _id: 'foo',
      data: {}
    });

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
