
var Batch = require('./Batch'),
    transaction = require('./transaction'),
    winston = require( 'pelias-logger' ).get( 'dbclient' );
    // HealthCheck = require('./HealthCheck'),
    // hc = new HealthCheck( client );

// this may be required on nodejs <0.11
// process.maxTickDepth = Infinity;

// var debug = console.error.bind( console );
// var debug = function(){};

var stats = require('./stats');

function BatchManager( opts ){

  // manager variable options
  this._opts = opts || {};
  if( !this._opts.flooding ){ this._opts.flooding = {}; }
  if( !this._opts.flooding.pause ){ this._opts.flooding.pause = 50; } //50
  if( !this._opts.flooding.resume ){ this._opts.flooding.resume = 8; } //8

  // internal variables
  this._current = new Batch( this._opts );
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
BatchManager.prototype._dispatch = function( batch, next ){

  this._transient++; // record active transactions

  // perform the transaction
  transaction( this._opts.client )( batch, function( err ){

    // console.log( 'batch status', batch.status );

    if( err ){
      stats.inc( 'batch_error', 1 );
      winston.error( 'transaction error', err );
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
    // debug( 'transaction returned', err || 'ok!' );

    batch = {}; // reclaim memory
    // global.gc(); // call gc

    this._transient--;
    this._attemptResume();
    this._attemptEnd();

    if ('function' === typeof next) {
      next();
    }

  }.bind(this));
};

BatchManager.prototype.flush = function(next){
  this._dispatch( this._current, next );
  this._current = new Batch( this._opts );
};

// call this on stream end
BatchManager.prototype.end = function(next){
  this.finished = true;
  if( this._current._slots.length ){
    this.flush(next);
  } else {
    this._attemptEnd(next);
  }
};

BatchManager.prototype._attemptEnd = function(next){
  if( this.finished && !this._transient && !this._current._slots.length ){
    this._opts.client.close();
    stats.end();

    if ('function' === typeof next) {
      next();
    }
    // hc.end();
  }
};

BatchManager.prototype._attemptPause = function( next ){
  if( this._transient >= this._opts.flooding.pause ){
    if( this.isPaused() ){
      winston.error( 'FATAL: double pause' );
      process.exit(1);
    }

    if( 'function' !== typeof next ){
      winston.error( 'FATAL: invalid next', next );
      process.exit(1);
    }

    this._resumeFunc = next;
  }
};

BatchManager.prototype._attemptResume = function(){
  if( this.isPaused() && this._transient <= this._opts.flooding.resume ){
    var unpause = this._resumeFunc;
    this._resumeFunc = undefined;
    unpause();
  }
};

BatchManager.prototype.isPaused = function(){
  return( 'function' === typeof this._resumeFunc );
};

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
