
var winston = require( 'pelias-logger' ).get( 'dbclient' );
var Task = require('./Task');

var defaults = {
  batchSize: 500 // maximum records per batch
};

function Batch( opts ){
  this._size = opts.batchSize || defaults.batchSize;
  this.merge = opts.merge;
  this.mergeFields = opts.mergeFields;
  this._slots = [];
  this.retries = 0;
  this.status = 999;

  // validate assign params for document merge
  if( Array.isArray(opts.mergeAssignFrom) && Array.isArray(opts.mergeAssignTo) &&
      opts.mergeAssignFrom.length === opts.mergeAssignTo.length) {
    this.mergeAssignFrom = opts.mergeAssignFrom;
    this.mergeAssignTo = opts.mergeAssignTo;
  } else if (opts.mergeAssignFrom || opts.mergeAssignTo) {
    winston.error( 'Bad assign parameters for document merging: ',
		   opts.mergeAssignFrom, opts.mergeAssignTo );
  }
}

// how many free slots are left in this batch
Batch.prototype.free = function(){
  return this._size - this._slots.length;
};

// add an record to the batch
Batch.prototype.push = function( record ){
  this._slots.push( new Task( record ) );
};

module.exports = Batch;
