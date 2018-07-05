/* global $, navigator, io, window, RTCPeerConnection, RTCSessionDescription, RTCIceCandidate */

const peerConnections = {};
const { hostname, port } = window.location;
const socket = port ? io.connect(`https://${hostname}:${port}`) : io.connect(`https://${hostname}`);

let currentUuid;
let currentTalker;
let localStream;
let currentPeerUuidList = [];
let defaultMuted = $('#checkbox-default-mute').is(':checked');

const peerConnectionConfig = {
  iceServers: [
    { urls: 'stun:stun.stunprotocol.org:3478' },
    { urls: 'stun:stun.l.google.com:19302' },
    {
      urls: 'turn:numb.viagenie.ca',
      credential: 'muazkh',
      username: 'webrtc@live.com',
    },
    {
      urls: 'turn:192.158.29.39:3478?transport=udp',
      credential: 'JZEOEt2V3Qb0y27GRntt2u2PAYA=',
      username: '28224511:1379330808',
    },
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

// request to talk
$('#btn-talk').on('mousedown touchstart', () => {
  socket.emit('requestTalk', currentUuid);
});

// request to stop talk
$('#btn-talk').on('mouseup touchend touchcancel', () => {
  socket.emit('requestStopTalk', currentUuid);
});

// mute click
$('#checkbox-default-mute').on('change', () => {
  defaultMuted = $('#checkbox-default-mute').is(':checked');
});

// leave
window.onbeforeunload = () => {
  socket.emit('leave', currentUuid);
};

socket.on('responseUuid', (uuid) => {
  currentUuid = uuid;
  $('#lbl-uuid').html(currentUuid);
  socket.emit('requestUuidList');
});

socket.on('responseTalk', (data) => {
  const { talker } = data;
  currentTalker = talker;
  $('#lbl-talker').html(currentTalker);
  if (currentTalker) {
    // currentTalker not mute
    $(`.vid-remote[uuid='${currentTalker}']`).prop('muted', false);
    $(`.vid-remote[uuid='${currentTalker}']`).removeAttr('muted');
    // others mute
    $(`.vid-remote[uuid!='${currentTalker}']`).prop('muted', true);
  } else {
    $('.vid-remote').prop('muted', defaultMuted);
    if (defaultMuted) {
      $('.vid-remote').attr('muted', true);
    } else {
      $('.vid-remote').removeAttr('muted');
    }
  }
});

socket.on('message', (signal) => {
  if (signal.to !== currentUuid) {
    return false;
  }
  const peerUuid = signal.from;
  const connection = peerConnections[peerUuid];
  if (signal.sdp) {
    const remoteDescription = new RTCSessionDescription(signal.sdp);
    let promise = connection.setRemoteDescription(remoteDescription);
    // answer offer
    if (signal.sdp.type === 'offer') {
      promise = promise.then(
        () => connection.createAnswer(),
      ).then(
        answer => connection.setLocalDescription(answer),
      ).then(() => {
        socket.emit('message', { sdp: connection.localDescription, from: currentUuid, to: peerUuid });
      });
    }
    promise.catch((error) => {
      console.error(error);
    });
  }
  if (signal.ice) {
    // addIceCandidate
    connection.addIceCandidate(new RTCIceCandidate(signal.ice)).catch((error) => {
      console.error(error);
    });
  }
  return true;
});

socket.on('responseUuidList', (data) => {
  const { uuidList, shouldInitCall } = data;
  // remove peers
  currentPeerUuidList.forEach((peerUuid) => {
    if (uuidList.indexOf(peerUuid) === -1) {
      $(`#vid-remote-${peerUuid}`).remove();
      delete peerConnections[peerUuid];
    }
  });
  currentPeerUuidList = currentPeerUuidList.filter(peerUuid => uuidList.indexOf(peerUuid) > -1);
  // create new peers
  const muted = defaultMuted ? 'muted' : '';
  uuidList.forEach((peerUuid) => {
    if (peerUuid === currentUuid) {
      return false; // no need to make PeerClient for itself
    }
    if (currentPeerUuidList.indexOf(peerUuid) === -1) {
      try {
        // create DOM component for video container
        $('#vid-remote-container').append(
          `<video id="vid-remote-${peerUuid}" class="vid-remote" uuid="${peerUuid}" ${muted} autoplay style="width:30%;"></video>`,
        );
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
          connection.createOffer().then(
            description => connection.setLocalDescription(description),
          ).then(() => {
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
