const { app, BrowserWindow, ipcMain, Menu, shell, session, Tray, nativeImage } = require('electron');
const { autoUpdater } = require('electron-updater');
const path = require('path');
const fs = require('fs');
const os = require('os');
const https = require('https');
const { fileURLToPath } = require('url');
const { execFile } = require('child_process');
const { createDownloadManager, isPrivateOrLoopbackHostname } = require('./downloadManager.cjs');
const { createQbitSetupManager } = require('./qbitSetupManager.cjs');
const { createHardwareMonitor } = require('./hardwareMonitor.cjs');
const { createGamingSessionManager } = require('./hardware/gamingSessionManager.cjs');
const { createPresentMonManager } = require('./hardware/presentMonManager.cjs');
const { createPcCleaner } = require('./hardware/pcCleaner.cjs');
const { createHardwareIntelligenceManager } = require('./hardware/hardwareIntelligenceIpc.cjs');
const { registerDealsNetworkBridge } = require('./deals/dealsNetworkBridge.cjs');
const { createDealsCredentialsManager } = require('./deals/dealsCredentialsManager.cjs');

const GITHUB_OWNER = 'secretarea1337';
const GITHUB_REPO = 'secretarea-desktop';

const gotSingleInstanceLock = app.requestSingleInstanceLock();
if (!gotSingleInstanceLock) {
  app.quit();
}

let mainWindow = null;
let appTray = null;
let isQuitting = false;
let downloadManager = null;
let qbitSetupManager = null;
let presentMonManager = null;
let hardwareMonitor = null;
let hardwareIntelligenceManager = null;
let gamingSessionManager = null;
let pcCleaner = null;

function readPackageVersion() {
  if (app.isPackaged) {
    return app.getVersion();
  }
  try {
    const pkgPath = path.join(__dirname, '../package.json');
    const parsed = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
    return typeof parsed.version === 'string' && parsed.version.trim()
      ? parsed.version.trim()
      : app.getVersion();
  } catch {
    return app.getVersion();
  }
}

function stripHtmlNotes(rawNotes) {
  if (!rawNotes) return null;

  let combined = '';
  if (typeof rawNotes === 'string') {
    combined = rawNotes;
  } else if (Array.isArray(rawNotes)) {
    combined = rawNotes
      .map((entry) => {
        if (typeof entry === 'string') return entry;
        if (entry && typeof entry.note === 'string') {
          const prefix = entry.version ? `v${entry.version}: ` : '';
          return `${prefix}${entry.note}`;
        }
        return '';
      })
      .filter(Boolean)
      .join('\n\n');
  }

  const text = combined
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/(p|li|div|h[1-6])>/gi, '\n')
    .replace(/<li[^>]*>/gi, '• ')
    .replace(/<[^>]+>/g, '')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\n{3,}/g, '\n\n')
    .trim();

  return text || null;
}

const updateState = {
  status: 'idle',
  currentVersion: readPackageVersion(),
  availableVersion: null,
  releaseName: null,
  releaseNotes: null,
  releaseDate: null,
  progress: null,
  error: null,
  isManualCheck: false,
  postponed: false,
  lastCheckedAt: null,
};

let hasCheckedOnStartup = false;
let activeCheckPromise = null;
let activeDownloadPromise = null;
let lastProgressEmitAt = 0;

function emitUpdateState() {
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send('updater:status', { ...updateState });
  }
}

function patchUpdateState(patch) {
  Object.assign(updateState, patch);
  emitUpdateState();
}

const PACKAGED_DIST_DIR = path.resolve(__dirname, '../dist');
const PACKAGED_INDEX_HTML = path.resolve(PACKAGED_DIST_DIR, 'index.html');

function isPathInsideDir(targetPath, baseDir) {
  if (!targetPath || !baseDir || typeof targetPath !== 'string' || typeof baseDir !== 'string') {
    return false;
  }
  const cleanTarget = path.resolve(targetPath);
  const cleanBase = path.resolve(baseDir);
  if (cleanTarget.includes('\0') || cleanBase.includes('\0')) return false;
  if (process.platform === 'win32') {
    const t = cleanTarget.toLowerCase();
    const b = cleanBase.toLowerCase();
    return t === b || t.startsWith(b + path.sep);
  }
  return cleanTarget === cleanBase || cleanTarget.startsWith(cleanBase + path.sep);
}

function isAllowedAppUrl(rawUrl) {
  if (typeof rawUrl !== 'string' || !rawUrl.trim()) return false;
  const trimmed = rawUrl.trim();
  const devServerUrl = process.env.VITE_DEV_SERVER_URL;
  if (devServerUrl) {
    try {
      const candidate = new URL(trimmed);
      const expected = new URL(devServerUrl);
      return candidate.origin === expected.origin;
    } catch {
      return false;
    }
  }
  if (!trimmed.toLowerCase().startsWith('file://')) return false;
  try {
    const filePath = path.resolve(fileURLToPath(trimmed));
    return isPathInsideDir(filePath, PACKAGED_DIST_DIR);
  } catch {
    return false;
  }
}

function isTrustedSender(event) {
  if (!mainWindow || mainWindow.isDestroyed()) return false;
  if (event.sender !== mainWindow.webContents) return false;
  const senderUrl = event.senderFrame?.url || '';
  return isAllowedAppUrl(senderUrl);
}

