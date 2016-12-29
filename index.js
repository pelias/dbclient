const config = require('pelias-config');

module.exports = (function() {
  require('./src/configValidation').validate(config.generate());
  return require('./src/sink');
})();
