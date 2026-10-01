function log(level, message, metadata) {
  const timestamp = new Date().toISOString();
  const details = metadata ? ` ${JSON.stringify(metadata)}` : '';
  console.log(`[${level}] ${timestamp} ${message}${details}`);
}

const logger = {
  info: (message, metadata) => log('INFO', message, metadata),
  warn: (message, metadata) => log('WARN', message, metadata),
  error: (message, metadata) => log('ERROR', message, metadata)
};

module.exports = { logger };
