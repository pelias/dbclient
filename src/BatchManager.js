const Batch = require('./Batch');
const transaction = require('./transaction');
const pelias_logger = require( 'pelias-logger' );

const Stats = require('./stats');

function BatchManager( opts ){
  // manager variable options
  this._opts = opts || {};
  if( !this._opts.flooding ){ this._opts.flooding = {}; }
  if( !this._opts.flooding.pause ){ this._opts.flooding.pause = 5; }
  if( !this._opts.flooding.resume ){ this._opts.flooding.resume = 2; }

  // set up logger
  const logger_name = this._opts.name ? `dbclient-${this._opts.name}` : 'dbclient';
  this._logger = pelias_logger.get(logger_name);

  // set up stats tracker
  this._stats = new Stats(this._logger);

  // internal variables
  this._current = new Batch( this._opts );
  this._transient = 0;
  this._resumeFunc = undefined;

  this._stats.watch( 'paused', function(){
    return this.isPaused();
  }.bind(this));

  this._stats.watch( 'transient', function(){
    return this._transient;
  }.bind(this));

  this._stats.watch( 'current_length', function(){
    return this._current._slots.length;
  }.bind(this));
}

// dispatch batch
BatchManager.prototype._dispatch = function( batch, next ){

  this._transient++; // record active transactions

  // perform the transaction
  transaction( this._opts.client , this._logger)( batch, function( err ){

    // console.log( 'batch status', batch.status );

    if( err ){
      this._stats.inc( 'batch_error', 1 );
      this._logger.error( 'transaction error', err );
    }

    else {
      this._stats.inc( 'indexed', batch._slots.length );
      this._stats.inc( 'batch_ok', 1 );

      var types = {};
      var failures = 0;

      batch._slots.forEach( function( task ){
        if( task.status < 299 ){
          const type = task.data.layer || task.cmd.index._type;
          if( !types.hasOwnProperty( type ) ){
            types[ type ] = 0;
          }
          types[ type ]++;
        } else {
          failures++;
        }
      });

      this._stats.inc( 'batch_retries', batch.retries );
      this._stats.inc( 'failed_records', failures );

      for( var type in types ){
        this._stats.inc( type, types[type] );
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
    this._stats.end();

    if ('function' === typeof next) {
      next();
    }
    // hc.end();
  }
};

BatchManager.prototype._attemptPause = function( next ){
  if( this._transient >= this._opts.flooding.pause ){
    if( this.isPaused() ){
      this._logger.error( 'FATAL: double pause' );
      process.exit(1);
    }

    if( 'function' !== typeof next ){
      this._logger.error( 'FATAL: invalid next', next );
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
