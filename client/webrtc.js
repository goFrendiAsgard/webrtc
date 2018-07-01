/* global $, navigator, io, window, RTCPeerConnection, RTCSessionDescription, RTCIceCandidate */

let localVideo;
let localStream;
let remoteVideo;
let peerConnection;
let uuid;
let socket;

const peerConnectionConfig = {
  iceServers: [
    { urls: 'stun:stun.stunprotocol.org:3478' },
    { urls: 'stun:stun.l.google.com:19302' },
  ],
};

function errorHandler(error) {
  console.error('something wrong');
  console.error(error);
}

function createPeerConnectionDescription(description) {
  peerConnection.setLocalDescription(description).then(() => {
    socket.emit('message', { sdp: peerConnection.localDescription, uuid });
  }).catch(errorHandler);
}

function start(isCaller) {
  peerConnection = new RTCPeerConnection(peerConnectionConfig);
  peerConnection.addStream(localStream);
  peerConnection.onicecandidate = (event) => {
    if (event.candidate != null) {
      socket.emit('message', { ice: event.candidate, uuid });
    }
  };
  peerConnection.ontrack = (event) => {
    const [srcObject] = event.streams;
    remoteVideo[0].srcObject = srcObject;
  };
  if (isCaller) {
    console.log('jalan');
    peerConnection.createOffer().then(createPeerConnectionDescription).catch(errorHandler);
  }
}

function pageReady() {
  // initialize socket
  const { hostname, port } = window.location;
  socket = port ? io.connect(`https://${hostname}:${port}`) : io.connect(`https://${hostname}`);

  // initialize components
  localVideo = $('#vid-local');
  remoteVideo = $('#vid-remote');
  $('#btn-talk').click(() => {
    socket.emit('requestTalk');
    start(true);
  });

  // initialize local video
  if (navigator.mediaDevices.getUserMedia) {
    navigator.mediaDevices.getUserMedia({ video: true, audio: true }).then((stream) => {
      localStream = stream;
      localVideo[0].srcObject = stream;
    }).catch(errorHandler);
  } else {
    console.error('Your browser does not support getUserMedia API');
  }

  // request UUID from signaling server
  socket.emit('requestUUID');

  // get UUID from signaling server
  socket.on('responseUUID', (data) => {
    uuid = data;
    $('#lbl-uuid').html(uuid);
  });

  // get Talker from signaling server
  socket.on('talk', (data) => {
    const { talker } = data;
    $('#lbl-talker').html(talker);
  });

  // Receive Web-RTC signaling
  socket.on('message', (signal) => {
    if (!peerConnection) start(false);
    // Ignore messages from ourself
    if (!uuid || signal.uuid === uuid) return;
    if (signal.sdp) {
      peerConnection.setRemoteDescription(new RTCSessionDescription(signal.sdp)).then(() => {
        // Only create answers in response to offers
        if (signal.sdp.type === 'offer') {
          peerConnection.createAnswer().then(createPeerConnectionDescription).catch(errorHandler);
        }
      }).catch(errorHandler);
    } else if (signal.ice) {
      peerConnection.addIceCandidate(new RTCIceCandidate(signal.ice)).catch(errorHandler);
    }
  });
}

// a trick to keep eslint shut up
if (typeof module !== 'undefined') {
  module.exports = pageReady;
}
