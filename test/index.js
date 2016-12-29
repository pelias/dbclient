
var factory = require('../index');

module.exports.tests = {};

module.exports.tests.interface = function(test) {
  test('factory', function(t) {
    t.equal(typeof factory, 'function', 'stream factory');
    t.end();
  });
};

module.exports.tests.invalidConfig = function(test) {
  test('configValidation throwing error should rethrow', function(t) {
    t.throws(function() {
      const proxyquire = require('proxyquire').noCallThru();
      proxyquire('../index', {
        './src/configValidation': {
          validate: () => {
            throw Error('config is not valid');
          }
        }
      })();

    }, /config is not valid/);

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
