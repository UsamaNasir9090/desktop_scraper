const express = require('express');
const router = express.Router();
const authService = require('../src/authService');
const { logger } = require('../src/logger');

router.post('/login', async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) {
    return res.status(400).json({ ok: false, error: 'Username and password are required.' });
  }
  try {
    const result = await authService.startLogin(req.sessionID, username, password);
    res.json({ ok: true, ...result });
  } catch (error) {
    logger.error('Login failed.', { message: error.message });
    res.status(500).json({ ok: false, error: error.message });
  }
});

router.post('/verify-otp', async (req, res) => {
  const { otp } = req.body;
  if (!otp) {
    return res.status(400).json({ ok: false, error: 'OTP code is required.' });
  }
  try {
    const capturedRequest = await authService.submitOtp(req.sessionID, otp);
    req.session.capturedRequest = capturedRequest;
    res.json({ ok: true, status: 'authenticated' });
  } catch (error) {
    logger.error('OTP verification failed.', { message: error.message });
    res.status(500).json({ ok: false, error: error.message });
  }
});

module.exports = router;