let electronApi = {};
try {
  electronApi = require('electron');
} catch {
  electronApi = {};
}
const { app, net, shell } = electronApi;
const crypto = require('crypto');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { execFile } = require('child_process');

const GITHUB_RELEASES_LATEST_API = 'https://api.github.com/repos/qbittorrent/qBittorrent/releases/latest';
const GITHUB_RELEASES_LIST_API = 'https://api.github.com/repos/qbittorrent/qBittorrent/releases?per_page=10';
const OFFICIAL_QBIT_DOWNLOAD_URL = 'https://www.qbittorrent.org/download';
const SETUP_USER_AGENT = 'SecretArea-Desktop/1.0 (+https://github.com/secretarea1337/secretarea-desktop)';

const ALLOWED_DOWNLOAD_SUFFIXES = [
  'api.github.com',
  'github.com',
  'objects.githubusercontent.com',
  'release-assets.githubusercontent.com',
  'qbittorrent.org',
  'sourceforge.net',
  'fosshub.com',
];

function isAllowedOfficialUrl(rawUrl) {
  if (typeof rawUrl !== 'string' || !rawUrl.trim()) return false;
  try {
    const parsed = new URL(rawUrl.trim());
    if (parsed.protocol !== 'https:') return false;
    const host = parsed.hostname.toLowerCase();
    return ALLOWED_DOWNLOAD_SUFFIXES.some(
      (allowed) => host === allowed || host.endsWith(`.${allowed}`)
    );
  } catch {
    return false;
  }
}

function normalizeVersionString(raw) {
  const str = String(raw || '').trim();
  if (!str) return '';
  const match = str.match(/(\d+(?:\.\d+){1,3})/);
  if (!match || !match[1]) return '';
  const parts = match[1].split('.').map((n) => parseInt(n, 10) || 0);
  // Drop trailing 4th ".0" build segment when standard 3-part Windows FileVersion (e.g., 5.3.0.0 -> 5.3.0)
  while (parts.length > 3 && parts[parts.length - 1] === 0) {
    parts.pop();
  }
  return parts.join('.');
}

function compareSemver(a, b) {
  const normA = normalizeVersionString(a);
  const normB = normalizeVersionString(b);
  if (!normA && !normB) return 0;
  if (!normA) return -1;
  if (!normB) return 1;
  const pa = normA.split('.').map((n) => parseInt(n, 10) || 0);
  const pb = normB.split('.').map((n) => parseInt(n, 10) || 0);
  const len = Math.max(pa.length, pb.length);
  for (let i = 0; i < len; i++) {
    const va = pa[i] || 0;
    const vb = pb[i] || 0;
    if (va > vb) return 1;
    if (va < vb) return -1;
  }
  return 0;
}

function evaluateVersionAction({ installed, installedVersion, latestVersion, isRunning }) {
  if (!installed) {
    return { actionNeeded: 'install_required', caseCode: 'A' };
  }
  const latestNorm = normalizeVersionString(latestVersion);
  const instNorm = normalizeVersionString(installedVersion);
  if (!latestNorm) {
    return { actionNeeded: 'unknown_latest', caseCode: 'D' };
  }
  if (!instNorm) {
    return {
      actionNeeded: isRunning ? 'close_required_for_update' : 'update_available',
      caseCode: isRunning ? 'C' : 'B_OUTDATED',
    };
  }
  const cmp = compareSemver(instNorm, latestNorm);
  if (cmp === 0) {
    return { actionNeeded: 'up_to_date', caseCode: 'B_UP_TO_DATE' };
  }
  if (cmp > 0) {
    return { actionNeeded: 'newer_installed', caseCode: 'B_NEWER' };
  }
  return {
    actionNeeded: isRunning ? 'close_required_for_update' : 'update_available',
    caseCode: isRunning ? 'C' : 'B_OUTDATED',
  };
}

function parseSha256ForFile(text, fileName) {
  if (typeof text !== 'string' || !text.trim()) return null;
  const escapedName = String(fileName || '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  if (escapedName) {
    const lineSpecificRegex = new RegExp(
      `(?:([0-9a-fA-F]{64})[^\\r\\n]{0,160}${escapedName})|(?:${escapedName}[^\\r\\n]{0,160}([0-9a-fA-F]{64}))`,
      'i'
    );
    const match = text.match(lineSpecificRegex);
    if (match) {
      return (match[1] || match[2] || '').toLowerCase() || null;
    }
  }
  return null;
}

function parseDigestString(rawDigest) {
  const str = String(rawDigest || '').trim();
  const match = str.match(/^(?:sha256:)?([0-9a-fA-F]{64})$/i);
  return match && match[1] ? match[1].toLowerCase() : null;
}

function selectBestWindowsAsset(releaseJson) {
  if (!releaseJson || typeof releaseJson !== 'object') return null;
  if (releaseJson.draft || releaseJson.prerelease) return null;

  const version =
    normalizeVersionString(releaseJson.tag_name) || normalizeVersionString(releaseJson.name);
  if (!version) return null;

  const assets = Array.isArray(releaseJson.assets) ? releaseJson.assets : [];
  const x64SetupAssets = assets.filter((a) => {
    const name = String(a?.name || '');
    const url = String(a?.browser_download_url || '');
    return /^qbittorrent_.*_x64_setup\.exe$/i.test(name) && isAllowedOfficialUrl(url);
  });

  if (x64SetupAssets.length === 0) return null;

  // Prefer the standard libtorrent release over specialized lt12/lt20 variants when available
  const preferred =
    x64SetupAssets.find((a) => !/_lt\d+_/i.test(String(a.name || ''))) || x64SetupAssets[0];

  const assetName = String(preferred.name);
  const directDigest = parseDigestString(preferred.digest);
  const bodyDigest = parseSha256ForFile(String(releaseJson.body || ''), assetName);

  // Also check if release includes a checksum file asset (.sha256 / .txt)
  const checksumAsset = assets.find((a) => {
    const n = String(a?.name || '').toLowerCase();
    return (n.endsWith('.sha256') || n.includes('checksum') || n === 'sha256sums.txt') &&
      isAllowedOfficialUrl(String(a?.browser_download_url || ''));
  });

  return {
    version,
    tagName: String(releaseJson.tag_name || `release-${version}`),
    publishedAt: releaseJson.published_at ? String(releaseJson.published_at) : null,
    releaseUrl: isAllowedOfficialUrl(releaseJson.html_url)
      ? String(releaseJson.html_url)
      : 'https://github.com/qbittorrent/qBittorrent/releases/latest',
    assetName,
    assetUrl: String(preferred.browser_download_url),
    assetSizeBytes: Math.max(0, Number(preferred.size) || 0),
    expectedSha256: directDigest || bodyDigest || null,
    checksumAssetUrl: checksumAsset ? String(checksumAsset.browser_download_url) : null,
    source: 'github_api',
  };
}

