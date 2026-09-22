const path = require('path');
const transaction = require('../src/transaction');
const Batch = require('../src/Batch');
const config = require('../src/config');

module.exports.tests = {};

function makeBatch(count) {
  const batch = new Batch({ batchSize: count });
  for (let i = 0; i < count; i++) {
    batch.push({ _index: 'test', _id: 'id' + i, data: { name: 'record' + i } });
  }
  return batch;
}

// fake logger which swallows output, since these tests intentionally
// trigger error/retry logging
const silentLogger = { error: () => {}, info: () => {} };

module.exports.tests.success = function (test) {
  test('single successful bulk request does not retry', function (t) {
    const batch = makeBatch(2);

    const client = {
      bulk: function (req, cb) {
        t.equals(req.body.length, 4, 'payload contains both records');
        cb(undefined, {
          items: [
            { index: { status: 201 } },
            { index: { status: 201 } }
          ]
        });
      }
    };

    transaction(client, silentLogger)(batch, function (err) {
      t.notOk(err, 'no error');
      t.equals(batch.retries, 0, 'no retries needed');
      t.equals(batch._slots[0].status, 201);
      t.equals(batch._slots[1].status, 201);
      t.end();
    });
  });
};

module.exports.tests.retryIndexAlignment = function (test) {
  test('a partial retry does not corrupt the status of slots that were not part of it', function (t) {
    const batch = makeBatch(3);
    var calls = 0;

    const client = {
      bulk: function (req, cb) {
        calls++;

        if (calls === 1) {
          t.equals(req.body.length, 6, 'first call includes all 3 records');
          // slot 0 succeeds as an update (200), slot 1 fails, slot 2
          // succeeds as a create (201) - distinct status codes so any
          // cross-contamination between slots is detectable
          return cb(undefined, {
            items: [
              { index: { status: 200 } },
              { index: { status: 429 } },
              { index: { status: 201 } }
            ]
          });
        }

        if (calls === 2) {
          // only the failed slot (1) should be retried
          t.equals(req.body.length, 2, 'second call only retries the 1 failed record');
          return cb(undefined, {
            items: [
              { index: { status: 201 } }
            ]
          });
        }

        t.fail('unexpected extra bulk call');
      }
    };

    transaction(client, silentLogger)(batch, function () {
      // regardless of the overall outcome, the response to the retry of
      // slot 1 must never be written onto slot 0 or slot 2
      t.equals(batch._slots[0].status, 200, 'slot 0 untouched by the retry meant for slot 1');
      t.equals(batch._slots[1].status, 201, 'slot 1 correctly updated by its own retry');
      t.equals(batch._slots[2].status, 201, 'slot 2 untouched by the retry meant for slot 1');
      t.end();
    });
  });
};

module.exports.tests.recoversAfterMultipleFailingRounds = function (test) {
  test('a batch can go through multiple rounds of partial failure and still converge to success', function (t) {
    // use short backoff delays so the test isn't slow
    process.env.PELIAS_CONFIG = path.resolve(__dirname + '/retry-config.json');
    config.reload();

    const batch = makeBatch(4);
    var calls = 0;

    const client = {
      bulk: function (req, cb) {
        calls++;

        if (calls === 1) {
          // slots 1 and 3 fail, 0 and 2 succeed
          t.equals(req.body.length, 8, 'first call includes all 4 records');
          return cb(undefined, {
            items: [
              { index: { status: 201 } },
              { index: { status: 429 } },
              { index: { status: 201 } },
              { index: { status: 429 } }
            ]
          });
        }

        if (calls === 2) {
          // only the 2 previously-failed slots (1 and 3) are retried
          t.equals(req.body.length, 4, 'second call only retries the 2 failed records');
          // slot 1 still fails, slot 3 now succeeds
          return cb(undefined, {
            items: [
              { index: { status: 500 } },
              { index: { status: 201 } }
            ]
          });
        }

        if (calls === 3) {
          // only slot 1 should still be outstanding
          t.equals(req.body.length, 2, 'third call only retries the single remaining record');
          return cb(undefined, {
            items: [
              { index: { status: 201 } }
            ]
          });
        }

        t.fail('should not need a fourth bulk call once everything has succeeded');
      }
    };

    transaction(client, silentLogger)(batch, function (err) {
      t.notOk(err, 'batch eventually succeeds');
      t.equals(calls, 3, 'took exactly 3 bulk calls to resolve, no phantom retry');
      t.equals(batch.retries, 2, 'retried twice');
      t.equals(batch.status, 201, 'batch status reflects the true final outcome');

      t.equals(batch._slots[0].status, 201, 'slot 0 untouched by retries');
      t.equals(batch._slots[1].status, 201, 'slot 1 eventually succeeded');
      t.equals(batch._slots[2].status, 201, 'slot 2 untouched by retries');
      t.equals(batch._slots[3].status, 201, 'slot 3 succeeded on first retry');

      delete process.env.PELIAS_CONFIG;
      config.reload();
      t.end();
    });
  });
};

module.exports.tests.maxRetries = function (test) {
  test('batch is dropped after max retries are exhausted', function (t) {
    process.env.PELIAS_CONFIG = path.resolve(__dirname + '/retry-config.json');
    config.reload();

    const batch = makeBatch(1);

    const client = {
      bulk: function (req, cb) {
        cb(undefined, { items: [{ index: { status: 429 } }] });
      }
    };

    transaction(client, silentLogger)(batch, function (err) {
      t.ok(err, 'error returned once max retries reached');
      t.equals(batch.retries, 3, 'retried up to the configured max');

      delete process.env.PELIAS_CONFIG;
      config.reload();
      t.end();
    });
  });
};

module.exports.tests.statusRecoversAfterTimeout = function (test) {
  // regression test for a real incident: a whosonfirst import batch hit an
  // es request timeout, then fully succeeded on retry, but the ratcheting
  // batch.status bug made the client falsely treat it as still failed
  test('a request-timeout round followed by a fully successful retry does not falsely error', function (t) {
    process.env.PELIAS_CONFIG = path.resolve(__dirname + '/retry-config.json');
    config.reload();

    const batch = makeBatch(3);
    var calls = 0;

    const client = {
      bulk: function (req, cb) {
        calls++;

        if (calls === 1) {
          // simulate an ES client request timeout: err set, no resp,
          // exactly as elasticsearch's transport.js reports a 408
          return cb({ message: 'Request Timeout after 120000ms', status: 408 }, undefined);
        }

        if (calls === 2) {
          // the whole batch is resent (nothing was marked failed
          // individually on the timeout) and this time succeeds outright
          t.equals(req.body.length, 6, 'full batch resent after the timeout');
          return cb(undefined, {
            items: [
              { index: { status: 201 } },
              { index: { status: 201 } },
              { index: { status: 201 } }
            ]
          });
        }

        t.fail('should not need a third bulk call once everything has succeeded');
      }
    };

    transaction(client, silentLogger)(batch, function (err) {
      t.notOk(err, 'batch succeeds, no false-positive error');
      t.equals(calls, 2, 'resolved in 2 bulk calls, no phantom retry');
      t.equals(batch.status, 201, 'batch status reflects the actual outcome, not a stale 500');

      delete process.env.PELIAS_CONFIG;
      config.reload();
      t.end();
    });
  });
};

module.exports.all = function (tape, common) {

  function test(name, testFunction) {
    return tape('transaction: ' + name, testFunction);
  }

  for (var testCase in module.exports.tests) {
    module.exports.tests[testCase](test, common);
  }
};
