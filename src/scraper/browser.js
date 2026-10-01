const { chromium } = require('playwright');
const path = require('path');
const { app } = require('electron');
const { logger } = require('../services/logger');
const { EXTERNAL_SITE_URL } = require('../utils/constants');

class BrowserManager {
  constructor() {
    this.context = null;
    this.page = null;
  }

  async launch() {
    if (this.context) {
      return this.page;
    }

    logger.info('Launching Playwright browser in visible mode.');

    const userDataDir = path.join(app.getPath('userData'), 'browser-profile');

    this.context = await chromium.launchPersistentContext(userDataDir, {
      headless: false,
      channel: 'chrome',
      viewport: { width: 1440, height: 1000 },
      proxy: process.env.PROXY_SERVER
        ? {
            server: process.env.PROXY_SERVER,
            username: process.env.PROXY_USERNAME,
            password: process.env.PROXY_PASSWORD
          }
        : undefined,
      args: ['--disable-blink-features=AutomationControlled']
    });

    this.page = this.context.pages()[0] || await this.context.newPage();

    await this.page.addInitScript(() => {
      Object.defineProperty(navigator, 'webdriver', { get: () => undefined });
    });

    await this.page.goto(EXTERNAL_SITE_URL, {
      waitUntil: 'domcontentloaded',
      timeout: 60000
    });

    logger.info(`Opened website: ${EXTERNAL_SITE_URL}`);

    return this.page;
  }

  async waitForApiCall(urlMatch, timeoutMs = 5 * 60 * 1000) {
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        this.page.off('request', handler);
        reject(new Error('Timed out waiting for API call: ' + urlMatch));
      }, timeoutMs);

      const handler = (request) => {
        if (request.url().includes(urlMatch) && request.method() === 'POST') {
          clearTimeout(timer);
          this.page.off('request', handler);
          resolve({
            url: request.url(),
            headers: request.headers(),
            body: request.postData()
          });
        }
      };

      this.page.on('request', handler);
    });
  }

  async close() {
    if (this.page) {
      try {
        await this.page.close();
      } catch (error) {
        logger.warn('Page close warning.', { message: error.message });
      }
    }

    if (this.context) {
      try {
        await this.context.close();
      } catch (error) {
        logger.warn('Context close warning.', { message: error.message });
      }
    }

    this.page = null;
    this.context = null;
  }

  getPage() {
    return this.page;
  }
}

module.exports = { BrowserManager };