
var through = require('through2');
var osm = require('openstreetmap-stream');

// var fs = require('fs');
// var osm = require('osm-pbf-parser');

// fs.createReadStream('/media/hdd/somes.osm.pbf')
  // .pipe(osm())
process.stdin
  .pipe(osm.parser())
  .pipe(through.obj( function( chunk, _, next ){
    this.push( JSON.stringify( chunk, '', 0 ) + '\n' );
    next();
  }))
  .pipe(process.stdout);