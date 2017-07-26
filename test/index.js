'use strict';

const proxyquire = require('proxyquire').noCallThru();

module.exports.tests = {};

module.exports.tests.interface = function(test) {
  test('configValidation not throwing error should return a function', function(t) {
    const factory = proxyquire('../index', {
      './src/configValidation': {
        validate: () => {}
      }
    });

    t.equal(typeof factory, 'function', 'stream factory');
    t.end();

  });

  test('calling factory function should return a stream', function(t) {
    // pass in opts so it doesn't tie into an actual ES instance
    const opts =  { client: {} };

    var stream = proxyquire('../index', {
      './src/configValidation': {
        validate: () => {}
      }
    })(opts);

    t.equal(typeof stream, 'object', 'valid stream');
    t.equal(typeof stream._read, 'function', 'valid readable');
    t.equal(typeof stream._write, 'function', 'valid writeable');
    t.end();
    
  });

};

module.exports.tests.invalidConfig = function(test) {
  test('configValidation throwing error should rethrow', function(t) {
    const env = process.env.NODE_ENV;
    // validation is skipping by default in test environment
    process.env.NODE_ENV = 'development';

    t.throws(function() {
      proxyquire('../index', {
        './src/configValidation': {
          validate: () => {
            throw Error('config is not valid');
          }
        }
      });

    }, /config is not valid/);

    process.env.NODE_ENV = env;

    t.end();

  });

};

module.exports.all = function (tape, common) {

  function test(name, testFunction) {
    return tape('index: ' + name, testFunction);
  }

  for( var testCase in module.exports.tests ){
    module.exports.tests[testCase](test, common);
  }
};
