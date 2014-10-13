
var Batch = require('./Batch'),
    transaction = require('./transaction'),
    client = require('./client')(),
    HealthCheck = require('./HealthCheck'),
    hc = new HealthCheck( client );

var debug = console.error.bind( console );
var debug = function(){};

var stats = require('./stats');
stats.start();

var defaults = {
  total: 5 // maximum batches to queue in memory
};

function BatchManager( opts ){
  this._total = opts && opts.total || defaults.total;
  this._current = new Batch();
  this._queued = [];
  this._transient = 0;
  this._pause = null;
}

BatchManager.prototype._next = function(){
  debug( 'NEXT!' );
  this._queued.push( this._current );
  this._current = new Batch();

  this._flush(); // @todo: make this more intuative
};

// enqueue batch if already full
BatchManager.prototype._enqueue = function(){
  if( 0 >= this._current.free() ){
    debug( 'ENQUEUE!' );
    this._next();
  }
};

// flush batch
BatchManager.prototype._flush = function(){
  if( this._queued.length ){
    var batch = this._queued.shift();
    this._transient++; // record active transactions
    
    // perform the transaction
    var _self = this;
    transaction( client )( batch, function( err ){
      this._transient--;

      if( err ){
        stats.inc( 'batch_error', 1 );
        console.error( 'transaction error', err );
      }

      if( !err ){
        stats.inc( 'indexed', batch._slots.length );

        var types = { node: 0, way: 0, relation: 0 };

        batch._slots.forEach( function( task ){
          types[ task.data.type ]++;
        });

        stats.inc( 'batch_retries', batch.retries );
        stats.inc( 'nodes', types.node );
        stats.inc( 'ways', types.way );
        stats.inc( 'relations', types.relation );
      }

      // console.log( 'batch complete', err, batch._slots.length );
      debug( 'transaction returned', err || 'ok!' );
      this._end();
    }.bind(this));
  }
};

BatchManager.prototype._end = function(){
  // debug('try end', this._queued.length && !this._current._slots.length);
  if( !this._queued.length && !this._transient && !this._current._slots.length ){
    debug( 'END!' );
    client.close();
    stats.end();
    hc.end();
  }
};

// add an item to the current batch
BatchManager.prototype.push = function( item, next ){
  // debug( 'BatchManager push' );
  this._enqueue(); // enqueue current batch if full
  this._current.push( item );

  // accept more data
  // if( this._queued.length < this._total ){
    // debug( 'MOAR!' );
    return next();
  // }

  // pause pipeline until queue empties
  // debug( 'PAWS' );
  // this._pause = next;
};

// resume paused pipeline
BatchManager.prototype.resume = function(){
  if( 'function' == typeof this._pause ){
    if( this._queued.length < this._total ){
      debug( 'UNPAWS' );
      this._pause();
      this._pause = null;
      return true;
    }
  }
  return false;
};

module.exports = BatchManager;