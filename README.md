<p align="center">
  <img height="100" src="https://raw.githubusercontent.com/pelias/design/master/logo/pelias_github/Github_markdown_hero.png">
</p>
<h3 align="center">A modular, open-source search engine for our world.</h3>
<p align="center">Pelias is a geocoder powered completely by open data, available freely to everyone.</p>
<p align="center">
<a href="https://github.com/pelias/dbclient/actions"><img src="https://github.com/pelias/dbclient/workflows/Continuous%20Integration/badge.svg" /></a>
<a href="https://en.wikipedia.org/wiki/MIT_License"><img src="https://img.shields.io/github/license/pelias/dbclient?style=flat&color=orange" /></a>
<a href="https://gitter.im/pelias/pelias"><img src="https://img.shields.io/gitter/room/pelias/pelias?style=flat&color=yellow" /></a>
</p>
<p align="center">
	<a href="https://github.com/pelias/docker">Local Installation</a> ·
        <a href="https://geocode.earth">Cloud Webservice</a> ·
	<a href="https://github.com/pelias/documentation">Documentation</a> ·
	<a href="https://gitter.im/pelias/pelias">Community Chat</a>
</p>
<details open>
<summary>What is Pelias?</summary>
<br />
Pelias is a search engine for places worldwide, powered by open data. It turns addresses and place names into geographic coordinates, and turns geographic coordinates into places and addresses. With Pelias, you're able to turn your users' place searches into actionable geodata and transform your geodata into real places.
<br /><br />
We think open data, open source, and open strategy win over proprietary solutions at any part of the stack and we want to ensure the services we offer are in line with that vision. We believe that an open geocoder improves over the long-term only if the community can incorporate truly representative local knowledge.
</details>

# Pelias Elasticsearch database client

This module provides a Node.js stream for bulk-inserting documents into [Elasticsearch](https://www.elastic.co/products/elasticsearch).

[![Greenkeeper badge](https://badges.greenkeeper.io/pelias/dbclient.svg)](https://greenkeeper.io/)

## Install Dependencies


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
  const client = new elasticsearch.Client(config.esclient);
  elasticDeleteQuery(client);

  const options = {
    index: config.schema.indexName,
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

CI tests every release against all currently supported Node.js versions.
