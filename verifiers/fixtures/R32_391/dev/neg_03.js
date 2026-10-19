const { getSession } = require('./sessions');

async function validate(payload) {
  const session = await getSession(payload.jti);
  if (!session) {
    return null;
  }
  const remaining = payload.exp - Date.now() / 1000;
  if (remaining <= 0) {
    return null;
  }
  return { id: payload.sub, roles: session.roles };
}

module.exports = { validate };
