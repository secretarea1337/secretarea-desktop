let electronApi = {};
try {
  electronApi = require('electron');
} catch {
  electronApi = {};
}
const { app, BrowserWindow, dialog, net, safeStorage, shell, session } = electronApi;
const crypto = require('crypto');
const path = require('path');
const fs = require('fs');
const netTcp = require('net');
const { execFile } = require('child_process');

let MegaFile = null;
try {
  ({ File: MegaFile } = require('megajs'));
} catch {
  MegaFile = null;
}

const DEFAULT_USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36';
const QBIT_DOWNLOAD_URL = 'https://www.qbittorrent.org/download';

const DANGEROUS_OPEN_EXTENSIONS = new Set([
  '.exe', '.msi', '.bat', '.cmd', '.ps1', '.vbs', '.vbe', '.js', '.jse',
  '.wsf', '.wsh', '.scr', '.com', '.pif', '.hta', '.jar', '.lnk', '.reg',
  '.msc', '.cpl', '.dll',
]);

const RESERVED_WINDOWS_NAMES = /^(CON|PRN|AUX|NUL|COM[1-9]|LPT[1-9])(?:\..*)?$/i;

function isLoopbackHost(host) {
  const clean = String(host || '').trim().toLowerCase();
  return (
    clean === '127.0.0.1' ||
    clean === 'localhost' ||
    clean === '::1' ||
    clean === '[::1]'
  );
}

function isPrivateOrLoopbackHostname(rawHostname) {
  const host = String(rawHostname || '').trim().toLowerCase().replace(/^\[|\]$/g, '');
  if (!host) return true;
  if (
    host === 'localhost' ||
    host === 'localhost.localdomain' ||
    host === '0.0.0.0' ||
    host === '::' ||
    host === '::1' ||
    host.endsWith('.localhost') ||
    host.endsWith('.local') ||
    host.endsWith('.internal')
  ) {
    return true;
  }

  const ipVer = netTcp.isIP(host);
  if (ipVer === 4) {
    const parts = host.split('.').map((n) => parseInt(n, 10));
    const [a, b] = parts;
    if (a === 127 || a === 10 || a === 0) return true;
    if (a === 169 && b === 254) return true;
    if (a === 172 && b >= 16 && b <= 31) return true;
    if (a === 192 && b === 168) return true;
    if (a === 100 && b >= 64 && b <= 127) return true;
    return false;
  }
  if (ipVer === 6) {
    if (host === '::1' || host === '::') return true;
    if (/^fe[89ab][0-9a-f]:/i.test(host)) return true; // link-local fe80::/10
    if (/^f[cd][0-9a-f]{2}:/i.test(host)) return true; // ULA fc00::/7
    if (host.startsWith('::ffff:')) {
      return isPrivateOrLoopbackHostname(host.slice('::ffff:'.length));
    }
    return false;
  }
  return false;
}

function isSafeRemoteDownloadUrl(rawUrl) {
  if (typeof rawUrl !== 'string') return false;
  const trimmed = rawUrl.trim();
  if (!trimmed || trimmed.length > 4096 || /[\x00-\x1f\x7f]/.test(trimmed)) return false;
  try {
    const parsed = new URL(trimmed);
    const proto = parsed.protocol.toLowerCase();
    if (proto !== 'http:' && proto !== 'https:') return false;
    if (parsed.username || parsed.password) return false;
    if (!parsed.hostname || isPrivateOrLoopbackHostname(parsed.hostname)) return false;
    return true;
  } catch {
    return false;
  }
}

function hasHeaderControlChars(val) {
  return typeof val === 'string' && /[\r\n\0\x00-\x1f\x7f]/.test(val);
}

function assertNotSymlinkIfExists(targetPath) {
  if (!targetPath || !fs.existsSync(targetPath)) return;
  const st = fs.lstatSync(targetPath);
  if (st.isSymbolicLink()) {
    throw new Error('Security policy: Refusing to read or write through a symbolic link target.');
  }
}

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
    return t.startsWith(b + path.sep);
  }
  return cleanTarget.startsWith(cleanBase + path.sep);
}

function isValidInfoHash(hash) {
  return typeof hash === 'string' && /^[A-Za-z0-9]{32,64}$/.test(hash.trim());
}

function scrubSensitiveText(text) {
  return String(text || '')
    .replace(/Bearer\s+[A-Za-z0-9._+/=-]+/gi, 'Bearer [redacted]')
    .replace(/(SID=)[^;\s]+/gi, '$1[redacted]')
    .replace(/(https?:\/\/)[^:/@\s]+:[^/@\s]+@/gi, '$1[redacted]@')
    .replace(/([?&](?:token|key|apikey|api_key|password|secret)=)[^&\s]+/gi, '$1[redacted]');
}

function compareSemver(a, b) {
  const pa = String(a || '').split('.').map((n) => parseInt(n, 10) || 0);
  const pb = String(b || '').split('.').map((n) => parseInt(n, 10) || 0);
  const len = Math.max(pa.length, pb.length);
  for (let i = 0; i < len; i++) {
    const va = pa[i] || 0;
    const vb = pb[i] || 0;
    if (va > vb) return 1;
    if (va < vb) return -1;
  }
  return 0;
}

// Lightweight zero-dependency Bencode parser to extract info_hash + display name from .torrent files
function parseTorrentBufferMetadata(buf, fallbackName) {
  if (!Buffer.isBuffer(buf) || buf.length < 4) {
    return { infoHash: '', name: fallbackName || 'torrent-file.torrent' };
  }

  let infoHash = '';
  let torrentName = '';

  function readNode(offset) {
    if (offset >= buf.length) throw new Error('EOF');
    const byte = buf[offset];
    if (byte === 0x69) {
      // 'i' integer
      const end = buf.indexOf(0x65, offset + 1);
      if (end === -1) throw new Error('Bad int');
      return { value: buf.slice(offset + 1, end).toString('utf8'), next: end + 1 };
    }
    if (byte === 0x6c) {
      // 'l' list
      let cursor = offset + 1;
      const list = [];
      while (cursor < buf.length && buf[cursor] !== 0x65) {
        const res = readNode(cursor);
        list.push(res.value);
        cursor = res.next;
      }
      return { value: list, next: cursor + 1 };
    }
    if (byte === 0x64) {
      // 'd' dict
      let cursor = offset + 1;
      const dict = {};
      while (cursor < buf.length && buf[cursor] !== 0x65) {
        const keyNode = readNode(cursor);
        const keyStr = Buffer.isBuffer(keyNode.value)
          ? keyNode.value.toString('utf8')
          : String(keyNode.value);
        const valStart = keyNode.next;
        const valNode = readNode(valStart);
        if (keyStr === 'info' && !infoHash && valNode.next > valStart) {
          infoHash = crypto
            .createHash('sha1')
            .update(buf.slice(valStart, valNode.next))
            .digest('hex')
            .toUpperCase();
        }
        dict[keyStr] = valNode.value;
        cursor = valNode.next;
      }
      return { value: dict, next: cursor + 1 };
    }
    // byte string <len>:<bytes>
    const colon = buf.indexOf(0x3a, offset);
    if (colon === -1) throw new Error('Bad str');
    const len = parseInt(buf.slice(offset, colon).toString('utf8'), 10);
    if (!Number.isFinite(len) || len < 0) throw new Error('Bad len');
    const start = colon + 1;
    const end = start + len;
    return { value: buf.slice(start, end), next: end };
  }

  try {
    const root = readNode(0);
    if (root?.value && typeof root.value === 'object' && root.value.info) {
      const infoObj = root.value.info;
      const rawName = infoObj['name.utf-8'] || infoObj.name;
      if (Buffer.isBuffer(rawName)) {
        torrentName = rawName.toString('utf8');
      }
    }
  } catch {
    // fallback safely
  }

  return {
    infoHash,
    name: torrentName || fallbackName || 'torrent-file.torrent',
  };
}