function configureAutoUpdater() {
  autoUpdater.autoDownload = false;
  autoUpdater.autoInstallOnAppQuit = true;
  autoUpdater.allowPrerelease = false;
  autoUpdater.allowDowngrade = false;

  const devConfigPath = path.join(__dirname, '../dev-app-update.yml');
  if (!app.isPackaged && fs.existsSync(devConfigPath)) {
    autoUpdater.forceDevUpdateConfig = true;
    autoUpdater.updateConfigPath = devConfigPath;
  }

  autoUpdater.setFeedURL({
    provider: 'github',
    owner: GITHUB_OWNER,
    repo: GITHUB_REPO,
    releaseType: 'release',
  });

  autoUpdater.on('checking-for-update', () => {
    patchUpdateState({
      status: 'checking',
      error: null,
      progress: null,
    });
  });

  autoUpdater.on('update-available', (info) => {
    patchUpdateState({
      status: 'available',
      availableVersion: info?.version || null,
      releaseName: info?.releaseName || null,
      releaseNotes: stripHtmlNotes(info?.releaseNotes),
      releaseDate: info?.releaseDate || null,
      progress: null,
      error: null,
      postponed: false,
      lastCheckedAt: new Date().toISOString(),
    });
  });

  autoUpdater.on('update-not-available', (info) => {
    patchUpdateState({
      status: 'not-available',
      availableVersion: info?.version || updateState.currentVersion,
      releaseName: null,
      releaseNotes: null,
      releaseDate: null,
      progress: null,
      error: null,
      postponed: false,
      lastCheckedAt: new Date().toISOString(),
    });
  });

  autoUpdater.on('download-progress', (progressObj) => {
    const now = Date.now();
    const percent = Math.max(0, Math.min(100, Math.round((progressObj?.percent || 0) * 10) / 10));
    if (percent < 100 && now - lastProgressEmitAt < 120) {
      return;
    }
    lastProgressEmitAt = now;
    patchUpdateState({
      status: 'downloading',
      progress: {
        percent,
        bytesPerSecond: Math.round(progressObj?.bytesPerSecond || 0),
        transferred: Math.round(progressObj?.transferred || 0),
        total: Math.round(progressObj?.total || 0),
      },
      error: null,
    });
  });

  autoUpdater.on('update-downloaded', (info) => {
    patchUpdateState({
      status: 'downloaded',
      availableVersion: info?.version || updateState.availableVersion,
      releaseName: info?.releaseName || updateState.releaseName,
      releaseNotes: stripHtmlNotes(info?.releaseNotes) || updateState.releaseNotes,
      releaseDate: info?.releaseDate || updateState.releaseDate,
      progress: {
        percent: 100,
        bytesPerSecond: 0,
        transferred: updateState.progress?.total || 0,
        total: updateState.progress?.total || 0,
      },
      error: null,
      postponed: false,
    });
  });

  autoUpdater.on('before-quit-for-update', () => {
    isQuitting = true;
  });

  autoUpdater.on('error', (err) => {
    const rawMsg = err instanceof Error ? err.message : String(err || 'Update check failed.');
    const scrubbedMsg = rawMsg
      .replace(/Bearer\s+[A-Za-z0-9._-]+/gi, 'Bearer [redacted]')
      .replace(/([?&](?:token|access_token|key|secret)=)[^&\s]+/gi, '$1[redacted]');
    const friendlyMsg = scrubbedMsg.includes('ERR_INTERNET_DISCONNECTED') || scrubbedMsg.includes('ENOTFOUND')
      ? 'Unable to reach GitHub Releases. Please check your internet connection.'
      : scrubbedMsg.split('\n')[0].slice(0, 220);

    patchUpdateState({
      status: 'error',
      progress: null,
      error: friendlyMsg,
      lastCheckedAt: new Date().toISOString(),
    });
  });
}

async function runUpdateCheck({ manual }) {
  if (updateState.status === 'downloading' || updateState.status === 'downloaded') {
    return { ...updateState };
  }

  if (activeCheckPromise) {
    if (manual && !updateState.isManualCheck) {
      patchUpdateState({ isManualCheck: true });
    }
    await activeCheckPromise;
    return { ...updateState };
  }

  const devConfigExists = fs.existsSync(path.join(__dirname, '../dev-app-update.yml'));
  if (!app.isPackaged && !devConfigExists) {
    if (manual) {
      patchUpdateState({
        status: 'error',
        isManualCheck: true,
        error: 'Update checking is enabled in packaged Windows builds (.exe).',
        lastCheckedAt: new Date().toISOString(),
      });
    }
    return { ...updateState };
  }

  updateState.isManualCheck = Boolean(manual);
  if (manual) {
    updateState.postponed = false;
  }

  activeCheckPromise = (async () => {
    try {
      await autoUpdater.checkForUpdates();
    } catch {
      // Error state is handled cleanly by autoUpdater 'error' listener
    } finally {
      activeCheckPromise = null;
    }
  })();

  await activeCheckPromise;
  return { ...updateState };
}

async function runUpdateDownload() {
  if (updateState.status === 'downloaded') {
    return { ...updateState };
  }
  if (activeDownloadPromise) {
    await activeDownloadPromise;
    return { ...updateState };
  }
  if (updateState.status !== 'available' && updateState.status !== 'error') {
    return { ...updateState };
  }

  lastProgressEmitAt = 0;
  patchUpdateState({
    status: 'downloading',
    error: null,
    postponed: false,
    progress: {
      percent: 0,
      bytesPerSecond: 0,
      transferred: 0,
      total: 0,
    },
  });

  activeDownloadPromise = (async () => {
    try {
      await autoUpdater.downloadUpdate();
    } catch {
      // Error state handled by autoUpdater 'error' listener
    } finally {
      activeDownloadPromise = null;
    }
  })();

  await activeDownloadPromise;
  return { ...updateState };
}

