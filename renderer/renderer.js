const statusEl = document.getElementById('statusText');
const detailEl = document.getElementById('statusDetail');
const recordCountEl = document.getElementById('recordCount');
const recordsBodyEl = document.getElementById('recordsBody');
const openWebsiteBtn = document.getElementById('openWebsiteBtn');
const stopBtn = document.getElementById('stopBtn');
const exportBtn = document.getElementById('exportBtn');

let records = [];

function renderStatus(text, detail = '') {
  statusEl.textContent = text;
  detailEl.textContent = detail;
}

function renderRecords(rows = []) {
  records = rows;
  recordCountEl.textContent = String(rows.length);
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

openWebsiteBtn.addEventListener('click', async () => {
  renderStatus('Opening', 'Starting browser...');
  openWebsiteBtn.disabled = true;
  stopBtn.disabled = false;

  try {
    const result = await window.electronAPI.startScraping();
    if (!result.ok) {
      renderStatus('Error', result.error || 'Unable to start the scraper.');
    }
  } catch (error) {
    renderStatus('Error', error.message || 'Failed to open website.');
  }
});

stopBtn.addEventListener('click', async () => {
  stopBtn.disabled = true;
  openWebsiteBtn.disabled = false;
  renderStatus('Stopping', 'Closing browser...');

  try {
    await window.electronAPI.stopScraping();
  } catch (error) {
    renderStatus('Error', error.message || 'Unable to stop the scraper.');
  }
});

exportBtn.addEventListener('click', async () => {
  if (records.length === 0) {
    renderStatus('Error', 'No records to export yet — run a fetch first.');
    return;
  }

  renderStatus('Exporting', `Saving ${records.length} records...`);

  try {
    const result = await window.electronAPI.exportToExcel(records);
    if (result.ok) {
      renderStatus('Exported', `Saved to ${result.filePath}`);
    } else {
      renderStatus('Error', result.error || 'Export failed.');
    }
  } catch (error) {
    renderStatus('Error', error.message || 'Export failed.');
  }
});

window.electronAPI.onStatus((data) => {
  const statusText = data?.text || 'Status';
  const detailText = data?.detail || '';
  renderStatus(statusText, detailText);

  if (statusText === 'Completed' || statusText === 'Error' || statusText === 'Stopped') {
    openWebsiteBtn.disabled = false;
    stopBtn.disabled = true;
  }
});

window.electronAPI.onProgress((data) => {
  const total = Number(data?.total || 0);
  const current = Number(data?.current || 0);
  renderStatus('Progress', data?.message || `Records retrieved: ${current} / ${total}`);
  recordCountEl.textContent = String(current || records.length);
});

window.electronAPI.onRecords((data) => {
  renderRecords(data || []);
});

renderStatus('Waiting', 'Ready');
stopBtn.disabled = true;
