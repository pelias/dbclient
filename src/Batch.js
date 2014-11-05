
var Task = require('./Task');

var defaults = {
  batchSize: 500 // maximum records per batch
};

function Batch( opts ){
  this._size = opts && opts.batchSize || defaults.batchSize;
  this._slots = [];
  this.retries = 0;
  this.status = 999;
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