const cache = new Map();

function GetUserName(id) {
  if (cache.has(id)) {
    return cache.get(id);
  }
  const name = `user-${id}`;
  cache.set(id, name);
  return name;
}

module.exports = { GetUserName };
