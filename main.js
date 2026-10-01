const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });
const { ScraperService } = require('./src/scraper/scraper');
const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const XLSX = require('xlsx');

let mainWindow;
let scraperService = null;

function sendToRenderer(channel, payload) {
  if (!mainWindow || mainWindow.isDestroyed()) {
    return;
  }

  mainWindow.webContents.send(channel, payload);
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 820,
    title: 'Desktop Scraper',
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false
    }
  });

  mainWindow.loadFile(path.join(__dirname, 'renderer', 'index.html'));

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

async function stopScraper() {
  if (!scraperService) {
    return;
  }

  try {
    await scraperService.stop();
  } catch (error) {
    sendToRenderer('scraper-status', {
      text: 'Error',
      detail: error.message || 'Unable to stop the scraper.'
    });
  }
}

ipcMain.handle('start-scraping', async () => {
  if (scraperService && scraperService.isRunning) {
    sendToRenderer('scraper-status', { text: 'Status', detail: 'Scraper already running.' });
    return { ok: true, running: true };
  }

  scraperService = new ScraperService({
    sendStatus: (status) => sendToRenderer('scraper-status', status),
    sendProgress: (progress) => sendToRenderer('scraper-progress', progress),
    sendRecords: (records) => sendToRenderer('scraper-records', records),
    sendError: (error) => sendToRenderer('scraper-status', {
      text: 'Error',
      detail: error.message || 'Unable to start the scraper.'
    })
  });

  try {
    const result = await scraperService.start();
    return { ok: true, running: result?.running ?? true };
  } catch (error) {
    sendToRenderer('scraper-status', {
      text: 'Error',
      detail: error.message || 'Failed to start the browser.'
    });
    return { ok: false, error: error.message };
  }
});

ipcMain.handle('stop-scraping', async () => {
  await stopScraper();
  return { ok: true };
});

ipcMain.handle('export-excel', async (event, records) => {
  try {
    if (!records || records.length === 0) {
      return { ok: false, error: 'No records to export.' };
    }

    const rows = records.map((r) => ({
      'Visit ID': r.visitId || '',
      'Visit Date': r.visitDate || '',
      'Visit Time': r.visitTimeSlotDesc || '',
      'Visit Type': r.visitTypeDesc || '',
      'Policy / Quotation No': r.policyNo || '',
      'Proposal No': r.proposalNo || '',
      'Type': r.newReschedule || '',
      'Mobile Number': r.contractorMobile || '',
      'Status': r.visitStatusDesc || ''
    }));

    const worksheet = XLSX.utils.json_to_sheet(rows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Visits');

    const { filePath, canceled } = await dialog.showSaveDialog(mainWindow, {
      title: 'Save Excel File',
      defaultPath: `tawuniya-visits-${Date.now()}.xlsx`,
      filters: [{ name: 'Excel Files', extensions: ['xlsx'] }]
    });

    if (canceled || !filePath) {
      return { ok: false, error: 'Export cancelled.' };
    }

    XLSX.writeFile(workbook, filePath);
    return { ok: true, filePath };
  } catch (error) {
    return { ok: false, error: error.message };
  }
});

app.whenReady().then(() => {
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('before-quit', async () => {
  await stopScraper();
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
