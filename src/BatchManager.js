
var Batch = require('./Batch'),
    transaction = require('./transaction'),
    client = require('./client')();
    // HealthCheck = require('./HealthCheck'),
    // hc = new HealthCheck( client );

// process.maxTickDepth = Infinity;

var flooding = {
  pause: 50,
  resume: 8
};

var debug = console.error.bind( console );
var debug = function(){};

var stats = require('./stats');
stats.start();

function BatchManager( opts ){

  this._current = new Batch();
  this._transient = 0;
  this._resumeFunc = undefined;

  // stats.watch( 'healthcheck', function(){
  //   return hc._status.threadpool.nodes;
  // }.bind(this));

  stats.watch( 'paused', function(){
    return this.isPaused();
  }.bind(this));

  stats.watch( 'transient', function(){
    return this._transient;
  }.bind(this));

  stats.watch( 'current_length', function(){
    return this._current._slots.length;
  }.bind(this));
}

// dispatch batch
BatchManager.prototype._dispatch = function( batch ){

  this._transient++; // record active transactions

  // perform the transaction
  transaction( client )( batch, function( err ){

    // console.log( 'batch status', batch.status );

    if( err ){
      stats.inc( 'batch_error', 1 );
      console.error( 'transaction error', err );
    }

    else {
      stats.inc( 'indexed', batch._slots.length );
      stats.inc( 'batch_ok', 1 );

      var types = {};
      var failures = 0;

      batch._slots.forEach( function( task ){
        if( task.status < 299 ){
          if( !types.hasOwnProperty( task.cmd.index._type ) ){
            types[ task.cmd.index._type ] = 0;
          }
          types[ task.cmd.index._type ]++;
        } else {
          failures++;
        }
      });

      stats.inc( 'batch_retries', batch.retries );
      stats.inc( 'failed_records', failures );

      for( var type in types ){
        stats.inc( type, types[type] );
      }
    }

    // console.log( 'batch complete', err, batch._slots.length );
    debug( 'transaction returned', err || 'ok!' );

    batch = {}; // reclaim memory
    // global.gc(); // call gc

    this._transient--;
    this._attemptResume();
    this._attemptEnd();

  }.bind(this));
};

BatchManager.prototype.flush = function(){
  this._dispatch( this._current );
  this._current = new Batch();
};

BatchManager.prototype._attemptEnd = function(){
  // debug('try end', this._queued.length && !this._current._slots.length);
  if( !this._transient && !this._current._slots.length ){
    // console.log( 'END!' );
    client.close();
    stats.end();
    // hc.end();
  }
};

BatchManager.prototype._attemptPause = function( next ){
  if( this._transient >= flooding.pause ){
    
    if( this.isPaused() ){
      console.error( 'FATAL: double pause' );
      process.exit(1);
    }

    if( 'function' !== typeof next ){
      console.error( 'FATAL: invalid next', next );
      process.exit(1);
    }

    this._resumeFunc = next;
  }
}

BatchManager.prototype._attemptResume = function(){
  // console.log( '_attemptResume', this.paused, this._transient, flooding.resume, this._resumeFunc );
  if( this.isPaused() && this._transient <= flooding.resume ){
    var unpause = this._resumeFunc;
    this._resumeFunc = undefined;
    unpause();
  }
}

BatchManager.prototype.isPaused = function(){
  return( 'function' === typeof this._resumeFunc );
}

// add an item to the current batch
BatchManager.prototype.push = function( item, next ){

  this._current.push( item );

  // enqueue current batch if full
  if( 0 >= this._current.free() ){
    this.flush();
  }

  this._attemptPause( next );

  if( !this.isPaused() ){
    return next();
  }
};

module.exports = BatchManager;