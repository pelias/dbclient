'use strict';

const configValidation = require('../src/configValidation');
const proxyquire = require('proxyquire').noCallThru();
const intercept = require('intercept-stdout');

module.exports.tests = {};

module.exports.tests.validate = function(test, common) {
  test('config without dbclient should throw error', function(t) {
    var config = {
      esclient: {},
      schema: {
        indexName: 'index_name'
      }
    };

    t.throws(function() {
      configValidation.validate(config);
    }, /"dbclient" is required/, 'dbclient should exist');
    t.end();

  });

  test('config without dbclient.statFrequency should throw error', function(t) {
    var config = {
      dbclient: {},
      esclient: {},
      schema: {
        indexName: 'index_name'
      }
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
        esclient: {},
        schema: {
          indexName: 'index_name'
        }
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
      esclient: {},
      schema: {
        indexName: 'index_name'
      }
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
        esclient: value,
        schema: {
          indexName: 'index_name'
        }
      };

      t.throws(function() {
        configValidation.validate(config);
      }, /"esclient" must be an object/, 'esclient should be an object');

    });

    t.end();

  });

  test('config with non-integer esclient.requestTimeout should throw error', function(t) {
    [null, 'string', {}, [], false].forEach((value) => {
      var config = {
        dbclient: {
          statFrequency: 17
        },
        esclient: {
          requestTimeout: value
        },
        schema: {
          indexName: 'index_name'
        }
      };

      t.throws(function() {
        configValidation.validate(config);
      }, /"requestTimeout" must be a number/, 'esclient.requestTimeout should be a number');
    });

    t.end();

  });

  test('config with non-integer esclient.requestTimeout should throw error', function(t) {
    var config = {
      dbclient: {
        statFrequency: 17
      },
      esclient: {
        requestTimeout: 17.3
      },
      schema: {
        indexName: 'index_name'
      }
    };

    t.throws(function() {
      configValidation.validate(config);
    }, /"requestTimeout" must be an integer/, 'esclient.requestTimeout should be an integer');

    t.end();

  });

  test('config with negative esclient.requestTimeout should throw error', function(t) {
    var config = {
      dbclient: {
        statFrequency: 17
      },
      esclient: {
        requestTimeout: -1
      },
      schema: {
        indexName: 'index_name'
      }
    };

    t.throws(function() {
      configValidation.validate(config);
    }, /"requestTimeout" must be larger than or equal to 0/, 'esclient.requestTimeout must be positive');

    t.end();

  });

  test('config with non-object schema should throw error', function(t) {
    [null, 'string', 17.3, [], false].forEach((value) => {
      var config = {
        dbclient: {
          statFrequency: 0
        },
        esclient: {},
        schema: value
      };

      t.throws(function() {
        configValidation.validate(config);
      }, /"schema" must be an object/);

    });

    t.end();

  });

  test('config with non-string schema.indexName should throw error', function(t) {
    [null, 17.3, {}, [], false].forEach((value) => {
      var config = {
        dbclient: {
          statFrequency: 0
        },
        esclient: {},
        schema: {
          indexName: value
        }
      };

      t.throws(function() {
        configValidation.validate(config);
      }, /"indexName" must be a string/);

    });

    t.end();

  });

  test('config without schema.indexName should throw error', function(t) {
    var config = {
      dbclient: {
        statFrequency: 0
      },
      esclient: {},
      schema: {}
    };

    t.throws(function() {
      configValidation.validate(config);
    }, /"indexName" is required/);
    t.end();

  });

  test('config with 0 dbclient.statFrequency and object esclient should not throw error', function(t) {
    var config = {
      dbclient: {
        statFrequency: 0
      },
      esclient: {},
      schema: {
        indexName: 'index_name'
      }
    };

    t.doesNotThrow(function() {
      proxyquire('../src/configValidation', {
        'elasticsearch': {
          Client: function() {
            return { indices: { exists: (indexName, cb) => { cb(false, true); } } };
          }
        }
      }).validate(config);
    }, 'no error should have been thrown');

    t.end();

  });

  test('valid config with existing index should not throw error', function(t) {
    var config = {
      dbclient: {
        statFrequency: 1
      },
      esclient: {
        requestTimeout: 17
      },
      schema: {
        indexName: 'index_name'
      }
    };

    t.doesNotThrow(() => {
      proxyquire('../src/configValidation', {
        'elasticsearch': {
          Client: function() {
            return { indices: { exists: (indexName, cb) => { cb(false, true); } } };
          }
        }
      }).validate(config);

    }, 'no error should have been thrown');

    t.end();

  });

  test('non-existent index should throw error', function(t) {
    var config = {
      dbclient: {
        statFrequency: 1
      },
      esclient: {
        requestTimeout: 17
      },
      schema: {
        indexName: 'index_name'
      }
    };

    var stderr = '';

    // intercept/swallow stderr
    var unhook_intercept = intercept(
      function() { },
      function(txt) { stderr += txt; return ''; }
    );

    t.throws(() => {
      proxyquire('../src/configValidation', {
        'elasticsearch': {
          Client: function() {
            return { indices: { exists: (indexName, cb) => { cb(false, false); } } };
          }
        }
      }).validate(config);

    }, /elasticsearch index index_name does not exist/);

    t.ok(stderr.match(/ERROR: Elasticsearch index index_name does not exist/));

    unhook_intercept();
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