function registerUpdaterIpc() {
  ipcMain.handle('updater:get-version', (event) => {
    if (!isTrustedSender(event)) return '';
    return updateState.currentVersion;
  });

  ipcMain.handle('updater:get-state', (event) => {
    if (!isTrustedSender(event)) return null;
    return { ...updateState };
  });

  ipcMain.handle('updater:check', async (event) => {
    if (!isTrustedSender(event)) return null;
    return runUpdateCheck({ manual: true });
  });

  ipcMain.handle('updater:download', async (event) => {
    if (!isTrustedSender(event)) return null;
    return runUpdateDownload();
  });

  ipcMain.handle('updater:postpone', (event) => {
    if (!isTrustedSender(event)) return null;
    patchUpdateState({ postponed: true });
    return { ...updateState };
  });

  ipcMain.handle('updater:install', (event) => {
    if (!isTrustedSender(event)) return;
    if (updateState.status !== 'downloaded') return;
    isQuitting = true;
    setImmediate(() => {
      autoUpdater.quitAndInstall(false, true);
    });
  });

  ipcMain.handle('updater:get-release-notes', async (event, version) => {
    if (!isTrustedSender(event)) return null;
    const requestedVersion =
      typeof version === 'string' && version.trim()
        ? version.trim()
        : readPackageVersion();
    return fetchReleaseNotesForVersion(requestedVersion);
  });

  ipcMain.handle('updater:get-release-history', async (event, forceRefresh) => {
    if (!isTrustedSender(event)) return [];
    return fetchReleaseHistory(Boolean(forceRefresh));
  });

  ipcMain.handle('window:is-fullscreen', (event) => {
    if (!isTrustedSender(event) || !mainWindow || mainWindow.isDestroyed()) return false;
    return mainWindow.isFullScreen();
  });

  ipcMain.handle('window:set-fullscreen', (event, flag) => {
    if (!isTrustedSender(event) || !mainWindow || mainWindow.isDestroyed()) return false;
    mainWindow.setFullScreen(Boolean(flag));
    return mainWindow.isFullScreen();
  });

  ipcMain.handle('system:get-specs', async (event, forceRefresh) => {
    if (!isTrustedSender(event)) return null;
    return getSystemSpecs(Boolean(forceRefresh));
  });

  ipcMain.handle('settings:get-desktop', (event) => {
    if (!isTrustedSender(event)) return null;
    return getDesktopSettingsPayload();
  });

  ipcMain.handle('settings:set-start-with-computer', (event, enabled) => {
    if (!isTrustedSender(event)) return null;
    return applyStartWithComputerSetting(Boolean(enabled));
  });

  ipcMain.handle('settings:set-close-behavior', (event, behavior) => {
    if (!isTrustedSender(event)) return null;
    return applyCloseBehaviorSetting(behavior);
  });

  ipcMain.handle('app:exit-completely', (event) => {
    if (!isTrustedSender(event)) return { ok: false };
    setImmediate(() => {
      performFullAppShutdown();
    });
    return { ok: true };
  });

  ipcMain.handle('settings:complete-onboarding', (event, payload = true) => {
    if (!isTrustedSender(event)) return null;
    const completed =
      typeof payload === 'object' && payload !== null
        ? Boolean(payload.completed ?? true)
        : Boolean(payload);
    const rawVersion =
      typeof payload === 'object' &&
      payload !== null &&
      typeof payload.version === 'string' &&
      payload.version.trim()
        ? payload.version.trim()
        : readPackageVersion();
    const version = /^[0-9A-Za-z._-]{1,32}$/.test(rawVersion)
      ? rawVersion
      : readPackageVersion();
    writeDesktopLauncherSettings({
      onboardingCompleted: completed,
      lastOnboardedVersion: completed ? version : null,
    });
    return getDesktopSettingsPayload();
  });
}

const releaseNotesCache = new Map();

function fetchGithubReleaseJson(apiPath) {
  return new Promise((resolve) => {
    const req = https.get(
      {
        hostname: 'api.github.com',
        path: apiPath,
        timeout: 5500,
        headers: {
          'User-Agent': `SecretArea/${readPackageVersion()}`,
          Accept: 'application/vnd.github+json',
        },
      },
      (res) => {
        if (!res || res.statusCode !== 200) {
          res?.resume();
          resolve(null);
          return;
        }
        let body = '';
        res.setEncoding('utf8');
        res.on('data', (chunk) => {
          if (body.length < 512 * 1024) {
            body += chunk;
          }
        });
        res.on('end', () => {
          try {
            resolve(JSON.parse(body));
          } catch {
            resolve(null);
          }
        });
      }
    );
    req.on('timeout', () => {
      req.destroy();
      resolve(null);
    });
    req.on('error', () => {
      resolve(null);
    });
  });
}

async function fetchReleaseNotesForVersion(rawVersion) {
  const cleanVersion = String(rawVersion || readPackageVersion())
    .replace(/^v/i, '')
    .trim();
  if (!/^[0-9A-Za-z._-]{1,32}$/.test(cleanVersion)) {
    return null;
  }
  if (releaseNotesCache.has(cleanVersion)) {
    return releaseNotesCache.get(cleanVersion);
  }

  let data = await fetchGithubReleaseJson(
    `/repos/${GITHUB_OWNER}/${GITHUB_REPO}/releases/tags/v${encodeURIComponent(cleanVersion)}`
  );
  if (!data) {
    data = await fetchGithubReleaseJson(
      `/repos/${GITHUB_OWNER}/${GITHUB_REPO}/releases/tags/${encodeURIComponent(cleanVersion)}`
    );
  }

  if (!data && updateState.releaseNotes && updateState.availableVersion === cleanVersion) {
    const fallback = {
      version: cleanVersion,
      releaseName: updateState.releaseName || `SecretArea v${cleanVersion}`,
      notes: updateState.releaseNotes,
      publishedAt: updateState.releaseDate || null,
      source: 'updater',
    };
    releaseNotesCache.set(cleanVersion, fallback);
    return fallback;
  }

  if (!data || typeof data.body !== 'string') {
    return null;
  }

  const parsed = {
    version: cleanVersion,
    releaseName: typeof data.name === 'string' && data.name.trim() ? data.name.trim() : `SecretArea v${cleanVersion}`,
    notes: stripHtmlNotes(data.body) || data.body.trim(),
    publishedAt: typeof data.published_at === 'string' ? data.published_at : null,
    source: 'github',
  };
  releaseNotesCache.set(cleanVersion, parsed);
  return parsed;
}

