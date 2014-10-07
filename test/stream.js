
var factory = require('../index'),
    through = require('through2');

module.exports.tests = {};

module.exports.tests.interface = function(test, common) {
  test('stream interface', function(t) {
    var stream = factory();
    t.equal(typeof stream, 'object', 'valid stream');
    t.equal(typeof stream._read, 'function', 'valid readable');
    t.equal(typeof stream._write, 'function', 'valid writeable');
    t.end();
  });
};

module.exports.tests.functional_example = function(test, common) {
  test('functional example', function(t) {

    var assertStream = through.obj( function( chunk, enc, next ){
      t.equal( chunk.test, 'test1', 'transform stream' );
      t.end();
      next();
    });

    var stream = factory();
    stream.pipe(assertStream);
    stream.write({ test: 'foo' });

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