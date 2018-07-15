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
    console.log('attempt to open');
    return device.open();
  }).then(() => {
    console.log('openned');
    if (device.configuration === null) {
      console.log('select configuration');
      return device.selectConfiguration(1);
    }
    return null;
  }).then(() => {
    console.log('claim interface');
    return device.claimInterface(2);
  }).then(() => {
    console.log('success control transfer out');
    return device.controlTransferOut({
      requestType: 'class',
      recipient: 'interface',
      request: 0x22, // CDC_SET_CONTROL_LINE_STATE
      value: 0x01,
      index: 0x02,
    });
  }).then(() => {
    console.log('read');
    readLoop(); // read

  }).catch((error) => {
    console.error(error);
  });
});
