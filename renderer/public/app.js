const loginPanel = document.getElementById('loginPanel');
const otpPanel = document.getElementById('otpPanel');
const dataPanel = document.getElementById('dataPanel');

const loginBtn = document.getElementById('loginBtn');
const otpBtn = document.getElementById('otpBtn');
const fetchBtn = document.getElementById('fetchBtn');
const exportBtn = document.getElementById('exportBtn');

const recordsBodyEl = document.getElementById('recordsBody');
const recordCountEl = document.getElementById('recordCount');

let currentRecords = [];

function showPanel(panel) {
  [loginPanel, otpPanel, dataPanel].forEach(p => p.classList.add('hidden'));
  panel.classList.remove('hidden');
}

async function postJson(url, body) {
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify(body || {})
  });
  return res.json();
}

loginBtn.addEventListener('click', async () => {
  const username = document.getElementById('username').value;
  const password = document.getElementById('password').value;
  document.getElementById('loginStatus').textContent = 'Logging in...';

  const result = await postJson('/api/login', { username, password });

  if (result.ok) {
    document.getElementById('loginStatus').textContent = '';
    showPanel(otpPanel);
  } else {
    document.getElementById('loginStatus').textContent = result.error || 'Login failed.';
  }
});

otpBtn.addEventListener('click', async () => {
  const otp = document.getElementById('otp').value;
  document.getElementById('otpStatus').textContent = 'Verifying...';

  const result = await postJson('/api/verify-otp', { otp });

  if (result.ok) {
    document.getElementById('otpStatus').textContent = '';
    showPanel(dataPanel);
  } else {
    document.getElementById('otpStatus').textContent = result.error || 'OTP verification failed.';
  }
});

fetchBtn.addEventListener('click', async () => {
  document.getElementById('fetchStatus').textContent = 'Fetching records...';
  fetchBtn.disabled = true;

  const result = await postJson('/api/fetch');

  fetchBtn.disabled = false;

  if (result.ok) {
    currentRecords = result.records;
    recordCountEl.textContent = String(result.count);
    renderRecords(currentRecords);
    exportBtn.disabled = currentRecords.length === 0;
    document.getElementById('fetchStatus').textContent = `Fetched ${result.count} records.`;
  } else {
    document.getElementById('fetchStatus').textContent = result.error || 'Fetch failed.';
  }
});

exportBtn.addEventListener('click', () => {
  window.location.href = '/api/export';
});

function renderRecords(rows) {
  recordsBodyEl.innerHTML = '';
  rows.forEach((row) => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${row.visitId ?? ''}</td>
      <td>${row.visitTypeDesc ?? ''}</td>
      <td>${row.policyNo ?? ''}</td>
      <td>${row.visitStatusDesc ?? ''}</td>
    `;
    recordsBodyEl.appendChild(tr);
  });
}