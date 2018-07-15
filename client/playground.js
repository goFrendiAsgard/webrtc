/* global $, navigator, TextDecoder */

const textDecoder = new TextDecoder();
let device;

function sendUsb(command) {
  const data = new Uint8Array(1);
  data[0] = command;
  device.transferOut(4, data);
}

function readLoop() {
  device.transferIn(5, 64).then((result) => {
    const data = textDecoder.decode(result.data);
    $('#div-status').html(data === '0' ? 'Saya tidak tertekan' : 'Saya tertekan');
    readLoop();
  }, (error) => {
    console.log(error);
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
      readLoop(); // read
    })
    .catch((error) => {
      console.error(error);
    });
}

$('#btn-start').click(initUsb);
$('#btn-on').click(() => {
  sendUsb(1);
});
$('#btn-off').click(() => {
  sendUsb(0);
});
