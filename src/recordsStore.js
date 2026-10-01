const store = new Map();

function set(sessionId, records) {
  store.set(sessionId, records);
}

function get(sessionId) {
  return store.get(sessionId) || [];
}

module.exports = { set, get };