function parseQbitIniWebUi(iniContent) {
  const result = {
    configFound: false,
    webUiEnabled: false,
    address: '127.0.0.1',
    port: 8080,
    username: 'admin',
    isLoopbackOnly: true,
  };
  if (typeof iniContent !== 'string' || !iniContent.trim()) {
    return result;
  }
  result.configFound = true;
  const lines = iniContent.split(/\r?\n/);
  let explicitAddress = '';

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#') || line.startsWith(';') || line.startsWith('[')) continue;
    const eqIdx = line.indexOf('=');
    if (eqIdx === -1) continue;
    const key = line.slice(0, eqIdx).trim();
    const val = line.slice(eqIdx + 1).trim();

    if (key === 'WebUI\\Enabled' || key === 'WebUI/Enabled') {
      result.webUiEnabled = val.toLowerCase() === 'true';
    } else if (key === 'WebUI\\Address' || key === 'WebUI/Address') {
      explicitAddress = val;
    } else if (key === 'WebUI\\Port' || key === 'WebUI/Port') {
      const p = parseInt(val, 10);
      if (Number.isFinite(p) && p > 0 && p <= 65535) {
        result.port = p;
      }
    } else if (key === 'WebUI\\Username' || key === 'WebUI/Username') {
      if (val) result.username = val;
    }
  }

  if (explicitAddress) {
    result.address = explicitAddress;
    const lowerAddr = explicitAddress.toLowerCase();
    result.isLoopbackOnly =
      lowerAddr === '127.0.0.1' || lowerAddr === 'localhost' || lowerAddr === '::1';
  } else {
    // qBittorrent defaults WebUI\Address to "*" (all interfaces) unless bound explicitly
    result.address = '*';
    result.isLoopbackOnly = false;
  }

  return result;
}

function isTrustedQbitPublisher(subject) {
  const s = String(subject || '').toLowerCase();
  if (!s) return false;
  return (
    s.includes('qbittorrent') ||
    s.includes('christophe dumez') ||
    s.includes('signpath') ||
    s.includes('sledgehammer')
  );
}

function generateStrongWebUiPassword(length = 16) {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%&*';
  const bytes = crypto.randomBytes(length);
  let out = '';
  for (let i = 0; i < length; i++) {
    out += alphabet[bytes[i] % alphabet.length];
  }
  return out;
}

function execFilePromise(cmd, args, options = {}) {
  return new Promise((resolve) => {
    execFile(
      cmd,
      args,
      {
        timeout: options.timeoutMs || 6000,
        windowsHide: true,
        maxBuffer: 2 * 1024 * 1024,
        env: options.env ? { ...process.env, ...options.env } : process.env,
      },
      (err, stdout, stderr) => {
        resolve({
          ok: !err,
          code: err && typeof err.code === 'number' ? err.code : err ? -1 : 0,
          stdout: String(stdout || '').trim(),
          stderr: String(stderr || '').trim(),
          error: err || null,
        });
      }
    );
  });
}

