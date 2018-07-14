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

Connect pin 12 to push button, connect pin 13 to LED. Pin 12 is acting like PTT button, while LED indicate that other client are currently talking (so you cannot talk). 

```c
int led = 13;
int btn = 12;
char* inputString = "";

void setup() {
  pinMode(led, OUTPUT);
  pinMode(btn, INPUT);
  Serial.begin(9600);  
}

void loop() {
  // let client knows that the button is pressed
  int pressed = digitalRead(btn);
  if (pressed) {
    Serial.write("pressed\n");
  } else {
    Serial.write("released\n");
  }
  // if client request is complete and the command is correct, turn on the lamp
  if (Serial.available()) {
    int input = Serial.parseInt();
    if (input == 1 || input == 0) {
      digitalWrite(led, input);
    }
  }
  delay(100);
}

```