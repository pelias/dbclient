
var fields = 'host,ip,bulk.active,bulk.queue,bulk.rejected';

function HealthCheck( client ){
  this._client = client;
  this._interval = undefined;
  this._status = { threadpool: new ThreadpoolStatus() };
  this.code = HealthCheck.code['UNKNOWN'];

  this.start();
}

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
  'UNKNOWN':  0,
  'CONTINUE': 1,
  'BACKOFF':  2,
  'STOP':     3,
};

HealthCheck.prototype.start = function(){
  this._interval = setInterval( this.probe.bind(this), 500 );
};

HealthCheck.prototype.end = function(){
  clearInterval( this._interval );
};

HealthCheck.prototype.probe = function(){
  this._client.cat.threadPool( { v: true, h: fields }, function( method, body, status ){
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
  recover: 2
};

HealthCheck.prototype.evaluate = function(){
  var magnitude = { max: 0, min: 999 };
  this._status.threadpool.nodes.forEach( function( node ){
    var mag = Math.ceil( node['bulk.queue'] / node['bulk.active'] );
    if( mag > magnitude.max ){ magnitude.max = mag; }
    if( mag < magnitude.min ){ magnitude.min = mag; }
  });

  if( magnitude.max >= HealthCheck.threshhold.flood ){
    this.code = HealthCheck.code[ 'BACKOFF' ];
  } else if( this.code == HealthCheck.code[ 'BACKOFF' ] && magnitude.max <= HealthCheck.threshhold.recover ){
    this.code = HealthCheck.code[ 'CONTINUE' ];
  } else {
    this.code = HealthCheck.code[ 'CONTINUE' ];
  }

  console.log( 'HealthCheck', this.code );
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

module.exports = HealthCheck;