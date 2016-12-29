'use strict';

const configValidation = require('../src/configValidation');

module.exports.tests = {};

module.exports.tests.validate = function(test, common) {
  test('config without schema should throw error', function(t) {
    var config = {
      esclient: {}
    };

    t.throws(function() {
      configValidation.validate(config);
    }, /"dbclient" is required/, 'dbclient should exist');
    t.end();

  });

  test('config without dbclient.statFrequency should throw error', function(t) {
    var config = {
      dbclient: {},
      esclient: {}
    };

    t.throws(function() {
      configValidation.validate(config);
    }, /"statFrequency" is required/, 'dbclient.statFrequency should exist');
    t.end();

  });

  test('config with non-number dbclient.statFrequency should throw error', function(t) {
    [null, 'string', {}, [], false].forEach((value) => {
      var config = {
        dbclient: {
          statFrequency: value
        },
        esclient: {}
      };

      t.throws(function() {
        configValidation.validate(config);
      }, /"statFrequency" must be a number/, 'dbclient.statFrequency should be a number');

    });

    t.end();

  });

  test('config with non-integer dbclient.statFrequency should throw error', function(t) {
    var config = {
      dbclient: {
        statFrequency: 17.3
      },
      esclient: {}
    };

    t.throws(function() {
      configValidation.validate(config);
    }, /"statFrequency" must be an integer/, 'dbclient.statFrequency should be an integer');

    t.end();

  });

  test('config with non-object esclient should throw error', function(t) {
    [null, 17, [], 'string', true].forEach((value) => {
      var config = {
        dbclient: {
          statFrequency: 17
        },
        esclient: value
      };

      t.throws(function() {
        configValidation.validate(config);
      }, /"esclient" must be an object/, 'esclient should be an object');

    });

    t.end();

  });

  test('config with 0 dbclient.statFrequency and object esclient should not throw error', function(t) {
    var config = {
      dbclient: {
        statFrequency: 0
      },
      esclient: {}
    };

    t.doesNotThrow(function() {
      configValidation.validate(config);
    }, 'no error should have been thrown');

    t.end();

  });

  test('config with positive dbclient.statFrequency and object esclient should not throw error', function(t) {
    var config = {
      dbclient: {
        statFrequency: 1
      },
      esclient: {}
    };

    t.doesNotThrow(function() {
      configValidation.validate(config);
    }, 'no error should have been thrown');

    t.end();

  });

};

module.exports.all = function (tape, common) {

  function test(name, testFunction) {
    return tape('configValidation: ' + name, testFunction);
  }

  for( var testCase in module.exports.tests ){
    module.exports.tests[testCase](test, common);
  }
};
