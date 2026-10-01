const { chromium } = require('playwright');
const sessionStore = require('./sessionStore');
const { logger } = require('./logger');
const { EXTERNAL_SITE_URL, SELECTORS } = require('./constants');

// Same trick as the desktop app's waitForApiCall — listens for the page's
// OWN getAllVisits request, which only fires once login is truly complete,
// and captures its real headers/body for reuse in the fetch loop.
function waitForApiCall(page, urlMatch, timeoutMs) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      page.off('request', handler);
      reject(new Error('Timed out waiting for API call: ' + urlMatch));
    }, timeoutMs);

    const handler = (request) => {
      if (request.url().includes(urlMatch) && request.method() === 'POST') {
        clearTimeout(timer);
        page.off('request', handler);
        resolve({ url: request.url(), headers: request.headers(), body: request.postData() });
      }
    };

    page.on('request', handler);
  });
}

// User submitted username + password on OUR page.
// Open a HEADLESS browser (no visible window — this runs on the server)
// and fill in Tawuniya's REAL login form
async function startLogin(sessionId, username, password) {
  logger.info('Starting server-side login.', { sessionId });

  
  const browser = await chromium.launch({
    headless: true,   
    channel: 'chrome',
    args: ['--disable-blink-features=AutomationControlled']
  });

  try {
   const context = await browser.newContext({
  viewport: { width: 1440, height: 1000 },
  userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36',
  locale: 'en-US'
});
    const page = await context.newPage();

    await page.addInitScript(() => {
      Object.defineProperty(navigator, 'webdriver', { get: () => undefined });
    });

   await page.goto(EXTERNAL_SITE_URL, { waitUntil: 'load', timeout: 60000 });
// skip tawuniya arabic login page
const englishToggle = page.locator('text=English').first();
if (await englishToggle.isVisible({ timeout: 5000 }).catch(() => false)) {
  logger.info('Page loaded in Arabic — switching to English.', { sessionId });
  await englishToggle.click({ force: true });
  await page.waitForTimeout(1500); // let the page re-render in English
}

await page.waitForSelector(SELECTORS.usernameInput, { state: 'visible', timeout: 45000 });

await page.fill(SELECTORS.usernameInput, username, { force: true });
await page.fill(SELECTORS.passwordInput, password, { force: true });

 
await page.click(SELECTORS.loginButton, { timeout: 30000, force: true });

    // Give Tawuniya a moment to show the OTP screen. Tawuniya's OTP is 4
    
    await page.waitForSelector(SELECTORS.otpInputs[0], { timeout: 20000 });

    // "Put the call on hold"  keep this exact browser/page open, tied to
  
    sessionStore.put(sessionId, { browser, context, page });

    return { status: 'otp_required' };
   } catch (error) {
    // Login failed
    logger.error('Login failed — closing browser.', { sessionId, message: error.message });

    try {
      const debugPage = sessionStore.get(sessionId)?.page || browser.contexts()[0]?.pages()[0];
      if (debugPage) {
        const debugPath = require('path').join(__dirname, '..', `login-failure-${Date.now()}.png`);
        await debugPage.screenshot({ path: debugPath });
        logger.error('Saved failure screenshot.', {
          path: debugPath,
          url: debugPage.url(),
          title: await debugPage.title().catch(() => 'unknown')
        });
      }
    } catch (debugError) {
      logger.warn('Could not capture debug screenshot.', { message: debugError.message });
    }

    await browser.close().catch(() => {});
    throw new Error('Could not reach the OTP screen. The login form or button may have changed, or credentials may be incorrect.');
  }
}

// user submitted the OTP code on OUR page.
// We resume the SAME held session and finish the login on Tawuniya's side.
async function submitOtp(sessionId, otp) {
  const held = sessionStore.get(sessionId);
  if (!held) {
    throw new Error('No pending login found for this session — it may have expired. Please log in again.');
  }

  const { page } = held;

  // Tawuniya's OTP is 4 SEPARATE digit boxes — type one digit into each.
  const digits = String(otp).trim().split('');
  if (digits.length !== SELECTORS.otpInputs.length) {
    throw new Error(`Expected a ${SELECTORS.otpInputs.length}-digit OTP, got ${digits.length} digits.`);
  }

  
  await page.waitForSelector(SELECTORS.otpInputs[0], { state: 'visible', timeout: 10000 });

  for (let i = 0; i < digits.length; i++) {
    await page.fill(SELECTORS.otpInputs[i], digits[i]);
  }

  // The Verify button starts disabled and only enables once all 4 boxes are
  // filled — give the page a moment to notice before we click.
  await page.waitForSelector(`${SELECTORS.otpSubmitButton}:not([disabled])`, { timeout: 5000 }).catch(() => {
    logger.warn('Verify button did not become enabled — clicking anyway.', { sessionId });
  });

 await page.click(SELECTORS.otpSubmitButton, { force: true });

  // Confirm login truly succeeded by watching for Tawuniya's own getAllVisits
  // call — same reliable signal the desktop app already uses.
  const capturedRequest = await waitForApiCall(page, 'getAllVisits', 30000);

  logger.info('Login confirmed via captured API call.', { sessionId });

  return capturedRequest; // { url, headers, body } — reused directly by scraperService
}

async function endSession(sessionId) {
  await sessionStore.clear(sessionId);
}

module.exports = { startLogin, submitOtp, endSession };