const { HTTPS_CONFIG, HTTPS_PORT } = require('./config.js');

function createHttpsServer(app, configs = { httpsConfig: HTTPS_CONFIG, httpsPort: HTTPS_PORT }) {
  const httpsServer = app.createHttpsServer(configs.httpsConfig);
  httpsServer.listen(configs.httpsPort);
  return httpsServer;
}

module.exports = { createHttpsServer };
