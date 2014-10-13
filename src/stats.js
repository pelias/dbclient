
function Stats(){
  this.data = { start: new Date().getTime() };
}

Stats.prototype.start = function(){
  this.end();
  this.interval = setInterval( function(){
    if( this.data.indexed ){
      if( this.lastIndexCount ){
        var indexPerSec = this.data.indexed - this.lastIndexCount;
        this.data.persec = indexPerSec;
      }
      this.lastIndexCount = this.data.indexed;
    }
    this.flush();
  }.bind(this), 1000);
};

Stats.prototype.flush = function(){
  console.log( JSON.stringify( this.data, null, 2 ) );
};

Stats.prototype.end = function(){
  this.flush();
  clearInterval( this.interval );
};

Stats.prototype.inc = function( key, num ){
  if( !this.data.hasOwnProperty(key) ){
    this.data[key] = 0;
  }
  this.data[key] += num;
};

module.exports = new Stats();