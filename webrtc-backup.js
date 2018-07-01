/* global $, navigator, io, window, RTCPeerConnection, RTCSessionDescription, RTCIceCandidate */

let localVideo;
let localStream;
// let remoteVideo;
// let peerConnection;
let currentUuid;
const currentUuidList = [];
const peerConnections = {};
const states = {};
let socket;

const peerConnectionConfig = {
  iceServers: [
    { urls: 'stun:stun.stunprotocol.org:3478' },
    { urls: 'stun:stun.l.google.com:19302' },
  ],
};

/*
function createPeerConnectionDescription(description) {
  peerConnection.setLocalDescription(description).then(() => {
    socket.emit('message', { sdp: peerConnection.localDescription, uuid: currentUuid });
  }).catch(errorHandler);
}

function start(isCaller) {
  peerConnection = new RTCPeerConnection(peerConnectionConfig);
  peerConnection.addStream(localStream);
  peerConnection.onicecandidate = (event) => {
    if (event.candidate != null) {
      socket.emit('message', { ice: event.candidate, uuid: currentUuid });
    }
  };
  peerConnection.ontrack = (event) => {
    const [srcObject] = event.streams;
    remoteVideo[0].srcObject = srcObject;
  };
  if (isCaller) {
    peerConnection.createOffer().then(createPeerConnectionDescription).catch(errorHandler);
  }
}

function errorHandler(error) {
  console.error(error);
}

*/


function createPeerDescriptionAssigner(uuid) {
  return (description) => {
    peerConnections[uuid].setLocalDescription(description).then(() => {
      socket.emit('message', { sdp: peerConnections[uuid].localDescription, uuid: currentUuid });
    }).catch((error) => {
      console.error(error);
    });
  };
}

function onIceCandidate(event) {
  if (event.candidate != null) {
    socket.emit('message', { ice: event.candidate, uuid: currentUuid });
  }
}

function initPeerConnection(uuidList, isCaller) {
  uuidList.forEach((uuid) => {
    if (uuid === currentUuid) {
      return;
    }
    try {
      if (currentUuidList.indexOf(uuid) === -1) {
        $('#vid-remote-container').append(`<video id="vid-remote-${uuid}" autoplay style="width:30%;"></video>`);
        currentUuidList.push(uuid);
        peerConnections[uuid] = new RTCPeerConnection(peerConnectionConfig);
        peerConnections[uuid].addStream(localStream);
        peerConnections[uuid].onicecandidate = onIceCandidate;
        peerConnections[uuid].ontrack = (event) => {
          const [srcObject] = event.streams;
          $(`#vid-remote-${uuid}`)[0].srcObject = srcObject;
        };
        peerConnections[uuid].onsignalingstatechange = () => {
          states[uuid] = peerConnections[uuid].signalingState;
          console.log([uuid, states[uuid]]);
        };
      }
      if (isCaller && states[uuid] !== 'have-remote-offer') {
        const peerDescriptionAssigner = createPeerDescriptionAssigner(uuid);
        peerConnections[uuid].createOffer().then(peerDescriptionAssigner).catch((error) => {
          console.error(error);
        });
      }
    } catch (error) {
      console.error(error);
    }
  });
}

function processSignal(uuidList, signal) {
  uuidList.forEach((uuid) => {
    if (uuid === currentUuid) {
      return;
    }
    if (signal.sdp) {
      peerConnections[uuid].setRemoteDescription(new RTCSessionDescription(signal.sdp)).then(() => {
        // Only create answers in response to offers
        if (signal.sdp.type === 'offer' && (states[uuid] === 'have-remote-offer' || states[uuid] === 'have-local-pranswer')) {
          const peerDescriptionAssigner = createPeerDescriptionAssigner(uuid);
          peerConnections[uuid].createAnswer().then(peerDescriptionAssigner).catch((error) => {
            console.error(error);
          });
        }
      }).catch((error) => {
        console.error(error);
      });
    } else if (signal.ice) {
      peerConnections[uuid].addIceCandidate(new RTCIceCandidate(signal.ice)).catch((error) => {
        console.error(error);
      });
    }
  });
}

function pageReady() {
  // initialize socket
  const { hostname, port } = window.location;
  socket = port ? io.connect(`https://${hostname}:${port}`) : io.connect(`https://${hostname}`);

  // initialize components
  localVideo = $('#vid-local');
  // remoteVideo = $('#vid-remote');
  $('#btn-talk').click(() => {
    socket.emit('requestTalk', currentUuid);
    // start(true);
  });

  // initialize local video
  if (navigator.mediaDevices.getUserMedia) {
    navigator.mediaDevices.getUserMedia({ video: true, audio: true }).then((stream) => {
      localStream = stream;
      localVideo[0].srcObject = stream;
      // request UUID from signaling server
      socket.emit('requestUuid');
    }).catch((error) => {
      console.error(error);
    });
  } else {
    console.error('Your browser does not support getUserMedia API');
  }

  // get UUID from signaling server
  socket.on('responseUuid', (uuid) => {
    currentUuid = uuid;
    $('#lbl-uuid').html(currentUuid);
  });

  // get UUID List from signaling server
  socket.on('responseUuidList', (data) => {
    const uuidList = data;
    initPeerConnection(uuidList, false);
  });

  // get Talker from signaling server
  socket.on('responseTalk', (data) => {
    const { talker } = data;
    $('#lbl-talker').html(talker);
    if (talker === currentUuid) {
      initPeerConnection(currentUuidList, true);
    }
  });

  // Receive Web-RTC signaling
  socket.on('message', (signal) => {
    // if (!peerConnection) start(false);
    initPeerConnection(currentUuidList, false);
    // Ignore messages from ourself
    if (!currentUuid || signal.uuid === currentUuid) return;
    processSignal(currentUuidList, signal);
    /*
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
    */
  });
}

// a trick to keep eslint shut up
if (typeof module !== 'undefined') {
  module.exports = pageReady;
}
