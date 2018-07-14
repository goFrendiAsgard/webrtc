const fs = require('fs');
const uuidv4 = require('uuid/v4');
const { DATA_LOCATION } = require('./config.js');

const defaultData = {
  users: {
    '01': {
      username: 'admin',
      password: 'admin',
      role: 'commander',
      banned: false,
    },
  },
};

function readData() {
  return new Promise((resolve) => {
    fs.readFile(DATA_LOCATION, (error, content) => {
      if (error) {
        return resolve(defaultData);
      }
      try {
        return resolve(JSON.parse(content));
      } catch (parseError) {
        return resolve(defaultData);
      }
    });
  });
}

function saveData(data) {
  return new Promise((resolve, reject) => {
    try {
      const content = JSON.stringify(data, null, 2);
      return fs.writeFile(DATA_LOCATION, content, (error) => {
        if (error) {
          return reject(error);
        }
        return resolve(true);
      });
    } catch (parseError) {
      return reject(parseError);
    }
  });
}

async function addUser(newUser) {
  const data = await readData();
  const { users } = data;
  let id = newUser.username;
  while (id in users || !id) {
    id = uuidv4();
  }
  users[id] = newUser;
  const success = await saveData(data);
  return { success, id, user: newUser };
}

async function editUser(id, userData) {
  const data = await readData();
  const { users } = data;
  if (!(id in users)) {
    return { success: false };
  }
  const user = users[id];
  users[id] = Object.assign(user, userData);
  const success = await saveData(data);
  return { success, id, user: users[id] };
}

async function deleteUser(id) {
  const data = await readData();
  delete data.users[id];
  const success = await saveData(data);
  return { success, id };
}

async function getUserId(quser) {
  const data = await readData();
  const { users } = data;
  const matchIdList = Object.keys(users).filter((id) => {
    const user = users[id];
    return user.username === quser.username && user.password === quser.password;
  });
  if (matchIdList.length > 0) {
    return matchIdList[0];
  }
  return null;
}

async function getUsers() {
  const data = await readData();
  const { users } = data;
  return users;
}

async function getUserById(id) {
  const data = await readData();
  const { users } = data;
  return users[id];
}

module.exports = {
  saveData,
  readData,
  addUser,
  editUser,
  deleteUser,
  getUserId,
  getUsers,
  getUserById,
};
