/* global $, navigator */
let device;

function readLoop() {
  device.transferIn(5, 64).then((result) => {
    console.log(result.data);
    readLoop();
  }, (error) => {
    console.log(error);
  });
}

$('#btn-start').click(() => {
  navigator.usb.requestDevice({ filters: [] }).then((selectedDevice) => {
    device = selectedDevice;
    return device.open();
  }).then(() => {
    if (device.configuration === null) {
      return device.selectConfiguration(1);
    }
    return null;
  }).then(() => {
    console.log('interface claimed');
    return device.claimInterface(2);
  }).then(() => {
    console.log('success again');
    return device.controlTransferOut({
      requestType: 'class',
      recipient: 'interface',
      request: 0x22, // CDC_SET_CONTROL_LINE_STATE
      value: 0x01,
      index: 0x02,
    });
  }).then(() => {
    readLoop(); // read

  }).catch((error) => {
    console.error(error);
  });
});
