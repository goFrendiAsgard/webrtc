const socketIo = require('socket.io');

function createIo(app, httpsServer) {
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
      // const uuid = uuidv4();
      const uuid = app.contextReference.session.userId;
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

  return io;
}

module.exports = { createIo };