const RELEASE_HISTORY_TTL_MS = 10 * 60 * 1000;
let releaseHistoryCache = { items: null, fetchedAt: 0 };

async function fetchReleaseHistory(forceRefresh = false) {
  if (
    !forceRefresh &&
    Array.isArray(releaseHistoryCache.items) &&
    Date.now() - releaseHistoryCache.fetchedAt < RELEASE_HISTORY_TTL_MS
  ) {
    return releaseHistoryCache.items;
  }

  const data = await fetchGithubReleaseJson(
    `/repos/${GITHUB_OWNER}/${GITHUB_REPO}/releases?per_page=25`
  );
  if (!Array.isArray(data)) {
    return Array.isArray(releaseHistoryCache.items) ? releaseHistoryCache.items : [];
  }

  const parsedList = data
    .filter((rel) => rel && !rel.draft)
    .map((rel) => {
      const rawTag = String(rel.tag_name || rel.name || '').trim();
      const version = rawTag.replace(/^v/i, '').trim();
      const notes =
        typeof rel.body === 'string' && rel.body.trim()
          ? stripHtmlNotes(rel.body) || rel.body.trim()
          : '';
      return {
        version,
        tagName: rawTag || (version ? `v${version}` : ''),
        releaseName:
          typeof rel.name === 'string' && rel.name.trim()
            ? rel.name.trim()
            : `SecretArea v${version}`,
        notes,
        publishedAt: typeof rel.published_at === 'string' ? rel.published_at : null,
        htmlUrl:
          typeof rel.html_url === 'string' && /^https:\/\/github\.com\//i.test(rel.html_url)
            ? rel.html_url
            : null,
        prerelease: Boolean(rel.prerelease),
        source: 'github',
      };
    })
    .filter((entry) => Boolean(entry.version));

  releaseHistoryCache = {
    items: parsedList,
    fetchedAt: Date.now(),
  };
  return parsedList;
}

function getLauncherSettingsPath() {
  return path.join(app.getPath('userData'), 'launcher-settings.json');
}

function readDesktopLauncherSettings() {
  try {
    const filePath = getLauncherSettingsPath();
    if (!fs.existsSync(filePath)) {
      return { startWithComputer: false, closeBehavior: 'exit' };
    }
    const parsed = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    const startWithComputer = Boolean(parsed?.startWithComputer);
    const rawBehavior = parsed?.closeBehavior;
    const closeBehavior =
      rawBehavior === 'minimize-to-tray' || rawBehavior === 'exit'
        ? rawBehavior
        : startWithComputer
        ? 'minimize-to-tray'
        : 'exit';
    return {
      ...(parsed && typeof parsed === 'object' ? parsed : {}),
      startWithComputer,
      closeBehavior,
    };
  } catch {
    return { startWithComputer: false, closeBehavior: 'exit' };
  }
}

function writeDesktopLauncherSettings(next) {
  try {
    const filePath = getLauncherSettingsPath();
    const existing = readDesktopLauncherSettings();
    const nextStart = Boolean(
      next && typeof next.startWithComputer === 'boolean'
        ? next.startWithComputer
        : existing.startWithComputer
    );
    const rawBehavior = next?.closeBehavior ?? existing.closeBehavior;
    const closeBehavior =
      rawBehavior === 'minimize-to-tray' || rawBehavior === 'exit'
        ? rawBehavior
        : nextStart
        ? 'minimize-to-tray'
        : 'exit';
    const merged = {
      ...existing,
      ...(next && typeof next === 'object' ? next : {}),
      startWithComputer: nextStart,
      closeBehavior,
    };
    fs.mkdirSync(path.dirname(filePath), { recursive: true });
    fs.writeFileSync(filePath, JSON.stringify(merged, null, 2), 'utf8');
  } catch {
    // ignore disk write errors
  }
}

function isTrayLaunchRequested() {
  if (process.argv.includes('--tray')) return true;
  if (process.platform === 'darwin') {
    try {
      return Boolean(app.getLoginItemSettings().wasOpenedAsHidden);
    } catch {
      return false;
    }
  }
  return false;
}

function showAndFocusMainWindow() {
  if (!mainWindow || mainWindow.isDestroyed()) {
    createWindow({ startHidden: false });
    return;
  }
  if (mainWindow.isMinimized()) {
    mainWindow.restore();
  }
  mainWindow.show();
  mainWindow.focus();
}

function performFullAppShutdown() {
  isQuitting = true;
  try {
    if (hardwareMonitor) hardwareMonitor.shutdown();
  } catch {
    // ignore
  }
  try {
    if (gamingSessionManager) gamingSessionManager.shutdown();
  } catch {
    // ignore
  }
  try {
    if (pcCleaner) pcCleaner.cancel();
  } catch {
    // ignore
  }
  try {
    if (qbitSetupManager) qbitSetupManager.shutdown();
  } catch {
    // ignore
  }
  try {
    if (presentMonManager) presentMonManager.shutdown();
  } catch {
    // ignore
  }
  try {
    if (downloadManager) downloadManager.shutdown();
  } catch {
    // ignore
  }
  destroySystemTray();
  for (const win of BrowserWindow.getAllWindows()) {
    if (win && !win.isDestroyed()) {
      win.destroy();
    }
  }
  app.quit();
}

function ensureSystemTray() {
  if (appTray && !appTray.isDestroyed()) return appTray;
  const iconPath = resolveAppIcon();
  let trayImg = iconPath ? nativeImage.createFromPath(iconPath) : nativeImage.createEmpty();
  if (!trayImg.isEmpty()) {
    trayImg = trayImg.resize({ width: 16, height: 16 });
  }
  appTray = new Tray(trayImg);
  appTray.setToolTip('SecretArea');

  const contextMenu = Menu.buildFromTemplate([
    {
      label: 'Open SecretArea',
      click: () => showAndFocusMainWindow(),
    },
    { type: 'separator' },
    {
      label: 'Exit SecretArea Completely',
      click: () => performFullAppShutdown(),
    },
  ]);

  appTray.setContextMenu(contextMenu);
  appTray.on('click', () => showAndFocusMainWindow());
  appTray.on('double-click', () => showAndFocusMainWindow());
  return appTray;
}

