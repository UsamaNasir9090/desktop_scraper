const express = require('express');
const router = express.Router();
const sessionStore = require('../src/sessionStore');
const recordsStore = require('../src/recordsStore');
const scraperService = require('../src/scraperService');
const exportService = require('../src/exportService');
const { logger } = require('../src/logger');

router.post('/fetch', async (req, res) => {
  const sessionId = req.sessionID;
  const capturedRequest = req.session.capturedRequest;
  const held = sessionStore.get(sessionId);

  if (!held || !capturedRequest) {
    return res.status(400).json({ ok: false, error: 'Not logged in, or session expired. Please log in again.' });
  }

  try {
    const records = await scraperService.fetchVisits(held.page, capturedRequest, (progress) => {
      logger.info('Fetch progress', { sessionId, ...progress });
    });
    recordsStore.set(sessionId, records);
    await sessionStore.clear(sessionId);
    res.json({ ok: true, count: records.length, records });
  } catch (error) {
    logger.error('Fetch failed.', { sessionId, message: error.message });
    res.status(500).json({ ok: false, error: error.message });
  }
});

router.get('/export', (req, res) => {
  const records = recordsStore.get(req.sessionID);
  if (!records || records.length === 0) {
    return res.status(400).json({ ok: false, error: 'No records to export yet.' });
  }
  const buffer = exportService.buildExcelBuffer(records);
  res.setHeader('Content-Disposition', `attachment; filename="tawuniya-visits-${Date.now()}.xlsx"`);
  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.send(buffer);
});

module.exports = router;