const { logger } = require('./logger');
const { API_ENDPOINT, PAGE_SIZE, MAX_PAGES, MAX_RETRIES } = require('./constants');

async function fetchVisits(page, capturedRequest, onProgress) {
  const baseBody = JSON.parse(capturedRequest.body);
  const headers = capturedRequest.headers;

  let offsetStart = 0;
  let allRecords = [];
  let pageCount = 0;

  while (pageCount < MAX_PAGES) {
    const requestBody = { ...baseBody, offsetStart: String(offsetStart), offset: String(PAGE_SIZE) };
    let result = null;
    let lastError = null;

    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
      try {
        result = await page.evaluate(async ({ url, headers, requestBody }) => {
          const res = await fetch(url, {
            method: 'POST',
            headers,
            body: JSON.stringify(requestBody),
            credentials: 'include'
          });
          return res.json();
        }, { url: API_ENDPOINT, headers, requestBody });
        lastError = null;
        break;
      } catch (error) {
        lastError = error;
        logger.warn(`Page fetch failed (attempt ${attempt}/${MAX_RETRIES})`, { message: error.message, offsetStart });
        await page.waitForTimeout(2000);
      }
    }

    if (lastError) {
      logger.error('Page fetch failed after retries.', { offsetStart, message: lastError.message });
      break;
    }

    const batch = result.visits || [];
    pageCount += 1;
    allRecords = allRecords.concat(batch);

    if (onProgress) onProgress({ current: allRecords.length, page: pageCount });
    if (batch.length < PAGE_SIZE) break;
    offsetStart += PAGE_SIZE;
  }

  return allRecords;
}

module.exports = { fetchVisits };