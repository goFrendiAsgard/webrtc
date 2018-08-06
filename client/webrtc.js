/* global $, navigator, io, window, RTCPeerConnection,
RTCSessionDescription, RTCIceCandidate, TextDecoder */

const peerConnections = {};
const { hostname, port } = window.location;
const socket = port ? io.connect(`https://${hostname}:${port}`) : io.connect(`https://${hostname}`);
const textDecoder = new TextDecoder();

let device;
let currentUuid;
let currentTalker;
let currentLastTalkTime;
let localStream;
let mouseIsDown = false;
let usbIsDown = false;
let currentPeerUuidList = [];
let defaultMuted = $('#checkbox-default-mute').is(':checked');
const IS_COMMANDER = $('#isCommander').val() === 'true';

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

function keepTalking() {
  if (mouseIsDown || usbIsDown) {
    socket.emit('requestTalk', currentUuid);
  }
}

function sendUsb(command) {
  if (!device) {
    return false;
  }
  const data = new Uint8Array(1);
  data[0] = command;
  device.transferOut(4, data);
  return true;
}

function readLoop() {
  return device.transferIn(5, 64).then((result) => {
    const data = textDecoder.decode(result.data);
    usbIsDown = data === '1';
    console.log(usbIsDown);
  });
}

function initUsb() {
  navigator.usb.requestDevice({ filters: [] })
    .then((selectedDevice) => {
      device = selectedDevice;
      console.log('device.open()');
      return device.open();
    })
    .then(() => {
      console.log('check device.configuration');
      if (device.configuration === null) {
        console.log('device.selectConfiguration(1)');
        return device.selectConfiguration(1);
      }
      return null;
    })
    .then(() => {
      console.log('device.claimInterface(2)');
      return device.claimInterface(2);
    })
    .then(() => {
      console.log('device.selectAlternateInterface(2, 0)');
      return device.selectAlternateInterface(2, 0);
    })
    .then(() => {
      console.log('device.controlTransferOut(options)');
      return device.controlTransferOut({
        requestType: 'class',
        recipient: 'interface',
        request: 0x22, // CDC_SET_CONTROL_LINE_STATE
        value: 0x01,
        index: 0x02,
      });
    })
    .then(() => {
      console.log('read');
      setInterval(readLoop, 1);
    })
    .catch((error) => {
      console.error(error);
    });
}

function clearTalkerState() {
  if (currentLastTalkTime && currentLastTalkTime < (new Date()).getTime() - 500) {
    currentTalker = '';
    $('#lbl-talker').html('');
    sendUsb(0);
    $('.vid-remote').prop('muted', defaultMuted);
    if (defaultMuted) {
      $('.vid-remote').attr('muted', true);
    } else {
      $('.vid-remote').removeAttr('muted');
    }
  }
  setTimeout(clearTalkerState, 100);
}

// get local stream
if (navigator.mediaDevices.getUserMedia) {
  navigator.mediaDevices.getUserMedia({ video: true, audio: true }).then((stream) => {
    localStream = stream;
    $('#vid-local')[0].srcObject = localStream;
    // ask for uuid, after localStream defined
    socket.emit('requestUuid');
    clearTalkerState();
    setInterval(keepTalking, 1);
  }).catch((error) => {
    console.error(error);
  });
} else {
  console.error('Your browser does not support getUserMedia API');
}

// request to talk
$('#btn-talk').on('mousedown touchstart', () => {
  mouseIsDown = true;
  // keepTalking();
});

// request to stop talk
$('#btn-talk').on('mouseup touchend touchcancel', () => {
  mouseIsDown = false;
  socket.emit('requestStopTalk', currentUuid);
});

// mute click
$('#checkbox-default-mute').on('change', () => {
  defaultMuted = $('#checkbox-default-mute').is(':checked');
});

$('#btn-start-usb').click(initUsb);

// kick
$('#vid-remote-container').on('mousedown touchstart', '.btn-kick', (event) => {
  const uuid = $(event.currentTarget).attr('uuid');
  socket.emit('kick', uuid);
});

// leave
window.onbeforeunload = () => {
  socket.emit('leave', currentUuid);
};

socket.on('kicked', () => {
  window.location.href = '/logout';
});

socket.on('responseUuid', (uuid) => {
  currentUuid = uuid;
  $('#lbl-uuid').html(currentUuid);
  socket.emit('requestUuidList');
});

socket.on('responseTalk', (data) => {
  const { talker } = data;
  currentTalker = talker;
  currentLastTalkTime = (new Date()).getTime();
  $('#lbl-talker').html(currentTalker);
  if (currentTalker) {
    // currentTalker not mute
    $(`.vid-remote[uuid='${currentTalker}']`).prop('muted', false);
    $(`.vid-remote[uuid='${currentTalker}']`).removeAttr('muted');
    // others mute
    $(`.vid-remote[uuid!='${currentTalker}']`).prop('muted', true);
    if (currentTalker !== currentUuid) {
      sendUsb(1); // indicate other client is currently talking
    }
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
      $(`#vid-remote-${peerUuid}-container`).remove();
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
        let kickButton = '';
        if (IS_COMMANDER) {
          kickButton = `<button class="btn-kick" uuid="${peerUuid}">Kick</button>`;
        }
        // create DOM component for video container
        $('#vid-remote-container').append(
          `<div id="vid-remote-${peerUuid}-container">
            <video id="vid-remote-${peerUuid}" class="vid-remote" uuid="${peerUuid}" ${muted} autoplay></video>
            <br />
            ${kickButton}
          </div>`,
        );
        // create peerConnection instance
        console.time('start-connection');
        const connection = new RTCPeerConnection(peerConnectionConfig);
        connection.ontrack = (event) => {
          [$(`#vid-remote-${peerUuid}`)[0].srcObject] = event.streams;
          console.timeEnd('start-connection');
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
