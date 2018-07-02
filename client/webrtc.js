/* global $, navigator, io, window, RTCPeerConnection, RTCSessionDescription, RTCIceCandidate */

let currentUuid;
let currentTalker;
let localStream;
const currentPeerUuidList = [];
const peerConnections = {};
const { hostname, port } = window.location;
const socket = port ? io.connect(`https://${hostname}:${port}`) : io.connect(`https://${hostname}`);

const peerConnectionConfig = {
  iceServers: [
    { urls: 'stun:stun.stunprotocol.org:3478' },
    { urls: 'stun:stun.l.google.com:19302' },
  ],
};

// get local stream
if (navigator.mediaDevices.getUserMedia) {
  navigator.mediaDevices.getUserMedia({ video: true, audio: true }).then((stream) => {
    localStream = stream;
    $('#vid-local')[0].srcObject = localStream;
    // ask for uuid, after localStream defined
    socket.emit('requestUuid');
  }).catch((error) => {
    console.error(error);
  });
} else {
  console.error('Your browser does not support getUserMedia API');
}

// btn talk clicked, send offer to all peers
$('#btn-talk').click(() => {
  console.log('talk clicked');
});

socket.on('responseUuid', (uuid) => {
  currentUuid = uuid;
  $('#lbl-uuid').html(currentUuid);
  socket.emit('requestUuidList');
});

socket.on('responseTalk', (data) => {
  const { talker } = data;
  currentTalker = talker;
  $('#lbl-talker').html(currentTalker);
});

socket.on('message', (signal) => {
  if (signal.to !== currentUuid) {
    return false;
  }
  const promises = [];
  currentPeerUuidList.forEach((peerUuid) => {
    const connection = peerConnections[peerUuid];
    if (signal.sdp) {
      // answer offer
      const remoteDescription = new RTCSessionDescription(signal.sdp);
      let promise = connection.setRemoteDescription(remoteDescription);
      if (signal.sdp.type === 'offer') {
        promise = promise.then(() => {
          const state = connection.signalingState;
          if (state === 'have-remote-offer' || state === 'have-local-pranswer') {
            console.log(state);
            return connection.createAnswer();
          }
          return Promise.resolve(null);
        }).then((answer) => {
          if (answer === null) {
            return Promise.resolve(null);
          }
          return connection.setLocalDescription(answer);
        }).then(() => {
          socket.emit('message', { sdp: connection.localDescription, from: currentUuid, to: peerUuid });
        });
      }
      promises.push(promise);
    } else if (signal.ice) {
      // addIceCandidate
      const promise = connection.addIceCandidate(new RTCIceCandidate(signal.ice));
      promises.push(promise);
    }
  });
  return Promise.all(promises).catch((error) => {
    console.error(error);
  });
});

socket.on('responseUuidList', (data) => {
  const { uuidList, shouldInitCall } = data;
  uuidList.forEach((peerUuid) => {
    if (peerUuid === currentUuid) {
      return false; // no need to make PeerClient for itself
    }
    if (currentPeerUuidList.indexOf(peerUuid) === -1) {
      try {
        // create DOM component for video container
        $('#vid-remote-container').append(`<video id="vid-remote-${peerUuid}" autoplay style="width:30%;"></video>`);
        // create peerConnection instance
        const connection = new RTCPeerConnection(peerConnectionConfig);
        connection.ontrack = (event) => {
          [$(`#vid-remote-${peerUuid}`)[0].srcObject] = event.streams;
        };
        connection.onicecandidate = (event) => {
          if (event.candidate) {
            socket.emit('message', { ice: event.candidate, from: currentUuid, to: peerUuid });
          }
        };
        connection.addStream(localStream);
        // create offer
        if (shouldInitCall) {
          connection.createOffer().then((description) => {
            return connection.setLocalDescription(description);
          }).then(() => {
            socket.emit('message', {
              sdp: connection.localDescription, from: currentUuid, to: peerUuid,
            });
          }).catch((error) => {
            console.error(error);
          });
        }
        peerConnections[peerUuid] = connection;
        currentPeerUuidList.push(peerUuid);
      } catch (error) {
        console.error(error);
      }
    }
    return true;
  });
});
