const path = require('path');
const fs = require('fs');
const https = require('https');
const Koa = require('koa');
const uuidv4 = require('uuid/v4');
const koaStatic = require('koa-static');
const socketIo = require('socket.io');

// HTTPS Configurations
const HTTPS_PORT = process.env.PORT || 8443;
const HTTPS_CONFIG = {
  key: fs.readFileSync('key.pem'),
  cert: fs.readFileSync('cert.pem'),
};

// Koa Initialization
const app = new Koa();
app.use(koaStatic(path.resolve(path.dirname(__dirname), 'client')));
app.use(koaStatic(path.resolve(path.dirname(__dirname), 'node_modules', 'socket.io-client', 'dist')));
app.use(koaStatic(path.resolve(path.dirname(__dirname), 'node_modules', 'jquery', 'dist')));
app.use(koaStatic(path.resolve(path.dirname(__dirname), 'node_modules', 'webrtc-adapter', 'out')));

// Create HTTPS server, bind it with Koa, and run it
const httpsServer = https.createServer(HTTPS_CONFIG, app.callback());
httpsServer.listen(HTTPS_PORT);

// Socket Io Initialization, bind it with existing HTTPS Server
const io = socketIo(httpsServer);
const clients = {};
let talker = '';
let lastTalkTime = (new Date()).getTime();
io.on('connection', (socket) => {
  // message, used for WebRTC signaling
  socket.on('message', (message) => {
    socket.emit('message', message);
    socket.broadcast.emit('message', message);
  });
  // uuid request
  socket.on('requestUUID', () => {
    const uuid = uuidv4();
    clients[uuid] = socket;
    socket.emit('responseUUID', uuid);
  });
  // talk request
  socket.on('requestTalk', (uuid) => {
    const currentTime = (new Date()).getTime();
    if (!talker || currentTime > lastTalkTime + 1000) {
      talker = uuid;
      lastTalkTime = currentTime;
    }
    socket.emit('talk', { talker, lastTalkTime });
  });
});

console.log(`Server running. Visit https://localhost: ${HTTPS_PORT} in Firefox/Chrome.`);
