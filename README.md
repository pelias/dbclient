## Install Dependencies

[![Greenkeeper badge](https://badges.greenkeeper.io/pelias/dbclient.svg)](https://greenkeeper.io/)

```bash
$ npm install
```

## Usage
This module returns “streamFactory” —a function that produces a transforming stream. The stream puts documents into elasticsearch during import pipeline. Note: this stream triggers finish event only after all documents are stored into elasticsearch.


```javascript
'use strict';

// some_importer.js

const streamify = require('stream-array');
const through = require('through2');
const Document = require('pelias-model').Document;
const dbMapper = require('pelias-model').createDocumentMapperStream;
const dbclient = require('pelias-dbclient');

const elasticsearch = require('elasticsearch');
const config = require('pelias-config').generate();
const elasticDeleteQuery = require('elastic-deletebyquery');

const timestamp = Date.now();

const stream = streamify([1, 2, 3])
  .pipe(through.obj((item, enc, next) => {
    const uniqueId = [ 'docType', item ].join(':'); // documents with the same id will be updated
    const doc = new Document( 'sourceType', 'venue', uniqueId );
    doc.timestamp = timestamp;
    next(null, doc);
  }))
  .pipe(dbMapper())
  .pipe(dbclient()); // put documents into elasticsearch
    
stream.on('finish', () => {
  // let's assume that documents with the same type but another timestamp (for example old copies)
  // have to be deleted
  const client = new elasticsearch.Client(config.esclient);
  elasticDeleteQuery(client);
    
  const options = {
    index: config.schema.indexName,
    type: 'venue',
    body: {
      query: {
        "bool": {
          "must": [
            {"term": { "source":  "sourceType" }}
          ],
          "must_not": [
            {"term": { "timestamp":  timestamp }}
          ]
        }
      }
    }
  };
  
  client.deleteByQuery(options, (err, response) => {
    console.log('The elements deleted are: %s', response.elements);
  });
});

```

## Contributing

Please fork and pull request against upstream master on a feature branch.

Pretty please; provide unit tests and script fixtures in the `test` directory.

### Running Unit Tests

```bash
$ npm test
```

### Continuous Integration

Travis tests every release against Node.js versions `4` and `6`

[![Build Status](https://travis-ci.org/pelias/dbclient.png?branch=master)](https://travis-ci.org/pelias/dbclient)
