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

// Taken from http://stackoverflow.com/a/105074/515584
function createUUID() {
  function s4() {
    return Math.floor((1 + Math.random()) * 0x10000).toString(16).substring(1);
  }
  return `${s4() + s4()}-${s4()}-${s4()}-${s4()}-${s4()}${s4()}${s4()}`;
}

function errorHandler(error) {
  console.error('something wrong');
  console.error(error);
}

function gotIceCandidate(event) {
  if (event.candidate != null) {
    socket.emit('message', { ice: event.candidate, uuid });
  }
}

function createdDescription(description) {
  peerConnection.setLocalDescription(description).then(() => {
    socket.emit('message', { sdp: peerConnection.localDescription, uuid });
  }).catch(errorHandler);
}

function gotRemoteStream(event) {
  const [srcObject] = event.streams;
  remoteVideo[0].srcObject = srcObject;
}

function getUserMediaSuccess(stream) {
  localStream = stream;
  localVideo[0].srcObject = stream;
}

function start(isCaller) {
  peerConnection = new RTCPeerConnection(peerConnectionConfig);
  peerConnection.onicecandidate = gotIceCandidate;
  peerConnection.ontrack = gotRemoteStream;
  peerConnection.addStream(localStream);

  if (isCaller) {
    peerConnection.createOffer().then(createdDescription).catch(errorHandler);
  }
}

function gotMessageFromServer(message) {
  if (!peerConnection) start(false);

  const signal = message;

  // Ignore messages from ourself
  if (signal.uuid === uuid) return;

  if (signal.sdp) {
    peerConnection.setRemoteDescription(new RTCSessionDescription(signal.sdp)).then(() => {
      // Only create answers in response to offers
      if (signal.sdp.type === 'offer') {
        peerConnection.createAnswer().then(createdDescription).catch(errorHandler);
      }
    }).catch(errorHandler);
  } else if (signal.ice) {
    peerConnection.addIceCandidate(new RTCIceCandidate(signal.ice)).catch(errorHandler);
  }
}

function pageReady() {
  uuid = createUUID();

  localVideo = $('#localVideo');
  remoteVideo = $('#remoteVideo');
  $('#start').click(() => {
    start(true);
  });


  const { hostname, port } = window.location;
  socket = port ? io.connect(`https://${hostname}:${port}`) : io.connect(`https://${hostname}`);
  socket.on('message', gotMessageFromServer);

  const constraints = {
    video: true,
    audio: true,
  };

  if (navigator.mediaDevices.getUserMedia) {
    navigator.mediaDevices.getUserMedia(constraints).then(getUserMediaSuccess).catch(errorHandler);
  } else {
    console.error('Your browser does not support getUserMedia API');
  }
}

if (typeof module !== 'undefined') {
  module.exports = pageReady;
}
