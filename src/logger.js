function ts() {
  return new Date().toISOString();
}

const logger = {
  info: (msg, meta) => console.log(`[INFO] ${ts()} ${msg}`, meta ? JSON.stringify(meta) : ''),
  warn: (msg, meta) => console.warn(`[WARN] ${ts()} ${msg}`, meta ? JSON.stringify(meta) : ''),
  error: (msg, meta) => console.error(`[ERROR] ${ts()} ${msg}`, meta ? JSON.stringify(meta) : '')
};

module.exports = { logger };