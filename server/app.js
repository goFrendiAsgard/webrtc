const path = require('path');
const koaEjs = require('koa-ejs');
const koaStatic = require('koa-static');
const bodyParser = require('koa-bodyparser');
const session = require('koa-session');
const { WebApp } = require('chiml');
const { EJS_OPTION, SESSION_OPTION } = require('./config.js');
const controller = require('./controller.js');

const routes = [
  {
    controller: controller.registerForm,
    method: 'get',
    url: '/register',
    roles: ['loggedOut'],
  }, {
    controller: controller.register,
    method: 'post',
    url: '/register',
    roles: ['loggedOut'],
  }, {
    controller: controller.logout,
    url: '/logout',
    roles: ['loggedIn'],
  }, {
    controller: controller.loginForm,
    method: 'get',
    url: '/',
    roles: ['loggedOut'],
  }, {
    controller: controller.login,
    method: 'post',
    url: '/login',
    roles: ['loggedOut'],
  }, {
    controller: controller.userList,
    method: 'all',
    url: '/user-list',
    roles: ['commander'],
  }, {
    controller: controller.main,
    method: 'all',
    roles: ['loggedIn'],
    url: '/',
  }, {
    controller: controller.userEditForm,
    method: 'get',
    roles: ['commander'],
    url: '/user-edit/:id',
  }, {
    controller: controller.userEdit,
    method: 'post',
    roles: ['commander'],
    url: '/user-edit',
  }, {
    controller: controller.userDelete,
    method: 'all',
    roles: ['commander'],
    url: '/user-delete/:id',
  }, {
    controller: controller.playground,
    method: 'all',
    url: '/playground',
  },
];

const defaultRoute = {
  url: '/',
  propagateCtx: true,
  roles: ['loggedIn', 'loggedOut'],
  controller: async (ctx) => {
    const state = {
      url: ctx.url,
      state: ctx.state,
      session: ctx.session,
    };
    const stateStr = JSON.stringify(state, null, 2);
    ctx.body = `<pre>${stateStr}</pre>`;
    return ctx.body;
  },
};

function createApp(configs = { ejsOption: EJS_OPTION }) {
  // Koa Initialization
  const app = new WebApp();

  // publish static files
  app.use(koaStatic(path.resolve(path.dirname(__dirname), 'client')));
  app.use(koaStatic(path.resolve(path.dirname(__dirname), 'node_modules', 'socket.io-client', 'dist')));
  app.use(koaStatic(path.resolve(path.dirname(__dirname), 'node_modules', 'jquery', 'dist')));
  app.use(koaStatic(path.resolve(path.dirname(__dirname), 'node_modules', 'webrtc-adapter', 'out')));

  // add bodyParser
  app.use(session(SESSION_OPTION, app));
  app.use(bodyParser());
  koaEjs(app, configs.ejsOption);

  app.addAuthentication({ controller: controller.authentication });
  app.addAuthorization({ controller: controller.authorization });
  app.addMiddleware(controller.debug);

  app.addRoutes(routes.map(route => Object.assign({}, defaultRoute, route)));
  return app;
}

module.exports = { createApp };