function destroySystemTray() {
  if (appTray && !appTray.isDestroyed()) {
    appTray.destroy();
  }
  appTray = null;
}

function syncLoginItemWithOs(enabled) {
  if (!app.isPackaged) return false;
  if (process.platform !== 'win32' && process.platform !== 'darwin') return false;
  try {
    app.setLoginItemSettings({
      openAtLogin: Boolean(enabled),
      openAsHidden: true,
      path: process.execPath,
      args: enabled ? ['--tray'] : [],
    });
    return true;
  } catch {
    return false;
  }
}

function getDesktopSettingsPayload() {
  const persisted = readDesktopLauncherSettings();
  let startWithComputer = persisted.startWithComputer;
  if (app.isPackaged && (process.platform === 'win32' || process.platform === 'darwin')) {
    try {
      const loginSettings = app.getLoginItemSettings({
        path: process.execPath,
        args: ['--tray'],
      });
      if (typeof loginSettings?.openAtLogin === 'boolean') {
        startWithComputer = loginSettings.openAtLogin || persisted.startWithComputer;
      }
    } catch {
      // fallback to persisted setting
    }
  }
  return {
    startWithComputer,
    closeBehavior: persisted.closeBehavior === 'minimize-to-tray' ? 'minimize-to-tray' : 'exit',
    onboardingCompleted: Boolean(persisted.onboardingCompleted),
    lastOnboardedVersion:
      typeof persisted.lastOnboardedVersion === 'string' && persisted.lastOnboardedVersion.trim()
        ? persisted.lastOnboardedVersion.trim()
        : null,
    appVersion: readPackageVersion(),
    isPackaged: app.isPackaged,
    platform: process.platform,
    trayActive: Boolean(appTray && !appTray.isDestroyed()),
  };
}

function applyStartWithComputerSetting(enabled) {
  writeDesktopLauncherSettings({ startWithComputer: enabled });
  syncLoginItemWithOs(enabled);
  const current = readDesktopLauncherSettings();
  if (enabled || current.closeBehavior === 'minimize-to-tray') {
    ensureSystemTray();
  } else if (!isTrayLaunchRequested()) {
    destroySystemTray();
  }
  return getDesktopSettingsPayload();
}

function applyCloseBehaviorSetting(rawBehavior) {
  const closeBehavior = rawBehavior === 'minimize-to-tray' ? 'minimize-to-tray' : 'exit';
  writeDesktopLauncherSettings({ closeBehavior });
  const current = readDesktopLauncherSettings();
  if (closeBehavior === 'minimize-to-tray' || current.startWithComputer) {
    ensureSystemTray();
  } else if (!isTrayLaunchRequested()) {
    destroySystemTray();
  }
  return getDesktopSettingsPayload();
}

let cachedHardwareProfile = null;
let pendingHardwarePromise = null;

function execFileAsync(cmd, args, timeoutMs = 4500) {
  return new Promise((resolve) => {
    execFile(
      cmd,
      args,
      { timeout: timeoutMs, windowsHide: true, maxBuffer: 1024 * 1024 },
      (err, stdout) => {
        if (err || !stdout) {
          resolve('');
          return;
        }
        resolve(String(stdout).trim());
      }
    );
  });
}

