const fs = require('fs');
const fsp = fs.promises;
const path = require('path');
const https = require('https');
const dns = require('dns').promises;
const netTcp = require('net');
const { dialog } = require('electron');

const DEFAULT_DB_FEED_URL = 'https://raw.githubusercontent.com/secretarea1337/secretarea-desktop/main/hardware-db.json';
const TRUSTED_DB_FEED_HOSTS = new Set([
  'raw.githubusercontent.com',
  'github.com',
  'objects.githubusercontent.com',
  'www.secretarea.site',
  'secretarea.site',
]);
const ALLOWED_CATEGORIES = new Set(['cpu', 'gpu', 'ram', 'storage', 'chipset_platform', 'network']);
const FORBIDDEN_IDS = new Set(['__proto__', 'constructor', 'prototype']);

function isTrustedFeedHost(rawUrl) {
  try {
    const parsed = new URL(String(rawUrl || '').trim());
    return TRUSTED_DB_FEED_HOSTS.has(parsed.hostname.toLowerCase());
  } catch {
    return false;
  }
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

function isSafeRemoteHttpsFeedUrl(rawUrl) {
  if (typeof rawUrl !== 'string') return false;
  const trimmed = rawUrl.trim();
  if (!trimmed || trimmed.length > 2048 || /[\x00-\x1f\x7f]/.test(trimmed)) return false;
  try {
    const parsed = new URL(trimmed);
    if (parsed.protocol !== 'https:') return false;
    if (parsed.username || parsed.password) return false;
    if (!parsed.hostname || isPrivateOrLoopbackHostname(parsed.hostname)) return false;
    return true;
  } catch {
    return false;
  }
}

function isSafeMatchPattern(pat) {
  if (typeof pat !== 'string') return false;
  const trimmed = pat.trim();
  if (!trimmed || trimmed.length > 160) return false;
  // Reject obvious catastrophic backtracking constructs
  if (/(\+|\*|\{)\s*\)(\+|\*|\{)/.test(trimmed)) return false;
  try {
    // eslint-disable-next-line no-new
    new RegExp(trimmed, 'i');
    return true;
  } catch {
    return false;
  }
}

function validateHardwareDbPayload(raw) {
  if (!raw || typeof raw !== 'object') {
    return { valid: false, error: 'Database payload must be a JSON object.' };
  }
  const schemaVersion = Number(raw.schemaVersion);
  if (!Number.isFinite(schemaVersion) || schemaVersion < 1) {
    return { valid: false, error: 'Missing or invalid schemaVersion (>= 1 required).' };
  }
  if (typeof raw.dbVersion !== 'string' || !raw.dbVersion.trim()) {
    return { valid: false, error: 'Missing dbVersion string.' };
  }
  if (!Array.isArray(raw.entries) || raw.entries.length === 0) {
    return { valid: false, error: 'Database entries array must contain at least 1 valid entry.' };
  }
  if (raw.entries.length > 5000) {
    return { valid: false, error: 'Database entries exceed maximum safe limit of 5000.' };
  }
  const cleanEntries = [];
  const seenIds = new Set();
  for (let i = 0; i < raw.entries.length; i++) {
    const item = raw.entries[i];
    if (!item || typeof item !== 'object') continue;
    if (typeof item.id !== 'string' || !item.id.trim()) continue;
    const trimmedId = item.id.trim();
    if (FORBIDDEN_IDS.has(trimmedId) || seenIds.has(trimmedId)) continue;
    if (!ALLOWED_CATEGORIES.has(item.category)) continue;
    if (typeof item.family !== 'string' || !item.family.trim()) continue;
    if (!Array.isArray(item.matchPatterns) || item.matchPatterns.length === 0) continue;
    const safePatterns = item.matchPatterns
      .filter((p) => isSafeMatchPattern(p))
      .map((p) => p.trim())
      .slice(0, 32);
    if (safePatterns.length === 0) continue;
    const releaseYear = Number(item.releaseYear);
    const tierScore = Number(item.tierScore);
    const suit2030 = Number(item.suitability2030Score ?? 50);
    if (!Number.isFinite(releaseYear) || releaseYear < 1995 || releaseYear > 2040 || !Number.isFinite(tierScore)) continue;

    seenIds.add(trimmedId);
    cleanEntries.push({
      id: trimmedId,
      category: item.category,
      vendor: typeof item.vendor === 'string' ? item.vendor.trim() : 'Generic',
      family: item.family.trim(),
      generation: typeof item.generation === 'string' ? item.generation.trim() : 'Standard',
      architecture: typeof item.architecture === 'string' ? item.architecture.trim() : 'Unknown',
      matchPatterns: safePatterns,
      releaseYear: Math.round(releaseYear),
      tierScore: Math.max(1, Math.min(1000, Math.round(tierScore))),
      specsSummary: typeof item.specsSummary === 'string' ? item.specsSummary.trim() : '',
      supportedTechnologies: Array.isArray(item.supportedTechnologies)
        ? item.supportedTechnologies.filter((x) => typeof x === 'string')
        : [],
      driverSupportStatus:
        item.driverSupportStatus === 'legacy_security' || item.driverSupportStatus === 'eol'
          ? item.driverSupportStatus
          : 'active',
      limitations: Array.isArray(item.limitations)
        ? item.limitations.filter((x) => typeof x === 'string')
        : [],
      recommendedSuccessor:
        typeof item.recommendedSuccessor === 'string' ? item.recommendedSuccessor.trim() : null,
      suitability2030Score: Math.max(0, Math.min(100, Math.round(Number.isFinite(suit2030) ? suit2030 : 50))),
    });
  }

  if (cleanEntries.length === 0) {
    return { valid: false, error: 'No valid hardware definitions passed schema verification.' };
  }

  return {
    valid: true,
    payload: {
      schemaVersion: Math.round(schemaVersion),
      dbVersion: raw.dbVersion.trim(),
      lastUpdatedAt:
        typeof raw.lastUpdatedAt === 'string' && raw.lastUpdatedAt.trim()
          ? raw.lastUpdatedAt.trim()
          : new Date().toISOString(),
      sourceLabel:
        typeof raw.sourceLabel === 'string' && raw.sourceLabel.trim()
          ? raw.sourceLabel.trim()
          : 'Verified Hardware Feed',
      entries: cleanEntries,
    },
  };
}

async function assertHostnameResolvesPublic(hostname) {
  if (netTcp.isIP(hostname)) {
    if (isPrivateOrLoopbackHostname(hostname)) {
      throw new Error('Blocked update feed pointing to private or loopback address.');
    }
    return;
  }
  try {
    const records = await dns.lookup(hostname, { all: true });
    for (const rec of records) {
      if (rec && rec.address && isPrivateOrLoopbackHostname(rec.address)) {
        throw new Error('Blocked update feed resolving to private or loopback address.');
      }
    }
  } catch (err) {
    if (err instanceof Error && err.message.startsWith('Blocked update feed')) {
      throw err;
    }
    // Allow https.get to raise standard network/DNS error if resolution fails
  }
}

function requestHttpsOnce(parsed, timeoutMs) {
  return new Promise((resolve, reject) => {
    const req = https.get(
      parsed,
      {
        timeout: timeoutMs,
        headers: {
          'User-Agent': 'SecretArea-HardwareDB/1.0',
          Accept: 'application/json',
        },
      },
      (res) => {
        const status = res.statusCode || 500;
        if (status >= 300 && status < 400 && res.headers.location) {
          res.resume();
          resolve({ redirectLocation: String(res.headers.location), status });
          return;
        }
        if (status >= 400) {
          res.resume();
          reject(new Error(`Server responded with HTTP ${status}`));
          return;
        }
        const chunks = [];
        let total = 0;
        res.on('data', (chunk) => {
          total += chunk.length;
          if (total > 4 * 1024 * 1024) {
            req.destroy();
            reject(new Error('Hardware database payload exceeded 4 MB safety limit.'));
            return;
          }
          chunks.push(chunk);
        });
        res.on('end', () => {
          try {
            const text = Buffer.concat(chunks).toString('utf8');
            resolve({ json: JSON.parse(text) });
          } catch {
            reject(new Error('Feed returned invalid JSON syntax.'));
          }
        });
      }
    );
    req.on('timeout', () => {
      req.destroy();
      reject(new Error('Hardware database update check timed out.'));
    });
    req.on('error', (err) => {
      reject(err);
    });
  });
}

async function fetchHttpsJson(urlString, timeoutMs = 8000, maxRedirects = 5) {
  let currentUrl = String(urlString || '').trim();
  for (let hop = 0; hop <= maxRedirects; hop += 1) {
    if (!isSafeRemoteHttpsFeedUrl(currentUrl)) {
      throw new Error('Blocked unsafe update feed URL: must be a public HTTPS endpoint.');
    }
    const parsed = new URL(currentUrl);
    await assertHostnameResolvesPublic(parsed.hostname);
    const outcome = await requestHttpsOnce(parsed, timeoutMs);
    if (outcome.redirectLocation) {
      let nextUrl;
      try {
        nextUrl = new URL(outcome.redirectLocation, parsed).toString();
      } catch {
        throw new Error('Invalid redirect location returned by update server.');
      }
      if (!isSafeRemoteHttpsFeedUrl(nextUrl)) {
        throw new Error('Blocked unsafe redirect to private or non-HTTPS address.');
      }
      currentUrl = nextUrl;
      continue;
    }
    return outcome.json;
  }
  throw new Error('Too many redirects while checking hardware database feed.');
}

function readBundledBaselineInfo() {
  const candidates = [
    path.resolve(__dirname, '../../hardware-db.json'),
    path.resolve(process.cwd(), 'hardware-db.json'),
    process.resourcesPath ? path.join(process.resourcesPath, 'hardware-db.json') : null,
  ].filter(Boolean);
  for (const p of candidates) {
    try {
      if (!fs.existsSync(p)) continue;
      const parsed = JSON.parse(fs.readFileSync(p, 'utf8'));
      const checked = validateHardwareDbPayload(parsed);
      if (checked.valid) {
        return {
          count: checked.payload.entries.length,
          ids: new Set(checked.payload.entries.map((e) => e.id)),
          dbVersion: checked.payload.dbVersion,
          lastUpdatedAt: checked.payload.lastUpdatedAt,
          sourceLabel: 'Bundled Verified Offline Baseline',
        };
      }
    } catch {
      // try next candidate
    }
  }
  return {
    count: 40,
    ids: new Set(),
    dbVersion: '2026.11-baseline',
    lastUpdatedAt: '2026-11-25T00:00:00.000Z',
    sourceLabel: 'Bundled Verified Offline Baseline',
  };
}

function createHardwareDbManager({ getMainWindow, getUserDataPath, bundledBaselineCount }) {
  const baselineInfo = readBundledBaselineInfo();
  const effectiveBaselineCount =
    typeof bundledBaselineCount === 'number' && bundledBaselineCount > 0
      ? bundledBaselineCount
      : baselineInfo.count;

  function computeMergedEntryCount(entries) {
    if (!Array.isArray(entries) || entries.length === 0) return effectiveBaselineCount;
    if (baselineInfo.ids.size === 0) return effectiveBaselineCount + entries.length;
    const merged = new Set(baselineInfo.ids);
    for (const item of entries) {
      if (item && item.id) merged.add(item.id);
    }
    return merged.size;
  }

  function getPaths() {
    const dir = path.join(getUserDataPath(), 'hardware-db');
    return {
      dir,
      activeFile: path.join(dir, 'hardware-db.json'),
      backupFile: path.join(dir, 'hardware-db-backup.json'),
      metaFile: path.join(dir, 'hardware-db-meta.json'),
    };
  }

  let state = {
    dbVersion: baselineInfo.dbVersion,
    lastUpdatedAt: baselineInfo.lastUpdatedAt,
    lastCheckedAt: null,
    updateFeedUrl: DEFAULT_DB_FEED_URL,
    entryCount: effectiveBaselineCount,
    hasBackup: false,
    lastError: null,
    sourceLabel: baselineInfo.sourceLabel,
    customEntriesCount: 0,
  };
  let customEntries = [];
  let initialized = false;

  async function ensureLoaded() {
    if (initialized) return;
    initialized = true;
    const paths = getPaths();
    try {
      await fsp.mkdir(paths.dir, { recursive: true });
      if (fs.existsSync(paths.metaFile)) {
        const meta = JSON.parse(await fsp.readFile(paths.metaFile, 'utf8'));
        if (meta && typeof meta === 'object') {
          state = {
            ...state,
            dbVersion: typeof meta.dbVersion === 'string' ? meta.dbVersion : state.dbVersion,
            lastUpdatedAt: typeof meta.lastUpdatedAt === 'string' ? meta.lastUpdatedAt : state.lastUpdatedAt,
            lastCheckedAt: typeof meta.lastCheckedAt === 'string' ? meta.lastCheckedAt : null,
            updateFeedUrl:
              typeof meta.updateFeedUrl === 'string' && isSafeRemoteHttpsFeedUrl(meta.updateFeedUrl)
                ? meta.updateFeedUrl.trim()
                : DEFAULT_DB_FEED_URL,
            sourceLabel: typeof meta.sourceLabel === 'string' ? meta.sourceLabel : state.sourceLabel,
          };
        }
      }
      if (fs.existsSync(paths.activeFile)) {
        const raw = JSON.parse(await fsp.readFile(paths.activeFile, 'utf8'));
        const checked = validateHardwareDbPayload(raw);
        if (checked.valid) {
          customEntries = checked.payload.entries;
          state.dbVersion = checked.payload.dbVersion;
          state.lastUpdatedAt = checked.payload.lastUpdatedAt;
          state.sourceLabel = checked.payload.sourceLabel;
          state.customEntriesCount = customEntries.length;
          state.entryCount = computeMergedEntryCount(customEntries);
          if (!fs.existsSync(paths.backupFile)) {
            await fsp.writeFile(
              paths.backupFile,
              JSON.stringify(
                {
                  schemaVersion: 1,
                  isBaselineRestore: true,
                  dbVersion: baselineInfo.dbVersion,
                  lastUpdatedAt: baselineInfo.lastUpdatedAt,
                  sourceLabel: baselineInfo.sourceLabel,
                  entries: [],
                },
                null,
                2
              ),
              'utf8'
            );
          }
        }
      }
      state.hasBackup = fs.existsSync(paths.backupFile);
    } catch {
      // Keep bundled baseline intact cleanly
    }
  }

  async function saveMeta() {
    const paths = getPaths();
    await fsp.mkdir(paths.dir, { recursive: true });
    await fsp.writeFile(
      paths.metaFile,
      JSON.stringify(
        {
          dbVersion: state.dbVersion,
          lastUpdatedAt: state.lastUpdatedAt,
          lastCheckedAt: state.lastCheckedAt,
          updateFeedUrl: state.updateFeedUrl,
          sourceLabel: state.sourceLabel,
        },
        null,
        2
      ),
      'utf8'
    );
  }

  async function applyValidatedPayload(payload) {
    const paths = getPaths();
    await fsp.mkdir(paths.dir, { recursive: true });
    if (fs.existsSync(paths.activeFile)) {
      await fsp.copyFile(paths.activeFile, paths.backupFile);
    } else {
      // First update/import: record bundled baseline sentinel so user can roll back cleanly
      await fsp.writeFile(
        paths.backupFile,
        JSON.stringify(
          {
            schemaVersion: 1,
            isBaselineRestore: true,
            dbVersion: baselineInfo.dbVersion,
            lastUpdatedAt: baselineInfo.lastUpdatedAt,
            sourceLabel: baselineInfo.sourceLabel,
            entries: [],
          },
          null,
          2
        ),
        'utf8'
      );
    }
    await fsp.writeFile(paths.activeFile, JSON.stringify(payload, null, 2), 'utf8');
    customEntries = payload.entries;
    state = {
      ...state,
      dbVersion: payload.dbVersion,
      lastUpdatedAt: payload.lastUpdatedAt,
      lastCheckedAt: new Date().toISOString(),
      sourceLabel: payload.sourceLabel,
      customEntriesCount: customEntries.length,
      entryCount: computeMergedEntryCount(customEntries),
      hasBackup: fs.existsSync(paths.backupFile),
      lastError: null,
    };
    await saveMeta();
  }

  async function getState() {
    await ensureLoaded();
    return { ...state };
  }

  async function getEntries() {
    await ensureLoaded();
    return [...customEntries];
  }

  async function checkUpdate(feedUrlOverride, options = {}) {
    await ensureLoaded();
    const hasOverride = typeof feedUrlOverride === 'string' && feedUrlOverride.trim().length > 0;
    const candidateUrl = hasOverride ? feedUrlOverride.trim() : state.updateFeedUrl || DEFAULT_DB_FEED_URL;

    if (!isSafeRemoteHttpsFeedUrl(candidateUrl)) {
      const errMsg = 'Blocked unsafe update feed URL: must be a public HTTPS endpoint.';
      state.lastError = errMsg;
      return { updated: false, state: { ...state }, error: errMsg };
    }

    if (candidateUrl !== DEFAULT_DB_FEED_URL && !options?.allowCustomFeed) {
      const errMsg = 'Explicit user consent is required to fetch from a custom hardware database feed URL.';
      state.lastError = errMsg;
      return { updated: false, state: { ...state }, error: errMsg };
    }

    state.updateFeedUrl = candidateUrl;
    state.lastCheckedAt = new Date().toISOString();

    try {
      const raw = await fetchHttpsJson(candidateUrl);
      const checked = validateHardwareDbPayload(raw);
      if (!checked.valid) {
        state.lastError = `Schema validation rejected update: ${checked.error}`;
        await saveMeta();
        return { updated: false, state: { ...state }, error: state.lastError };
      }
      await applyValidatedPayload(checked.payload);
      return { updated: true, state: { ...state }, error: null };
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      state.lastError = msg.includes('HTTP 404')
        ? 'No remote hardware-db.json release feed published at URL yet; continuing with verified local offline database.'
        : msg;
      await saveMeta();
      return { updated: false, state: { ...state }, error: state.lastError };
    }
  }

  async function importPayloadObject(parsed, sourceLabel = 'Local Imported JSON') {
    await ensureLoaded();
    const checked = validateHardwareDbPayload(parsed);
    if (!checked.valid) {
      state.lastError = checked.error;
      return { imported: false, canceled: false, state: { ...state }, error: checked.error };
    }
    await applyValidatedPayload({
      ...checked.payload,
      sourceLabel,
    });
    return { imported: true, canceled: false, state: { ...state }, error: null };
  }

  async function importFromFile() {
    await ensureLoaded();
    const win = getMainWindow();
    const res = await dialog.showOpenDialog(win || undefined, {
      title: 'Import Hardware Generation Database JSON',
      properties: ['openFile'],
      filters: [{ name: 'JSON Database', extensions: ['json'] }],
    });
    if (res.canceled || !res.filePaths || res.filePaths.length === 0) {
      return { imported: false, canceled: true, state: { ...state }, error: null };
    }

    try {
      const text = await fsp.readFile(res.filePaths[0], 'utf8');
      const parsed = JSON.parse(text);
      return await importPayloadObject(parsed, `Local Imported JSON (${path.basename(res.filePaths[0])})`);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to read JSON file.';
      state.lastError = msg;
      return { imported: false, canceled: false, state: { ...state }, error: msg };
    }
  }

  async function rollbackToBackup() {
    await ensureLoaded();
    const paths = getPaths();
    if (!fs.existsSync(paths.backupFile)) {
      if (fs.existsSync(paths.activeFile)) {
        await fsp.unlink(paths.activeFile).catch(() => {});
        customEntries = [];
        state.dbVersion = baselineInfo.dbVersion;
        state.lastUpdatedAt = baselineInfo.lastUpdatedAt;
        state.sourceLabel = `${baselineInfo.sourceLabel} (Rolled Back)`;
        state.customEntriesCount = 0;
        state.entryCount = effectiveBaselineCount;
        state.hasBackup = false;
        state.lastError = null;
        await saveMeta();
        return { ok: true, state: { ...state }, error: null };
      }
      return { ok: false, state: { ...state }, error: 'No backup database exists.' };
    }
    try {
      const parsed = JSON.parse(await fsp.readFile(paths.backupFile, 'utf8'));
      if (parsed && parsed.isBaselineRestore === true) {
        if (fs.existsSync(paths.activeFile)) {
          await fsp.unlink(paths.activeFile).catch(() => {});
        }
        await fsp.unlink(paths.backupFile).catch(() => {});
        customEntries = [];
        state.dbVersion = typeof parsed.dbVersion === 'string' ? parsed.dbVersion : baselineInfo.dbVersion;
        state.lastUpdatedAt =
          typeof parsed.lastUpdatedAt === 'string' ? parsed.lastUpdatedAt : baselineInfo.lastUpdatedAt;
        state.sourceLabel = `${baselineInfo.sourceLabel} (Rolled Back)`;
        state.customEntriesCount = 0;
        state.entryCount = effectiveBaselineCount;
        state.hasBackup = false;
        state.lastError = null;
        await saveMeta();
        return { ok: true, state: { ...state }, error: null };
      }

      const checked = validateHardwareDbPayload(parsed);
      if (!checked.valid) {
        return { ok: false, state: { ...state }, error: checked.error };
      }
      await fsp.copyFile(paths.backupFile, paths.activeFile);
      // Preserve a baseline restore sentinel so subsequent rollback still reaches bundled baseline
      await fsp.writeFile(
        paths.backupFile,
        JSON.stringify(
          {
            schemaVersion: 1,
            isBaselineRestore: true,
            dbVersion: baselineInfo.dbVersion,
            lastUpdatedAt: baselineInfo.lastUpdatedAt,
            sourceLabel: baselineInfo.sourceLabel,
            entries: [],
          },
          null,
          2
        ),
        'utf8'
      );
      customEntries = checked.payload.entries;
      state.dbVersion = checked.payload.dbVersion;
      state.lastUpdatedAt = checked.payload.lastUpdatedAt;
      state.sourceLabel = `${checked.payload.sourceLabel} (Rolled Back)`;
      state.customEntriesCount = customEntries.length;
      state.entryCount = computeMergedEntryCount(customEntries);
      state.hasBackup = fs.existsSync(paths.backupFile);
      state.lastError = null;
      await saveMeta();
      return { ok: true, state: { ...state }, error: null };
    } catch (err) {
      return { ok: false, state: { ...state }, error: err instanceof Error ? err.message : String(err) };
    }
  }

  return {
    getState,
    getEntries,
    checkUpdate,
    importFromFile,
    importPayloadObject,
    rollbackToBackup,
  };
}

module.exports = {
  DEFAULT_DB_FEED_URL,
  TRUSTED_DB_FEED_HOSTS,
  isTrustedFeedHost,
  readBundledBaselineInfo,
  createHardwareDbManager,
  validateHardwareDbPayload,
  isSafeRemoteHttpsFeedUrl,
  isPrivateOrLoopbackHostname,
};
