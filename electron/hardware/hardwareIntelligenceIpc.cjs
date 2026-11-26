const fs = require('fs');
const fsp = fs.promises;
const path = require('path');
const { BrowserWindow, dialog } = require('electron');
const { createDeepInventoryCollector } = require('./deepInventoryCollector.cjs');
const { createHardwareDbManager } = require('./hardwareDbManager.cjs');
const { createBenchmarkRunner } = require('./benchmarkRunner.cjs');

function sanitizeDefaultReportFilename(rawName, fallbackName) {
  const base = path.basename(String(rawName || '')).replace(/[<>:"/\\|?*\x00-\x1f]/g, '_').trim();
  return base || fallbackName;
}

function injectStrictReportCsp(rawHtml) {
  const html = String(rawHtml || '<html><body></body></html>');
  const cspTag = '<meta http-equiv="Content-Security-Policy" content="default-src \'none\'; style-src \'unsafe-inline\';">';
  if (/<head[^>]*>/i.test(html)) {
    return html.replace(/<head[^>]*>/i, (m) => `${m}\n${cspTag}`);
  }
  return `<!doctype html><html><head>${cspTag}</head><body>${html}</body></html>`;
}

function createHardwareIntelligenceManager({
  getMainWindow,
  getUserDataPath,
  getLatestSnapshot,
  getFreshSnapshot,
  getLhmLibraryInfo,
  onElevationDetected,
}) {
  const deepCollector = createDeepInventoryCollector({
    getLhmLibraryInfo,
    onElevationDetected,
  });
  const dbManager = createHardwareDbManager({ getMainWindow, getUserDataPath });
  const benchmarkRunner = createBenchmarkRunner({
    getMainWindow,
    getLatestSnapshot,
    getFreshSnapshot,
  });

  async function exportReportJson({ jsonContent, defaultFilename }) {
    const rawJson = String(jsonContent || '{}');
    if (rawJson.length > 10 * 1024 * 1024) {
      return { ok: false, canceled: false, error: 'Report JSON exceeded maximum allowed size.' };
    }
    const win = getMainWindow();
    const safeDefaultName = sanitizeDefaultReportFilename(
      defaultFilename,
      `secretarea-hardware-report-${new Date().toISOString().slice(0, 10)}.json`
    );
    const saveRes = await dialog.showSaveDialog(win || undefined, {
      title: 'Export Hardware Health Report (JSON)',
      defaultPath: safeDefaultName,
      filters: [{ name: 'JSON File', extensions: ['json'] }],
    });
    if (saveRes.canceled || !saveRes.filePath) {
      return { ok: false, canceled: true };
    }
    await fsp.writeFile(saveRes.filePath, rawJson, 'utf8');
    return { ok: true, canceled: false, filePath: saveRes.filePath };
  }

  async function exportReportPdf({ htmlContent, defaultFilename }) {
    const rawHtml = String(htmlContent || '<html><body></body></html>');
    if (rawHtml.length > 5 * 1024 * 1024) {
      return { ok: false, canceled: false, error: 'Report HTML exceeded maximum allowed size.' };
    }
    const win = getMainWindow();
    const safeDefaultName = sanitizeDefaultReportFilename(
      defaultFilename,
      `secretarea-hardware-report-${new Date().toISOString().slice(0, 10)}.pdf`
    );
    const saveRes = await dialog.showSaveDialog(win || undefined, {
      title: 'Export Hardware Health Report (PDF)',
      defaultPath: safeDefaultName,
      filters: [{ name: 'PDF Document', extensions: ['pdf'] }],
    });
    if (saveRes.canceled || !saveRes.filePath) {
      return { ok: false, canceled: true };
    }

    const printWin = new BrowserWindow({
      show: false,
      width: 960,
      height: 1200,
      webPreferences: {
        contextIsolation: true,
        nodeIntegration: false,
        sandbox: true,
        javascript: false,
        webSecurity: true,
        allowRunningInsecureContent: false,
        webviewTag: false,
      },
    });
    printWin.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));
    printWin.webContents.on('will-attach-webview', (event) => event.preventDefault());
    printWin.webContents.on('will-navigate', (event, navUrl) => {
      if (!String(navUrl || '').startsWith('data:text/html;')) {
        event.preventDefault();
      }
    });
    try {
      const safeHtml = injectStrictReportCsp(rawHtml);
      const encoded = `data:text/html;charset=utf-8,${encodeURIComponent(safeHtml)}`;
      await printWin.loadURL(encoded);
      const pdfBuffer = await printWin.webContents.printToPDF({
        printBackground: true,
        pageSize: 'A4',
        margins: { top: 0.4, bottom: 0.4, left: 0.4, right: 0.4 },
      });
      await fsp.writeFile(saveRes.filePath, pdfBuffer);
      return { ok: true, canceled: false, filePath: saveRes.filePath };
    } finally {
      if (!printWin.isDestroyed()) {
        printWin.destroy();
      }
    }
  }

  function registerIpc(ipcMain, isTrustedSender) {
    ipcMain.handle('hardware:get-deep-inventory', async (event, forceRefresh) => {
      if (!isTrustedSender(event)) return null;
      return deepCollector.collectDeepInventory(Boolean(forceRefresh));
    });

    ipcMain.handle('hardware:db-get-state', async (event) => {
      if (!isTrustedSender(event)) return null;
      return dbManager.getState();
    });

    ipcMain.handle('hardware:db-get-entries', async (event) => {
      if (!isTrustedSender(event)) return [];
      return dbManager.getEntries();
    });

    ipcMain.handle('hardware:db-check-update', async (event, customUrl, options) => {
      if (!isTrustedSender(event)) return null;
      return dbManager.checkUpdate(customUrl, options && typeof options === 'object' ? options : {});
    });

    ipcMain.handle('hardware:db-import-file', async (event) => {
      if (!isTrustedSender(event)) return null;
      return dbManager.importFromFile();
    });

    ipcMain.handle('hardware:db-rollback', async (event) => {
      if (!isTrustedSender(event)) return null;
      return dbManager.rollbackToBackup();
    });

    ipcMain.handle('hardware:benchmark-run', async (event, testIds) => {
      if (!isTrustedSender(event)) return { ok: false, results: [] };
      return benchmarkRunner.runBenchmark(testIds);
    });

    ipcMain.handle('hardware:benchmark-cancel', (event) => {
      if (!isTrustedSender(event)) return { ok: false };
      return benchmarkRunner.cancel();
    });

    ipcMain.handle('hardware:export-report-json', async (event, payload) => {
      if (!isTrustedSender(event)) return { ok: false };
      return exportReportJson(payload || {});
    });

    ipcMain.handle('hardware:export-report-pdf', async (event, payload) => {
      if (!isTrustedSender(event)) return { ok: false };
      return exportReportPdf(payload || {});
    });
  }

  function shutdown() {
    benchmarkRunner.cancel();
  }

  return {
    registerIpc,
    shutdown,
  };
}

module.exports = {
  createHardwareIntelligenceManager,
};
