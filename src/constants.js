
module.exports = {
  EXTERNAL_SITE_URL: 'https://www.tawuniya.com/inherent-defects-insurance/TIS/visit-requests',

 
  SELECTORS: {
    usernameInput: '#username',
    passwordInput: '#password',
    loginButton: 'button:has-text("Login")',
    otpInputs: [
      '.MuiOtpInput-TextField-1 input',
      '.MuiOtpInput-TextField-2 input',
      '.MuiOtpInput-TextField-3 input',
      '.MuiOtpInput-TextField-4 input'
    ],
    otpSubmitButton: 'button:has-text("Verify")'
  },

  API_ENDPOINT: 'https://www.tawuniya.com/web/api/tawnidi/getAllVisits',
  PAGE_SIZE: 500,
  MAX_PAGES: 2,      
  MAX_RETRIES: 3,

  
  OTP_WAIT_TIMEOUT_MS: 5 * 60 * 1000 // 5 minutes
};
