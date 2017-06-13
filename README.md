
## Install Dependencies

```bash
$ npm install
```

## Usage in normal indexing

```
var peliasDbClient = require( 'pelias-dbclient' );

var myDataStream;
// Create your standard nodejs data stream here ...

var client = peliasDbClient({});
myDataStream.pipe(client);

// Then write docs to the stream

```


## Update ES index by adding new fields to existing docs

```
var client = peliasDbclient({
    merge: true,
    mergeFields: ['name'],     // optional list of fields that need merging (default = whole doc)
    mergeAssignFrom: ['name'], // to keep the phrase field valid when name changes.
    mergeAssignTo: ['phrase']  // target field for each 'From' array entry above.
                               // mergeAssignFrom.length must match mergeAssignTo.length
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

Travis tests every release against Node.js versions `4` and `6`

[![Build Status](https://travis-ci.org/pelias/dbclient.png?branch=master)](https://travis-ci.org/pelias/dbclient)
