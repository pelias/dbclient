if (process.env.NODE_ENV !== 'test') {
  require('./src/configValidation').validate(require('pelias-config').generate());
}

module.exports = require('./src/sink');