function stripMultipartHeaderControls(val) {
  return String(val || '').replace(/[\r\n\0"]+/g, '_');
}

function buildMultipartFormBody(fields, files) {
  const boundary = `----SecretAreaQbit${Date.now().toString(16)}${crypto.randomBytes(6).toString('hex')}`;
  const chunks = [];

  for (const [key, value] of Object.entries(fields || {})) {
    if (value === undefined || value === null || value === '') continue;
    const safeKey = stripMultipartHeaderControls(key);
    const safeVal = String(value).replace(/[\r\n\0]+/g, '');
    chunks.push(
      Buffer.from(
        `--${boundary}\r\nContent-Disposition: form-data; name="${safeKey}"\r\n\r\n${safeVal}\r\n`,
        'utf8'
      )
    );
  }

  for (const file of files || []) {
    const safeField = stripMultipartHeaderControls(file.field || 'torrents');
    const safeFilename = stripMultipartHeaderControls(file.filename || 'upload.torrent');
    const safeType = String(file.contentType || 'application/x-bittorrent').replace(/[\r\n\0]+/g, '');
    chunks.push(
      Buffer.from(
        `--${boundary}\r\nContent-Disposition: form-data; name="${safeField}"; filename="${safeFilename}"\r\nContent-Type: ${safeType}\r\n\r\n`,
        'utf8'
      )
    );
    chunks.push(Buffer.isBuffer(file.buffer) ? file.buffer : Buffer.from(file.buffer));
    chunks.push(Buffer.from('\r\n', 'utf8'));
  }

  chunks.push(Buffer.from(`--${boundary}--\r\n`, 'utf8'));
  return {
    contentType: `multipart/form-data; boundary=${boundary}`,
    body: Buffer.concat(chunks),
  };
}

function createDownloadManager({ getMainWindow, readSettings, writeSettings }) {
  const activeHttpControllers = new Map();
  const activeMegaStreams = new Map();
  const activeElectronItems = new Map();
  const browserTaskQueueMeta = [];
  const browserWindows = new Set();

  let tasks = [];
  let torrentConfig = {
    enabled: false,
    host: '127.0.0.1',
    port: 8080,
    username: 'admin',
    password: '',
    apiKey: '',
    pollIntervalMs: 1500,
  };
  let torrentConnected = false;
  let torrentVersion = null;
  let torrentWebApiVersion = null;
  let torrentError = null;
  let torrentPollTimer = null;
  let currentTorrentPollMs = 1500;
  let pausedTorrentPollingByHide = false;
  let qbitCookie = '';
  let lastEmitAt = 0;
  let pendingEmitTimer = null;
  let pendingDiskPersistTimer = null;
  let persistInFlight = false;
  let persistDirty = false;
  let windowHiddenSuppressedPending = false;
  let isShuttingDown = false;
  let perfConfig = {
    throttleMs: 350,
    torrentActivePollMs: 1500,
    torrentIdlePollMs: 12000,
    adaptiveTorrentPolling: true,
    pauseOnMinimize: true,
  };

  function getStateFilePath() {
    return path.join(app.getPath('userData'), 'downloads-state.json');
  }

  function getTorrentSecretPath() {
    return path.join(app.getPath('userData'), 'torrent-webui.json');
  }

  function getDefaultDownloadFolder() {
    try {
      return path.join(app.getPath('downloads'), 'SecretArea');
    } catch {
      return path.join(process.cwd(), 'downloads');
    }
  }

  function getDownloadSettings() {
    const persisted = readSettings ? readSettings() : {};
    const folder =
      typeof persisted.downloadFolder === 'string' && persisted.downloadFolder.trim()
        ? persisted.downloadFolder.trim()
        : getDefaultDownloadFolder();
    const maxConcurrent = Number.isFinite(Number(persisted.maxConcurrent))
      ? Math.min(5, Math.max(1, Math.round(Number(persisted.maxConcurrent))))
      : 3;
    return { downloadFolder: folder, maxConcurrent };
  }

  function ensureDirExists(dirPath) {
    try {
      fs.mkdirSync(dirPath, { recursive: true });
    } catch {
      // ignore mkdir errors cleanly
    }
  }

  function validateDownloadUrl(rawUrl) {
    if (typeof rawUrl !== 'string') return '';
    const trimmed = rawUrl.trim();
    if (!trimmed || /[\x00-\x1f\x7f]/.test(trimmed)) return '';
    if (trimmed.toLowerCase().startsWith('magnet:?')) {
      return /\s/.test(trimmed) ? '' : trimmed;
    }
    return isSafeRemoteDownloadUrl(trimmed) ? trimmed : '';
  }

  function sanitizeFileName(rawName, fallback = 'download.bin') {
    let candidate = String(rawName || '').trim();
    try {
      candidate = decodeURIComponent(candidate);
    } catch {
      // keep raw
    }
    candidate = path.basename(candidate.split('?')[0].split('#')[0]);
    candidate = candidate.replace(/[<>:"/\\|?*\x00-\x1f]/g, '_').replace(/[. ]+$/, '').trim();
    if (!candidate || candidate === '.' || candidate === '..') {
      candidate = fallback;
    }
    if (RESERVED_WINDOWS_NAMES.test(candidate)) {
      candidate = `_${candidate}`;
    }
    if (candidate.length > 180) {
      const ext = path.extname(candidate);
      const base = path.basename(candidate, ext).slice(0, Math.max(10, 180 - ext.length));
      candidate = `${base}${ext}`;
    }
    return candidate;
  }

  function resolveUniqueFilePath(folder, rawFileName) {
    ensureDirExists(folder);
    const safeName = sanitizeFileName(rawFileName);
    const parsed = path.parse(safeName);
    let candidate = path.resolve(folder, safeName);
    let counter = 1;
    while (
      fs.existsSync(candidate) ||
      fs.existsSync(`${candidate}.part`) ||
      tasks.some((t) => t.savePath === candidate && t.status !== 'cancelled')
    ) {
      candidate = path.resolve(folder, `${parsed.name} (${counter})${parsed.ext}`);
      counter += 1;
      if (counter > 999) break;
    }
    return candidate;
  }

  function detectSourceFromUrl(url, channelGroup = '') {
    const lower = url.toLowerCase();
    const grp = String(channelGroup || '').toLowerCase();
    if (lower.startsWith('magnet:?') || /\.torrent(\?|$)/i.test(lower)) {
      return 'qbittorrent';
    }
    if (lower.includes('mediafire.com') || grp.includes('mediafire')) {
      return 'mediafire';
    }
    if (lower.includes('mega.nz') || lower.includes('mega.co.nz') || grp.includes('mega')) {
      return 'mega';
    }
    return 'direct';
  }

  function base32ToHex(input) {
    const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
    const clean = String(input || '').trim().toUpperCase().replace(/=+$/, '');
    let bits = 0;
    let value = 0;
    let hex = '';
    for (let i = 0; i < clean.length; i++) {
      const idx = alphabet.indexOf(clean[i]);
      if (idx === -1) return '';
      value = (value << 5) | idx;
      bits += 5;
      if (bits >= 8) {
        bits -= 8;
        const byte = (value >>> bits) & 0xff;
        hex += byte.toString(16).padStart(2, '0');
      }
    }
    return hex.toUpperCase();
  }

  function extractMagnetInfoHash(magnetUrl) {
    const rawUrl = String(magnetUrl || '');
    const btihMatch = rawUrl.match(/xt=urn:btih:([A-Za-z0-9]{32,40})/i);
    if (btihMatch && btihMatch[1]) {
      const candidate = btihMatch[1].trim();
      if (/^[a-fA-F0-9]{40}$/.test(candidate)) {
        return candidate.toUpperCase();
      }
      if (/^[A-Za-z2-7]{32}$/.test(candidate)) {
        const decoded = base32ToHex(candidate);
        if (decoded.length === 40) return decoded;
      }
      return candidate.toUpperCase();
    }
    const btmhMatch = rawUrl.match(/xt=urn:btmh:1220([a-fA-F0-9]{64})/i);
    if (btmhMatch && btmhMatch[1]) {
      return btmhMatch[1].slice(0, 40).toUpperCase();
    }
    return '';
  }

  function normalizeTorrentCompareName(rawName) {
    return String(rawName || '')
      .trim()
      .toLowerCase()
      .replace(/\.torrent$/i, '')
      .replace(/\s+/g, ' ');
  }

  function extractMagnetDisplayName(magnetUrl) {
    const match = String(magnetUrl || '').match(/[?&]dn=([^&]+)/i);
    if (!match) return '';
    try {
      return decodeURIComponent(match[1].replace(/\+/g, ' '));
    } catch {
      return match[1];
    }
  }

  function isSafeStorageReady() {
    try {
      return Boolean(
        safeStorage &&
          typeof safeStorage.isEncryptionAvailable === 'function' &&
          safeStorage.isEncryptionAvailable()
      );
    } catch {
      return false;
    }
  }

  function decryptSecretValue(encoded) {
    if (typeof encoded !== 'string' || !encoded) return '';
    if (!isSafeStorageReady()) return '';
    try {
      return safeStorage.decryptString(Buffer.from(encoded, 'base64'));
    } catch {
      return '';
    }
  }

  function encryptSecretValue(plain) {
    if (typeof plain !== 'string' || !plain) return '';
    if (!isSafeStorageReady()) return null;
    try {
      return safeStorage.encryptString(plain).toString('base64');
    } catch {
      return null;
    }
  }

  function sanitizeTorrentConfigForUi(cfg) {
    return {
      enabled: Boolean(cfg.enabled),
      host: isLoopbackHost(cfg.host) ? cfg.host.trim() : '127.0.0.1',
      port: Number(cfg.port) || 8080,
      username: cfg.username || 'admin',
      password: '',
      apiKey: '',
      hasSavedPassword: Boolean(cfg.password),
      hasSavedApiKey: Boolean(cfg.apiKey),
      safeStorageAvailable: isSafeStorageReady(),
      pollIntervalMs: Number(cfg.pollIntervalMs) || 1500,
    };
  }

  function readPersistedTorrentConfig() {
    try {
      const filePath = getTorrentSecretPath();
      if (!fs.existsSync(filePath)) return;
      const parsed = JSON.parse(fs.readFileSync(filePath, 'utf8'));
      let plainPassword = '';
      if (typeof parsed.encryptedPassword === 'string' && parsed.encryptedPassword) {
        plainPassword = decryptSecretValue(parsed.encryptedPassword);
      } else if (typeof parsed.password === 'string' && parsed.password) {
        // Migrate legacy plaintext field cleanly if OS encryption is available; ignore otherwise
        plainPassword = isSafeStorageReady() ? parsed.password : '';
      }
      const plainApiKey =
        typeof parsed.encryptedApiKey === 'string' && parsed.encryptedApiKey
          ? decryptSecretValue(parsed.encryptedApiKey)
          : '';

      const rawHost = typeof parsed.host === 'string' ? parsed.host.trim() : '';
      torrentConfig = {
        enabled: Boolean(parsed.enabled),
        host: isLoopbackHost(rawHost) ? rawHost : '127.0.0.1',
        port: Number(parsed.port) > 0 && Number(parsed.port) <= 65535 ? Number(parsed.port) : 8080,
        username: typeof parsed.username === 'string' ? parsed.username : 'admin',
        password: plainPassword,
        apiKey: plainApiKey,
        pollIntervalMs: 1500,
      };

      // Strip legacy plaintext `password` field if present on disk
      if (typeof parsed.password === 'string' && parsed.password) {
        writePersistedTorrentConfig(torrentConfig);
      }
    } catch {
      // ignore read errors
    }
  }

  function writePersistedTorrentConfig(nextCfg) {
    try {
      const filePath = getTorrentSecretPath();
      ensureDirExists(path.dirname(filePath));
      const safeReady = isSafeStorageReady();
      const encPassword = safeReady && nextCfg.password ? encryptSecretValue(nextCfg.password) : '';
      const encApiKey = safeReady && nextCfg.apiKey ? encryptSecretValue(nextCfg.apiKey) : '';
      const payload = {
        enabled: Boolean(nextCfg.enabled),
        host: isLoopbackHost(nextCfg.host) ? nextCfg.host.trim() : '127.0.0.1',
        port: nextCfg.port,
        username: nextCfg.username,
        encryptedPassword: typeof encPassword === 'string' ? encPassword : '',
        encryptedApiKey: typeof encApiKey === 'string' ? encApiKey : '',
        storageMode: safeReady ? 'safeStorage' : 'session_memory',
      };
      fs.writeFileSync(filePath, JSON.stringify(payload, null, 2), { encoding: 'utf8', mode: 0o600 });
    } catch {
      // ignore disk errors
    }
  }

  function readPersistedTasks() {
    try {
      const filePath = getStateFilePath();
      if (!fs.existsSync(filePath)) return;
      const parsed = JSON.parse(fs.readFileSync(filePath, 'utf8'));
      if (!Array.isArray(parsed)) return;
      tasks = parsed.map((rawItem) => {
        let item =
          rawItem.source === 'utorrent' ? { ...rawItem, source: 'qbittorrent' } : rawItem;
        if (
          item.source === 'qbittorrent' &&
          item.status === 'completed' &&
          Number(item.totalBytes || 0) === 0 &&
          Number(item.downloadedBytes || 0) === 0
        ) {
          item = {
            ...item,
            status: 'queued',
            progress: 0,
            completedAt: null,
            torrentHash: item.torrentHash || extractMagnetInfoHash(item.url) || undefined,
          };
        }
        if (item.status === 'downloading' || item.status === 'resolving' || item.status === 'queued') {
          if (item.source === 'qbittorrent') {
            return {
              ...item,
              torrentHash: item.torrentHash || extractMagnetInfoHash(item.url) || undefined,
              speedBytesPerSec: 0,
              uploadSpeedBytesPerSec: 0,
            };
          }
          return {
            ...item,
            status: item.canPauseResume ? 'paused' : 'failed',
            speedBytesPerSec: 0,
            uploadSpeedBytesPerSec: 0,
            etaSeconds: null,
            error: item.canPauseResume ? null : 'Interrupted when application closed.',
          };
        }
        return item;
      });
    } catch {
      tasks = [];
    }
  }

  function isWindowHiddenOrMinimized() {
    try {
      const win = getMainWindow ? getMainWindow() : null;
      if (!win || (typeof win.isDestroyed === 'function' && win.isDestroyed())) return true;
      const minimized = typeof win.isMinimized === 'function' && win.isMinimized();
      const hidden = typeof win.isVisible === 'function' && !win.isVisible();
      return Boolean(minimized || hidden);
    } catch {
      return false;
    }
  }

  function persistTasksToDisk(immediate = false) {
    if (immediate) {
      if (pendingDiskPersistTimer) {
        clearTimeout(pendingDiskPersistTimer);
        pendingDiskPersistTimer = null;
      }
      persistDirty = false;
      try {
        const filePath = getStateFilePath();
        ensureDirExists(path.dirname(filePath));
        fs.writeFileSync(filePath, JSON.stringify(tasks.slice(0, 200), null, 2), 'utf8');
      } catch {
        // ignore write errors
      }
      return;
    }
    schedulePersistTasksToDisk();
  }

  async function flushAsyncTasksPersist() {
    if (persistInFlight) {
      persistDirty = true;
      return;
    }
    persistInFlight = true;
    try {
      const filePath = getStateFilePath();
      ensureDirExists(path.dirname(filePath));
      const payload = JSON.stringify(tasks.slice(0, 200), null, 2);
      await fs.promises.writeFile(filePath, payload, 'utf8');
    } catch {
      // ignore write errors
    } finally {
      persistInFlight = false;
      if (persistDirty && !isShuttingDown) {
        persistDirty = false;
        void flushAsyncTasksPersist();
      }
    }
  }

  function schedulePersistTasksToDisk() {
    if (isShuttingDown) return;
    if (pendingDiskPersistTimer) return;
    pendingDiskPersistTimer = setTimeout(() => {
      pendingDiskPersistTimer = null;
      void flushAsyncTasksPersist();
    }, 2500);
  }

  function getSnapshot() {
    const { downloadFolder, maxConcurrent } = getDownloadSettings();
    return {
      tasks: tasks.map((t) => ({ ...t })),
      downloadFolder,
      maxConcurrent,
      torrentConfig: sanitizeTorrentConfigForUi(torrentConfig),
      torrentConnected,
      torrentVersion,
      torrentWebApiVersion,
      torrentError,
    };
  }

  function emitSnapshot(force = false, immediateDisk = force) {
    if (immediateDisk) {
      persistTasksToDisk(true);
    } else {
      schedulePersistTasksToDisk();
    }

    const mainWindow = getMainWindow();
    if (!mainWindow || mainWindow.isDestroyed()) return;

    if (!force && perfConfig.pauseOnMinimize && isWindowHiddenOrMinimized()) {
      windowHiddenSuppressedPending = true;
      return;
    }

    const throttleWindow = Math.max(120, Math.min(2000, Number(perfConfig.throttleMs) || 350));
    const now = Date.now();
    if (!force && now - lastEmitAt < throttleWindow) {
      if (!pendingEmitTimer) {
        pendingEmitTimer = setTimeout(() => {
          pendingEmitTimer = null;
          emitSnapshot(true, false);
        }, throttleWindow + 15);
      }
      return;
    }

    if (force && pendingEmitTimer) {
      clearTimeout(pendingEmitTimer);
      pendingEmitTimer = null;
    }

    lastEmitAt = now;
    windowHiddenSuppressedPending = false;
    mainWindow.webContents.send('downloads:updated', getSnapshot());
  }

  function patchTask(id, patch, forceEmit = false) {
    const idx = tasks.findIndex((t) => t.id === id);
    if (idx === -1) return null;
    tasks[idx] = {
      ...tasks[idx],
      ...patch,
      updatedAt: Date.now(),
    };
    emitSnapshot(forceEmit, forceEmit);
    return tasks[idx];
  }

  function findTask(id) {
    return tasks.find((t) => t.id === id) || null;
  }

  function parseFilenameFromHeaders(headers, fallbackUrl) {
    const disp = headers.get('content-disposition') || '';
    const utfMatch = disp.match(/filename\*=UTF-8''([^;\r\n]+)/i);
    if (utfMatch && utfMatch[1]) {
      return sanitizeFileName(utfMatch[1]);
    }
    const quotedMatch = disp.match(/filename="([^"]+)"/i);
    if (quotedMatch && quotedMatch[1]) {
      return sanitizeFileName(quotedMatch[1]);
    }
    const plainMatch = disp.match(/filename=([^;\r\n]+)/i);
    if (plainMatch && plainMatch[1]) {
      return sanitizeFileName(plainMatch[1]);
    }
    try {
      const urlObj = new URL(fallbackUrl);
      const base = path.basename(urlObj.pathname);
      if (base && base.includes('.')) {
        return sanitizeFileName(base);
      }
    } catch {
      // ignore URL parse error
    }
    return sanitizeFileName(fallbackUrl.split('/').pop() || 'download.bin');
  }

  function rewriteKnownDirectUrl(rawUrl) {
    const pixeldrainMatch = rawUrl.match(/^https?:\/\/(?:www\.)?pixeldrain\.com\/u\/([A-Za-z0-9_-]+)/i);
    if (pixeldrainMatch) {
      return `https://pixeldrain.com/api/file/${pixeldrainMatch[1]}?download`;
    }
    return rawUrl;
  }

  async function fetchWithSafeRedirects(initialUrl, fetchOptions = {}, maxRedirects = 6) {
    let currentUrl = initialUrl;
    for (let hop = 0; hop <= maxRedirects; hop += 1) {
      if (!isSafeRemoteDownloadUrl(currentUrl)) {
        throw new Error('Blocked unsafe or private network download target.');
      }
      const res = await net.fetch(currentUrl, {
        ...fetchOptions,
        redirect: 'manual',
      });
      if (res.status >= 300 && res.status < 400) {
        const location = res.headers.get('location');
        if (!location) {
          return { response: res, finalUrl: currentUrl };
        }
        const resolvedNext = new URL(location, currentUrl).toString();
        if (!isSafeRemoteDownloadUrl(resolvedNext)) {
          throw new Error('Blocked unsafe redirect to private or unsupported address.');
        }
        currentUrl = resolvedNext;
        continue;
      }
      return { response: res, finalUrl: currentUrl };
    }
    throw new Error('Too many redirects while resolving download URL.');
  }

  async function resolveMediaFireDirectUrl(pageUrl) {
    if (!isSafeRemoteDownloadUrl(pageUrl)) {
      throw new Error('Blocked unsafe MediaFire target URL.');
    }
    if (/^https?:\/\/download\d*\.mediafire\.com\//i.test(pageUrl)) {
      return pageUrl;
    }
    const timeoutController = new AbortController();
    const timer = setTimeout(() => timeoutController.abort('timeout'), 15000);
    let res;
    let finalUrl;
    try {
      ({ response: res, finalUrl } = await fetchWithSafeRedirects(pageUrl, {
        headers: {
          'User-Agent': DEFAULT_USER_AGENT,
          Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        },
        signal: timeoutController.signal,
      }));
    } finally {
      clearTimeout(timer);
    }

    const contentType = (res.headers.get('content-type') || '').toLowerCase();
    const contentDisp = (res.headers.get('content-disposition') || '').toLowerCase();
    if (!contentType.includes('text/html') || contentDisp.includes('attachment')) {
      return isSafeRemoteDownloadUrl(finalUrl) ? finalUrl : pageUrl;
    }

    const html = await res.text();
    const patterns = [
      /<a[^>]+id=["']downloadButton["'][^>]+href=["'](https?:\/\/[^"']+)["']/i,
      /<a[^>]+href=["'](https?:\/\/download\d*\.mediafire\.com\/[^"']+)["']/i,
      /aria-label=["']Download file["'][^>]*href=["'](https?:\/\/[^"']+)["']/i,
      /href=["'](https?:\/\/[^"']*mediafire\.com\/file_premium\/[^"']+)["']/i,
    ];
    for (const pattern of patterns) {
      const match = html.match(pattern);
      if (match && match[1]) {
        const candidate = match[1].replace(/&amp;/g, '&');
        if (isSafeRemoteDownloadUrl(candidate)) {
          return candidate;
        }
      }
    }
    return null;
  }

  function openInAppDownloadBrowser(targetUrl, task) {
    if (!isSafeRemoteDownloadUrl(targetUrl)) {
      patchTask(
        task.id,
        {
          status: 'failed',
          error: 'Blocked unsafe URL before opening Download Browser.',
        },
        true
      );
      return;
    }

    const mainWindow = getMainWindow();
    const win = new BrowserWindow({
      width: 1020,
      height: 720,
      title: `SecretArea Download Browser — ${task.title || 'File Host'}`,
      parent: mainWindow && !mainWindow.isDestroyed() ? mainWindow : undefined,
      backgroundColor: '#0e141b',
      autoHideMenuBar: true,
      webPreferences: {
        contextIsolation: true,
        nodeIntegration: false,
        sandbox: true,
        webSecurity: true,
        allowRunningInsecureContent: false,
        webviewTag: false,
      },
    });

    browserWindows.add(win);
    browserTaskQueueMeta.push({
      taskId: task.id,
      title: task.title,
      source: task.source,
      channelGroup: task.channelGroup,
      coverImage: task.coverImage,
      gameId: task.gameId,
      gameTab: task.gameTab,
      originUrl: targetUrl,
      createdAt: Date.now(),
    });

    patchTask(
      task.id,
      {
        status: 'resolving',
        error: 'Waiting for download trigger inside Download Browser window...',
      },
      true
    );

    win.webContents.on('will-attach-webview', (event) => {
      event.preventDefault();
    });

    win.webContents.on('will-navigate', (event, navUrl) => {
      if (!isSafeRemoteDownloadUrl(navUrl)) {
        event.preventDefault();
      }
    });

    win.webContents.on('will-redirect', (event, redirectUrl) => {
      if (!isSafeRemoteDownloadUrl(redirectUrl)) {
        event.preventDefault();
      }
    });

    win.webContents.setWindowOpenHandler(({ url }) => {
      if (isSafeRemoteDownloadUrl(url)) {
        void win.loadURL(url);
      }
      return { action: 'deny' };
    });

    win.on('closed', () => {
      browserWindows.delete(win);
      const current = findTask(task.id);
      if (current && current.status === 'resolving') {
        patchTask(
          task.id,
          {
            status: 'failed',
            error: 'Download Browser closed before file download started.',
          },
          true
        );
      }
    });

    void win.loadURL(targetUrl);
  }

  async function runHttpStreamTask(taskId) {
    const task = findTask(taskId);
    if (!task) return;

    const controller = new AbortController();
    activeHttpControllers.set(taskId, controller);

    try {
      let targetUrl = task.resolvedUrl || rewriteKnownDirectUrl(task.url);
      if (!isSafeRemoteDownloadUrl(targetUrl)) {
        throw new Error('Blocked unsafe or private network download target.');
      }

      if (task.source === 'mediafire' && !task.resolvedUrl) {
        patchTask(taskId, { status: 'resolving', error: null }, true);
        const extracted = await resolveMediaFireDirectUrl(targetUrl);
        if (!extracted) {
          activeHttpControllers.delete(taskId);
          openInAppDownloadBrowser(targetUrl, findTask(taskId) || task);
          return;
        }
        targetUrl = extracted;
        patchTask(taskId, { resolvedUrl: targetUrl }, false);
      }

      const currentTask = findTask(taskId);
      if (!currentTask || controller.signal.aborted) return;

      const { downloadFolder } = getDownloadSettings();
      const existingPartCandidate = currentTask.savePath ? `${currentTask.savePath}.part` : '';
      let existingBytes = 0;
      if (
        existingPartCandidate &&
        isPathInsideDir(currentTask.savePath, downloadFolder) &&
        fs.existsSync(existingPartCandidate)
      ) {
        try {
          existingBytes = fs.statSync(existingPartCandidate).size;
        } catch {
          existingBytes = 0;
        }
      }

      const requestHeaders = {
        'User-Agent': DEFAULT_USER_AGENT,
      };
      if (existingBytes > 0) {
        requestHeaders.Range = `bytes=${existingBytes}-`;
      }

      patchTask(taskId, { status: 'resolving', error: null }, true);
      const { response, finalUrl } = await fetchWithSafeRedirects(targetUrl, {
        headers: requestHeaders,
        signal: controller.signal,
      });

      if (!response.ok && response.status !== 206) {
        throw new Error(`Server returned HTTP ${response.status}`);
      }

      const contentType = (response.headers.get('content-type') || '').toLowerCase();
      const contentDisp = (response.headers.get('content-disposition') || '').toLowerCase();

      if (contentType.includes('text/html') && !contentDisp.includes('attachment')) {
        controller.abort('html-page');
        activeHttpControllers.delete(taskId);
        openInAppDownloadBrowser(finalUrl || targetUrl, findTask(taskId) || task);
        return;
      }

      const resolvedFileName = parseFilenameFromHeaders(response.headers, finalUrl || targetUrl);
      const latestTask = findTask(taskId);
      const finalSavePath =
        latestTask?.savePath && isPathInsideDir(latestTask.savePath, downloadFolder)
          ? path.resolve(latestTask.savePath)
          : resolveUniqueFilePath(downloadFolder, resolvedFileName);

      const finalPartPath = `${finalSavePath}.part`;
      ensureDirExists(path.dirname(finalPartPath));

      const isResumedPartial = response.status === 206 && existingBytes > 0;
      let startOffset = isResumedPartial ? existingBytes : 0;

      const contentLength = Number(response.headers.get('content-length') || 0);
      let totalBytes = 0;
      const contentRange = response.headers.get('content-range') || '';
      const rangeTotalMatch = contentRange.match(/\/(\d+)$/);
      if (rangeTotalMatch) {
        totalBytes = Number(rangeTotalMatch[1]) || 0;
      } else if (contentLength > 0) {
        totalBytes = startOffset + contentLength;
      }

      const acceptRanges = (response.headers.get('accept-ranges') || '').toLowerCase();
      const canPauseResume = acceptRanges.includes('bytes') || response.status === 206 || totalBytes > 0;

      patchTask(
        taskId,
        {
          fileName: path.basename(finalSavePath),
          savePath: finalSavePath,
          resolvedUrl: finalUrl || targetUrl,
          status: 'downloading',
          downloadedBytes: startOffset,
          totalBytes,
          canPauseResume,
          progress: totalBytes > 0 ? Math.min(99.9, (startOffset / totalBytes) * 100) : 0,
          error: null,
        },
        true
      );

      if (!response.body) {
        throw new Error('Response stream is empty.');
      }

      const writeStream = fs.createWriteStream(
        (() => {
          assertNotSymlinkIfExists(finalSavePath);
          assertNotSymlinkIfExists(finalPartPath);
          return finalPartPath;
        })(),
        {
          flags: isResumedPartial ? 'a' : 'w',
        }
      );

      const reader = response.body.getReader();
      let downloaded = startOffset;
      let windowBytes = 0;
      let windowStart = Date.now();
      let smoothedSpeed = 0;

      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          if (!value || value.byteLength === 0) continue;

          const chunkBuf = Buffer.from(value);
          const ok = writeStream.write(chunkBuf);
          if (!ok) {
            await new Promise((resolve) => writeStream.once('drain', resolve));
          }

          downloaded += chunkBuf.byteLength;
          windowBytes += chunkBuf.byteLength;

          const now = Date.now();
          const elapsedMs = now - windowStart;
          const patchIntervalMs = Math.max(150, Math.min(2000, Number(perfConfig.throttleMs) || 350));
          if (elapsedMs >= patchIntervalMs) {
            const instantSpeed = (windowBytes * 1000) / elapsedMs;
            smoothedSpeed =
              smoothedSpeed > 0 ? smoothedSpeed * 0.6 + instantSpeed * 0.4 : instantSpeed;
            windowBytes = 0;
            windowStart = now;

            const remaining = totalBytes > downloaded ? totalBytes - downloaded : 0;
            const etaSeconds =
              totalBytes > 0 && smoothedSpeed > 512 ? Math.ceil(remaining / smoothedSpeed) : null;
            const progress =
              totalBytes > 0 ? Math.min(99.9, Number(((downloaded / totalBytes) * 100).toFixed(1))) : 0;

            patchTask(taskId, {
              downloadedBytes: downloaded,
              totalBytes,
              speedBytesPerSec: Math.round(smoothedSpeed),
              etaSeconds,
              progress,
            });
          }
        }
      } finally {
        await new Promise((resolve) => writeStream.end(resolve));
      }

      if (controller.signal.aborted) {
        return;
      }

      if (fs.existsSync(finalPartPath)) {
        assertNotSymlinkIfExists(finalPartPath);
        assertNotSymlinkIfExists(finalSavePath);
        fs.renameSync(finalPartPath, finalSavePath);
      }

      patchTask(
        taskId,
        {
          status: 'completed',
          progress: 100,
          downloadedBytes: downloaded,
          totalBytes: totalBytes || downloaded,
          speedBytesPerSec: 0,
          etaSeconds: 0,
          completedAt: Date.now(),
          error: null,
        },
        true
      );
    } catch (err) {
      const reason = controller.signal.reason;
      if (reason === 'paused' || reason === 'cancelled' || reason === 'html-page') {
        return;
      }
      const msg = err instanceof Error ? err.message : String(err || 'Download failed.');
      patchTask(
        taskId,
        {
          status: 'failed',
          speedBytesPerSec: 0,
          etaSeconds: null,
          error: msg.slice(0, 240),
        },
        true
      );
    } finally {
      activeHttpControllers.delete(taskId);
    }
  }

  async function runMegaTask(taskId) {
    const task = findTask(taskId);
    if (!task) return;

    if (!MegaFile) {
      openInAppDownloadBrowser(task.url, task);
      return;
    }

    const abortFlag = { paused: false, cancelled: false };
    activeMegaStreams.set(taskId, { abortFlag, stream: null });

    try {
      patchTask(taskId, { status: 'resolving', error: null }, true);
      const megaFile = MegaFile.fromURL(task.url);
      await megaFile.loadAttributes();

      if (abortFlag.paused || abortFlag.cancelled) return;

      if (megaFile.directory || Array.isArray(megaFile.children)) {
        activeMegaStreams.delete(taskId);
        openInAppDownloadBrowser(task.url, findTask(taskId) || task);
        return;
      }

      const { downloadFolder } = getDownloadSettings();
      const latestTask = findTask(taskId);
      const finalSavePath =
        latestTask?.savePath && isPathInsideDir(latestTask.savePath, downloadFolder)
          ? path.resolve(latestTask.savePath)
          : resolveUniqueFilePath(downloadFolder, megaFile.name || 'mega-download.bin');
      const finalPartPath = `${finalSavePath}.part`;
      ensureDirExists(path.dirname(finalPartPath));

      let existingBytes = 0;
      if (fs.existsSync(finalPartPath)) {
        try {
          existingBytes = fs.statSync(finalPartPath).size;
        } catch {
          existingBytes = 0;
        }
      }

      const totalBytes = Number(megaFile.size) || 0;
      if (totalBytes > 0 && existingBytes >= totalBytes) {
        fs.renameSync(finalPartPath, finalSavePath);
        patchTask(
          taskId,
          {
            fileName: path.basename(finalSavePath),
            savePath: finalSavePath,
            status: 'completed',
            progress: 100,
            downloadedBytes: totalBytes,
            totalBytes,
            speedBytesPerSec: 0,
            etaSeconds: 0,
            completedAt: Date.now(),
          },
          true
        );
        return;
      }

      patchTask(
        taskId,
        {
          fileName: path.basename(finalSavePath),
          savePath: finalSavePath,
          status: 'downloading',
          downloadedBytes: existingBytes,
          totalBytes,
          canPauseResume: true,
          progress: totalBytes > 0 ? Math.min(99.9, (existingBytes / totalBytes) * 100) : 0,
          error: null,
        },
        true
      );

      const dlStream = megaFile.download({ start: existingBytes });
      const entry = activeMegaStreams.get(taskId);
      if (entry) entry.stream = dlStream;

      assertNotSymlinkIfExists(finalSavePath);
      assertNotSymlinkIfExists(finalPartPath);
      const writeStream = fs.createWriteStream(finalPartPath, {
        flags: existingBytes > 0 ? 'a' : 'w',
      });

      let downloaded = existingBytes;
      let windowBytes = 0;
      let windowStart = Date.now();
      let smoothedSpeed = 0;

      await new Promise((resolve, reject) => {
        dlStream.on('data', (chunk) => {
          if (abortFlag.paused || abortFlag.cancelled) return;
          const ok = writeStream.write(chunk);
          if (!ok) {
            dlStream.pause();
            writeStream.once('drain', () => {
              if (!abortFlag.paused && !abortFlag.cancelled) {
                dlStream.resume();
              }
            });
          }

          downloaded += chunk.length;
          windowBytes += chunk.length;
          const now = Date.now();
          const elapsedMs = now - windowStart;
          const patchIntervalMs = Math.max(150, Math.min(2000, Number(perfConfig.throttleMs) || 350));
          if (elapsedMs >= patchIntervalMs) {
            const instant = (windowBytes * 1000) / elapsedMs;
            smoothedSpeed = smoothedSpeed > 0 ? smoothedSpeed * 0.6 + instant * 0.4 : instant;
            windowBytes = 0;
            windowStart = now;

            const remaining = totalBytes > downloaded ? totalBytes - downloaded : 0;
            const etaSeconds =
              totalBytes > 0 && smoothedSpeed > 512 ? Math.ceil(remaining / smoothedSpeed) : null;
            const progress =
              totalBytes > 0 ? Math.min(99.9, Number(((downloaded / totalBytes) * 100).toFixed(1))) : 0;

            patchTask(taskId, {
              downloadedBytes: downloaded,
              totalBytes,
              speedBytesPerSec: Math.round(smoothedSpeed),
              etaSeconds,
              progress,
            });
          }
        });

        dlStream.on('end', () => {
          writeStream.end(() => resolve());
        });

        dlStream.on('error', (err) => {
          writeStream.end(() => reject(err));
        });
      });

      if (abortFlag.paused || abortFlag.cancelled) return;

      if (fs.existsSync(finalPartPath)) {
        assertNotSymlinkIfExists(finalPartPath);
        assertNotSymlinkIfExists(finalSavePath);
        fs.renameSync(finalPartPath, finalSavePath);
      }

      patchTask(
        taskId,
        {
          status: 'completed',
          progress: 100,
          downloadedBytes: downloaded,
          totalBytes: totalBytes || downloaded,
          speedBytesPerSec: 0,
          etaSeconds: 0,
          completedAt: Date.now(),
          error: null,
        },
        true
      );
    } catch (err) {
      if (abortFlag.paused || abortFlag.cancelled) return;
      const msg = err instanceof Error ? err.message : String(err || 'Mega download failed.');
      patchTask(
        taskId,
        {
          status: 'failed',
          speedBytesPerSec: 0,
          etaSeconds: null,
          error: msg.slice(0, 240),
        },
        true
      );
    } finally {
      activeMegaStreams.delete(taskId);
    }
  }

  function registerGlobalWillDownload() {
    session.defaultSession.on('will-download', (event, item, webContents) => {
      const urlChain = typeof item.getURLChain === 'function' ? item.getURLChain() : [];
      const currentUrl = typeof item.getURL === 'function' ? item.getURL() : '';
      const candidateUrls = [currentUrl, ...urlChain].filter(
        (u) => typeof u === 'string' && u.trim().length > 0
      );
      const firstUrl = urlChain[0] || currentUrl || '';
      const rawName = item.getFilename() || 'download.bin';

      let matchedMeta = null;
      for (let i = browserTaskQueueMeta.length - 1; i >= 0; i--) {
        const candidate = browserTaskQueueMeta[i];
        if (Date.now() - candidate.createdAt < 1000 * 60 * 20) {
          matchedMeta = candidate;
          browserTaskQueueMeta.splice(i, 1);
          break;
        }
      }

      if (candidateUrls.length === 0 || !candidateUrls.every((u) => isSafeRemoteDownloadUrl(u))) {
        event.preventDefault();
        try {
          item.cancel();
        } catch {
          // ignore
        }
        if (matchedMeta?.taskId) {
          patchTask(
            matchedMeta.taskId,
            {
              status: 'failed',
              speedBytesPerSec: 0,
              etaSeconds: null,
              error: 'Blocked unsafe or private network download target.',
            },
            true
          );
        }
        return;
      }

      const { downloadFolder } = getDownloadSettings();
      const targetSavePath = resolveUniqueFilePath(downloadFolder, rawName);
      item.setSavePath(targetSavePath);

      let taskId = matchedMeta?.taskId;
      let existing = taskId ? findTask(taskId) : null;

      if (existing) {
        patchTask(
          taskId,
          {
            fileName: path.basename(targetSavePath),
            savePath: targetSavePath,
            resolvedUrl: item.getURL() || firstUrl,
            status: 'downloading',
            totalBytes: item.getTotalBytes(),
            downloadedBytes: item.getReceivedBytes(),
            canPauseResume: true,
            error: null,
          },
          true
        );
      } else {
        taskId = `dl-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
        const newTask = {
          id: taskId,
          title: matchedMeta?.title || path.basename(targetSavePath),
          fileName: path.basename(targetSavePath),
          url: firstUrl || item.getURL(),
          resolvedUrl: item.getURL(),
          source: matchedMeta?.source || 'browser',
          channelGroup: matchedMeta?.channelGroup || 'Browser Download',
          coverImage: matchedMeta?.coverImage,
          gameId: matchedMeta?.gameId,
          gameTab: matchedMeta?.gameTab,
          status: 'downloading',
          progress: 0,
          downloadedBytes: 0,
          totalBytes: item.getTotalBytes(),
          speedBytesPerSec: 0,
          etaSeconds: null,
          savePath: targetSavePath,
          canPauseResume: true,
          createdAt: Date.now(),
          updatedAt: Date.now(),
          completedAt: null,
          error: null,
        };
        tasks.unshift(newTask);
        emitSnapshot(true);
      }

      activeElectronItems.set(taskId, item);

      try {
        const ownerWin = BrowserWindow.fromWebContents(webContents);
        if (ownerWin && browserWindows.has(ownerWin) && !ownerWin.isDestroyed()) {
          ownerWin.close();
        }
      } catch {
        // ignore
      }

      let lastBytes = item.getReceivedBytes();
      let lastTick = Date.now();
      let smoothedSpeed = 0;
      let lastBrowserStatus = 'downloading';

      item.on('updated', (_ev, state) => {
        const isPaused = item.isPaused();
        const nextStatus = state === 'interrupted' ? 'paused' : isPaused ? 'paused' : 'downloading';
        const now = Date.now();
        const elapsedMs = Math.max(1, now - lastTick);

        if (elapsedMs < 350 && nextStatus === lastBrowserStatus) {
          return;
        }

        const received = item.getReceivedBytes();
        const total = item.getTotalBytes();
        const delta = Math.max(0, received - lastBytes);
        const instant = (delta * 1000) / elapsedMs;
        smoothedSpeed = smoothedSpeed > 0 ? smoothedSpeed * 0.6 + instant * 0.4 : instant;
        lastBytes = received;
        lastTick = now;
        lastBrowserStatus = nextStatus;

        const remaining = total > received ? total - received : 0;
        const etaSeconds =
          !isPaused && total > 0 && smoothedSpeed > 512
            ? Math.ceil(remaining / smoothedSpeed)
            : null;
        const progress =
          total > 0 ? Math.min(99.9, Number(((received / total) * 100).toFixed(1))) : 0;

        patchTask(
          taskId,
          {
            status: nextStatus,
            downloadedBytes: received,
            totalBytes: total,
            speedBytesPerSec: isPaused ? 0 : Math.round(smoothedSpeed),
            etaSeconds,
            progress,
            canPauseResume: item.canResume() || !isPaused,
          },
          nextStatus !== 'downloading'
        );
      });

      item.once('done', (_ev, state) => {
        activeElectronItems.delete(taskId);
        if (state === 'completed') {
          const finalTotal = item.getTotalBytes() || item.getReceivedBytes();
          patchTask(
            taskId,
            {
              status: 'completed',
              progress: 100,
              downloadedBytes: finalTotal,
              totalBytes: finalTotal,
              speedBytesPerSec: 0,
              etaSeconds: 0,
              completedAt: Date.now(),
              error: null,
            },
            true
          );
        } else if (state === 'cancelled') {
          patchTask(
            taskId,
            {
              status: 'cancelled',
              speedBytesPerSec: 0,
              etaSeconds: null,
            },
            true
          );
        } else {
          patchTask(
            taskId,
            {
              status: 'failed',
              speedBytesPerSec: 0,
              etaSeconds: null,
              error: `Browser download ${state}.`,
            },
            true
          );
        }
      });
    });
  }

  // =========================================================================
  // qBittorrent Installation Detection & WebUI API v2 (5.0+ Compatible)
  // =========================================================================

  function execRegQuery(keyPath) {
    return new Promise((resolve) => {
      if (process.platform !== 'win32') {
        resolve('');
        return;
      }
      execFile('reg.exe', ['query', keyPath, '/ve'], { timeout: 2500, windowsHide: true }, (err, stdout) => {
        if (err || !stdout) {
          resolve('');
          return;
        }
        resolve(String(stdout));
      });
    });
  }

  function isLocalPortOpen(host, port, timeoutMs = 450) {
    return new Promise((resolve) => {
      const socket = new netTcp.Socket();
      let settled = false;
      const done = (result) => {
        if (settled) return;
        settled = true;
        socket.destroy();
        resolve(result);
      };
      socket.setTimeout(timeoutMs);
      socket.once('connect', () => done(true));
      socket.once('timeout', () => done(false));
      socket.once('error', () => done(false));
      socket.connect(port, host);
    });
  }

  async function detectInstalledQbit() {
    let installed = false;
    let executablePath = null;

    if (process.platform === 'win32') {
      const regOutputs = await Promise.all([
        execRegQuery('HKCU\\Software\\Classes\\magnet\\shell\\open\\command'),
        execRegQuery('HKLM\\SOFTWARE\\Classes\\qBittorrent\\shell\\open\\command'),
        execRegQuery('HKLM\\SOFTWARE\\qBittorrent'),
      ]);

      for (const regOut of regOutputs) {
        const exeMatch =
          regOut.match(/"([^"]*qbittorrent\.exe)"/i) ||
          regOut.match(/([A-Za-z]:\\[^\r\n"]*qbittorrent\.exe)/i);
        if (exeMatch && exeMatch[1] && fs.existsSync(exeMatch[1])) {
          installed = true;
          executablePath = exeMatch[1];
          break;
        }
      }

      if (!installed) {
        const localAppData = process.env.LOCALAPPDATA || '';
        const programFiles = process.env.ProgramFiles || 'C:\\Program Files';
        const programFilesX86 = process.env['ProgramFiles(x86)'] || 'C:\\Program Files (x86)';
        const candidates = [
          path.join(programFiles, 'qBittorrent', 'qbittorrent.exe'),
          path.join(programFilesX86, 'qBittorrent', 'qbittorrent.exe'),
          path.join(localAppData, 'Programs', 'qBittorrent', 'qbittorrent.exe'),
        ];
        for (const cand of candidates) {
          if (cand && fs.existsSync(cand)) {
            installed = true;
            executablePath = cand;
            break;
          }
        }
      }
    } else {
      // Non-Windows fallback check for common Linux/macOS binary locations
      const unixCandidates = ['/usr/bin/qbittorrent', '/usr/local/bin/qbittorrent', '/Applications/qbittorrent.app'];
      for (const cand of unixCandidates) {
        if (fs.existsSync(cand)) {
          installed = true;
          executablePath = cand;
          break;
        }
      }
    }

    const portsToProbe = [8080, 8081, 8085, 9090];
    const probeResults = await Promise.all(
      portsToProbe.map(async (p) => ((await isLocalPortOpen('127.0.0.1', p)) ? p : null))
    );
    const openWebUiPorts = probeResults.filter((p) => p !== null);

    // If a local qBittorrent WebUI responds on an open port, treat as available even with portable installs
    let verifiedRunning = false;
    let verifiedPort = openWebUiPorts[0] || 8080;
    for (const p of openWebUiPorts) {
      try {
        const res = await net.fetch(`http://127.0.0.1:${p}/api/v2/app/version`, {
          headers: { Referer: `http://127.0.0.1:${p}` },
          redirect: 'manual',
          signal: AbortSignal.timeout(2500),
        });
        if (res.status === 200 || res.status === 401 || res.status === 403) {
          verifiedRunning = true;
          verifiedPort = p;
          installed = true;
          break;
        }
      } catch {
        // continue probing
      }
    }

    return {
      installed,
      clientName: installed ? 'qBittorrent' : 'Not installed',
      executablePath,
      openWebUiPorts,
      recommendedHost: '127.0.0.1',
      recommendedPort: verifiedPort,
      isRunning: verifiedRunning || openWebUiPorts.length > 0,
      downloadUrl: QBIT_DOWNLOAD_URL,
    };
  }

  function assertSafeLoopbackConfig(cfg) {
    if (!isLoopbackHost(cfg.host)) {
      throw new Error(
        'Security policy: Host must be 127.0.0.1, localhost, or ::1 so WebUI is never exposed to external networks.'
      );
    }
  }

  async function ensureQbitSession(cfg) {
    assertSafeLoopbackConfig(cfg);
    const baseUrl = `http://${cfg.host}:${cfg.port}`;
    const body = new URLSearchParams({
      username: cfg.username || '',
      password: cfg.password || '',
    }).toString();

    const res = await net.fetch(`${baseUrl}/api/v2/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        Referer: baseUrl,
        Origin: baseUrl,
      },
      body,
      redirect: 'manual',
      signal: AbortSignal.timeout(10000),
    });

    if (res.status === 403) {
      throw new Error(
        '403 Forbidden: qBittorrent banned 127.0.0.1 temporarily after too many failed logins (restart qBittorrent to clear).'
      );
    }

    const txt = (await res.text()).trim();
    if (!res.ok || txt === 'Fails.') {
      throw new Error('qBittorrent Web UI login failed — verify Username and Password.');
    }

    const rawCookies =
      typeof res.headers.getSetCookie === 'function'
        ? res.headers.getSetCookie()
        : [res.headers.get('set-cookie') || ''];
    for (const cookieStr of rawCookies) {
      const sidMatch = String(cookieStr).match(/([A-Za-z0-9_-]*SID=[^;]+)/i);
      if (sidMatch && sidMatch[1]) {
        qbitCookie = sidMatch[1];
        return 'cookie';
      }
    }
    return 'localhost-bypass';
  }

  async function callQbitApi(cfg, endpoint, options = {}) {
    assertSafeLoopbackConfig(cfg);
    const method = options.method || 'GET';
    const baseUrl = `http://${cfg.host}:${cfg.port}`;

    const sendOnce = () => {
      const headers = {
        Referer: baseUrl,
        Origin: baseUrl,
      };
      if (cfg.apiKey && !options.forceCookie) {
        headers.Authorization = `Bearer ${cfg.apiKey}`;
      } else if (qbitCookie) {
        headers.Cookie = qbitCookie;
      }

      let bodyPayload;
      if (options.multipart) {
        headers['Content-Type'] = options.multipart.contentType;
        bodyPayload = options.multipart.body;
      } else if (options.formParams) {
        headers['Content-Type'] = 'application/x-www-form-urlencoded';
        bodyPayload = new URLSearchParams(options.formParams).toString();
      }

      return net.fetch(`${baseUrl}${endpoint}`, {
        method,
        headers,
        body: bodyPayload,
        redirect: 'manual',
        signal: AbortSignal.timeout(10000),
      });
    };

    let res = await sendOnce();

    // Retry with fresh cookie login on 401/403 (unless API key explicitly failed without user credentials)
    if (res.status === 401 || res.status === 403) {
      if (cfg.apiKey && !cfg.password && !cfg.username) {
        throw new Error('HTTP 401/403 — API Key rejected by qBittorrent (requires v5.2.0+ or check key).');
      }
      await ensureQbitSession(cfg);
      res = await net.fetch(`${baseUrl}${endpoint}`, {
        method,
        headers: {
          Referer: baseUrl,
          Origin: baseUrl,
          ...(qbitCookie ? { Cookie: qbitCookie } : {}),
          ...(options.multipart
            ? { 'Content-Type': options.multipart.contentType }
            : options.formParams
            ? { 'Content-Type': 'application/x-www-form-urlencoded' }
            : {}),
        },
        body: options.multipart
          ? options.multipart.body
          : options.formParams
          ? new URLSearchParams(options.formParams).toString()
          : undefined,
        redirect: 'manual',
        signal: AbortSignal.timeout(10000),
      });
    }

    if (!res.ok) {
      const err = new Error(`qBittorrent API returned HTTP ${res.status}`);
      err.status = res.status;
      throw err;
    }

    const ct = (res.headers.get('content-type') || '').toLowerCase();
    if (ct.includes('application/json')) {
      return res.json();
    }
    return res.text();
  }

  async function callQbitPauseOrResume(cfg, action, hashesCsv) {
    if (!isValidInfoHash(hashesCsv)) {
      throw new Error('Invalid torrent hash format.');
    }
    // qBittorrent 5.0+ (WebAPI >= 2.11.0) uses /stop and /start; 4.x used /pause and /resume
    const isLegacyV4 =
      torrentWebApiVersion && compareSemver(torrentWebApiVersion, '2.11.0') < 0;
    const primaryEndpoint =
      action === 'pause'
        ? isLegacyV4
          ? '/api/v2/torrents/pause'
          : '/api/v2/torrents/stop'
        : isLegacyV4
        ? '/api/v2/torrents/resume'
        : '/api/v2/torrents/start';

    try {
      return await callQbitApi(cfg, primaryEndpoint, {
        method: 'POST',
        formParams: { hashes: hashesCsv },
      });
    } catch (err) {
      if (err && err.status === 404 && !isLegacyV4) {
        const fallbackEndpoint =
          action === 'pause' ? '/api/v2/torrents/pause' : '/api/v2/torrents/resume';
        return callQbitApi(cfg, fallbackEndpoint, {
          method: 'POST',
          formParams: { hashes: hashesCsv },
        });
      }
      throw err;
    }
  }

  function diagnoseQbitError(err, cfg, installedCheck = null) {
    const raw = scrubSensitiveText(err instanceof Error ? err.message : String(err || 'Connection failed'));
    const lower = raw.toLowerCase();

    if (installedCheck && !installedCheck.installed) {
      return {
        message: 'qBittorrent is not installed on this PC.',
        hint: 'Install qBittorrent (optional — only needed for magnet & .torrent files) and enable Tools → Options → Web UI.',
      };
    }

    if (lower.includes('security policy') || lower.includes('external networks')) {
      return {
        message: raw,
        hint: 'Set Host to 127.0.0.1 so qBittorrent Web UI stays private on this computer.',
      };
    }

    if (lower.includes('403') && lower.includes('banned')) {
      return {
        message: raw,
        hint: 'Close and reopen qBittorrent to reset the login ban, then verify your Username & Password under Tools → Options → Web UI.',
      };
    }

    if (lower.includes('login failed') || lower.includes('401') || lower.includes('403')) {
      return {
        message: raw,
        hint: 'In qBittorrent, open Tools → Options → Web UI → Authentication and verify your Username, Password, or API Key.',
      };
    }

    if (lower.includes('econnrefused') || lower.includes('fetch failed') || lower.includes('failed to fetch')) {
      return {
        message: `Cannot reach qBittorrent Web UI at http://${cfg.host}:${cfg.port}`,
        hint: `Make sure qBittorrent is running, "Web User Interface (Remote control)" is enabled in Tools → Options → Web UI, IP address is 127.0.0.1, and Port matches ${cfg.port}.`,
      };
    }

    return {
      message: raw,
      hint: 'Verify qBittorrent is open with Web UI enabled on 127.0.0.1.',
    };
  }

  async function testTorrentConnection(rawOverride) {
    const cfg = rawOverride
      ? {
          ...torrentConfig,
          ...rawOverride,
          host: typeof rawOverride.host === 'string' ? rawOverride.host.trim() : torrentConfig.host,
          port: Number(rawOverride.port) || torrentConfig.port || 8080,
          password:
            typeof rawOverride.password === 'string' && rawOverride.password.length > 0
              ? rawOverride.password
              : torrentConfig.password,
          apiKey:
            typeof rawOverride.apiKey === 'string' && rawOverride.apiKey.length > 0
              ? rawOverride.apiKey
              : torrentConfig.apiKey,
        }
      : torrentConfig;

    try {
      assertSafeLoopbackConfig(cfg);
      if (
        hasHeaderControlChars(cfg.username) ||
        hasHeaderControlChars(cfg.password) ||
        hasHeaderControlChars(cfg.apiKey)
      ) {
        return {
          ok: false,
          message: 'Credentials contain invalid control or newline characters.',
        };
      }
      if (!cfg.port || cfg.port < 1 || cfg.port > 65535) {
        return {
          ok: false,
          message: 'Port must be between 1 and 65535.',
        };
      }

      let authMethod = cfg.apiKey ? 'api-key' : 'localhost-bypass';
      if (!cfg.apiKey && (cfg.username || cfg.password)) {
        authMethod = await ensureQbitSession(cfg);
      }

      const [versionRaw, webApiRaw, list] = await Promise.all([
        callQbitApi(cfg, '/api/v2/app/version'),
        callQbitApi(cfg, '/api/v2/app/webapiVersion'),
        callQbitApi(cfg, '/api/v2/torrents/info'),
      ]);

      const version = String(versionRaw || '').trim();
      const webApiVersion = String(webApiRaw || '').trim();
      torrentVersion = version || torrentVersion;
      torrentWebApiVersion = webApiVersion || torrentWebApiVersion;

      const matchesActiveTarget =
        !rawOverride ||
        (cfg.host === torrentConfig.host && Number(cfg.port) === Number(torrentConfig.port));
      if (matchesActiveTarget) {
        torrentConnected = true;
        torrentError = null;
        emitSnapshot(true);
        if (torrentConfig.enabled) {
          void pollTorrentWebUiOnce();
        }
      }

      return {
        ok: true,
        version,
        webApiVersion,
        authMethod,
        activeCount: Array.isArray(list) ? list.length : 0,
        message: `Connected to qBittorrent ${version} (WebAPI ${webApiVersion})`,
      };
    } catch (err) {
      const detected = await detectInstalledQbit().catch(() => null);
      const diagnosed = diagnoseQbitError(err, cfg, detected);
      const matchesActiveTarget =
        !rawOverride ||
        (cfg.host === torrentConfig.host && Number(cfg.port) === Number(torrentConfig.port));
      if (matchesActiveTarget) {
        torrentConnected = false;
        torrentError = diagnosed.message;
        emitSnapshot(true);
      }
      return {
        ok: false,
        message: diagnosed.message,
        hint: diagnosed.hint,
      };
    }
  }

  function mapQbitStatus(state, progressRatio) {
    const clean = String(state || '').trim();
    if (clean === 'error' || clean === 'missingFiles') {
      return 'failed';
    }
    if (clean === 'pausedDL' || clean === 'stoppedDL') {
      return 'paused';
    }
    if (clean === 'metaDL' || clean === 'forcedMetaDL') {
      return 'resolving';
    }
    if (
      clean === 'queuedDL' ||
      clean === 'checkingDL' ||
      clean === 'checkingUP' ||
      clean === 'checkingResumeData' ||
      clean === 'allocating' ||
      clean === 'moving'
    ) {
      return 'queued';
    }
    if (clean === 'downloading' || clean === 'forcedDL' || clean === 'stalledDL') {
      return 'downloading';
    }
    if (
      clean === 'uploading' ||
      clean === 'stalledUP' ||
      clean === 'queuedUP' ||
      clean === 'forcedUP' ||
      clean === 'pausedUP' ||
      clean === 'stoppedUP'
    ) {
      return 'completed';
    }
    return Number(progressRatio) >= 1 ? 'completed' : 'downloading';
  }

  async function pollTorrentWebUiOnce() {
    if (!torrentConfig.enabled || isShuttingDown) return;

    try {
      if (!torrentVersion || !torrentWebApiVersion) {
        const [ver, apiVer] = await Promise.all([
          callQbitApi(torrentConfig, '/api/v2/app/version'),
          callQbitApi(torrentConfig, '/api/v2/app/webapiVersion'),
        ]);
        torrentVersion = String(ver || '').trim() || torrentVersion;
        torrentWebApiVersion = String(apiVer || '').trim() || torrentWebApiVersion;
      }

      const rawList = await callQbitApi(torrentConfig, '/api/v2/torrents/info');
      const remoteTorrents = Array.isArray(rawList)
        ? rawList.map((t) => {
            const progressRatio = Math.min(1, Math.max(0, Number(t.progress) || 0));
            const mappedStatus = mapQbitStatus(String(t.state || ''), progressRatio);
            const computedProgress =
              mappedStatus === 'completed'
                ? 100
                : Math.min(99.9, Math.max(0, Math.round(progressRatio * 1000) / 10));
            const totalBytes = Math.max(0, Number(t.size) || Number(t.total_size) || 0);
            const completedBytes =
              Number(t.completed) > 0
                ? Number(t.completed)
                : totalBytes > 0
                ? Math.round(totalBytes * progressRatio)
                : Math.max(0, Number(t.downloaded) || 0);
            const rawEta = Number(t.eta);

            return {
              hash: String(t.hash || '').toUpperCase(),
              infohashV1: String(t.infohash_v1 || '').toUpperCase(),
              infohashV2: String(t.infohash_v2 || '').toUpperCase(),
              name: String(t.name || 'Torrent'),
              totalBytes,
              downloadedBytes: completedBytes,
              progress: computedProgress,
              speedBytesPerSec: Math.max(0, Number(t.dlspeed) || 0),
              uploadSpeedBytesPerSec: Math.max(0, Number(t.upspeed) || 0),
              etaSeconds:
                Number.isFinite(rawEta) && rawEta >= 0 && rawEta < 8640000 ? rawEta : null,
              status: mappedStatus,
              peers: Math.max(0, Number(t.num_leechs) || 0),
              peersTotal: Math.max(0, Number(t.num_incomplete) || 0),
              seeds: Math.max(0, Number(t.num_seeds) || 0),
              seedsTotal: Math.max(0, Number(t.num_complete) || 0),
              ratio:
                Number.isFinite(Number(t.ratio)) && Number(t.ratio) >= 0
                  ? Math.round(Number(t.ratio) * 100) / 100
                  : 0,
              savePath: String(t.content_path || t.save_path || ''),
              stateRaw: String(t.state || ''),
            };
          })
        : [];

      const wasConnected = torrentConnected;
      torrentConnected = true;
      torrentError = null;

      let changed = !wasConnected;
      for (const rt of remoteTorrents) {
        if (!rt.hash) continue;
        const normalizedRemoteName = normalizeTorrentCompareName(rt.name);
        const existingIdx = tasks.findIndex((t) => {
          if (t.source !== 'qbittorrent') return false;
          const localHash = (t.torrentHash || extractMagnetInfoHash(t.url) || '').toUpperCase();
          if (
            localHash &&
            (localHash === rt.hash ||
              (rt.infohashV1 && localHash === rt.infohashV1) ||
              (rt.infohashV2 &&
                (localHash === rt.infohashV2 || localHash === rt.infohashV2.slice(0, 40))))
          ) {
            return true;
          }
          if (
            normalizedRemoteName &&
            (normalizeTorrentCompareName(t.fileName) === normalizedRemoteName ||
              normalizeTorrentCompareName(t.title) === normalizedRemoteName)
          ) {
            return true;
          }
          return false;
        });

        if (existingIdx !== -1) {
          const prev = tasks[existingIdx];
          if (prev.status === 'cancelled') continue;
          const keepActiveSpeed =
            rt.status === 'downloading' || rt.status === 'resolving' || rt.status === 'queued';
          const nextFileName = rt.name || prev.fileName;
          const nextSpeed = keepActiveSpeed ? rt.speedBytesPerSec : 0;
          const nextEta =
            rt.status === 'downloading' ? rt.etaSeconds : rt.status === 'completed' ? 0 : null;
          const nextSavePath = rt.savePath || prev.savePath;
          const nextError = rt.status === 'failed' ? `qBittorrent status: ${rt.stateRaw}` : null;

          const hasDiff =
            prev.fileName !== nextFileName ||
            prev.torrentHash !== rt.hash ||
            prev.status !== rt.status ||
            prev.progress !== rt.progress ||
            prev.downloadedBytes !== rt.downloadedBytes ||
            prev.totalBytes !== rt.totalBytes ||
            prev.speedBytesPerSec !== nextSpeed ||
            (prev.uploadSpeedBytesPerSec || 0) !== rt.uploadSpeedBytesPerSec ||
            prev.etaSeconds !== nextEta ||
            (prev.torrentPeers ?? null) !== rt.peers ||
            (prev.torrentSeeds ?? null) !== rt.seeds ||
            (prev.torrentRatio ?? null) !== rt.ratio ||
            prev.torrentStateRaw !== rt.stateRaw ||
            prev.savePath !== nextSavePath ||
            (prev.error || null) !== nextError;

          if (!hasDiff) {
            continue;
          }

          const next = {
            ...prev,
            fileName: nextFileName,
            torrentHash: rt.hash,
            status: rt.status,
            progress: rt.progress,
            downloadedBytes: rt.downloadedBytes,
            totalBytes: rt.totalBytes,
            speedBytesPerSec: nextSpeed,
            uploadSpeedBytesPerSec: rt.uploadSpeedBytesPerSec,
            etaSeconds: nextEta,
            torrentPeers: rt.peers,
            torrentPeersTotal: rt.peersTotal,
            torrentSeeds: rt.seeds,
            torrentSeedsTotal: rt.seedsTotal,
            torrentRatio: rt.ratio,
            torrentStateRaw: rt.stateRaw,
            savePath: nextSavePath,
            canPauseResume: true,
            completedAt: rt.status === 'completed' ? prev.completedAt || Date.now() : null,
            error: nextError,
            updatedAt: Date.now(),
          };
          tasks[existingIdx] = next;
          changed = true;
        }
      }

      if (changed) {
        emitSnapshot(false, false);
      }
      rescheduleTorrentPollerIfNeeded();
    } catch (err) {
      const diagnosed = diagnoseQbitError(err, torrentConfig);
      const wasConnected = torrentConnected;
      const prevErr = torrentError;
      torrentConnected = false;
      torrentError = diagnosed.message;
      if (wasConnected || prevErr !== torrentError) {
        emitSnapshot(true, false);
      }
      rescheduleTorrentPollerIfNeeded();
    }
  }

  function hasActiveTorrentTasks() {
    return tasks.some(
      (t) =>
        t.source === 'qbittorrent' &&
        (t.status === 'downloading' || t.status === 'resolving' || t.status === 'queued')
    );
  }

  function getDesiredTorrentPollMs() {
    if (!torrentConnected && torrentError) {
      return Math.max(8000, perfConfig.torrentIdlePollMs || 12000);
    }
    if (perfConfig.adaptiveTorrentPolling && !hasActiveTorrentTasks()) {
      return Math.max(4000, Number(perfConfig.torrentIdlePollMs) || 12000);
    }
    return Math.max(1000, Number(perfConfig.torrentActivePollMs || torrentConfig.pollIntervalMs) || 1500);
  }

  function rescheduleTorrentPollerIfNeeded() {
    if (!torrentConfig.enabled || isShuttingDown) return;
    if (perfConfig.pauseOnMinimize && isWindowHiddenOrMinimized()) return;
    const nextMs = getDesiredTorrentPollMs();
    if (torrentPollTimer && currentTorrentPollMs === nextMs) return;
    if (torrentPollTimer) {
      clearInterval(torrentPollTimer);
      torrentPollTimer = null;
    }
    currentTorrentPollMs = nextMs;
    torrentPollTimer = setInterval(() => {
      void pollTorrentWebUiOnce();
    }, currentTorrentPollMs);
  }

  function syncTorrentPoller(triggerImmediate = true) {
    if (torrentPollTimer) {
      clearInterval(torrentPollTimer);
      torrentPollTimer = null;
    }
    pausedTorrentPollingByHide = false;
    if (!torrentConfig.enabled || isShuttingDown) {
      torrentConnected = false;
      torrentVersion = null;
      torrentWebApiVersion = null;
      torrentError = null;
      return;
    }
    if (perfConfig.pauseOnMinimize && isWindowHiddenOrMinimized()) {
      pausedTorrentPollingByHide = true;
      return;
    }
    currentTorrentPollMs = getDesiredTorrentPollMs();
    if (triggerImmediate) {
      void pollTorrentWebUiOnce();
    }
    torrentPollTimer = setInterval(() => {
      void pollTorrentWebUiOnce();
    }, currentTorrentPollMs);
  }

  function setPerformanceConfig(nextCfg = {}) {
    if (!nextCfg || typeof nextCfg !== 'object') return perfConfig;
    const prevAdaptive = perfConfig.adaptiveTorrentPolling;
    const prevActiveMs = perfConfig.torrentActivePollMs;
    const prevIdleMs = perfConfig.torrentIdlePollMs;
    const prevPause = perfConfig.pauseOnMinimize;

    perfConfig = {
      throttleMs:
        Number.isFinite(Number(nextCfg.throttleMs))
          ? Math.max(120, Math.min(2000, Math.round(Number(nextCfg.throttleMs))))
          : perfConfig.throttleMs,
      torrentActivePollMs:
        Number.isFinite(Number(nextCfg.torrentActivePollMs))
          ? Math.max(1000, Math.min(10000, Math.round(Number(nextCfg.torrentActivePollMs))))
          : perfConfig.torrentActivePollMs,
      torrentIdlePollMs:
        Number.isFinite(Number(nextCfg.torrentIdlePollMs))
          ? Math.max(3000, Math.min(60000, Math.round(Number(nextCfg.torrentIdlePollMs))))
          : perfConfig.torrentIdlePollMs,
      adaptiveTorrentPolling:
        typeof nextCfg.adaptiveTorrentPolling === 'boolean'
          ? nextCfg.adaptiveTorrentPolling
          : perfConfig.adaptiveTorrentPolling,
      pauseOnMinimize:
        typeof nextCfg.pauseOnMinimize === 'boolean'
          ? nextCfg.pauseOnMinimize
          : perfConfig.pauseOnMinimize,
    };

    if (
      torrentConfig.enabled &&
      (prevAdaptive !== perfConfig.adaptiveTorrentPolling ||
        prevActiveMs !== perfConfig.torrentActivePollMs ||
        prevIdleMs !== perfConfig.torrentIdlePollMs ||
        prevPause !== perfConfig.pauseOnMinimize)
    ) {
      rescheduleTorrentPollerIfNeeded();
    }
    if (pendingEmitTimer) {
      clearTimeout(pendingEmitTimer);
      pendingEmitTimer = null;
      emitSnapshot(true, false);
    }
    return { ...perfConfig };
  }

  function onWindowHidden() {
    if (!perfConfig.pauseOnMinimize) return;
    if (torrentPollTimer) {
      clearInterval(torrentPollTimer);
      torrentPollTimer = null;
      pausedTorrentPollingByHide = true;
    }
  }

  function onWindowShown() {
    if (pausedTorrentPollingByHide && torrentConfig.enabled && !isShuttingDown) {
      pausedTorrentPollingByHide = false;
      syncTorrentPoller(true);
    }
    if (windowHiddenSuppressedPending) {
      windowHiddenSuppressedPending = false;
      emitSnapshot(true, false);
    }
  }

  function getRuntimeStats() {
    return {
      taskCount: tasks.length,
      activeHttpCount: activeHttpControllers.size,
      activeMegaCount: activeMegaStreams.size,
      activeElectronCount: activeElectronItems.size,
      torrentEnabled: Boolean(torrentConfig.enabled),
      torrentConnected: Boolean(torrentConnected),
      torrentPollerActive: Boolean(torrentPollTimer),
      torrentPollIntervalMs: torrentPollTimer ? currentTorrentPollMs : null,
      pausedTorrentPollingByHide,
      throttleMs: perfConfig.throttleMs,
      adaptiveTorrentPolling: perfConfig.adaptiveTorrentPolling,
    };
  }

  async function launchQbitTask(taskId, torrentFileBuffer = null, originalFilename = '') {
    const task = findTask(taskId);
    if (!task) return;

    const infoHash =
      task.torrentHash || (task.url ? extractMagnetInfoHash(task.url) : '');
    const displayName =
      (task.fileName && task.fileName !== 'download.bin' ? task.fileName : '') ||
      extractMagnetDisplayName(task.url) ||
      task.title;
    const { downloadFolder } = getDownloadSettings();

    if (torrentConfig.enabled) {
      try {
        let multipart;
        if (torrentFileBuffer) {
          multipart = buildMultipartFormBody(
            { savepath: downloadFolder },
            [
              {
                field: 'torrents',
                filename: sanitizeFileName(originalFilename || `${displayName}.torrent`),
                buffer: torrentFileBuffer,
                contentType: 'application/x-bittorrent',
              },
            ]
          );
        } else {
          multipart = buildMultipartFormBody(
            {
              urls: task.url,
              savepath: downloadFolder,
            },
            []
          );
        }

        const addRes = await callQbitApi(torrentConfig, '/api/v2/torrents/add', {
          method: 'POST',
          multipart,
        });
        if (String(addRes || '').trim() === 'Fails.') {
          throw new Error('qBittorrent rejected the magnet link or .torrent file (Fails.).');
        }

        patchTask(
          taskId,
          {
            fileName: displayName || task.fileName,
            torrentHash: infoHash || task.torrentHash,
            status: 'resolving',
            progress: 0,
            completedAt: null,
            canPauseResume: true,
            error: null,
          },
          true
        );
        void pollTorrentWebUiOnce();
        setTimeout(() => {
          void pollTorrentWebUiOnce();
        }, 350);
        setTimeout(() => {
          void pollTorrentWebUiOnce();
        }, 1100);
        return;
      } catch (err) {
        // For local .torrent upload when WebUI fails, surface actionable error instead of opening empty URL
        if (torrentFileBuffer || !task.url) {
          const diagnosed = diagnoseQbitError(err, torrentConfig);
          patchTask(
            taskId,
            {
              status: 'failed',
              progress: 0,
              completedAt: null,
              canPauseResume: false,
              error: `${diagnosed.message} ${diagnosed.hint}`.slice(0, 260),
            },
            true
          );
          return;
        }
        // Fallback to OS handler for magnet / .torrent URLs
      }
    }

    if (task.url) {
      const safeExternal = validateDownloadUrl(task.url);
      if (safeExternal) {
        await shell.openExternal(safeExternal);
      }
    }
    patchTask(
      taskId,
      {
        fileName: displayName || task.fileName,
        torrentHash: infoHash || task.torrentHash,
        status: 'queued',
        progress: 0,
        canPauseResume: false,
        error: torrentConfig.enabled
          ? 'Opened via external torrent app — live progress requires a connected qBittorrent Web UI.'
          : 'Sent to external torrent app — enable qBittorrent Web UI in Settings for live progress sync.',
        completedAt: null,
      },
      true
    );
  }

  async function addLocalTorrentFile() {
    const mainWindow = getMainWindow();
    const res = await dialog.showOpenDialog(mainWindow || undefined, {
      title: 'Select .torrent File',
      properties: ['openFile'],
      filters: [{ name: 'Torrent Files', extensions: ['torrent'] }],
    });
    if (res.canceled || !res.filePaths?.[0]) {
      return null;
    }

    const filePath = res.filePaths[0];
    const buf = fs.readFileSync(filePath);
    const baseName = path.basename(filePath);
    const meta = parseTorrentBufferMetadata(buf, baseName.replace(/\.torrent$/i, ''));
    const { downloadFolder } = getDownloadSettings();

    const taskId = `dl-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    const task = {
      id: taskId,
      title: meta.name || baseName,
      fileName: meta.name || baseName,
      url: filePath,
      source: 'qbittorrent',
      channelGroup: 'Torrent File',
      status: 'queued',
      progress: 0,
      downloadedBytes: 0,
      totalBytes: 0,
      speedBytesPerSec: 0,
      uploadSpeedBytesPerSec: 0,
      etaSeconds: null,
      savePath: downloadFolder,
      canPauseResume: torrentConfig.enabled,
      torrentHash: meta.infoHash || undefined,
      error: null,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      completedAt: null,
    };

    tasks.unshift(task);
    emitSnapshot(true);

    if (torrentConfig.enabled) {
      void launchQbitTask(taskId, buf, baseName);
    } else {
      await shell.openPath(filePath);
      patchTask(
        taskId,
        {
          status: 'queued',
          progress: 0,
          canPauseResume: false,
          completedAt: null,
          error: 'Opened with system torrent app — enable qBittorrent Web UI in Settings for live progress sync.',
        },
        true
      );
    }

    return findTask(taskId) || task;
  }

  async function startDownload(payload) {
    const cleanUrl = validateDownloadUrl(payload?.url);
    if (!cleanUrl) {
      throw new Error('Only valid http://, https://, or magnet:? links are supported.');
    }

    const { downloadFolder } = getDownloadSettings();
    const source = detectSourceFromUrl(cleanUrl, payload?.channelGroup);
    const title = String(payload?.title || '').trim() || 'SecretArea Download';
    const initialName =
      source === 'qbittorrent'
        ? extractMagnetDisplayName(cleanUrl) || `${title}.torrent`
        : sanitizeFileName(cleanUrl.split('/').pop() || title, `${sanitizeFileName(title)}.bin`);

    const taskId = `dl-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    const task = {
      id: taskId,
      title,
      fileName: initialName,
      url: cleanUrl,
      source,
      channelGroup: String(payload?.channelGroup || 'Direct Link'),
      coverImage: typeof payload?.coverImage === 'string' ? payload.coverImage : undefined,
      gameId: typeof payload?.gameId === 'string' ? payload.gameId : undefined,
      gameTab: typeof payload?.gameTab === 'string' ? payload.gameTab : undefined,
      status: 'queued',
      progress: 0,
      downloadedBytes: 0,
      totalBytes: 0,
      speedBytesPerSec: 0,
      uploadSpeedBytesPerSec: 0,
      etaSeconds: null,
      savePath: source === 'qbittorrent' ? downloadFolder : resolveUniqueFilePath(downloadFolder, initialName),
      canPauseResume: source !== 'qbittorrent' || torrentConfig.enabled,
      torrentHash: source === 'qbittorrent' ? extractMagnetInfoHash(cleanUrl) : undefined,
      error: null,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      completedAt: null,
    };

    tasks.unshift(task);
    emitSnapshot(true);

    if (source === 'qbittorrent') {
      void launchQbitTask(taskId);
    } else if (source === 'mega') {
      void runMegaTask(taskId);
    } else {
      void runHttpStreamTask(taskId);
    }

    return task;
  }

  async function pauseDownload(id) {
    const task = findTask(id);
    if (!task) return getSnapshot();

    if (task.source === 'qbittorrent' && task.torrentHash && torrentConfig.enabled) {
      try {
        await callQbitPauseOrResume(torrentConfig, 'pause', task.torrentHash.toLowerCase());
        patchTask(
          id,
          { status: 'paused', speedBytesPerSec: 0, uploadSpeedBytesPerSec: 0, etaSeconds: null },
          true
        );
        void pollTorrentWebUiOnce();
      } catch (err) {
        const diagnosed = diagnoseQbitError(err, torrentConfig);
        patchTask(id, { error: diagnosed.message }, true);
      }
      return getSnapshot();
    }

    const electronItem = activeElectronItems.get(id);
    if (electronItem) {
      electronItem.pause();
      patchTask(id, { status: 'paused', speedBytesPerSec: 0, etaSeconds: null }, true);
      return getSnapshot();
    }

    const megaEntry = activeMegaStreams.get(id);
    if (megaEntry) {
      megaEntry.abortFlag.paused = true;
      try {
        megaEntry.stream?.destroy();
      } catch {
        // ignore
      }
      activeMegaStreams.delete(id);
      patchTask(id, { status: 'paused', speedBytesPerSec: 0, etaSeconds: null }, true);
      return getSnapshot();
    }

    const controller = activeHttpControllers.get(id);
    if (controller) {
      controller.abort('paused');
      activeHttpControllers.delete(id);
      patchTask(id, { status: 'paused', speedBytesPerSec: 0, etaSeconds: null }, true);
    }

    return getSnapshot();
  }

  async function resumeDownload(id) {
    const task = findTask(id);
    if (!task) return getSnapshot();

    if (task.source === 'qbittorrent' && torrentConfig.enabled) {
      if (task.torrentHash) {
        try {
          await callQbitPauseOrResume(torrentConfig, 'resume', task.torrentHash.toLowerCase());
          patchTask(id, { status: 'downloading', error: null }, true);
          void pollTorrentWebUiOnce();
          return getSnapshot();
        } catch (err) {
          const diagnosed = diagnoseQbitError(err, torrentConfig);
          patchTask(id, { error: diagnosed.message }, true);
          return getSnapshot();
        }
      }
      void launchQbitTask(id);
      return getSnapshot();
    }

    const electronItem = activeElectronItems.get(id);
    if (electronItem && electronItem.canResume()) {
      electronItem.resume();
      patchTask(id, { status: 'downloading', error: null }, true);
      return getSnapshot();
    }

    if (task.source === 'mega') {
      void runMegaTask(id);
    } else if (task.source === 'qbittorrent') {
      void launchQbitTask(id);
    } else {
      void runHttpStreamTask(id);
    }
    return getSnapshot();
  }

  async function cancelDownload(id, deleteFiles = false) {
    const task = findTask(id);
    if (!task) return getSnapshot();

    if (task.source === 'qbittorrent' && isValidInfoHash(task.torrentHash) && torrentConfig.enabled) {
      try {
        await callQbitApi(torrentConfig, '/api/v2/torrents/delete', {
          method: 'POST',
          formParams: {
            hashes: task.torrentHash.toLowerCase(),
            deleteFiles: deleteFiles ? 'true' : 'false',
          },
        });
      } catch {
        // continue local cleanup
      }
    }

    const electronItem = activeElectronItems.get(id);
    if (electronItem) {
      electronItem.cancel();
      activeElectronItems.delete(id);
    }

    const megaEntry = activeMegaStreams.get(id);
    if (megaEntry) {
      megaEntry.abortFlag.cancelled = true;
      try {
        megaEntry.stream?.destroy();
      } catch {
        // ignore
      }
      activeMegaStreams.delete(id);
    }

    const controller = activeHttpControllers.get(id);
    if (controller) {
      controller.abort('cancelled');
      activeHttpControllers.delete(id);
    }

    const { downloadFolder: activeDownloadFolder } = getDownloadSettings();
    if (
      task.savePath &&
      isPathInsideDir(task.savePath, activeDownloadFolder) &&
      fs.existsSync(`${task.savePath}.part`)
    ) {
      try {
        const partFile = `${path.resolve(task.savePath)}.part`;
        if (!fs.lstatSync(partFile).isSymbolicLink()) {
          fs.unlinkSync(partFile);
        }
      } catch {
        // ignore cleanup error
      }
    }

    patchTask(
      id,
      {
        status: 'cancelled',
        speedBytesPerSec: 0,
        uploadSpeedBytesPerSec: 0,
        etaSeconds: null,
        error: null,
      },
      true
    );

    return getSnapshot();
  }

  async function retryDownload(id) {
    const task = findTask(id);
    if (!task) return getSnapshot();

    patchTask(
      id,
      {
        status: 'queued',
        error: null,
        speedBytesPerSec: 0,
        uploadSpeedBytesPerSec: 0,
        etaSeconds: null,
      },
      true
    );

    if (task.source === 'qbittorrent') {
      if (torrentConfig.enabled && isValidInfoHash(task.torrentHash)) {
        try {
          const existing = await callQbitApi(
            torrentConfig,
            `/api/v2/torrents/info?hashes=${encodeURIComponent(task.torrentHash.toLowerCase())}`
          );
          if (Array.isArray(existing) && existing.length > 0) {
            await callQbitPauseOrResume(torrentConfig, 'resume', task.torrentHash.toLowerCase());
            patchTask(id, { status: 'downloading', canPauseResume: true }, true);
            void pollTorrentWebUiOnce();
            return getSnapshot();
          }
        } catch {
          // fall through to re-add via launchQbitTask
        }
      }

      if (task.url && fs.existsSync(task.url) && /\.torrent$/i.test(task.url)) {
        const buf = fs.readFileSync(task.url);
        void launchQbitTask(id, buf, path.basename(task.url));
      } else {
        void launchQbitTask(id);
      }
    } else if (task.source === 'mega') {
      void runMegaTask(id);
    } else {
      void runHttpStreamTask(id);
    }
    return getSnapshot();
  }

  async function removeTask(id, deleteFiles = false) {
    const task = findTask(id);
    if (!task) return getSnapshot();

    if (task.source === 'qbittorrent' && isValidInfoHash(task.torrentHash) && torrentConfig.enabled) {
      try {
        await callQbitApi(torrentConfig, '/api/v2/torrents/delete', {
          method: 'POST',
          formParams: {
            hashes: task.torrentHash.toLowerCase(),
            deleteFiles: deleteFiles ? 'true' : 'false',
          },
        });
      } catch {
        // remove locally cleanly even if remote torrent already deleted
      }
    }

    const electronItem = activeElectronItems.get(id);
    if (electronItem) {
      electronItem.cancel();
      activeElectronItems.delete(id);
    }
    const megaEntry = activeMegaStreams.get(id);
    if (megaEntry) {
      megaEntry.abortFlag.cancelled = true;
      try {
        megaEntry.stream?.destroy();
      } catch {
        // ignore
      }
      activeMegaStreams.delete(id);
    }
    const controller = activeHttpControllers.get(id);
    if (controller) {
      controller.abort('cancelled');
      activeHttpControllers.delete(id);
    }

    tasks = tasks.filter((t) => t.id !== id);
    emitSnapshot(true);
    return getSnapshot();
  }

  function clearCompleted() {
    tasks = tasks.filter(
      (t) =>
        t.status === 'downloading' ||
        t.status === 'resolving' ||
        t.status === 'queued' ||
        t.status === 'paused'
    );
    emitSnapshot(true);
    return getSnapshot();
  }

  function isUnsafeDownloadFolderChoice(folderPath) {
    const resolved = path.resolve(String(folderPath || ''));
    const parsedRoot = path.parse(resolved).root;
    if (!resolved || resolved === parsedRoot || resolved === '/' || /^[A-Za-z]:\\?$/.test(resolved)) {
      return true;
    }
    const lower = resolved.toLowerCase();
    const blockedPrefixes = [
      (process.env.SystemRoot || 'C:\\Windows').toLowerCase(),
      (process.env.ProgramFiles || 'C:\\Program Files').toLowerCase(),
      (process.env['ProgramFiles(x86)'] || 'C:\\Program Files (x86)').toLowerCase(),
      '/bin',
      '/sbin',
      '/usr',
      '/etc',
      '/system',
    ];
    return blockedPrefixes.some(
      (prefix) => lower === prefix || lower.startsWith(prefix + path.sep)
    );
  }

  async function chooseDownloadFolder() {
    const mainWindow = getMainWindow();
    const { downloadFolder } = getDownloadSettings();
    const res = await dialog.showOpenDialog(mainWindow || undefined, {
      title: 'Select Download Folder',
      defaultPath: fs.existsSync(downloadFolder) ? downloadFolder : app.getPath('downloads'),
      properties: ['openDirectory', 'createDirectory'],
    });
    if (res.canceled || !res.filePaths?.[0]) {
      return getSnapshot();
    }
    const chosen = path.resolve(res.filePaths[0]);
    if (isUnsafeDownloadFolderChoice(chosen)) {
      await dialog.showMessageBox(mainWindow || undefined, {
        type: 'warning',
        title: 'Protected System Folder',
        message: 'Downloads cannot be saved directly to a drive root or operating system directory.',
      });
      return getSnapshot();
    }
    ensureDirExists(chosen);
    const prev = readSettings ? readSettings() : {};
    if (writeSettings) {
      writeSettings({ ...prev, downloadFolder: chosen });
    }
    emitSnapshot(true);
    return getSnapshot();
  }

  async function openFolder(idOrEmpty) {
    const { downloadFolder } = getDownloadSettings();
    if (idOrEmpty) {
      const task = findTask(idOrEmpty);
      if (task?.savePath) {
        const resolved = path.resolve(String(task.savePath));
        const allowedPath =
          task.source === 'qbittorrent'
            ? path.isAbsolute(resolved)
            : isPathInsideDir(resolved, downloadFolder);
        if (allowedPath && fs.existsSync(resolved)) {
          shell.showItemInFolder(resolved);
          return true;
        }
        const parentDir = path.dirname(resolved);
        const allowedParent =
          task.source === 'qbittorrent'
            ? path.isAbsolute(parentDir)
            : isPathInsideDir(parentDir, downloadFolder);
        if (allowedParent && fs.existsSync(parentDir)) {
          await shell.openPath(parentDir);
          return true;
        }
      }
    }
    ensureDirExists(downloadFolder);
    await shell.openPath(downloadFolder);
    return true;
  }

  async function openFile(id) {
    const task = findTask(id);
    if (!task?.savePath) return false;
    const { downloadFolder } = getDownloadSettings();
    const resolved = path.resolve(String(task.savePath));
    if (task.source !== 'qbittorrent' && !isPathInsideDir(resolved, downloadFolder)) {
      return false;
    }
    if (!fs.existsSync(resolved)) {
      return false;
    }
    try {
      const st = fs.lstatSync(resolved);
      if (st.isSymbolicLink()) return false;
    } catch {
      return false;
    }

    const ext = path.extname(resolved).toLowerCase();
    if (DANGEROUS_OPEN_EXTENSIONS.has(ext)) {
      const mainWindow = getMainWindow();
      const confirm = await dialog.showMessageBox(mainWindow || undefined, {
        type: 'warning',
        buttons: ['Run File', 'Cancel'],
        defaultId: 1,
        cancelId: 1,
        noLink: true,
        title: 'Security Confirmation',
        message: `Run "${path.basename(resolved)}"?`,
        detail:
          'This downloaded file is an executable or script that can modify your computer. Only proceed if you trust the source.',
      });
      if (confirm.response !== 0) {
        return false;
      }
    }

    const err = await shell.openPath(resolved);
    return !err;
  }

  async function saveTorrentConfig(nextInput) {
    const portNum = Number(nextInput?.port);
    const rawHost = typeof nextInput?.host === 'string' ? nextInput.host.trim() : '';
    const safeHost = isLoopbackHost(rawHost) ? rawHost : '127.0.0.1';
    const rawUsername = typeof nextInput?.username === 'string' ? nextInput.username.trim() : '';
    const rawPassword =
      typeof nextInput?.password === 'string' && nextInput.password.length > 0
        ? nextInput.password
        : torrentConfig.password;
    const rawApiKey =
      typeof nextInput?.apiKey === 'string' && nextInput.apiKey.length > 0
        ? nextInput.apiKey.trim()
        : torrentConfig.apiKey;

    if (
      hasHeaderControlChars(rawUsername) ||
      hasHeaderControlChars(rawPassword) ||
      hasHeaderControlChars(rawApiKey)
    ) {
      torrentError = 'Credentials contain invalid control or newline characters.';
      emitSnapshot(true);
      return getSnapshot();
    }

    const nextCfg = {
      enabled: Boolean(nextInput?.enabled),
      host: safeHost,
      port: Number.isFinite(portNum) && portNum > 0 && portNum <= 65535 ? Math.round(portNum) : 8080,
      username: rawUsername,
      password: rawPassword,
      apiKey: rawApiKey,
      pollIntervalMs: 1500,
    };

    torrentConfig = nextCfg;
    qbitCookie = '';
    torrentVersion = null;
    torrentWebApiVersion = null;
    torrentError = null;
    writePersistedTorrentConfig(nextCfg);
    syncTorrentPoller();
    if (nextCfg.enabled) {
      await pollTorrentWebUiOnce();
    }
    emitSnapshot(true);
    return getSnapshot();
  }

  function registerIpc(ipcMain, isTrustedSender) {
    ipcMain.handle('downloads:get-state', (event) => {
      if (!isTrustedSender(event)) return null;
      return getSnapshot();
    });

    ipcMain.handle('downloads:start', async (event, payload) => {
      if (!isTrustedSender(event)) return null;
      return startDownload(payload);
    });

    ipcMain.handle('downloads:add-torrent-file', async (event) => {
      if (!isTrustedSender(event)) return null;
      return addLocalTorrentFile();
    });

    ipcMain.handle('downloads:pause', async (event, id) => {
      if (!isTrustedSender(event)) return null;
      return pauseDownload(String(id || ''));
    });

    ipcMain.handle('downloads:resume', async (event, id) => {
      if (!isTrustedSender(event)) return null;
      return resumeDownload(String(id || ''));
    });

    ipcMain.handle('downloads:cancel', async (event, id) => {
      if (!isTrustedSender(event)) return null;
      return cancelDownload(String(id || ''), false);
    });

    ipcMain.handle('downloads:retry', async (event, id) => {
      if (!isTrustedSender(event)) return null;
      return retryDownload(String(id || ''));
    });

    ipcMain.handle('downloads:remove', async (event, id, deleteFiles) => {
      if (!isTrustedSender(event)) return null;
      return removeTask(String(id || ''), Boolean(deleteFiles));
    });

    ipcMain.handle('downloads:clear-completed', (event) => {
      if (!isTrustedSender(event)) return null;
      return clearCompleted();
    });

    ipcMain.handle('downloads:choose-folder', async (event) => {
      if (!isTrustedSender(event)) return null;
      return chooseDownloadFolder();
    });

    ipcMain.handle('downloads:open-folder', async (event, id) => {
      if (!isTrustedSender(event)) return false;
      return openFolder(id ? String(id) : '');
    });

    ipcMain.handle('downloads:open-file', async (event, id) => {
      if (!isTrustedSender(event)) return false;
      return openFile(String(id || ''));
    });

    ipcMain.handle('downloads:open-external', async (event, rawUrl) => {
      if (!isTrustedSender(event)) return false;
      const clean = validateDownloadUrl(rawUrl);
      if (!clean) return false;
      await shell.openExternal(clean);
      return true;
    });

    ipcMain.handle('downloads:detect-torrent', async (event) => {
      if (!isTrustedSender(event)) return null;
      return detectInstalledQbit();
    });

    ipcMain.handle('downloads:save-torrent-config', async (event, cfg) => {
      if (!isTrustedSender(event)) return null;
      return saveTorrentConfig(cfg);
    });

    ipcMain.handle('downloads:test-torrent-connection', async (event, cfg) => {
      if (!isTrustedSender(event)) return null;
      return testTorrentConnection(cfg);
    });
  }

  function init() {
    readPersistedTorrentConfig();
    readPersistedTasks();
    registerGlobalWillDownload();
    syncTorrentPoller();
  }

  function shutdown() {
    isShuttingDown = true;
    if (torrentPollTimer) {
      clearInterval(torrentPollTimer);
      torrentPollTimer = null;
    }
    if (pendingEmitTimer) {
      clearTimeout(pendingEmitTimer);
      pendingEmitTimer = null;
    }
    if (pendingDiskPersistTimer) {
      clearTimeout(pendingDiskPersistTimer);
      pendingDiskPersistTimer = null;
    }
    for (const controller of activeHttpControllers.values()) {
      controller.abort('paused');
    }
    activeHttpControllers.clear();
    for (const entry of activeMegaStreams.values()) {
      entry.abortFlag.paused = true;
      try {
        entry.stream?.destroy();
      } catch {
        // ignore
      }
    }
    activeMegaStreams.clear();
    persistTasksToDisk(true);
  }

  return {
    init,
    shutdown,
    registerIpc,
    getSnapshot,
    testTorrentConnection,
    setPerformanceConfig,
    onWindowHidden,
    onWindowShown,
    getRuntimeStats,
  };
}

module.exports = {
  createDownloadManager,
  isPrivateOrLoopbackHostname,
  isSafeRemoteDownloadUrl,
  isPathInsideDir,
  isValidInfoHash,
  buildMultipartFormBody,
  scrubSensitiveText,
};
