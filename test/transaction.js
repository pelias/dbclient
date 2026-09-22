const transaction = require('../src/transaction');
const Batch = require('../src/Batch');

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

module.exports.all = function (tape, common) {

  function test(name, testFunction) {
    return tape('transaction: ' + name, testFunction);
  }

  for (var testCase in module.exports.tests) {
    module.exports.tests[testCase](test, common);
  }
};
