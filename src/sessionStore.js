const { logger } = require('./logger');

const pending = new Map();
const OTP_WAIT_TIMEOUT_MS = 5 * 60 * 1000;

function put(sessionId, { browser, context, page }) {
  clear(sessionId);
  const timeoutHandle = setTimeout(async () => {
    logger.warn('OTP wait timed out — closing abandoned session.', { sessionId });
    await clear(sessionId);
  }, OTP_WAIT_TIMEOUT_MS);
  pending.set(sessionId, { browser, context, page, timeoutHandle });
}

function get(sessionId) {
  return pending.get(sessionId) || null;
}

async function clear(sessionId) {
  const entry = pending.get(sessionId);
  if (!entry) return;
  clearTimeout(entry.timeoutHandle);
  pending.delete(sessionId);
  try {
    await entry.browser.close();
  } catch (error) {
    logger.warn('Error closing session browser.', { sessionId, message: error.message });
  }
}

module.exports = { put, get, clear };