const path = require('path');
const fs = require('fs');
const koaEjs = require('koa-ejs');
const uuidv4 = require('uuid/v4');
const koaStatic = require('koa-static');
const socketIo = require('socket.io');
const { WebApp } = require('chiml');

// HTTPS Configurations
const HTTPS_PORT = process.env.PORT || 3030;
const HTTPS_CONFIG = {
  key: fs.readFileSync('key.pem'),
  cert: fs.readFileSync('cert.pem'),
};
const DATA_LOCATION = path.resolve(path.dirname(__dirname), 'db', 'data.json');

// Koa Initialization
const app = new WebApp();

// publish static files
app.use(koaStatic(path.resolve(path.dirname(__dirname), 'client')));
app.use(koaStatic(path.resolve(path.dirname(__dirname), 'node_modules', 'socket.io-client', 'dist')));
app.use(koaStatic(path.resolve(path.dirname(__dirname), 'node_modules', 'jquery', 'dist')));
app.use(koaStatic(path.resolve(path.dirname(__dirname), 'node_modules', 'webrtc-adapter', 'out')));

// initiate ejs middleware
koaEjs(app, {
  root: path.resolve(path.dirname(__dirname), 'view'),
  layout: false,
  viewExt: 'html',
  cache: false,
  debug: false,
});

function readData() {
  return new Promise((resolve, reject) => {
    fs.readFile(DATA_LOCATION, (error, content) => {
      if (error) {
        return reject(error);
      }
      try {
        return resolve(JSON.parse(content));
      } catch (parseError) {
        return reject(parseError);
      }
    });
  });
}

function saveData(data) {
  return new Promise((resolve, reject) => {
    try {
      const content = JSON.stringify(data, null, 2);
      return fs.writeFile(DATA_LOCATION, content, (error) => {
        if (error) {
          return reject(error);
        }
        return resolve(true);
      });
    } catch (parseError) {
      return reject(parseError);
    }
  });
}

app.addRoutes([
  {
    method: 'get',
    url: '/register',
    roles: ['loggedOut'],
    propagateCtx: true,
    controller: async (ctx) => {
      await ctx.render('register-form');
    },
  },
  {
    method: 'post',
    url: '/register',
    roles: ['loggedOut'],
    propagateCtx: true,
    controller: async (ctx) => {
      await ctx.render('register');
    },
  },
  {
    method: 'get',
    url: '/login',
    roles: ['loggedOut'],
    propagateCtx: true,
    controller: async (ctx) => {
      await ctx.render('login-form');
    },
  },
  {
    method: 'post',
    url: '/login',
    roles: ['loggedOut'],
    propagateCtx: true,
    controller: async (ctx) => {
      await ctx.render('login');
    },
  },
  {
    method: 'all',
    url: '/users',
    propagateCtx: true,
    controller: async (ctx) => {
      const users = await readData();
      await ctx.render('users', { users });
    },
  },
  {
    method: 'all',
    url: '/',
    propagateCtx: true,
    controller: async (ctx) => {
      console.log(ctx);
      await ctx.render('main');
    },
  },
]);

// Create HTTPS server, bind it with Koa, and run it
const httpsServer = app.createHttpsServer(HTTPS_CONFIG);
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
  // on disconnect
  socket.on('disconnect', () => {
    Object.keys(clients).forEach((uuid) => {
      if (clients[uuid] === socket) {
        delete clients[uuid];
        socket.broadcast.emit('responseUuidList', {
          uuidList: getUuidList(),
          shouldInitCall: false,
        });
      }
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
  // stop talk request
  socket.on('requestStopTalk', (uuid) => {
    if (talker === uuid) {
      talker = '';
      socket.emit('responseTalk', { talker, lastTalkTime });
      socket.broadcast.emit('responseTalk', { talker, lastTalkTime });
    }
  });
});

console.log(`Server running. Visit https://localhost:${HTTPS_PORT} in Firefox/Chrome.`);
