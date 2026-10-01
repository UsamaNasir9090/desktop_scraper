const { BrowserManager } = require('./browser');
const { logger } = require('../services/logger');

class ScraperService {
  constructor({ sendStatus, sendProgress, sendRecords, sendError }) {
    this.browserManager = new BrowserManager();
    this.sendStatus = sendStatus;
    this.sendProgress = sendProgress;
    this.sendRecords = sendRecords;
    this.sendError = sendError;
    this.isRunning = false;
    this.stopRequested = false;
  }

  async start() {
    this.isRunning = true;
    this.stopRequested = false;

    try {
      this.sendStatus({ text: 'Status', detail: 'Opening website...' });
      logger.info('Starting scraper workflow.');

      const page = await this.browserManager.launch();
      this.sendStatus({ text: 'Status', detail: 'Website opened. Please complete sign in.' });

      const authenticated = await this.waitForAuthentication(page);
      if (!authenticated) {
        throw new Error('Authentication timed out.');
      }

      this.sendStatus({ text: 'Status', detail: 'Authenticated successfully' });
      this.sendProgress({ current: 0, total: 0, message: 'Authenticated. Waiting to retrieve records...' });

      const records = await this.scrapeRecords(page);
      this.sendRecords(records);
      this.sendProgress({ current: records.length, total: records.length, message: 'Completed' });
      this.sendStatus({ text: 'Status', detail: 'Completed' });

      return { running: false };
    } catch (error) {
      logger.error('Scraper failed.', { message: error.message });
      this.sendError(error);
      return { running: false };
    } finally {
      this.isRunning = false;
      this.stopRequested = false;

      if (this.browserManager) {
        await this.browserManager.close();
      }
    }
  }

  async stop() {
  this.stopRequested = true;
  this.isRunning = false;
  this.sendStatus({ text: 'Status', detail: 'Stopping after current page finishes...' });

}
  async waitForAuthentication(page) {
  this.sendStatus({ text: 'Status', detail: 'Waiting for you to log in and open Visit Requests...' });
  const captured = await this.browserManager.waitForApiCall('getAllVisits');
  this.capturedRequest = captured;  
  return true;
}


async scrapeRecords(page) {
  const { headers, body } = this.capturedRequest;
  const baseBody = JSON.parse(body);

  const pageSize = 500;
  const maxPages = 2;
  const maxRetries = 3;
  let offsetStart = 0;
  let allRecords = [];
  let pageCount = 0;

  while (!this.stopRequested && pageCount < maxPages) {
    const requestBody = { ...baseBody, offsetStart: String(offsetStart), offset: String(pageSize) };

    let result = null;
    let lastError = null;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        result = await page.evaluate(async ({ headers, requestBody }) => {
          const res = await fetch('https://www.tawuniya.com/web/api/tawnidi/getAllVisits', {
            method: 'POST',
            headers,
            body: JSON.stringify(requestBody),
            credentials: 'include'
          });
          return res.json();
        }, { headers, requestBody });
        lastError = null;
        break; // success, stop retrying
      } catch (error) {
        lastError = error;
        logger.warn(`Page fetch failed (attempt ${attempt}/${maxRetries})`, { message: error.message, offsetStart });
        await page.waitForTimeout(2000); 
      }
    }

    if (lastError) {
      logger.error('Page fetch failed after retries — stopping with partial results.', { offsetStart, message: lastError.message });
      break; // stop the loop=
    }

    const batch = result.visits || [];
    pageCount += 1;
    allRecords = allRecords.concat(batch);

    this.sendProgress({
      current: allRecords.length,
      total: '?',
      message: `Fetched ${allRecords.length} so far (page ${pageCount})...`
    });

    this.sendRecords(allRecords); 

    if (batch.length < pageSize) {
      break;
    }

    offsetStart += pageSize;
  }

  return allRecords;
}

}

module.exports = { ScraperService };