function cleanHardwareLabel(raw) {
  if (!raw || typeof raw !== 'string') return '';
  return raw
    .replace(/\(R\)/gi, '')
    .replace(/\(TM\)/gi, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function scoreGpuAdapterPriority(name) {
  const n = name.toLowerCase();
  if (!n) return -100;
  if (
    n.includes('microsoft basic') ||
    n.includes('virtual') ||
    n.includes('parsec') ||
    n.includes('vnc') ||
    n.includes('citrix') ||
    n.includes('mirage')
  ) {
    return -50;
  }
  if (n.includes('nvidia') || n.includes('geforce') || n.includes('rtx') || n.includes('gtx') || n.includes('quadro')) {
    return 100;
  }
  if (n.includes('radeon rx') || n.includes('radeon pro')) {
    return 90;
  }
  if (n.includes('intel') && n.includes('arc')) {
    return 80;
  }
  if (n.includes('amd') || n.includes('radeon')) {
    return 45;
  }
  if (n.includes('iris') || n.includes('uhd') || n.includes('hd graphics') || n.includes('intel')) {
    return 25;
  }
  return 10;
}

function getFriendlyOsName() {
  const platform = process.platform;
  const rel = os.release();
  if (platform === 'win32') {
    const parts = rel.split('.');
    const major = Number(parts[0] || 10);
    const build = Number(parts[2] || 0);
    if (major >= 10 && build >= 22000) {
      return `Windows 11 (${os.arch()})`;
    }
    if (major >= 10) {
      return `Windows 10 (${os.arch()})`;
    }
    return `Windows ${rel} (${os.arch()})`;
  }
  if (platform === 'darwin') {
    return `macOS (${os.arch()})`;
  }
  return `Linux ${rel} (${os.arch()})`;
}

function getDiskSpaceInfo() {
  let targetPath = process.cwd();
  try {
    targetPath = app.getPath('downloads') || app.getPath('userData') || process.cwd();
  } catch {
    // fallback cwd
  }
  const parsedRoot = path.parse(targetPath).root || targetPath;
  const spaceDrive =
    process.platform === 'win32'
      ? parsedRoot.replace(/[\\/]+$/, '') || 'C:'
      : parsedRoot;

  try {
    if (typeof fs.statfsSync === 'function') {
      const stat = fs.statfsSync(targetPath);
      const bsize = Number(stat.bsize || 0);
      const bavail = Number(stat.bavail || 0);
      const blocks = Number(stat.blocks || 0);
      if (bsize > 0) {
        return {
          spaceDrive,
          freeSpaceGB: Number(((bavail * bsize) / (1024 ** 3)).toFixed(1)),
          totalSpaceGB: Math.round((blocks * bsize) / (1024 ** 3)),
        };
      }
    }
  } catch {
    // ignore statfs error
  }

  return {
    spaceDrive,
    freeSpaceGB: null,
    totalSpaceGB: null,
  };
}

async function detectWindowsHardwareDetails() {
  const psScript = [
    '$ErrorActionPreference = "SilentlyContinue";',
    '$osObj = Get-CimInstance Win32_OperatingSystem | Select-Object -First 1 Caption;',
    '$cpuObj = Get-CimInstance Win32_Processor | Select-Object -First 1 Name,NumberOfCores,NumberOfLogicalProcessors,MaxClockSpeed;',
    '$gpus = @(Get-CimInstance Win32_VideoController | ForEach-Object {',
    '  [PSCustomObject]@{ Name = $_.Name; AdapterRAM = $_.AdapterRAM }',
    '});',
    '@{ osCaption = $osObj.Caption; cpu = $cpuObj; gpus = $gpus } | ConvertTo-Json -Depth 4 -Compress',
  ].join(' ');

  const out = await execFileAsync('powershell.exe', [
    '-NoProfile',
    '-NonInteractive',
    '-ExecutionPolicy',
    'Bypass',
    '-Command',
    psScript,
  ]);

  if (!out) return null;
  try {
    return JSON.parse(out);
  } catch {
    return null;
  }
}

async function detectStaticHardwareProfile() {
  const cpus = os.cpus() || [];
  let cpuName = cleanHardwareLabel(cpus[0]?.model || '') || 'Unknown Processor';
  let cpuCores = cpus.length > 0 ? cpus.length : null;
  let cpuSpeedGhz = cpus[0]?.speed && cpus[0].speed > 0 ? Number((cpus[0].speed / 1000).toFixed(2)) : null;
  let osName = getFriendlyOsName();
  const totalMem = os.totalmem();
  const ramGB = totalMem > 0 ? Math.max(1, Math.round(totalMem / (1024 ** 3))) : null;
  let allGpus = [];
  let gpuName = '';
  let gpuVramGB = null;

  if (process.platform === 'win32') {
    const winInfo = await detectWindowsHardwareDetails();
    if (winInfo) {
      if (winInfo.osCaption && typeof winInfo.osCaption === 'string') {
        osName = cleanHardwareLabel(winInfo.osCaption).replace(/^Microsoft\s+/i, '');
      }
      if (winInfo.cpu?.Name) {
        cpuName = cleanHardwareLabel(winInfo.cpu.Name);
      }
      if (winInfo.cpu?.NumberOfLogicalProcessors && Number(winInfo.cpu.NumberOfLogicalProcessors) > 0) {
        cpuCores = Number(winInfo.cpu.NumberOfLogicalProcessors);
      }
      if (winInfo.cpu?.MaxClockSpeed && Number(winInfo.cpu.MaxClockSpeed) > 0) {
        cpuSpeedGhz = Number((Number(winInfo.cpu.MaxClockSpeed) / 1000).toFixed(2));
      }
      const gpuList = Array.isArray(winInfo.gpus)
        ? winInfo.gpus
        : winInfo.gpus
        ? [winInfo.gpus]
        : [];
      const cleaned = gpuList
        .map((g) => ({
          name: cleanHardwareLabel(g?.Name || ''),
          vramBytes: Number(g?.AdapterRAM || 0),
        }))
        .filter((g) => g.name.length > 0)
        .sort((a, b) => scoreGpuAdapterPriority(b.name) - scoreGpuAdapterPriority(a.name));

      allGpus = cleaned.map((g) => g.name);
      if (cleaned[0]) {
        gpuName = cleaned[0].name;
        if (cleaned[0].vramBytes > 0) {
          gpuVramGB = Number((cleaned[0].vramBytes / (1024 ** 3)).toFixed(1));
        }
      }
    }
  }

  if (!gpuName) {
    try {
      const basicGpu = await app.getGPUInfo('basic');
      const devices = Array.isArray(basicGpu?.gpuDevice) ? basicGpu.gpuDevice : [];
      const names = devices
        .map((d) => cleanHardwareLabel(d?.description || d?.driverVendor || ''))
        .filter(Boolean);
      if (names.length > 0) {
        allGpus = names;
        gpuName = names.sort((a, b) => scoreGpuAdapterPriority(b) - scoreGpuAdapterPriority(a))[0];
      }
    } catch {
      // ignore fallback error
    }
  }

  return {
    source: 'electron',
    osName,
    cpuName,
    cpuCores,
    cpuSpeedGhz,
    gpuName: gpuName || 'Unknown GPU',
    gpuVramGB,
    allGpus,
    ramGB,
    ramIsApprox: false,
  };
}

async function getSystemSpecs(forceRefresh = false) {
  if (!cachedHardwareProfile || forceRefresh) {
    if (!pendingHardwarePromise || forceRefresh) {
      pendingHardwarePromise = detectStaticHardwareProfile()
        .then((profile) => {
          cachedHardwareProfile = profile;
          return profile;
        })
        .finally(() => {
          pendingHardwarePromise = null;
        });
    }
    await pendingHardwarePromise;
  }

  const disk = getDiskSpaceInfo();
  const fallbackMem = os.totalmem();
  const fallbackCores = os.cpus()?.length || 0;
  return {
    ...(cachedHardwareProfile || {
      source: 'electron',
      osName: getFriendlyOsName(),
      cpuName: 'Unknown Processor',
      cpuCores: fallbackCores > 0 ? fallbackCores : null,
      cpuSpeedGhz: null,
      gpuName: 'Unknown GPU',
      gpuVramGB: null,
      allGpus: [],
      ramGB: fallbackMem > 0 ? Math.max(1, Math.round(fallbackMem / (1024 ** 3))) : null,
      ramIsApprox: false,
    }),
    ...disk,
    detectedAt: new Date().toISOString(),
  };
}

function resolveAppIcon() {
  const distIcon = path.join(__dirname, '../dist/img/logo01.png');
  if (fs.existsSync(distIcon)) return distIcon;
  const publicIcon = path.join(__dirname, '../public/img/logo01.png');
  if (fs.existsSync(publicIcon)) return publicIcon;
  return undefined;
}

function parseSafeExternalUrl(targetUrl) {
  if (typeof targetUrl !== 'string') return '';
  const trimmed = targetUrl.trim();
  if (!trimmed || trimmed.length > 2048 || /[\x00-\x1f\x7f]/.test(trimmed)) return '';
  try {
    const parsed = new URL(trimmed);
    const proto = parsed.protocol.toLowerCase();
    if (proto === 'http:' || proto === 'https:') {
      if (parsed.username || parsed.password) return '';
      if (!parsed.hostname || isPrivateOrLoopbackHostname(parsed.hostname)) return '';
      return trimmed;
    }
    if (proto === 'magnet:' || proto === 'tg:') {
      return /\s/.test(trimmed) ? '' : trimmed;
    }
    return '';
  } catch {
    return '';
  }
}

function createWindow(options = {}) {
  const startHidden = Boolean(options.startHidden);
  mainWindow = new BrowserWindow({
    width: 1360,
    height: 860,
    minWidth: 960,
    minHeight: 620,
    title: 'SecretArea',
    icon: resolveAppIcon(),
    backgroundColor: '#0e141b',
    autoHideMenuBar: true,
    fullScreenable: true,
    show: false,
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      webSecurity: true,
      allowRunningInsecureContent: false,
      webviewTag: false,
    },
  });

  mainWindow.on('enter-full-screen', () => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('window:fullscreen-changed', true);
    }
  });

  mainWindow.on('leave-full-screen', () => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('window:fullscreen-changed', false);
    }
  });

  mainWindow.once('ready-to-show', () => {
    if (!startHidden) {
      mainWindow?.show();
    }
    emitUpdateState();

    if (!hasCheckedOnStartup && app.isPackaged) {
      hasCheckedOnStartup = true;
      setTimeout(() => {
        void runUpdateCheck({ manual: false });
      }, 2500);
    }
  });

  mainWindow.on('hide', () => {
    if (hardwareMonitor) {
      hardwareMonitor.pauseForHidden();
    }
  });

  mainWindow.on('show', () => {
    if (hardwareMonitor) {
      hardwareMonitor.resumeFromHidden();
    }
  });

  mainWindow.on('close', (event) => {
    const persisted = readDesktopLauncherSettings();
    if (!isQuitting && persisted.closeBehavior === 'minimize-to-tray') {
      ensureSystemTray();
      if (appTray && !appTray.isDestroyed()) {
        event.preventDefault();
        mainWindow?.hide();
      }
    }
  });

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    const safeUrl = parseSafeExternalUrl(url);
    if (safeUrl) {
      void shell.openExternal(safeUrl);
    }
    return { action: 'deny' };
  });

  mainWindow.webContents.on('will-navigate', (event, url) => {
    if (isAllowedAppUrl(url)) {
      return;
    }
    event.preventDefault();
    const safeUrl = parseSafeExternalUrl(url);
    if (safeUrl) {
      void shell.openExternal(safeUrl);
    }
  });

  if (process.env.VITE_DEV_SERVER_URL) {
    void mainWindow.loadURL(process.env.VITE_DEV_SERVER_URL);
  } else {
    void mainWindow.loadFile(PACKAGED_INDEX_HTML);
  }

  mainWindow.on('closed', () => {
    if (hardwareMonitor) {
      hardwareMonitor.stop();
    }
    mainWindow = null;
  });
}

