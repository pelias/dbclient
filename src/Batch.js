
var Task = require('./Task');

var defaults = {
  batchSize: 500 // maximum records per batch
};

function Batch( opts ){
  this._size = opts.batchSize || defaults.batchSize;
  this._merge = opts.merge;
  this._mergeFields = opts.mergeFields;
  this._client = opts.client;
  this._slots = [];
  this.retries = 0;
  this.status = 999;
}

// how many free slots are left in this batch
Batch.prototype.free = function(){
  return this._size - this._slots.length;
};

// how many free slots are left in this batch
Batch.prototype.getMerge = function(){
  return this.merge;
};

// how many free slots are left in this batch
Batch.prototype.setMerge = function(val) {
  this.merge = val;
};

// add an record to the batch
Batch.prototype.push = function( record ){
  this._slots.push( new Task( record ) );
};

module.exports = Batch;
