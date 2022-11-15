const Task = require('./Task');
const peliasConfig = require('pelias-config').generate();

function Batch(){
  this._size = peliasConfig.dbclient.batchSize;
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