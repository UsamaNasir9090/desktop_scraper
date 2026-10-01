const express = require('express');
const session = require('express-session');
const path = require('path');
const { logger } = require('./src/logger');

const app = express();

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

app.use(session({
  secret: process.env.SESSION_SECRET || 'CHANGE_THIS_BEFORE_DEPLOYING',
  resave: false,
  saveUninitialized: true,
  cookie: {
    secure: false,
    maxAge: 30 * 60 * 1000
  }
}));

app.use('/api', require('./routes/auth'));
app.use('/api', require('./routes/data'));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  logger.info(`Server listening on http://localhost:${PORT}`);
});