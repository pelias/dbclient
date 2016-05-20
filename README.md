
## Install Dependencies

```bash
$ npm install
```

## Usage in normal indexing

```
var peliasDbClient = require( 'pelias-dbclient' );

var mydataStream;
// Create your standard nodejs data stream here ...

var client = peliasDbClient({});
myDataStream.pipe(client);

// Then write docs to the pipe

```


## Update ES index by adding new fields to existing docs

```
var client = peliasDbclient({
    merge: true,
    mergeFields: ['name'],     // list new fields if they are known in advance
    mergeAssignFrom: ['name'], // to keep the phrase field valid when name changes
    mergeAssignTo: ['phrase']
  });
  // Index as usual. Whenever document ids match, the new data updates the old doc.
```

## Contributing

Please fork and pull request against upstream master on a feature branch.

Pretty please; provide unit tests and script fixtures in the `test` directory.

### Running Unit Tests

```bash
$ npm test
```

### Continuous Integration

Travis tests every release against node versions `0.10`, `0.12`, `4.x` and `5.x`

[![Build Status](https://travis-ci.org/pelias/dbclient.png?branch=master)](https://travis-ci.org/pelias/dbclient)
