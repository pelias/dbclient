const Batch = require('../src/Batch');
const path = require('path');
const config = require('../src/config');

module.exports.tests = {};

module.exports.tests.validate = function (test) {
  test('batch size from opts should be prioritised', function (t) {

    process.env.PELIAS_CONFIG = path.resolve(__dirname + '/test-config.json');

    const opts = {
      batchSize: 200
    };

    const batch = new Batch(opts);

    t.equals(batch.free(), 200, 'opts should be prioritised over config');
    t.end();

    delete process.env.PELIAS_CONFIG;
  });

  test('batch size from config should be used', function (t) {

    process.env.PELIAS_CONFIG = path.resolve(__dirname + '/test-config.json');
    config.reload();

    const batch = new Batch();

    t.equals(batch.free(), 1000, 'batch size from config should be used when opts do not have it');
    t.end();

    delete process.env.PELIAS_CONFIG;
    config.reload();
  });

  test('default batch size from config should be used', function (t) {

    const batch = new Batch();

    t.equals(batch.free(), 500, 'default batch size should be used when no batch size is configured');
    t.end();

  });
};

module.exports.all = function (tape, common) {

  function test(name, testFunction) {
    return tape('batch size tests: ' + name, testFunction);
  }

  for (var testCase in module.exports.tests) {
    module.exports.tests[testCase](test, common);
  }
};
