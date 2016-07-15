var winston = require( 'pelias-logger' ).get( 'dbclient' );
var peliasConfig = require( 'pelias-config' ).generate().dbclient;

function Stats(){
  this.data = {};
  this.active = false;
  this.watching = {};
  this.lastIndexCount = 0;
}

Stats.prototype.watch = function( key, func ){
  this.watching[ key ] = func;
};

Stats.prototype.start = function(){
  this.end();
  var interval = peliasConfig.statFrequency;
  this.interval = setInterval( this.updateStats.bind(this), interval );
};

Stats.prototype.updateStats = function(){
  if( this.data.indexed ){
    var seconds = peliasConfig.statFrequency / 1000;
    var change = this.data.indexed - this.lastIndexCount;
    this.data.persec = change / seconds;
    this.lastIndexCount = this.data.indexed;
  }

  this.runWatchers();
  this.flush();
};

Stats.prototype.flush = function(){
  winston.info( this.data );
};

Stats.prototype.runWatchers = function(){
  for( var key in this.watching ){
    this.data[ key ] = this.watching[key]();
  }
};

Stats.prototype.end = function(){
  if( this.active ){
    this.updateStats();
    clearInterval( this.interval );
    this.flush();
  }
};

Stats.prototype.inc = function( key, num ){

  // start logging stats after the first update
  if( !this.active ){
    this.active = true;
    this.start();
  }

  if( !this.data.hasOwnProperty(key) ){
    this.data[key] = 0;
  }
  this.data[key] += num;
};

module.exports = new Stats();
