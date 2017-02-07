
var util = require('util'),
    EventEmitter = require('events').EventEmitter;

var fields = 'host,ip,bulk.active,bulk.queue,bulk.rejected,bulk.queueSize';
// var fields = 'host,ip,bulk.type,bulk.size,bulk.active,bulk.queue,bulk.queueSize,bulk.rejected,
//               bulk.largest,bulk.completed,bulk.min,bulk.max,bulk.keepAlive';
//
function ThreadpoolStatus( body ){
  var lines = ( body || '' ).trim().split('\n');
  var headers = lines.shift().trim().split(/\s+/);
  this.nodes = lines.map( function( line ){
    var cols = line.trim().split(/\s+/);
    var node = {};
    headers.forEach( function( header, i ){
      node[ header ] = ( i > 1 ) ? parseInt( cols[ i ], 10 ) : cols[ i ];
    });
    return node;
  });
}

function HealthCheck( client ){

  EventEmitter.call(this);

  this._client = client;
  this._interval = undefined;
  this._status = { threadpool: new ThreadpoolStatus() };
  this.code = HealthCheck.code.CONTINUE;

  this.start();
}

util.inherits( HealthCheck, EventEmitter );

// var grant = 'host ip bulk.active bulk.queue bulk.rejected\n';
// grant += 'elasticsearch13.localdomain 127.0.1.1 0 0    0\n';
// grant += 'elasticsearch14.localdomain 127.0.1.1 0 0    0\n';
// grant += 'elasticsearch5.localdomain  127.0.1.1 0 0  686\n';
// grant += 'elasticsearch1.localdomain  127.0.1.1 0 0  814\n';
// grant += 'elasticsearch2.localdomain  127.0.1.1 0 0  829\n';
// grant += 'elasticsearch6.localdomain  127.0.1.1 0 0  641\n';
// grant += 'elasticsearch8.localdomain  127.0.1.1 0 0    0\n';
// grant += 'elasticsearch3.localdomain  127.0.1.1 0 0 1201\n';
// grant += 'elasticsearch4.localdomain  127.0.1.1 0 0  994\n';
// grant += 'elasticsearch7.localdomain  127.0.1.1 0 0   20';

HealthCheck.code = {
  CONTINUE: 1,
  BACKOFF:  2
};

HealthCheck.prototype.start = function(){
  this._interval = setInterval( this.probe.bind(this), 500 );
};

HealthCheck.prototype.end = function(){
  clearInterval( this._interval );
};

HealthCheck.prototype.setCode = function( code ){
  if( code > this.code ){
    this.emit( 'pause' );
  } else if( code < this.code ){
    this.emit( 'resume' );
  }
  this.code = code;
};

HealthCheck.prototype.probe = function(){
  this._client.cat.threadPool( { v: true, h: fields }, function( method, body){
    if( body ){
      this._status.threadpool = new ThreadpoolStatus( body );
      this.evaluate();
    }
  }.bind(this));
};

// flood: allow x times as many batches in the queue as are currently active
// recover: allow x times as many batches in the queue as are currently active
HealthCheck.threshhold = {
  flood: 8,
  recover: 0
};

HealthCheck.prototype.evaluate = function(){
  var magnitude = { max: 0, min: 999 };
  this._status.threadpool.nodes.forEach( function( node ){
    var mag = Math.ceil( node['bulk.queue'] / node['bulk.active'] );
    if( mag > magnitude.max ){ magnitude.max = mag; }
    if( mag < magnitude.min ){ magnitude.min = mag; }
  });

  // flood
  if( magnitude.max >= HealthCheck.threshhold.flood ){
    this.setCode( HealthCheck.code.BACKOFF );

  // resume
  } else if( this.code === HealthCheck.code.BACKOFF && magnitude.max <= HealthCheck.threshhold.recover ){
    this.setCode( HealthCheck.code.CONTINUE );

  // normal operation
  }

  // else {
  //   this.setCode( HealthCheck.code[ 'CONTINUE' ] );
  // }

  // console.log( 'HealthCheck', this.code );
};

/**
[{
  'host': 'mini',
  'ip': '127.0.1.1',
  'bulk.active': 8,
  'bulk.queue': 57,
  'bulk.rejected': 10932,
  'index.active': 0,
  'index.queue': 0,
  'index.rejected': 0,
  'search.active': 0,
  'search.queue': 0,
  'search.rejected': 0
}]
**/
module.exports = HealthCheck;
