'use strict';

const omitUnmappedFields = require('../src/omitUnmappedFields');

module.exports.tests = {};

module.exports.tests.exclude = function(test, common) {
  test('no fields returns document unchanged', function(t) {
    const doc = { name: { default: 'foo' }, popularity: 10 };
    t.equal(omitUnmappedFields([])(doc), doc);
    t.end();
  });

  test('top level and nested fields are removed', function(t) {
    const doc = {
      name: { default: 'foo' },
      popularity: 10,
      parent: { county: ['Foo'], county_a: ['FO'] }
    };
    const result = omitUnmappedFields(['popularity', 'parent.county_a', 'not_present'])(doc);
    t.deepEqual(result, { name: { default: 'foo' }, parent: { county: ['Foo'] } });
    t.end();
  });

  test('original document is not modified', function(t) {
    const parent = { county: ['Foo'], county_a: ['FO'] };
    const doc = { popularity: 10, parent: parent };
    omitUnmappedFields(['popularity', 'parent.county_a'])(doc);
    t.deepEqual(doc, { popularity: 10, parent: { county: ['Foo'], county_a: ['FO'] } });
    t.equal(doc.parent, parent);
    t.end();
  });
};

module.exports.all = function (tape, common) {

  function test(name, testFunction) {
    return tape('omitUnmappedFields: ' + name, testFunction);
  }

  for( var testCase in module.exports.tests ){
    module.exports.tests[testCase](test, common);
  }
};
