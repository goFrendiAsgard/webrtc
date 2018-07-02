const path = require('path');
const fs = require('fs');
const https = require('https');
const Koa = require('koa');
const uuidv4 = require('uuid/v4');
const koaStatic = require('koa-static');
const socketIo = require('socket.io');

// HTTPS Configurations
const HTTPS_PORT = process.env.PORT || 3030;
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
function getUuidList() {
  return Object.keys(clients);
}
io.on('connection', (socket) => {
  // message handling, used for WebRTC signaling
  socket.on('message', (message) => {
    socket.broadcast.emit('message', message);
  });
  // uuid request (every client should do this at first)
  socket.on('requestUuid', () => {
    const uuid = uuidv4();
    clients[uuid] = socket;
    socket.emit('responseUuid', uuid);
    socket.emit('responseTalk', { talker, lastTalkTime });
    socket.broadcast.emit('responseUuidList', {
      uuidList: getUuidList(),
      shouldInitCall: false,
    });
  });
  // uuid list request (client will ask uuid list after get uuid)
  socket.on('requestUuidList', () => {
    socket.emit('responseUuidList', {
      uuidList: getUuidList(),
      shouldInitCall: true,
    });
  });
  // disconnect request (client will send this on unload)
  socket.on('leave', (uuid) => {
    delete clients[uuid];
    socket.broadcast.emit('responseUuidList', {
      uuidList: getUuidList(),
      shouldInitCall: false,
    });
  });
  // talk request
  socket.on('requestTalk', (uuid) => {
    const currentTime = (new Date()).getTime();
    if (!talker || currentTime > lastTalkTime + 1000) {
      talker = uuid;
      lastTalkTime = currentTime;
    }
    socket.emit('responseTalk', { talker, lastTalkTime });
    socket.broadcast.emit('responseTalk', { talker, lastTalkTime });
  });
});

console.log(`Server running. Visit https://localhost: ${HTTPS_PORT} in Firefox/Chrome.`);
