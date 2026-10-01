const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  startScraping: () => ipcRenderer.invoke('start-scraping'),
  stopScraping: () => ipcRenderer.invoke('stop-scraping'),
  exportToExcel: (records) => ipcRenderer.invoke('export-excel', records),
  onStatus: (callback) => ipcRenderer.on('scraper-status', (_, data) => callback(data)),
  onProgress: (callback) => ipcRenderer.on('scraper-progress', (_, data) => callback(data)),
  onRecords: (callback) => ipcRenderer.on('scraper-records', (_, data) => callback(data))
});

contextBridge.exposeInMainWorld('electronAPI', {
  startScraping: () => ipcRenderer.invoke('start-scraping'),
  stopScraping: () => ipcRenderer.invoke('stop-scraping'),
  exportToExcel: (records) => ipcRenderer.invoke('export-excel', records), // ADD THIS
  onStatus: (callback) => ipcRenderer.on('scraper-status', (_, data) => callback(data)),
  onProgress: (callback) => ipcRenderer.on('scraper-progress', (_, data) => callback(data)),
  onRecords: (callback) => ipcRenderer.on('scraper-records', (_, data) => callback(data))
});