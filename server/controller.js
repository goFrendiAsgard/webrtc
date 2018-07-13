const {
  addUser,
  editUser,
  getUsers,
  getUserById,
  getUserId,
  deleteUser,
} = require('./helper.js');

const loggedOutLinkConfig = [
  { title: 'Login', url: '/' },
  { title: 'Register', url: '/register' },
];

const loggedInLinkConfig = [
  { title: 'RTC Session', url: '/' },
  { title: 'Logout', url: '/logout' },
];

const commanderLinkConfig = [
  { title: 'Manage User', url: '/user-list' },
];

const homeLink = '<a href="/">Back</a>';

function getLinkConfig(roles) {
  if (roles.indexOf('loggedOut') > -1) {
    return loggedOutLinkConfig;
  }
  if (roles.indexOf('commander') > -1) {
    return commanderLinkConfig.concat(loggedInLinkConfig);
  }
  if (roles.indexOf('loggedIn') > -1) {
    return loggedInLinkConfig;
  }
  return [];
}

function getLinks(ctx) {
  const linkConfig = getLinkConfig(ctx.state.roles);
  return linkConfig.map(config => `<a href="${config.url}">${config.title}</a>`).join(' | ');
}

async function debug(ctx, next) {
  console.log({
    session: ctx.session,
    url: ctx.request.url,
  });
  await next();
}

function authentication(ctx) {
  return ctx.session.userId;
}

async function authorization(ctx) {
  const user = await getUserById(ctx.state.user);
  if (user && user.role) {
    return [user.role];
  }
  return [];
}

async function registerForm(ctx) {
  const links = getLinks(ctx);
  await ctx.render('register-form', { links });
}

async function register(ctx) {
  const links = getLinks(ctx);
  const { username, password } = ctx.request.body;
  const user = { username, password };
  const result = await addUser(user);
  await ctx.render('register', { result, links });
}

async function logout(ctx) {
  const links = homeLink;
  ctx.session = {};
  await ctx.render('logout', { links });
}

async function loginForm(ctx) {
  const links = getLinks(ctx);
  await ctx.render('login-form', { links });
}

async function login(ctx) {
  const links = homeLink;
  const { username, password } = ctx.request.body;
  const quser = { username, password };
  const id = await getUserId(quser);
  let success = id !== null;
  let user = {};
  if (success) {
    user = await getUserById(id);
    if (!user.banned) {
      ctx.session.userId = id;
      ctx.session.user = user;
    } else {
      success = false;
    }
  }
  if (!success) {
    delete ctx.session.userId;
    delete ctx.session.user;
  }
  await ctx.render('login', {
    success, id, user, links,
  });
}

async function userList(ctx) {
  const links = getLinks(ctx);
  const users = await getUsers();
  await ctx.render('user-list', { users, links });
}

async function userEditForm(ctx, id) {
  const links = getLinks(ctx);
  const user = await getUserById(id);
  await ctx.render('user-edit-form', { id, user, links });
}

async function userEdit(ctx) {
  const links = getLinks(ctx);
  const {
    id, username, password, role,
  } = ctx.request.body;
  const banned = parseInt(ctx.request.body.banned, 10) ? true : false;
  let result;
  const oldUser = await getUserById(id);
  if (oldUser.role === 'commander' && banned) {
    result = { success: false, error: 'Cannot ban commander' };
  } else {
    result = await editUser(id, {
      username, password, banned, role,
    });
  }
  console.error(ctx.request.body);
  await ctx.render('user-edit', { result, links });
}

async function userDelete(ctx, id) {
  const links = getLinks(ctx);
  let result;
  const oldUser = await getUserById(id);
  if (oldUser.role === 'commander') {
    result = { success: false, error: 'Cannot delete commander' };
  } else {
    result = await deleteUser(id);
  }
  await ctx.render('user-delete', { result, links });
}

async function main(ctx) {
  const links = getLinks(ctx);
  const { userId, user } = ctx.session;
  await ctx.render('main', { id: userId, user, links });
}

module.exports = {
  debug,
  authentication,
  authorization,
  registerForm,
  register,
  logout,
  loginForm,
  login,
  userList,
  userEditForm,
  userEdit,
  userDelete,
  main,
};
