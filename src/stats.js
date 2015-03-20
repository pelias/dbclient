var winston = require( 'pelias-logger' ).get( 'dbclient' );
var peliasConfig = require( 'pelias-config' );

function Stats(){
  this.data = {};
  this.active = false;
  this.watching = {};
}

Stats.prototype.watch = function( key, func ){
  this.watching[ key ] = func;
};

Stats.prototype.start = function(){
  this.end();
  var interval = peliasConfig.generate().dbclient.statFrequency;
  this.interval = setInterval( this.updateStats.bind(this), interval );
};

Stats.prototype.updateStats = function(){
  if( this.data.indexed ){
    if( this.lastIndexCount ){
      var indexPerSec = this.data.indexed - this.lastIndexCount;
      this.data.persec = indexPerSec;
    }
    this.lastIndexCount = this.data.indexed;
  }

  this.runWatchers();
  this.flush();
};

Stats.prototype.flush = function(){
  winston.verbose( this.data );
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
