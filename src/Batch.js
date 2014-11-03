
var Task = require('./Task');

var defaults = {
  max: 500 // maximum records per batch
};

function Batch( opts ){
  this._max = opts && opts.max || defaults.max;
  this._slots = [];
  this.retries = 0;
  this.status = 999;
}

// how many free slots are left in this batch
Batch.prototype.free = function(){
  return this._max - this._slots.length;
};

// add an record to the batch
Batch.prototype.push = function( record ){
  this._slots.push( new Task( record ) );
};

module.exports = Batch;