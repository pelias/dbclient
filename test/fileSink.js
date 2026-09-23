'use strict';

const fs = require('fs');
const os = require('os');
const path = require('path');
const tape = require('tape');
const fileSinkFactory = require('../src/fileSink');

module.exports.tests = {};

module.exports.tests.filename = function(test, common) {
  test('fileSink: filename includes name from opts', function(t) {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'pelias-filesink-'));
    const stream = fileSinkFactory(tmpDir, { name: 'openstreetmap' });
    stream.write({ _index: 'pelias', _id: 'a', data: { name: 'foo', layer: 'venue' } });
    stream.end(function() {
      const files = fs.readdirSync(tmpDir).filter(f => f.endsWith('.ndjson'));
      t.equal(files.length, 1, 'one file created');
      t.ok(files[0].startsWith('pelias_openstreetmap_'), 'filename includes importer name');
      fs.rmSync(tmpDir, { recursive: true });
      t.end();
    });
  });

  test('fileSink: filename uses pelias prefix without name', function(t) {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'pelias-filesink-'));
    const stream = fileSinkFactory(tmpDir);
    stream.write({ _index: 'pelias', _id: 'a', data: { name: 'foo', layer: 'venue' } });
    stream.end(function() {
      const files = fs.readdirSync(tmpDir).filter(f => f.endsWith('.ndjson'));
      t.equal(files.length, 1, 'one file created');
      t.ok(files[0].startsWith('pelias_'), 'filename uses default pelias prefix');
      t.notOk(files[0].startsWith('pelias_undefined'), 'filename does not include undefined');
      fs.rmSync(tmpDir, { recursive: true });
      t.end();
    });
  });
};

module.exports.tests.writes_ndjson = function(test, common) {
  test('fileSink: writes documents as ndjson', function(t) {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'pelias-filesink-'));
    const stream = fileSinkFactory(tmpDir);

    const docs = [
      { _index: 'pelias', _id: 'a', data: { name: 'foo', layer: 'venue' } },
      { _index: 'pelias', _id: 'b', data: { name: 'bar', layer: 'address' } },
      { _index: 'pelias', _id: 'c', data: { name: 'baz', layer: 'venue' } }
    ];

    docs.forEach(doc => stream.write(doc));

    stream.end(function() {
      const files = fs.readdirSync(tmpDir).filter(f => f.endsWith('.ndjson'));
      t.equal(files.length, 1, 'one ndjson file created');

      const lines = fs.readFileSync(path.join(tmpDir, files[0]), 'utf8')
        .trim().split('\n')
        .map(l => JSON.parse(l));

      t.equal(lines.length, 3, 'three lines written');
      t.deepEqual(lines[0], docs[0].data, 'first doc data matches');
      t.deepEqual(lines[1], docs[1].data, 'second doc data matches');
      t.deepEqual(lines[2], docs[2].data, 'third doc data matches');

      fs.rmSync(tmpDir, { recursive: true });
      t.end();
    });
  });

  test('fileSink: handles docs with mixed and missing layers', function(t) {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'pelias-filesink-'));
    const stream = fileSinkFactory(tmpDir);

    const docs = [
      { _index: 'pelias', _id: 'a', data: { name: 'foo', layer: 'venue' } },
      { _index: 'pelias', _id: 'b', data: { name: 'bar', layer: 'address' } },
      { _index: 'pelias', _id: 'c', data: { name: 'baz', layer: 'venue' } },
      { _index: 'pelias', _id: 'd', data: { name: 'qux' } }  // no layer → 'default'
    ];

    docs.forEach(doc => stream.write(doc));

    stream.end(function() {
      const files = fs.readdirSync(tmpDir).filter(f => f.endsWith('.ndjson'));
      t.equal(files.length, 1, 'one ndjson file created');

      const lines = fs.readFileSync(path.join(tmpDir, files[0]), 'utf8')
        .trim().split('\n');
      t.equal(lines.length, 4, 'all four docs written');

      fs.rmSync(tmpDir, { recursive: true });
      t.end();
    });
  });

  test('fileSink: removes excluded fields', function(t) {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'pelias-filesink-'));
    const stream = fileSinkFactory(tmpDir, { excludedFields: ['popularity'] });

    stream.write({ _index: 'pelias', _id: 'a', data: { name: 'foo', layer: 'venue', popularity: 10 } });

    stream.end(function() {
      const files = fs.readdirSync(tmpDir).filter(f => f.endsWith('.ndjson'));
      const line = JSON.parse(fs.readFileSync(path.join(tmpDir, files[0]), 'utf8'));
      t.deepEqual(line, { name: 'foo', layer: 'venue' }, 'popularity removed');

      fs.rmSync(tmpDir, { recursive: true });
      t.end();
    });
  });
};

module.exports.all = function(tape, common) {
  function test(name, testFunction) {
    return tape('fileSink: ' + name, testFunction);
  }

  for (var testCase in module.exports.tests) {
    module.exports.tests[testCase](test, common);
  }
};
