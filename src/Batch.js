
var Task = require('./Task');

// Wed Oct  8 16:51:30 BST 2014
// Wed Oct  8 16:53:02 BST 2014


var defaults = {
  max: 250 // maximum records per batch
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

  // console.log( record );
  // process.exit(1);

  if( !this.free() ){
    console.error( 'batch not free' );
    return false;
  }
  // console.log( 'Batch push', record );
  this._slots.push( new Task( record ) );
  return true;
};

module.exports = Batch;