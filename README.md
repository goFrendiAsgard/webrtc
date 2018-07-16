# WebRTC-PTT

Video conference using Web RTC with PTT feature.

This project is inspired by [https://shanetully.com/2014/09/a-dead-simple-webrtc-example/](https://shanetully.com/2014/09/a-dead-simple-webrtc-example/).

## Features

* Using `Koa` and `socket.io`.
* Using `airbnb` style guide.
* Fully https.

## Usage

```
> npm install
> npm start
```

With the server running, open a recent version of Firefox or Chrome and visit `https://localhost:3030`.

## Deployment

Assuming you have `ssh` and `root` access to your VPS, you should first login to the VPS by invoking `ssh root@192.168.xx.xx`.

```bash
# Install nodejs
> curl -sL https://deb.nodesource.com/setup_8.x | sudo -E bash -
> apt-get install -y nodejs git

# copy this repository
> cd /var/www
> git clone https://git.github.com/goFrendiAsgard/webrtc.git

# install and start pm2
> npm install -g pm2
> cd webrtc
> npm install --save
> pm2 start server/serverStart.js
> pm2 startup

```

# Experiment to emulate ptt by using arduino uno

## Download arduino IDE

You can download arduino IDE [here](https://www.arduino.cc/en/Main/Software). The minimum required version is `1.16.1`

## Upgrade to USB 2.1

In your `avr/cores/arduino/USBCore.h`, find the line `#define USB_VERSION 0x200`, change `0x200` into `0x210`. In ubuntu, the file location was in: `arduino-1.8.5/hardware/arduino/avr/cores/arduino`

## See what's wrong

If you get `Access denied`, `Permission Error` or any other error. Inspect this:

* chrome://device-log
* lsusb
* lsusb -v
* After getting device usb part do this: `chmod 777 /dev/bus/usb/001/007`, where `/dev/bux/usb/001/007` is the device name.

## What we are trying to do

Connect pin 12 to push button, connect pin 13 to LED. Pin 12 is acting like PTT button, while LED indicate that other client are currently talking (so you cannot talk). 

```c
#include <WebUSB.h>
#define Serial WebUSBSerial
WebUSB WebUSBSerial(1, "roiptim.com/playground");

int led = 13;
int btn = 12;
int heartBeat = 0;

void setup() {
  pinMode(led, OUTPUT);
  pinMode(btn, INPUT);
  Serial.begin(9600); 
  while(!Serial.available()) {
    delay(10); 
  }
}

void loop() {  
  if (heartBeat == 10) {
    heartBeat = 0;
    int pressed = digitalRead(btn);
    if (pressed) {
      Serial.print(1); Serial.flush(); // send `1` to client if the button is pressed
    } else {
      Serial.print(0); Serial.flush(); // send `0` to client if the button is not pressed
    }
    // if client request is complete and the command is correct, turn on the lamp. Valid command is either `0` or `1`.
    int input = Serial.read();
    if (input == 1 || input == 0) {
      digitalWrite(led, input);
    }
  }
  heartBeat++;
}
```