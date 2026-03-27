if (process.env.NODE_ENV !== 'test') {
  require('./src/configValidation').validate(require('pelias-config').generate());
}

module.exports = {
  v1: {
    client: require('./src/client'),
    createWriteStream: require('./src/sink')
  },
  v2: {
    client: require('./v2/client'),
    createWriteStream: require('./v2/sink')
  }
};
