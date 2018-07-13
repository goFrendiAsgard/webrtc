const { HTTPS_PORT } = require('./config.js');
const { createApp } = require('./app.js');
const { createHttpsServer } = require('./httpsServer');
const { createIo } = require('./io.js');

const app = createApp();
const httpsServer = createHttpsServer(app);
const io = createIo(app, httpsServer);

module.exports = { app, httpsServer, io };
if (require.main === module) {
  httpsServer.listen(HTTPS_PORT, () => {
    console.log(`Server running. Visit https://localhost:${HTTPS_PORT} in Firefox/Chrome.`);
  });
}