app.on('second-instance', () => {
  showAndFocusMainWindow();
});

function configureYouTubeEmbedHeaders() {
  const embedReferer = 'https://www.secretarea.site/';
  const embedOrigin = 'https://www.secretarea.site';
  const filter = {
    urls: [
      '*://*.youtube.com/*',
      '*://*.youtube-nocookie.com/*',
      '*://*.ytimg.com/*',
      '*://*.googlevideo.com/*',
    ],
  };

  session.defaultSession.webRequest.onBeforeSendHeaders(filter, (details, callback) => {
    const headers = { ...details.requestHeaders };
    const existingReferer = headers.Referer || headers.referer || '';
    const existingOrigin = headers.Origin || headers.origin || '';

    if (
      !existingReferer ||
      existingReferer.startsWith('file://') ||
      existingReferer.startsWith('app://') ||
      existingReferer === 'null'
    ) {
      delete headers.referer;
      headers.Referer = embedReferer;
    }

    if (
      existingOrigin &&
      (existingOrigin === 'null' ||
        existingOrigin.startsWith('file://') ||
        existingOrigin.startsWith('app://'))
    ) {
      delete headers.origin;
      headers.Origin = embedOrigin;
    }

    callback({ requestHeaders: headers });
  });
}

function configureSecurityPolicies() {
  session.defaultSession.setPermissionRequestHandler((webContents, permission, callback) => {
    const isMain = mainWindow && !mainWindow.isDestroyed() && webContents === mainWindow.webContents;
    const allowed = isMain && (permission === 'fullscreen' || permission === 'clipboard-sanitized-write');
    callback(Boolean(allowed));
  });

  session.defaultSession.setPermissionCheckHandler((webContents, permission) => {
    const isMain = mainWindow && !mainWindow.isDestroyed() && webContents === mainWindow.webContents;
    return Boolean(isMain && (permission === 'fullscreen' || permission === 'clipboard-sanitized-write'));
  });

  const isDevMode = Boolean(process.env.VITE_DEV_SERVER_URL);
  const scriptSrc = isDevMode ? "script-src 'self' 'unsafe-inline'" : "script-src 'self'";
  const connectSrc = isDevMode ? "connect-src 'self' https: ws: wss:" : "connect-src 'self' https:";
  const cspHeader = [
    "default-src 'self'",
    scriptSrc,
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    "font-src 'self' data: https://fonts.gstatic.com",
    "img-src 'self' data: blob: https: http:",
    "media-src 'self' data: blob: https: http:",
    "frame-src https://*.youtube.com https://*.youtube-nocookie.com https://trocador.app",
    connectSrc,
    "object-src 'none'",
    "base-uri 'self'",
    "frame-ancestors 'none'",
  ].join('; ');

  session.defaultSession.webRequest.onHeadersReceived((details, callback) => {
    if (details.resourceType === 'mainFrame' && isAllowedAppUrl(details.url)) {
      const responseHeaders = { ...(details.responseHeaders || {}) };
      responseHeaders['Content-Security-Policy'] = [cspHeader];
      callback({ responseHeaders });
      return;
    }
    callback({ cancel: false });
  });
}

