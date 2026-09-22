const path = require('path');
const proxyquire = require('proxyquire').noCallThru();
const config = require('../src/config');

module.exports.tests = {};

// BatchManager builds a client on construction, which a test has no use for
function createManager(opts) {
  const BatchManager = proxyquire('../src/BatchManager', {});
  return new BatchManager(opts);
}

module.exports.tests.flooding = function (test) {
  test('flooding thresholds default when nothing is configured', function (t) {
    delete process.env.PELIAS_CONFIG;
    config.reload();

    const manager = createManager({});

    t.equals(manager._opts.flooding.pause, 5, 'pause defaults to 5 in flight');
    t.equals(manager._opts.flooding.resume, 2, 'resume defaults to 2 in flight');
    t.end();
  });

  test('flooding thresholds can be set from pelias.json', function (t) {
    process.env.PELIAS_CONFIG = path.resolve(__dirname + '/test-config.json');
    config.reload();

    const manager = createManager({});

    t.equals(manager._opts.flooding.pause, 9, 'pause comes from config');
    t.equals(manager._opts.flooding.resume, 4, 'resume comes from config');
    t.end();

    delete process.env.PELIAS_CONFIG;
    config.reload();
  });

  test('opts take priority over config', function (t) {
    process.env.PELIAS_CONFIG = path.resolve(__dirname + '/test-config.json');
    config.reload();

    const manager = createManager({ flooding: { pause: 3, resume: 1 } });

    t.equals(manager._opts.flooding.pause, 3, 'opts win for pause');
    t.equals(manager._opts.flooding.resume, 1, 'opts win for resume');
    t.end();

    delete process.env.PELIAS_CONFIG;
    config.reload();
  });
};

module.exports.all = function (tape, common) {

  function test(name, testFunction) {
    return tape('BatchManager: ' + name, testFunction);
  }

  for (var testCase in module.exports.tests) {
    module.exports.tests[testCase](test, common);
  }
};