function createQbitSetupManager({
  getMainWindow,
  readSettings,
  writeSettings,
  getDownloadSnapshot,
  testTorrentConnection,
}) {
  let state = {
    stage: 'idle',
    actionNeeded: null,
    platformSupported: process.platform === 'win32',
    installed: false,
    installedVersion: null,
    executablePath: null,
    isRunning: false,
    latestRelease: null,
    releaseError: null,
    releaseErrorCode: null,
    downloadProgress: null,
    verification: null,
    webUiConfig: {
      iniPath: null,
      configFound: false,
      webUiEnabled: false,
      address: '127.0.0.1',
      port: 8080,
      username: 'admin',
      isLoopbackOnly: true,
    },
    webUiVerifiedConnected: false,
    error: null,
    statusMessage: '',
    officialDownloadUrl: OFFICIAL_QBIT_DOWNLOAD_URL,
    shouldPromptOnFirstLaunch: false,
    firstLaunchDismissed: false,
    lastCheckedAt: null,
  };

  let activeOperationAbort = null;
  let activeCheckPromise = null;
  let activeInstallPromise = null;

  function emitState() {
    const win = getMainWindow?.();
    if (win && !win.isDestroyed()) {
      win.webContents.send('qbit-setup:status', getState());
    }
  }

  function patchState(patch) {
    state = { ...state, ...patch };
    emitState();
  }

  function getState() {
    return {
      ...state,
      latestRelease: state.latestRelease ? { ...state.latestRelease } : null,
      downloadProgress: state.downloadProgress ? { ...state.downloadProgress } : null,
      verification: state.verification ? { ...state.verification } : null,
      webUiConfig: { ...state.webUiConfig },
    };
  }

  function getSetupCacheDir() {
    const dir = path.resolve(path.join(app.getPath('userData'), 'setup-cache'));
    fs.mkdirSync(dir, { recursive: true });
    return dir;
  }

  function safeRemoveFile(filePath) {
    try {
      const cacheDir = getSetupCacheDir();
      const resolved = path.resolve(filePath);
      if (resolved.startsWith(cacheDir + path.sep) && fs.existsSync(resolved)) {
        fs.unlinkSync(resolved);
      }
    } catch {
      // ignore temp cleanup failure
    }
  }

  function readPersistedSetupFlags() {
    const persisted = readSettings ? readSettings() : {};
    return {
      firstLaunchDismissed: Boolean(persisted.qbitSetupDismissed),
      completedOnce: Boolean(persisted.qbitSetupCompletedOnce),
    };
  }

  function writePersistedSetupFlags(patch) {
    const prev = readSettings ? readSettings() : {};
    if (writeSettings) {
      writeSettings({ ...prev, ...patch });
    }
  }

  function resolveQbitIniPath() {
    if (process.platform === 'win32') {
      const appData = process.env.APPDATA || path.join(os.homedir(), 'AppData', 'Roaming');
      const candidates = [
        path.join(appData, 'qBittorrent', 'qBittorrent.ini'),
        path.join(appData, 'qBittorrent', 'qBittorrent.conf'),
      ];
      for (const cand of candidates) {
        if (fs.existsSync(cand)) return cand;
      }
      return candidates[0];
    }
    const homeConf = path.join(os.homedir(), '.config', 'qBittorrent', 'qBittorrent.conf');
    return homeConf;
  }

  function inspectQbitWebUiConfig() {
    const iniPath = resolveQbitIniPath();
    if (!iniPath || !fs.existsSync(iniPath)) {
      return {
        iniPath: iniPath || null,
        configFound: false,
        webUiEnabled: false,
        address: '127.0.0.1',
        port: 8080,
        username: 'admin',
        isLoopbackOnly: true,
      };
    }
    try {
      const content = fs.readFileSync(iniPath, 'utf8');
      return {
        iniPath,
        ...parseQbitIniWebUi(content),
      };
    } catch {
      return {
        iniPath,
        configFound: false,
        webUiEnabled: false,
        address: '127.0.0.1',
        port: 8080,
        username: 'admin',
        isLoopbackOnly: true,
      };
    }
  }

  async function detectQbitProcessRunning() {
    if (process.platform === 'win32') {
      const res = await execFilePromise(
        'tasklist.exe',
        ['/FI', 'IMAGENAME eq qbittorrent.exe', '/FO', 'CSV', '/NH'],
        { timeoutMs: 3500 }
      );
      if (res.ok && res.stdout.toLowerCase().includes('qbittorrent.exe')) {
        return true;
      }
      return false;
    }
    const res = await execFilePromise('pgrep', ['-x', 'qbittorrent'], { timeoutMs: 2500 });
    return res.ok && Boolean(res.stdout);
  }

  async function inspectWindowsQbitInstall() {
    let executablePath = null;
    let registryVersion = null;

    // 1. Check standard Windows Uninstall Registry keys + command keys for qBittorrent
    const psDetectScript = [
      '$ErrorActionPreference = "SilentlyContinue";',
      '$roots = @(',
      '  "HKLM:\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\Uninstall\\*",',
      '  "HKLM:\\SOFTWARE\\WOW6432Node\\Microsoft\\Windows\\CurrentVersion\\Uninstall\\*",',
      '  "HKCU:\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\Uninstall\\*"',
      ');',
      '$entry = Get-ItemProperty $roots | Where-Object { $_.DisplayName -like "*qBittorrent*" } | Select-Object -First 1 DisplayVersion, InstallLocation, UninstallString;',
      '$qbitReg = Get-ItemProperty "HKLM:\\SOFTWARE\\qBittorrent" | Select-Object -First 1 "(default)", InstallLocation;',
      '$magnetCmd = (Get-ItemProperty "HKCU:\\Software\\Classes\\magnet\\shell\\open\\command")."(default)";',
      '$classCmd = (Get-ItemProperty "HKLM:\\SOFTWARE\\Classes\\qBittorrent\\shell\\open\\command")."(default)";',
      '@{ entry = $entry; qbitReg = $qbitReg; magnetCmd = $magnetCmd; classCmd = $classCmd } | ConvertTo-Json -Depth 4 -Compress',
    ].join(' ');

    const regRes = await execFilePromise(
      'powershell.exe',
      ['-NoProfile', '-NonInteractive', '-ExecutionPolicy', 'Bypass', '-Command', psDetectScript],
      { timeoutMs: 5000 }
    );

    if (regRes.ok && regRes.stdout) {
      try {
        const parsed = JSON.parse(regRes.stdout);
        if (parsed?.entry?.DisplayVersion) {
          registryVersion = normalizeVersionString(parsed.entry.DisplayVersion) || null;
        }
        const rawCandidates = [];
        if (parsed?.entry?.InstallLocation) {
          rawCandidates.push(path.join(String(parsed.entry.InstallLocation), 'qbittorrent.exe'));
        }
        if (parsed?.qbitReg?.InstallLocation) {
          rawCandidates.push(path.join(String(parsed.qbitReg.InstallLocation), 'qbittorrent.exe'));
        }
        for (const cmdVal of [parsed?.magnetCmd, parsed?.classCmd, parsed?.entry?.UninstallString]) {
          const str = String(cmdVal || '');
          const exeMatch =
            str.match(/"([^"]*qbittorrent\.exe)"/i) ||
            str.match(/([A-Za-z]:\\[^\r\n"]*qbittorrent\.exe)/i);
          if (exeMatch && exeMatch[1]) {
            rawCandidates.push(exeMatch[1]);
          } else if (str.toLowerCase().includes('qbittorrent') && str.toLowerCase().includes('uninst.exe')) {
            const uninstMatch =
              str.match(/"([^"]*uninst\.exe)"/i) || str.match(/([A-Za-z]:\\[^\r\n"]*uninst\.exe)/i);
            if (uninstMatch && uninstMatch[1]) {
              rawCandidates.push(path.join(path.dirname(uninstMatch[1]), 'qbittorrent.exe'));
            }
          }
        }
        for (const cand of rawCandidates) {
          if (cand && fs.existsSync(cand)) {
            executablePath = cand;
            break;
          }
        }
      } catch {
        // continue to filesystem scan
      }
    }

    // 2. Fallback to standard 64-bit / 32-bit / local installation paths
    if (!executablePath) {
      const localAppData = process.env.LOCALAPPDATA || '';
      const programFiles = process.env.ProgramFiles || 'C:\\Program Files';
      const programFilesX86 = process.env['ProgramFiles(x86)'] || 'C:\\Program Files (x86)';
      const fallbackPaths = [
        path.join(programFiles, 'qBittorrent', 'qbittorrent.exe'),
        path.join(programFilesX86, 'qBittorrent', 'qbittorrent.exe'),
        path.join(localAppData, 'Programs', 'qBittorrent', 'qbittorrent.exe'),
      ];
      for (const cand of fallbackPaths) {
        if (cand && fs.existsSync(cand)) {
          executablePath = cand;
          break;
        }
      }
    }

    // 3. Extract accurate PE VersionInfo from qbittorrent.exe
    let exeVersion = null;
    if (executablePath && fs.existsSync(executablePath)) {
      const verRes = await execFilePromise(
        'powershell.exe',
        [
          '-NoProfile',
          '-NonInteractive',
          '-ExecutionPolicy',
          'Bypass',
          '-Command',
          '$v = (Get-Item -LiteralPath $env:QBIT_EXE_PATH).VersionInfo; @{ ProductVersion = $v.ProductVersion; FileVersion = $v.FileVersion } | ConvertTo-Json -Compress',
        ],
        { timeoutMs: 4500, env: { QBIT_EXE_PATH: executablePath } }
      );
      if (verRes.ok && verRes.stdout) {
        try {
          const parsedVer = JSON.parse(verRes.stdout);
          exeVersion =
            normalizeVersionString(parsedVer?.ProductVersion) ||
            normalizeVersionString(parsedVer?.FileVersion) ||
            null;
        } catch {
          // ignore parse error
        }
      }
    }

    const isRunning = await detectQbitProcessRunning();
    return {
      installed: Boolean(executablePath || registryVersion),
      executablePath,
      installedVersion: exeVersion || registryVersion || null,
      isRunning,
    };
  }

  async function inspectUnixQbitInstall() {
    const candidates = [
      '/usr/bin/qbittorrent',
      '/usr/local/bin/qbittorrent',
      '/Applications/qbittorrent.app',
    ];
    let executablePath = null;
    for (const cand of candidates) {
      if (fs.existsSync(cand)) {
        executablePath = cand;
        break;
      }
    }
    let installedVersion = null;
    if (executablePath && process.platform === 'linux') {
      const out = await execFilePromise(executablePath, ['--version'], { timeoutMs: 2500 });
      if (out.ok && out.stdout) {
        installedVersion = normalizeVersionString(out.stdout) || null;
      }
    }
    const isRunning = await detectQbitProcessRunning();
    return {
      installed: Boolean(executablePath),
      executablePath,
      installedVersion,
      isRunning,
    };
  }

  async function inspectInstalledState() {
    const base =
      process.platform === 'win32'
        ? await inspectWindowsQbitInstall()
        : await inspectUnixQbitInstall();

    const snap = getDownloadSnapshot ? getDownloadSnapshot() : null;
    const snapVer = normalizeVersionString(snap?.torrentVersion);
    const webUiConfig = inspectQbitWebUiConfig();

    return {
      installed: base.installed || Boolean(snap?.torrentConnected),
      executablePath: base.executablePath,
      installedVersion: base.installedVersion || snapVer || null,
      isRunning: base.isRunning || Boolean(snap?.torrentConnected),
      webUiConfig,
      webUiVerifiedConnected: Boolean(snap?.torrentConnected),
    };
  }

  async function fetchJsonChecked(url) {
    if (!isAllowedOfficialUrl(url)) {
      throw new Error('Blocked untrusted URL outside official qBittorrent / GitHub domains.');
    }
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 12000);
    try {
      const res = await net.fetch(url, {
        headers: {
          Accept: 'application/vnd.github+json',
          'User-Agent': SETUP_USER_AGENT,
        },
        signal: controller.signal,
      });
      if (res.status === 403 || res.status === 429) {
        const remaining = res.headers.get('x-ratelimit-remaining');
        const err = new Error(
          remaining === '0'
            ? 'GitHub API rate limit reached. Try again later or use the official qBittorrent download link.'
            : `GitHub API access temporarily limited (HTTP ${res.status}).`
        );
        err.code = 'rate_limited';
        throw err;
      }
      if (!res.ok) {
        const err = new Error(`Official release endpoint returned HTTP ${res.status}.`);
        err.code = 'http_error';
        throw err;
      }
      return await res.json();
    } catch (err) {
      if (err && err.code) throw err;
      const msg = err instanceof Error ? err.message : String(err || 'Network error');
      const lower = msg.toLowerCase();
      const wrapped = new Error(
        lower.includes('enotfound') ||
          lower.includes('internet_disconnected') ||
          lower.includes('network') ||
          lower.includes('fetch failed')
          ? 'Unable to reach official release servers. Please check your internet connection.'
          : msg
      );
      wrapped.code =
        lower.includes('enotfound') || lower.includes('disconnected') || lower.includes('fetch failed')
          ? 'offline'
          : 'http_error';
      throw wrapped;
    } finally {
      clearTimeout(timer);
    }
  }

  async function fetchOfficialWebsiteFallback() {
    if (!isAllowedOfficialUrl(OFFICIAL_QBIT_DOWNLOAD_URL)) return null;
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 12000);
    try {
      const res = await net.fetch(OFFICIAL_QBIT_DOWNLOAD_URL, {
        headers: { 'User-Agent': SETUP_USER_AGENT },
        signal: controller.signal,
      });
      if (!res.ok) return null;
      const html = await res.text();
      const verMatch = html.match(/qbittorrent_(\d+\.\d+\.\d+)_x64_setup\.exe/i);
      if (!verMatch || !verMatch[1]) return null;
      const version = normalizeVersionString(verMatch[1]);
      const assetName = `qbittorrent_${version}_x64_setup.exe`;
      const sha256 = parseSha256ForFile(html, assetName);

      // Extract official SourceForge or FossHub direct link if linked on qbittorrent.org
      const hrefRegex = /href=["'](https:\/\/[^"']*qbittorrent_[^"']*x64_setup\.exe[^"']*)["']/i;
      const hrefMatch = html.match(hrefRegex);
      const candidateUrl = hrefMatch && hrefMatch[1] && isAllowedOfficialUrl(hrefMatch[1])
        ? hrefMatch[1]
        : `https://github.com/qbittorrent/qBittorrent/releases/download/release-${version}/${assetName}`;

      if (!isAllowedOfficialUrl(candidateUrl)) return null;

      return {
        version,
        tagName: `release-${version}`,
        publishedAt: null,
        releaseUrl: `https://github.com/qbittorrent/qBittorrent/releases/tag/release-${version}`,
        assetName,
        assetUrl: candidateUrl,
        assetSizeBytes: 0,
        expectedSha256: sha256,
        checksumAssetUrl: null,
        source: 'official_website',
      };
    } catch {
      return null;
    } finally {
      clearTimeout(timer);
    }
  }

  async function fetchLatestStableRelease() {
    let selected = null;
    let githubErr = null;

    try {
      const latestJson = await fetchJsonChecked(GITHUB_RELEASES_LATEST_API);
      selected = selectBestWindowsAsset(latestJson);

      if (!selected) {
        const listJson = await fetchJsonChecked(GITHUB_RELEASES_LIST_API);
        if (Array.isArray(listJson)) {
          for (const rel of listJson) {
            selected = selectBestWindowsAsset(rel);
            if (selected) break;
          }
        }
      }
    } catch (err) {
      githubErr = err;
    }

    // Fallback to qbittorrent.org/download if GitHub hit rate limit or latest tag lacked Windows asset
    if (!selected) {
      const fallback = await fetchOfficialWebsiteFallback();
      if (fallback) {
        selected = fallback;
      }
    }

    if (!selected) {
      if (githubErr) throw githubErr;
      const missingErr = new Error(
        'No official Windows 64-bit installer asset found in the latest stable release.'
      );
      missingErr.code = 'asset_missing';
      throw missingErr;
    }

    // Enrich missing SHA-256 from release checksum asset or qbittorrent.org/download
    if (!selected.expectedSha256 && selected.checksumAssetUrl && isAllowedOfficialUrl(selected.checksumAssetUrl)) {
      try {
        const csRes = await net.fetch(selected.checksumAssetUrl, {
          headers: { 'User-Agent': SETUP_USER_AGENT },
          signal: AbortSignal.timeout(10000),
        });
        if (csRes.ok) {
          const csText = await csRes.text();
          selected.expectedSha256 = parseSha256ForFile(csText, selected.assetName);
        }
      } catch {
        // continue to official webpage checksum lookup
      }
    }

    if (!selected.expectedSha256) {
      try {
        const webRes = await net.fetch(OFFICIAL_QBIT_DOWNLOAD_URL, {
          headers: { 'User-Agent': SETUP_USER_AGENT },
          signal: AbortSignal.timeout(10000),
        });
        if (webRes.ok) {
          const html = await webRes.text();
          selected.expectedSha256 = parseSha256ForFile(html, selected.assetName);
        }
      } catch {
        // non-fatal; verifier enforces policy below
      }
    }

    return {
      version: selected.version,
      tagName: selected.tagName,
      publishedAt: selected.publishedAt,
      releaseUrl: selected.releaseUrl,
      assetName: selected.assetName,
      assetUrl: selected.assetUrl,
      assetSizeBytes: selected.assetSizeBytes,
      expectedSha256: selected.expectedSha256 || null,
      source: selected.source,
    };
  }

  async function checkStatus(options = {}) {
    if (activeCheckPromise) {
      return activeCheckPromise;
    }

    activeCheckPromise = (async () => {
      const flags = readPersistedSetupFlags();
      patchState({
        stage: 'checking_dependencies',
        error: null,
        releaseError: null,
        releaseErrorCode: null,
        firstLaunchDismissed: flags.firstLaunchDismissed,
        statusMessage: 'Checking dependencies...',
      });

      const localInfo = await inspectInstalledState();

      patchState({
        stage: 'detecting_qbit',
        installed: localInfo.installed,
        installedVersion: localInfo.installedVersion,
        executablePath: localInfo.executablePath,
        isRunning: localInfo.isRunning,
        webUiConfig: localInfo.webUiConfig,
        webUiVerifiedConnected: localInfo.webUiVerifiedConnected,
        statusMessage: 'Detecting qBittorrent...',
      });

      let latestRelease = state.latestRelease;
      let releaseError = null;
      let releaseErrorCode = null;

      patchState({
        stage: 'fetching_release',
        statusMessage: 'Checking latest official qBittorrent release...',
      });

      try {
        latestRelease = await fetchLatestStableRelease();
      } catch (err) {
        releaseError = err instanceof Error ? err.message : String(err || 'Unable to fetch release info.');
        releaseErrorCode = err?.code || 'http_error';
      }

      const evalRes = evaluateVersionAction({
        installed: localInfo.installed,
        installedVersion: localInfo.installedVersion,
        latestVersion: latestRelease?.version || null,
        isRunning: localInfo.isRunning,
      });

      // Automatically clear first-launch prompt if user already has qBittorrent installed + up-to-date + connected
      const isAlreadyHealthyAndReady =
        localInfo.installed &&
        (evalRes.actionNeeded === 'up_to_date' || evalRes.actionNeeded === 'newer_installed') &&
        localInfo.webUiVerifiedConnected;

      if (isAlreadyHealthyAndReady && !flags.completedOnce) {
        writePersistedSetupFlags({ qbitSetupCompletedOnce: true });
      }

      const shouldPrompt =
        Boolean(options.isStartup) &&
        process.platform === 'win32' &&
        !flags.firstLaunchDismissed &&
        !flags.completedOnce &&
        !localInfo.installed;

      let nextStage = 'ready';
      let nextMsg = '';
      if (!localInfo.installed && releaseError) {
        nextStage = 'error';
        nextMsg = releaseError;
      } else if (evalRes.actionNeeded === 'up_to_date') {
        nextStage = localInfo.webUiVerifiedConnected ? 'completed' : 'ready';
        nextMsg = `qBittorrent ${localInfo.installedVersion || ''} is up to date.`;
      } else if (evalRes.actionNeeded === 'newer_installed') {
        nextStage = localInfo.webUiVerifiedConnected ? 'completed' : 'ready';
        nextMsg = `qBittorrent ${localInfo.installedVersion} is newer than release ${latestRelease?.version}.`;
      } else if (evalRes.actionNeeded === 'close_required_for_update') {
        nextStage = 'waiting_for_close';
        nextMsg = 'qBittorrent is currently running. Close it cleanly before updating.';
      } else if (evalRes.actionNeeded === 'update_available') {
        nextStage = 'ready';
        nextMsg = `Update available: ${localInfo.installedVersion} → ${latestRelease?.version}`;
      } else if (evalRes.actionNeeded === 'install_required') {
        nextStage = 'ready';
        nextMsg = `qBittorrent ${latestRelease?.version || ''} is ready to install.`;
      }

      patchState({
        stage: nextStage,
        actionNeeded: evalRes.actionNeeded,
        latestRelease,
        releaseError,
        releaseErrorCode,
        error: !localInfo.installed && releaseError ? releaseError : null,
        statusMessage: nextMsg,
        shouldPromptOnFirstLaunch: shouldPrompt,
        lastCheckedAt: Date.now(),
      });

      return getState();
    })().finally(() => {
      activeCheckPromise = null;
    });

    return activeCheckPromise;
  }

  async function downloadVerifiedAsset(releaseInfo) {
    if (!releaseInfo || !isAllowedOfficialUrl(releaseInfo.assetUrl)) {
      throw new Error('Blocked download: Installer URL is not on an official domain.');
    }

    const cacheDir = getSetupCacheDir();
    let safeAssetName = path.basename(String(releaseInfo.assetName || 'qbittorrent_x64_setup.exe')).replace(
      /[<>:"/\\|?*\x00-\x1f]/g,
      '_'
    );
    if (!safeAssetName.toLowerCase().endsWith('.exe')) {
      safeAssetName = `${safeAssetName}.exe`;
    }
    const targetPath = path.resolve(path.join(cacheDir, safeAssetName));
    if (!targetPath.startsWith(cacheDir + path.sep)) {
      throw new Error('Security check failed: Invalid destination path.');
    }

    const partPath = `${targetPath}.part`;
    safeRemoveFile(partPath);
    safeRemoveFile(targetPath);

    const controller = new AbortController();
    activeOperationAbort = controller;

    let res;
    try {
      res = await net.fetch(releaseInfo.assetUrl, {
        headers: { 'User-Agent': SETUP_USER_AGENT },
        signal: controller.signal,
      });
    } catch (err) {
      throw new Error(
        `Failed to download qBittorrent installer: ${
          err instanceof Error ? err.message : String(err || 'Network error')
        }`
      );
    }

    if (res.url && !isAllowedOfficialUrl(res.url)) {
      controller.abort();
      throw new Error(`Security check blocked untrusted redirect target: ${res.url}`);
    }

    if (!res.ok || !res.body) {
      throw new Error(`Official server returned HTTP ${res.status} while downloading installer.`);
    }

    const totalBytes = Number(res.headers.get('content-length')) || releaseInfo.assetSizeBytes || 0;
    const writeStream = fs.createWriteStream(partPath);
    const hash = crypto.createHash('sha256');
    let downloadedBytes = 0;
    let windowBytes = 0;
    let windowStart = Date.now();
    let smoothedSpeed = 0;
    let headerChecked = false;

    const reader = res.body.getReader();
    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        if (controller.signal.aborted) {
          throw new Error('Installer download cancelled.');
        }

        const chunk = Buffer.from(value);
        if (!headerChecked && downloadedBytes === 0 && chunk.length >= 2) {
          headerChecked = true;
          if (chunk[0] !== 0x4d || chunk[1] !== 0x5a) {
            throw new Error(
              'Downloaded file is not a valid Windows executable (.exe). Please use the official download link.'
            );
          }
        }

        hash.update(chunk);
        const ok = writeStream.write(chunk);
        if (!ok) {
          await new Promise((resolve) => writeStream.once('drain', resolve));
        }

        downloadedBytes += chunk.byteLength;
        windowBytes += chunk.byteLength;

        const now = Date.now();
        const elapsedMs = now - windowStart;
        if (elapsedMs >= 250) {
          const instant = (windowBytes * 1000) / elapsedMs;
          smoothedSpeed = smoothedSpeed > 0 ? smoothedSpeed * 0.6 + instant * 0.4 : instant;
          windowBytes = 0;
          windowStart = now;

          const remaining = totalBytes > downloadedBytes ? totalBytes - downloadedBytes : 0;
          const etaSeconds =
            totalBytes > 0 && smoothedSpeed > 512 ? Math.ceil(remaining / smoothedSpeed) : null;
          const percent =
            totalBytes > 0
              ? Math.min(99.9, Number(((downloadedBytes / totalBytes) * 100).toFixed(1)))
              : 0;

          patchState({
            stage: 'downloading',
            statusMessage: 'Downloading qBittorrent...',
            downloadProgress: {
              percent,
              downloadedBytes,
              totalBytes,
              speedBytesPerSec: Math.round(smoothedSpeed),
              etaSeconds,
            },
          });
        }
      }
    } catch (err) {
      await new Promise((resolve) => writeStream.end(resolve));
      safeRemoveFile(partPath);
      throw err;
    } finally {
      activeOperationAbort = null;
    }

    await new Promise((resolve) => writeStream.end(resolve));

    if (downloadedBytes < 5 * 1024 * 1024) {
      safeRemoveFile(partPath);
      throw new Error('Downloaded installer is unexpectedly small or incomplete.');
    }

    fs.renameSync(partPath, targetPath);
    const sha256Actual = hash.digest('hex').toLowerCase();

    patchState({
      downloadProgress: {
        percent: 100,
        downloadedBytes,
        totalBytes: totalBytes || downloadedBytes,
        speedBytesPerSec: 0,
        etaSeconds: 0,
      },
    });

    return { filePath: targetPath, sha256Actual };
  }

  async function verifyDownloadedInstaller(filePath, sha256Actual, expectedSha256) {
    patchState({
      stage: 'verifying',
      statusMessage: 'Verifying installer...',
    });

    const expected = expectedSha256 ? expectedSha256.toLowerCase() : null;
    const sha256Verified = Boolean(expected && sha256Actual === expected);

    if (expected && !sha256Verified) {
      safeRemoveFile(filePath);
      throw new Error(
        'Installer integrity check failed (SHA-256 mismatch). File was deleted for your safety.'
      );
    }

    let signatureStatus = 'Unavailable';
    let publisher = null;
    let signatureVerified = false;

    if (process.platform === 'win32') {
      const sigRes = await execFilePromise(
        'powershell.exe',
        [
          '-NoProfile',
          '-NonInteractive',
          '-ExecutionPolicy',
          'Bypass',
          '-Command',
          '$s = Get-AuthenticodeSignature -LiteralPath $env:QBIT_SETUP_PATH; @{ Status = [string]$s.Status; Subject = [string]$s.SignerCertificate.Subject; Issuer = [string]$s.SignerCertificate.Issuer } | ConvertTo-Json -Compress',
        ],
        { timeoutMs: 8000, env: { QBIT_SETUP_PATH: filePath } }
      );

      if (sigRes.ok && sigRes.stdout) {
        try {
          const parsed = JSON.parse(sigRes.stdout);
          signatureStatus = String(parsed?.Status || 'Unknown');
          publisher = parsed?.Subject ? String(parsed.Subject) : null;
        } catch {
          signatureStatus = 'ParseError';
        }
      }

      if (signatureStatus === 'HashMismatch' || signatureStatus === 'NotTrusted') {
        safeRemoveFile(filePath);
        throw new Error(
          `Windows security check rejected installer signature (${signatureStatus}).`
        );
      }

      if (signatureStatus === 'Valid') {
        if (!isTrustedQbitPublisher(publisher)) {
          safeRemoveFile(filePath);
          throw new Error(
            `Unexpected installer publisher (${publisher || 'Unknown'}). Execution blocked.`
          );
        }
        signatureVerified = true;
      } else if (signatureStatus === 'NotSigned') {
        // Official FOSS qBittorrent NSIS builds are often unsigned; allow strictly when official SHA-256 matched
        if (!sha256Verified) {
          safeRemoveFile(filePath);
          throw new Error(
            'Installer has no digital signature and no verified official SHA-256 checksum. Please install manually from qbittorrent.org.'
          );
        }
      } else if (!sha256Verified) {
        safeRemoveFile(filePath);
        throw new Error(
          `Could not verify installer signature (${signatureStatus}) or SHA-256 checksum.`
        );
      }
    }

    const verification = {
      sha256Actual,
      sha256Expected: expected,
      sha256Verified,
      signatureStatus,
      publisher,
      signatureVerified,
    };

    patchState({ verification });
    return verification;
  }

  async function runSilentInstaller(installerPath) {
    patchState({
      stage: 'installing',
      statusMessage: 'Installing qBittorrent...',
    });

    if (process.platform !== 'win32') {
      throw new Error('Automatic silent installation is only supported on Windows desktop builds.');
    }

    // Re-check running process right before install (Case C safeguard)
    const stillRunning = await detectQbitProcessRunning();
    if (stillRunning) {
      patchState({
        isRunning: true,
        actionNeeded: 'close_required_for_update',
        stage: 'waiting_for_close',
        statusMessage: 'qBittorrent is running. Close it cleanly before continuing installation.',
      });
      return { deferredForRunningProcess: true };
    }

    // Launch official NSIS installer silently (/S) using Start-Process so Windows handles UAC consent normally
    const psInstallCmd =
      '$p = Start-Process -FilePath $env:QBIT_SETUP_PATH -ArgumentList "/S" -Wait -PassThru; exit $p.ExitCode';
    const res = await execFilePromise(
      'powershell.exe',
      [
        '-NoProfile',
        '-NonInteractive',
        '-ExecutionPolicy',
        'Bypass',
        '-Command',
        psInstallCmd,
      ],
      { timeoutMs: 180000, env: { QBIT_SETUP_PATH: installerPath } }
    );

    if (!res.ok) {
      const lowerErr = `${res.stderr} ${res.error?.message || ''}`.toLowerCase();
      if (lowerErr.includes('canceled by the user') || lowerErr.includes('cancelled by the user') || res.code === 1223) {
        throw new Error(
          'Windows permission prompt (UAC) was declined. Approve the prompt when retrying or use the official link.'
        );
      }
      throw new Error(
        res.stderr || `qBittorrent silent installer exited with code ${res.code}.`
      );
    }

    return { deferredForRunningProcess: false };
  }

  async function startInstall(options = {}) {
    if (activeInstallPromise) {
      return activeInstallPromise;
    }

    activeInstallPromise = (async () => {
      if (!options.userConfirmed) {
        throw new Error('Explicit user confirmation is required before installing qBittorrent.');
      }

      const current = await checkStatus({ isStartup: false });

      if (process.platform !== 'win32') {
        patchState({
          stage: 'error',
          error: 'Automated qBittorrent installation is supported on Windows PCs. Download for your OS from qbittorrent.org.',
          statusMessage: 'Unsupported OS for Windows silent installer.',
        });
        return getState();
      }

      if (current.actionNeeded === 'up_to_date' || current.actionNeeded === 'newer_installed') {
        patchState({
          stage: 'configuring',
          statusMessage: 'Configuring integration...',
        });
        const postLocal = await inspectInstalledState();
        patchState({
          stage: postLocal.webUiVerifiedConnected ? 'completed' : 'completed',
          installed: postLocal.installed,
          installedVersion: postLocal.installedVersion,
          executablePath: postLocal.executablePath,
          webUiConfig: postLocal.webUiConfig,
          webUiVerifiedConnected: postLocal.webUiVerifiedConnected,
          statusMessage: 'Setup completed.',
        });
        return getState();
      }

      if (current.isRunning || current.actionNeeded === 'close_required_for_update') {
        patchState({
          stage: 'waiting_for_close',
          actionNeeded: 'close_required_for_update',
          statusMessage: 'qBittorrent is running. Please close qBittorrent cleanly, then click Check Again.',
          error: null,
        });
        return getState();
      }

      if (!current.latestRelease || !current.latestRelease.assetUrl) {
        patchState({
          stage: 'error',
          error:
            current.releaseError ||
            'Could not locate an official Windows installer release. Please retry or use the official download page.',
          statusMessage: 'Release lookup failed.',
        });
        return getState();
      }

      let downloadedFilePath = '';
      try {
        patchState({
          stage: 'downloading',
          error: null,
          downloadProgress: {
            percent: 0,
            downloadedBytes: 0,
            totalBytes: current.latestRelease.assetSizeBytes || 0,
            speedBytesPerSec: 0,
            etaSeconds: null,
          },
          statusMessage: 'Downloading qBittorrent...',
        });

        const { filePath, sha256Actual } = await downloadVerifiedAsset(current.latestRelease);
        downloadedFilePath = filePath;

        await verifyDownloadedInstaller(
          filePath,
          sha256Actual,
          current.latestRelease.expectedSha256
        );

        const installOutcome = await runSilentInstaller(filePath);
        safeRemoveFile(filePath);
        downloadedFilePath = '';

        if (installOutcome.deferredForRunningProcess) {
          return getState();
        }

        patchState({
          stage: 'configuring',
          statusMessage: 'Configuring integration...',
        });

        const postInfo = await inspectInstalledState();
        let webUiConnected = postInfo.webUiVerifiedConnected;

        if (testTorrentConnection && !webUiConnected) {
          const testRes = await testTorrentConnection().catch(() => null);
          if (testRes && testRes.ok) {
            webUiConnected = true;
          }
        }

        if (postInfo.installed) {
          writePersistedSetupFlags({ qbitSetupCompletedOnce: true });
        }

        patchState({
          stage: 'completed',
          actionNeeded: 'up_to_date',
          installed: postInfo.installed,
          installedVersion: postInfo.installedVersion || current.latestRelease.version,
          executablePath: postInfo.executablePath,
          isRunning: postInfo.isRunning,
          webUiConfig: postInfo.webUiConfig,
          webUiVerifiedConnected: webUiConnected,
          shouldPromptOnFirstLaunch: false,
          error: null,
          statusMessage: 'Setup completed.',
        });
      } catch (err) {
        if (downloadedFilePath) safeRemoveFile(downloadedFilePath);
        const msg = err instanceof Error ? err.message : String(err || 'Installation failed.');
        patchState({
          stage: 'error',
          error: msg,
          statusMessage: msg,
        });
      }

      return getState();
    })().finally(() => {
      activeInstallPromise = null;
    });

    return activeInstallPromise;
  }

  async function launchQbitClient() {
    const info = await inspectInstalledState();
    const exePath = info.executablePath ? path.resolve(String(info.executablePath)) : '';
    const base = exePath ? path.basename(exePath).toLowerCase() : '';
    const allowedName =
      process.platform === 'win32'
        ? base === 'qbittorrent.exe'
        : base === 'qbittorrent' || base === 'qbittorrent.app';
    if (exePath && path.isAbsolute(exePath) && allowedName && fs.existsSync(exePath)) {
      const errMsg = await shell.openPath(exePath);
      if (!errMsg) {
        setTimeout(() => {
          void refreshLocalOnly();
        }, 1200);
        return { ok: true, executablePath: exePath };
      }
      return { ok: false, error: errMsg };
    }
    return { ok: false, error: 'qBittorrent executable was not found on this PC.' };
  }

  async function refreshLocalOnly() {
    const localInfo = await inspectInstalledState();
    const evalRes = evaluateVersionAction({
      installed: localInfo.installed,
      installedVersion: localInfo.installedVersion,
      latestVersion: state.latestRelease?.version || null,
      isRunning: localInfo.isRunning,
    });
    patchState({
      installed: localInfo.installed,
      installedVersion: localInfo.installedVersion,
      executablePath: localInfo.executablePath,
      isRunning: localInfo.isRunning,
      webUiConfig: localInfo.webUiConfig,
      webUiVerifiedConnected: localInfo.webUiVerifiedConnected,
      actionNeeded: evalRes.actionNeeded,
    });
    return getState();
  }

  function dismissWizard() {
    writePersistedSetupFlags({ qbitSetupDismissed: true });
    patchState({
      shouldPromptOnFirstLaunch: false,
      firstLaunchDismissed: true,
    });
    return getState();
  }

  function openOfficialDownloadPage() {
    void shell.openExternal(OFFICIAL_QBIT_DOWNLOAD_URL);
    return true;
  }

  function registerIpc(ipcMain, isTrustedSender) {
    ipcMain.handle('qbit-setup:get-state', (event) => {
      if (!isTrustedSender(event)) return null;
      return getState();
    });

    ipcMain.handle('qbit-setup:check', async (event) => {
      if (!isTrustedSender(event)) return null;
      return checkStatus({ isStartup: false });
    });

    ipcMain.handle('qbit-setup:refresh-local', async (event) => {
      if (!isTrustedSender(event)) return null;
      return refreshLocalOnly();
    });

    ipcMain.handle('qbit-setup:install', async (event, opts) => {
      if (!isTrustedSender(event)) return null;
      return startInstall({ userConfirmed: Boolean(opts?.userConfirmed) });
    });

    ipcMain.handle('qbit-setup:launch-client', async (event) => {
      if (!isTrustedSender(event)) return { ok: false, error: 'Unauthorized' };
      return launchQbitClient();
    });

    ipcMain.handle('qbit-setup:dismiss', (event) => {
      if (!isTrustedSender(event)) return null;
      return dismissWizard();
    });

    ipcMain.handle('qbit-setup:generate-password', (event) => {
      if (!isTrustedSender(event)) return '';
      return generateStrongWebUiPassword(16);
    });

    ipcMain.handle('qbit-setup:open-official', (event) => {
      if (!isTrustedSender(event)) return false;
      return openOfficialDownloadPage();
    });
  }

  function initStartupCheck() {
    const flags = readPersistedSetupFlags();
    patchState({ firstLaunchDismissed: flags.firstLaunchDismissed });
    setTimeout(() => {
      if (process.platform !== 'win32') {
        void refreshLocalOnly();
        return;
      }
      void checkStatus({ isStartup: true });
    }, 1800);
  }

  function shutdown() {
    if (activeOperationAbort) {
      try {
        activeOperationAbort.abort('shutdown');
      } catch {
        // ignore
      }
      activeOperationAbort = null;
    }
  }

  return {
    getState,
    checkStatus,
    refreshLocalOnly,
    startInstall,
    launchQbitClient,
    dismissWizard,
    registerIpc,
    initStartupCheck,
    shutdown,
  };
}

module.exports = {
  createQbitSetupManager,
  isAllowedOfficialUrl,
  normalizeVersionString,
  compareSemver,
  evaluateVersionAction,
  parseSha256ForFile,
  selectBestWindowsAsset,
  parseQbitIniWebUi,
  isTrustedQbitPublisher,
  generateStrongWebUiPassword,
  OFFICIAL_QBIT_DOWNLOAD_URL,
};