app.on('web-contents-created', (_event, contents) => {
  contents.on('will-attach-webview', (attachEvent) => {
    attachEvent.preventDefault();
  });
});

app.whenReady().then(() => {
  configureSecurityPolicies();
  configureYouTubeEmbedHeaders();
  configureAutoUpdater();
  registerUpdaterIpc();

  downloadManager = createDownloadManager({
    getMainWindow: () => mainWindow,
    readSettings: readDesktopLauncherSettings,
    writeSettings: writeDesktopLauncherSettings,
  });
  downloadManager.init();
  downloadManager.registerIpc(ipcMain, isTrustedSender);

  qbitSetupManager = createQbitSetupManager({
    getMainWindow: () => mainWindow,
    readSettings: readDesktopLauncherSettings,
    writeSettings: writeDesktopLauncherSettings,
    getDownloadSnapshot: () => downloadManager.getSnapshot(),
    testTorrentConnection: () => downloadManager.testTorrentConnection(),
  });
  qbitSetupManager.registerIpc(ipcMain, isTrustedSender);
  qbitSetupManager.initStartupCheck();

  presentMonManager = createPresentMonManager({
    getMainWindow: () => mainWindow,
    getUserDataPath: () => app.getPath('userData'),
    readSettings: readDesktopLauncherSettings,
    writeSettings: writeDesktopLauncherSettings,
    stopActiveGamingCapture: () => {
      if (gamingSessionManager) {
        gamingSessionManager.stopPresentMon();
      }
    },
    onDependencyUpdated: () => {
      if (gamingSessionManager) {
        gamingSessionManager.refreshPresentMonAvailability();
      }
    },
  });
  presentMonManager.registerIpc(ipcMain, isTrustedSender);

  gamingSessionManager = createGamingSessionManager({
    getMainWindow: () => mainWindow,
    getUserDataPath: () => app.getPath('userData'),
    getPresentMonInfo: () => (presentMonManager ? presentMonManager.getActiveExecutableInfo() : null),
  });
  gamingSessionManager.registerIpc(ipcMain, isTrustedSender);
  presentMonManager.initStartupCheck();

  pcCleaner = createPcCleaner({
    getMainWindow: () => mainWindow,
    getUserDataPath: () => app.getPath('userData'),
  });
  pcCleaner.registerIpc(ipcMain, isTrustedSender);

  hardwareMonitor = createHardwareMonitor({
    getMainWindow: () => mainWindow,
    onSnapshot: (snap) => {
      if (gamingSessionManager) {
        gamingSessionManager.ingestHardwareSnapshot(snap);
      }
    },
  });
  hardwareMonitor.registerIpc(ipcMain, isTrustedSender);

  hardwareIntelligenceManager = createHardwareIntelligenceManager({
    getMainWindow: () => mainWindow,
    getUserDataPath: () => app.getPath('userData'),
    getLatestSnapshot: () => (hardwareMonitor ? hardwareMonitor.getLastSnapshot() : null),
  });
  hardwareIntelligenceManager.registerIpc(ipcMain, isTrustedSender);

  const dealsCredentialsManager = createDealsCredentialsManager({
    getUserDataPath: () => app.getPath('userData'),
  });
  registerDealsNetworkBridge(ipcMain, isTrustedSender, readPackageVersion, dealsCredentialsManager);

  const persisted = readDesktopLauncherSettings();
  const launchInTray = isTrayLaunchRequested();
  if (persisted.startWithComputer || persisted.closeBehavior === 'minimize-to-tray' || launchInTray) {
    ensureSystemTray();
  }

  createWindow({ startHidden: launchInTray });

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow({ startHidden: false });
    } else {
      showAndFocusMainWindow();
    }
  });
});

app.on('before-quit', () => {
  isQuitting = true;
  if (hardwareMonitor) {
    hardwareMonitor.shutdown();
  }
  if (hardwareIntelligenceManager) {
    hardwareIntelligenceManager.shutdown();
  }
  if (gamingSessionManager) {
    gamingSessionManager.shutdown();
  }
  if (pcCleaner) {
    pcCleaner.cancel();
  }
  if (qbitSetupManager) {
    qbitSetupManager.shutdown();
  }
  if (presentMonManager) {
    presentMonManager.shutdown();
  }
  if (downloadManager) {
    downloadManager.shutdown();
  }
});

app.on('window-all-closed', () => {
  const persisted = readDesktopLauncherSettings();
  const stayInTray = !isQuitting && persisted.closeBehavior === 'minimize-to-tray' && appTray && !appTray.isDestroyed();
  if (process.platform !== 'darwin' && !stayInTray) {
    app.quit();
  }
});
