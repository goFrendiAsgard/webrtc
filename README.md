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
> git clone https://git.github.com/goFrendiAsgard/webrtc

# install and start pm2
> npm install -g pm2
> pm2 start webrtc/server/serverStart.js
> pm2 startup

```
