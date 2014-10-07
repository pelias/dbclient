
var tape = require('tape');
var common = {};

var tests = [
  require('./index'),
  require('./stream')
  // other tests go here
];

tests.map(function(t) {
  t.all(tape, common);
});