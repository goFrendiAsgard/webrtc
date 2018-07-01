const path = require('path');
const fs = require('fs');
const https = require('https');
const Koa = require('koa');
const koaStatic = require('koa-static');
const socketIo = require('socket.io');

const HTTPS_PORT = process.env.PORT || 8443;
const HTTPS_CONFIG = {
  key: fs.readFileSync('key.pem'),
  cert: fs.readFileSync('cert.pem'),
};

const app = new Koa();
app.use(koaStatic(path.resolve(path.dirname(__dirname), 'client')));
app.use(koaStatic(path.resolve(path.dirname(__dirname), 'node_modules', 'socket.io-client', 'dist')));
app.use(koaStatic(path.resolve(path.dirname(__dirname), 'node_modules', 'jquery', 'dist')));
app.use(koaStatic(path.resolve(path.dirname(__dirname), 'node_modules', 'webrtc-adapter', 'out')));

const httpsServer = https.createServer(HTTPS_CONFIG, app.callback());
httpsServer.listen(HTTPS_PORT);

const io = socketIo(httpsServer);
io.on('connection', (socket) => {
  socket.on('message', (message) => {
    console.log('Received %s', JSON.stringify(message));
    socket.emit('message', message);
    socket.broadcast.emit('message', message);
  });
});

console.log(`Server running. Visit https://localhost: ${HTTPS_PORT} in Firefox/Chrome.
Some important notes:
  * Note the HTTPS; there is no HTTP -> HTTPS redirect.\n\
  * You'll also need to accept the invalid TLS certificate.\n\
  * Some browsers or OSs may not allow the webcam to be used by multiple pages at once. You may need to use two different browsers or machines.`);
