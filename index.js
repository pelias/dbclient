require('./src/configValidation').validate(require('pelias-config').generate());

module.exports = (function() {
  return require('./src/sink');
})();
