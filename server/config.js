const fs = require('fs');
const path = require('path');

const HTTPS_PORT = process.env.PORT || 3030;

const HTTPS_CONFIG = {
  key: fs.readFileSync('key.pem'),
  cert: fs.readFileSync('cert.pem'),
};

const DATA_LOCATION = path.resolve(path.dirname(__dirname), 'db', 'data.json');

const EJS_OPTION = {
  root: path.resolve(path.dirname(__dirname), 'view'),
  layout: 'template',
  viewExt: 'html',
  cache: false,
  debug: false,
};

const SESSION_OPTION = {
  httpOnly: false,
  signed: false,
};

module.exports = {
  DATA_LOCATION,
  HTTPS_PORT,
  HTTPS_CONFIG,
  EJS_OPTION,
  SESSION_OPTION,
};
