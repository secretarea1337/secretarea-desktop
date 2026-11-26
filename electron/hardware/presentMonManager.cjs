let electronApi = {};
try {
  electronApi = require('electron');
} catch {
  electronApi = {};
}
const { app, shell } = electronApi;
const crypto = require('crypto');
const fs = require('fs');
const fsp = fs.promises;
const https = require('https');
const path = require('path');
const { execFile } = require('child_process');

const GITHUB_PRESENTMON_API_LATEST =
  'https://api.github.com/repos/GameTechDev/PresentMon/releases/latest';
const OFFICIAL_PRESENTMON_RELEASES_URL =
  'https://github.com/GameTechDev/PresentMon/releases/latest';
const USER_AGENT = 'SecretArea-Desktop/1.0 (+https://github.com/secretarea1337/secretarea-desktop)';

const ALLOWED_PRESENTMON_HOST_SUFFIXES = [
  'api.github.com',
  'github.com',
  'objects.githubusercontent.com',
  'release-assets.githubusercontent.com',
  'codeload.github.com',
];

const MIN_PRESENTMON_EXE_BYTES = 100 * 1024; // Official standalone x64 CLI is ~950 KB
const STARTUP_RECHECK_COOLDOWN_MS = 6 * 60 * 60 * 1000; // 6 hours

function isAllowedPresentMonUrl(rawUrl) {
  if (typeof rawUrl !== 'string' || !rawUrl.trim()) return false;
  try {
    const parsed = new URL(rawUrl.trim());
    if (parsed.protocol !== 'https:') return false;
    const host = parsed.hostname.toLowerCase();
    return ALLOWED_PRESENTMON_HOST_SUFFIXES.some(
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

function parseDigestString(rawDigest) {
  const str = String(rawDigest || '').trim();
  const match = str.match(/^(?:sha256:)?([0-9a-fA-F]{64})$/i);
  return match ? match[1].toLowerCase() : null;
}

function parseSha256ForFile(text, fileName) {
  if (typeof text !== 'string' || !text.trim()) return null;
  const escaped = String(fileName || '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  if (escaped) {
    const regex = new RegExp(
      `(?:([0-9a-fA-F]{64})[^\\r\\n]{0,160}${escaped})|(?:${escaped}[^\\r\\n]{0,160}([0-9a-fA-F]{64}))`,
      'i'
    );
    const match = text.match(regex);
    if (match) {
      return (match[1] || match[2] || '').toLowerCase() || null;
    }
  }
  return null;
}

function sanitizeAssetFileName(name) {
  const base = path.basename(String(name || 'PresentMon-x64.exe'));
  return base.replace(/[^a-zA-Z0-9._-]/g, '_') || 'PresentMon-x64.exe';
}

function isTrustedIntelPublisher(subject) {
  if (typeof subject !== 'string' || !subject.trim()) return false;
  const lower = subject.toLowerCase();
  return lower.includes('intel corporation') || /(?:cn|o)=intel\b/i.test(subject);
}

/**
 * Dynamically inspects GitHub Release JSON from GameTechDev/PresentMon and selects
 * the optimal official Windows x64 deliverable:
 *   1. Standalone x64 CLI .exe (e.g. PresentMon-2.6.0-x64.exe)
 *   2. Windows x64 .zip archive
 *   3. Windows .msi installer fallback
 */
function selectBestPresentMonReleaseAsset(releaseJson) {
  if (!releaseJson || typeof releaseJson !== 'object') return null;
  if (releaseJson.draft || releaseJson.prerelease) return null;

  const tagName = String(releaseJson.tag_name || '').trim();
  const version = normalizeVersionString(tagName || releaseJson.name || '');
  const assets = Array.isArray(releaseJson.assets) ? releaseJson.assets : [];
  if (!version || assets.length === 0) return null;

  const usableAssets = assets.filter((asset) => {
    const name = String(asset?.name || '');
    const lower = name.toLowerCase();
    const url = String(asset?.browser_download_url || '');
    if (!name || !isAllowedPresentMonUrl(url)) return false;
    if (
      lower.includes('symbol') ||
      lower.includes('.pdb') ||
      lower.includes('source') ||
      lower.includes('arm64') ||
      lower.includes('x86') ||
      lower.includes('win32')
    ) {
      return false;
    }
    return true;
  });

  // Priority 1: Official standalone x64 CLI binary (PresentMon-<ver>-x64.exe)
  let selected =
    usableAssets.find((a) => /^presentmon[-_.]?.*-x64\.exe$/i.test(String(a.name || ''))) ||
    usableAssets.find((a) => /^presentmon.*\.exe$/i.test(String(a.name || ''))) ||
    null;
  let assetKind = selected ? 'exe' : null;

  // Priority 2: Official Windows x64 zip package
  if (!selected) {
    selected =
      usableAssets.find((a) => /presentmon.*(x64|win64|64).*\.zip$/i.test(String(a.name || ''))) ||
      usableAssets.find((a) => /^presentmon.*\.zip$/i.test(String(a.name || ''))) ||
      null;
    if (selected) assetKind = 'zip';
  }

  // Priority 3: Official MSI installer fallback
  if (!selected) {
    selected =
      usableAssets.find((a) => /^presentmon.*(x64|64)?\.msi$/i.test(String(a.name || ''))) || null;
    if (selected) assetKind = 'msi';
  }

  if (!selected || !assetKind) return null;

  const expectedSha256 =
    parseDigestString(selected.digest) ||
    parseSha256ForFile(String(releaseJson.body || ''), String(selected.name || '')) ||
    null;

  return {
    version,
    tagName: tagName || `v${version}`,
    publishedAt: typeof releaseJson.published_at === 'string' ? releaseJson.published_at : null,
    releaseUrl: isAllowedPresentMonUrl(releaseJson.html_url)
      ? releaseJson.html_url
      : OFFICIAL_PRESENTMON_RELEASES_URL,
    assetName: String(selected.name),
    assetUrl: String(selected.browser_download_url),
    assetKind,
    assetSizeBytes: Number(selected.size) || 0,
    expectedSha256,
    releaseNotes: typeof releaseJson.body === 'string' ? releaseJson.body.trim().slice(0, 4000) : '',
    source: 'github_api',
  };
}

/**
 * Evaluates dependency action needed covering Scenarios A, B, C, D:
 *   A -> not installed (`install_required`)
 *   B -> installed & healthy & current (`up_to_date` or `newer_installed`)
 *   C -> installed & healthy & outdated (`update_available` or `close_required_for_update`)
 *   D -> installed binary missing/corrupted/incompatible (`repair_required`)
 */
function evaluatePresentMonVersionAction({
  installed,
  healthy,
  installedVersion,
  latestVersion,
  isRunning,
}) {
  if (!installed) {
    return { actionNeeded: 'install_required', caseCode: 'A' };
  }
  if (!healthy) {
    return { actionNeeded: 'repair_required', caseCode: 'D' };
  }
  const latestNorm = normalizeVersionString(latestVersion);
  const instNorm = normalizeVersionString(installedVersion);
  if (!latestNorm) {
    return { actionNeeded: 'up_to_date', caseCode: 'B_OFFLINE' };
  }
  if (!instNorm) {
    return {
      actionNeeded: isRunning ? 'close_required_for_update' : 'update_available',
      caseCode: 'C',
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
    caseCode: 'C',
  };
}

function verifyPeHeaderSync(filePath) {
  try {
    const fd = fs.openSync(filePath, 'r');
    try {
      const buf = Buffer.alloc(2);
      const read = fs.readSync(fd, buf, 0, 2, 0);
      return read === 2 && buf[0] === 0x4d && buf[1] === 0x5a; // "MZ"
    } finally {
      fs.closeSync(fd);
    }
  } catch {
    return false;
  }
}

function parseCliHelpOutput(rawOutput) {
  const text = String(rawOutput || '');
  if (!text.trim()) {
    return {
      functional: false,
      doubleDash: true,
      supportsProcessId: false,
      supportsOutputStdout: false,
      supportsNoTop: false,
      supportsTerminateOnExit: false,
      supportsV1Metrics: false,
    };
  }
  const lower = text.toLowerCase();
  const hasDoubleStdout = lower.includes('--output_stdout');
  const hasSingleStdout = !hasDoubleStdout && /-output_stdout\b/.test(lower);
  const hasDoubleProc = lower.includes('--process_id');
  const hasSingleProc = !hasDoubleProc && /-process_id\b/.test(lower);
  const supportsOutputStdout = hasDoubleStdout || hasSingleStdout;
  const supportsProcessId = hasDoubleProc || hasSingleProc;

  return {
    functional: supportsOutputStdout && supportsProcessId,
    doubleDash: hasDoubleStdout || !hasSingleStdout,
    supportsProcessId,
    supportsOutputStdout,
    supportsNoTop: lower.includes('no_top'),
    supportsTerminateOnExit: lower.includes('terminate_on_proc_exit'),
    supportsV1Metrics: lower.includes('--v1_metrics') || lower.includes('-v1_metrics'),
  };
}

function execFilePromise(cmd, args, options = {}) {
  return new Promise((resolve) => {
    execFile(
      cmd,
      args,
      {
        timeout: options.timeoutMs || 15000,
        windowsHide: true,
        maxBuffer: 2 * 1024 * 1024,
        env: options.env || process.env,
      },
      (err, stdout, stderr) => {
        resolve({
          ok: !err,
          code: err && typeof err.code === 'number' ? err.code : 0,
          stdout: String(stdout || ''),
          stderr: String(stderr || ''),
          error: err ? err.message : null,
        });
      }
    );
  });
}

function httpsGetJsonWithRedirect(targetUrl, timeoutMs = 12000, maxRedirects = 4) {
  return new Promise((resolve, reject) => {
    if (!isAllowedPresentMonUrl(targetUrl)) {
      reject(new Error('Blocked untrusted URL outside official PresentMon GitHub hosts.'));
      return;
    }

    const req = https.get(
      targetUrl,
      {
        timeout: timeoutMs,
        headers: {
          'User-Agent': USER_AGENT,
          Accept: 'application/vnd.github+json',
        },
      },
      (res) => {
        const status = res.statusCode || 0;
        if ([301, 302, 307, 308].includes(status) && res.headers.location && maxRedirects > 0) {
          res.resume();
          const nextUrl = new URL(res.headers.location, targetUrl).toString();
          httpsGetJsonWithRedirect(nextUrl, timeoutMs, maxRedirects - 1)
            .then(resolve)
            .catch(reject);
          return;
        }

        if (status === 403 || status === 429) {
          res.resume();
          const err = new Error(`GitHub API rate limit or access denied (HTTP ${status}).`);
          err.code = 'rate_limited';
          reject(err);
          return;
        }

        if (status < 200 || status >= 300) {
          res.resume();
          const err = new Error(`GitHub API returned HTTP ${status}.`);
          err.code = 'http_error';
          reject(err);
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
            reject(new Error('Invalid JSON response from GitHub Releases API.'));
          }
        });
      }
    );

    req.on('timeout', () => {
      req.destroy(new Error('Timed out connecting to GitHub Releases API.'));
    });

    req.on('error', (err) => {
      const msg = String(err?.message || '');
      if (msg.includes('ENOTFOUND') || msg.includes('EAI_AGAIN') || msg.includes('ENETUNREACH')) {
        err.code = 'offline';
      }
      reject(err);
    });
  });
}

function downloadFileWithRedirectAndHash({
  targetUrl,
  destPath,
  expectedBytes,
  signal,
  onProgress,
  maxRedirects = 6,
}) {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) {
      const abortErr = new Error('Download cancelled by user.');
      abortErr.code = 'aborted';
      reject(abortErr);
      return;
    }

    if (!isAllowedPresentMonUrl(targetUrl)) {
      reject(new Error('Blocked download from unapproved host.'));
      return;
    }

    const req = https.get(
      targetUrl,
      {
        timeout: 25000,
        headers: {
          'User-Agent': USER_AGENT,
          Accept: 'application/octet-stream,*/*',
        },
      },
      (res) => {
        const status = res.statusCode || 0;

        if ([301, 302, 307, 308].includes(status) && res.headers.location) {
          res.resume();
          if (maxRedirects <= 0) {
            reject(new Error('Too many HTTP redirects while downloading PresentMon.'));
            return;
          }
          let nextUrl;
          try {
            nextUrl = new URL(res.headers.location, targetUrl).toString();
          } catch {
            reject(new Error('Invalid redirect URL while downloading PresentMon.'));
            return;
          }
          downloadFileWithRedirectAndHash({
            targetUrl: nextUrl,
            destPath,
            expectedBytes,
            signal,
            onProgress,
            maxRedirects: maxRedirects - 1,
          })
            .then(resolve)
            .catch(reject);
          return;
        }

        if (status < 200 || status >= 300) {
          res.resume();
          reject(new Error(`PresentMon asset download failed with HTTP ${status}.`));
          return;
        }

        const totalBytes = Number(res.headers['content-length']) || Number(expectedBytes) || 0;
        const hash = crypto.createHash('sha256');
        const outStream = fs.createWriteStream(destPath);
        let downloadedBytes = 0;
        const startedAt = Date.now();
        let lastEmitAt = 0;
        let settled = false;

        const cleanupStreams = () => {
          try {
            res.destroy();
          } catch {
            // ignore
          }
          try {
            outStream.destroy();
          } catch {
            // ignore
          }
        };

        const onAbort = () => {
          if (settled) return;
          settled = true;
          cleanupStreams();
          const abortErr = new Error('Download cancelled by user.');
          abortErr.code = 'aborted';
          reject(abortErr);
        };

        if (signal) {
          signal.addEventListener('abort', onAbort, { once: true });
        }

        res.on('data', (chunk) => {
          if (settled) return;
          downloadedBytes += chunk.length;
          hash.update(chunk);
          if (!outStream.write(chunk)) {
            res.pause();
            outStream.once('drain', () => res.resume());
          }
          const now = Date.now();
          if (now - lastEmitAt >= 120 || (totalBytes > 0 && downloadedBytes >= totalBytes)) {
            lastEmitAt = now;
            const elapsedSec = Math.max(0.1, (now - startedAt) / 1000);
            const speedBytesPerSec = Math.round(downloadedBytes / elapsedSec);
            const percent =
              totalBytes > 0
                ? Math.min(100, Math.round((downloadedBytes / totalBytes) * 1000) / 10)
                : 0;
            const etaSeconds =
              totalBytes > 0 && speedBytesPerSec > 0
                ? Math.max(0, Math.round((totalBytes - downloadedBytes) / speedBytesPerSec))
                : null;
            if (typeof onProgress === 'function') {
              onProgress({
                percent,
                downloadedBytes,
                totalBytes,
                speedBytesPerSec,
                etaSeconds,
              });
            }
          }
        });

        res.on('end', () => {
          if (settled) return;
          outStream.end(() => {
            if (settled) return;
            settled = true;
            if (signal) signal.removeEventListener('abort', onAbort);
            resolve({
              filePath: destPath,
              downloadedBytes,
              sha256Actual: hash.digest('hex').toLowerCase(),
            });
          });
        });

        res.on('error', (err) => {
          if (settled) return;
          settled = true;
          if (signal) signal.removeEventListener('abort', onAbort);
          cleanupStreams();
          reject(err);
        });

        outStream.on('error', (err) => {
          if (settled) return;
          settled = true;
          if (signal) signal.removeEventListener('abort', onAbort);
          cleanupStreams();
          reject(err);
        });
      }
    );

    req.on('timeout', () => {
      req.destroy(new Error('PresentMon download connection timed out.'));
    });

    req.on('error', (err) => {
      reject(err);
    });
  });
}

function safeRemoveSync(targetPath) {
  if (!targetPath) return;
  try {
    if (fs.existsSync(targetPath)) {
      fs.unlinkSync(targetPath);
    }
  } catch {
    // ignore
  }
}

function findPresentMonRecursive(dirPath, maxDepth = 2) {
  if (!dirPath || !fs.existsSync(dirPath)) return null;
  const exact = path.join(dirPath, 'PresentMon.exe');
  if (fs.existsSync(exact)) return exact;
  try {
    const entries = fs.readdirSync(dirPath, { withFileTypes: true });
    const files = entries.filter((e) => e.isFile()).map((e) => e.name);
    const x64Match = files.find((f) => /^presentmon.*-x64\.exe$/i.test(f));
    if (x64Match) return path.join(dirPath, x64Match);
    const anyCli = files.find(
      (f) => /^presentmon.*\.exe$/i.test(f) && !/service|installer|setup/i.test(f)
    );
    if (anyCli) return path.join(dirPath, anyCli);
    if (maxDepth > 0) {
      for (const entry of entries) {
        if (entry.isDirectory()) {
          const nested = findPresentMonRecursive(path.join(dirPath, entry.name), maxDepth - 1);
          if (nested) return nested;
        }
      }
    }
  } catch {
    // ignore
  }
  return null;
}

function createPresentMonManager({
  getMainWindow,
  getUserDataPath,
  readSettings,
  writeSettings,
  stopActiveGamingCapture,
  onDependencyUpdated,
  platformOverride,
  execOverride,
  fetchReleaseOverride,
  downloadOverride,
  metadataOverride,
  registryOverride,
  runningOverride,
} = {}) {
  const effectivePlatform = platformOverride || process.platform;
  const execHelper = execOverride || execFilePromise;
  let state = {
    stage: 'idle', // idle | checking | ready | downloading | verifying | installing | waiting_for_close | completed | error | cancelled
    actionNeeded: null, // install_required | update_available | repair_required | up_to_date | newer_installed | close_required_for_update
    platformSupported: effectivePlatform === 'win32',
    installed: false,
    healthy: false,
    healthIssue: null,
    installSource: null, // 'managed' | 'bundled' | 'system_msi' | 'system_path' | null
    installedVersion: null,
    executablePath: null,
    installDirectory: null,
    cliCapabilities: null,
    isRunning: false,
    latestRelease: null,
    releaseError: null,
    releaseErrorCode: null,
    downloadProgress: null,
    verification: null,
    error: null,
    statusMessage: '',
    officialReleasesUrl: OFFICIAL_PRESENTMON_RELEASES_URL,
    shouldPrompt: false,
    declinedForVersion: null,
    dismissedForVersion: null,
    lastCheckedAt: null,
  };

  let activeCheckPromise = null;
  let activeInstallPromise = null;
  let activeAbortController = null;

  function resolveUserDataRoot() {
    if (typeof getUserDataPath === 'function') {
      return path.resolve(getUserDataPath());
    }
    try {
      return path.resolve(app.getPath('userData'));
    } catch {
      return path.resolve(process.cwd(), '.secretarea-userdata');
    }
  }

  function getManagedToolsDir() {
    return path.join(resolveUserDataRoot(), 'tools', 'presentmon');
  }

  function getManagedExecutablePath() {
    return path.join(getManagedToolsDir(), 'PresentMon.exe');
  }

  function getManagedManifestPath() {
    return path.join(getManagedToolsDir(), 'manifest.json');
  }

  function getStagingDir() {
    return path.join(getManagedToolsDir(), '.staging');
  }

  function readPersistedFlags() {
    try {
      const saved = typeof readSettings === 'function' ? readSettings() : {};
      return {
        presentMonInstallPath:
          typeof saved?.presentMonInstallPath === 'string' ? saved.presentMonInstallPath : null,
        presentMonVersion:
          typeof saved?.presentMonVersion === 'string' ? saved.presentMonVersion : null,
        presentMonDismissedVersion:
          typeof saved?.presentMonDismissedVersion === 'string'
            ? saved.presentMonDismissedVersion
            : null,
        presentMonDeclinedVersion:
          typeof saved?.presentMonDeclinedVersion === 'string'
            ? saved.presentMonDeclinedVersion
            : null,
        presentMonLastCheckedAt:
          typeof saved?.presentMonLastCheckedAt === 'number' ? saved.presentMonLastCheckedAt : null,
      };
    } catch {
      return {
        presentMonInstallPath: null,
        presentMonVersion: null,
        presentMonDismissedVersion: null,
        presentMonDeclinedVersion: null,
        presentMonLastCheckedAt: null,
      };
    }
  }

  function writePersistedFlags(patch) {
    try {
      if (typeof writeSettings === 'function') {
        writeSettings(patch);
      }
    } catch {
      // ignore
    }
  }

  function emitState() {
    const win = typeof getMainWindow === 'function' ? getMainWindow() : null;
    if (win && !win.isDestroyed()) {
      win.webContents.send('presentmon-setup:status', getState());
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
      cliCapabilities: state.cliCapabilities ? { ...state.cliCapabilities } : null,
    };
  }

  function readManagedManifest() {
    try {
      const file = getManagedManifestPath();
      if (!fs.existsSync(file)) return null;
      const parsed = JSON.parse(fs.readFileSync(file, 'utf8'));
      return parsed && typeof parsed === 'object' ? parsed : null;
    } catch {
      return null;
    }
  }

  async function writeManagedManifest(manifest) {
    const file = getManagedManifestPath();
    await fsp.mkdir(path.dirname(file), { recursive: true });
    await fsp.writeFile(file, JSON.stringify(manifest, null, 2), 'utf8');
  }

  async function inspectWindowsRegistryPresentMon() {
    if (typeof registryOverride === 'function') {
      return registryOverride();
    }
    if (effectivePlatform !== 'win32') return null;
    const psScript = [
      '$ErrorActionPreference = "SilentlyContinue";',
      '$roots = @(',
      '  "HKLM:\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\Uninstall\\*",',
      '  "HKLM:\\SOFTWARE\\WOW6432Node\\Microsoft\\Windows\\CurrentVersion\\Uninstall\\*",',
      '  "HKCU:\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\Uninstall\\*"',
      ');',
      '$match = Get-ItemProperty $roots | Where-Object { $_.DisplayName -like "*PresentMon*" } | Select-Object -First 1 DisplayName,DisplayVersion,InstallLocation,UninstallString,Publisher;',
      'if ($match) { $match | ConvertTo-Json -Compress }',
    ].join(' ');

    const res = await execHelper(
      'powershell.exe',
      ['-NoProfile', '-NonInteractive', '-ExecutionPolicy', 'Bypass', '-Command', psScript],
      { timeoutMs: 4500 }
    );
    if (!res.stdout.trim()) return null;
    try {
      const parsed = JSON.parse(res.stdout.trim());
      return parsed && parsed.DisplayName ? parsed : null;
    } catch {
      return null;
    }
  }

  async function readExecutableMetadataWindows(exePath) {
    if (typeof metadataOverride === 'function') {
      return metadataOverride(exePath);
    }
    if (effectivePlatform !== 'win32' || !exePath || !fs.existsSync(exePath)) {
      return { fileVersion: null, signatureStatus: 'Unknown', publisher: null, signatureVerified: false };
    }
    const psScript = [
      '$ErrorActionPreference = "SilentlyContinue";',
      '$target = $env:PM_TARGET_PATH;',
      'if (-not $target -or -not (Test-Path -LiteralPath $target)) { exit 0 }',
      '$item = Get-Item -LiteralPath $target;',
      '$sig = Get-AuthenticodeSignature -FilePath $target;',
      '$subj = if ($sig -and $sig.SignerCertificate) { [string]$sig.SignerCertificate.Subject } else { "" };',
      '$verRaw = if ($item.VersionInfo -and $item.VersionInfo.ProductVersion) { [string]$item.VersionInfo.ProductVersion } elseif ($item.VersionInfo -and $item.VersionInfo.FileVersion) { [string]$item.VersionInfo.FileVersion } else { "" };',
      '@{',
      '  fileVersion = $verRaw;',
      '  status = if ($sig) { [string]$sig.Status } else { "Unknown" };',
      '  publisher = $subj;',
      '} | ConvertTo-Json -Compress',
    ].join(' ');

    const res = await execHelper(
      'powershell.exe',
      ['-NoProfile', '-NonInteractive', '-ExecutionPolicy', 'Bypass', '-Command', psScript],
      {
        timeoutMs: 6000,
        env: { ...process.env, PM_TARGET_PATH: exePath },
      }
    );
    if (!res.stdout.trim()) {
      return { fileVersion: null, signatureStatus: 'Unknown', publisher: null, signatureVerified: false };
    }
    try {
      const parsed = JSON.parse(res.stdout.trim());
      const status = String(parsed.status || 'Unknown');
      const publisher = parsed.publisher ? String(parsed.publisher) : null;
      return {
        fileVersion: normalizeVersionString(parsed.fileVersion || '') || null,
        signatureStatus: status,
        publisher,
        signatureVerified: status === 'Valid' && isTrustedIntelPublisher(publisher || ''),
      };
    } catch {
      return { fileVersion: null, signatureStatus: 'Unknown', publisher: null, signatureVerified: false };
    }
  }

  async function probeBinaryFunctionality(exePath) {
    if (!exePath || !fs.existsSync(exePath)) {
      return { healthy: false, issue: 'Executable file missing', cliCapabilities: null, cliVersion: null };
    }

    let stat;
    try {
      stat = fs.statSync(exePath);
    } catch {
      return { healthy: false, issue: 'Cannot stat executable', cliCapabilities: null, cliVersion: null };
    }

    if (!stat.isFile() || stat.size < MIN_PRESENTMON_EXE_BYTES) {
      return {
        healthy: false,
        issue: `Incomplete or corrupted binary (${stat.size} bytes)`,
        cliCapabilities: null,
        cliVersion: null,
      };
    }

    if (!verifyPeHeaderSync(exePath)) {
      return {
        healthy: false,
        issue: 'Invalid Windows PE/MZ executable header',
        cliCapabilities: null,
        cliVersion: null,
      };
    }

    if (effectivePlatform !== 'win32') {
      return {
        healthy: true,
        issue: null,
        cliCapabilities: {
          functional: true,
          doubleDash: true,
          supportsProcessId: true,
          supportsOutputStdout: true,
          supportsNoTop: true,
          supportsTerminateOnExit: true,
          supportsV1Metrics: true,
        },
        cliVersion: null,
      };
    }

    const helpRes = await execHelper(exePath, ['--help'], { timeoutMs: 4000 });
    let combined = `${helpRes.stdout}\n${helpRes.stderr}`.trim();
    let parsedCaps = parseCliHelpOutput(combined);

    if (!parsedCaps.functional) {
      const altHelpRes = await execHelper(exePath, ['-h'], { timeoutMs: 4000 });
      combined = `${altHelpRes.stdout}\n${altHelpRes.stderr}`.trim();
      parsedCaps = parseCliHelpOutput(combined);
    }

    if (!parsedCaps.functional) {
      return {
        healthy: false,
        issue: 'PresentMon binary failed CLI compatibility check (--help)',
        cliCapabilities: parsedCaps,
        cliVersion: null,
      };
    }

    let cliVersion = null;
    const versionMatch = combined.match(/PresentMon(?:\s+v?|\s+version\s+)(\d+(?:\.\d+){1,3})/i);
    if (versionMatch) {
      cliVersion = normalizeVersionString(versionMatch[1]) || null;
    }

    return {
      healthy: true,
      issue: null,
      cliCapabilities: parsedCaps,
      cliVersion,
    };
  }

  async function isPresentMonProcessRunning() {
    if (typeof runningOverride === 'function') {
      return runningOverride();
    }
    if (effectivePlatform !== 'win32') return false;
    const res = await execHelper(
      'tasklist.exe',
      ['/FI', 'IMAGENAME eq PresentMon*', '/FO', 'CSV', '/NH'],
      { timeoutMs: 3000 }
    );
    return /"PresentMon[^"]*\.exe"/i.test(res.stdout || '');
  }

  function findPresentMonInDirectory(dirPath) {
    return findPresentMonRecursive(dirPath, 1);
  }

  async function detectInstalledPresentMon() {
    const isRunning = await isPresentMonProcessRunning();
    const persisted = readPersistedFlags();
    const managedExe = getManagedExecutablePath();
    const managedManifest = readManagedManifest();
    const regInfo = await inspectWindowsRegistryPresentMon();

    const candidateEntries = [];

    // 1. SecretArea managed binary path (highest precedence so SecretArea updates take priority cleanly)
    if (fs.existsSync(managedExe)) {
      candidateEntries.push({ exePath: managedExe, source: 'managed' });
    }
    // 2. Previously saved path in launcher settings
    if (
      persisted.presentMonInstallPath &&
      persisted.presentMonInstallPath !== managedExe &&
      fs.existsSync(persisted.presentMonInstallPath)
    ) {
      candidateEntries.push({ exePath: persisted.presentMonInstallPath, source: 'managed' });
    }
    // 3. Registry MSI InstallLocation (Windows)
    if (regInfo?.InstallLocation) {
      const fromReg = findPresentMonInDirectory(String(regInfo.InstallLocation));
      if (fromReg) {
        candidateEntries.push({ exePath: fromReg, source: 'system_msi' });
      }
    }
    // 4. Bundled or standard Windows installation locations
    const dirCandidates = [
      { dir: path.join(process.resourcesPath || '', 'bin'), source: 'bundled' },
      { dir: process.resourcesPath || '', source: 'bundled' },
      { dir: path.join(__dirname, '../../resources/bin'), source: 'bundled' },
      { dir: 'C:\\Program Files\\Intel\\PresentMon', source: 'system_msi' },
      { dir: path.join(process.env.LOCALAPPDATA || '', 'Intel', 'PresentMon'), source: 'system_path' },
      {
        dir: path.join(process.env.LOCALAPPDATA || '', 'Programs', 'Intel', 'PresentMon'),
        source: 'system_path',
      },
      { dir: path.join(process.env.USERPROFILE || '', 'PresentMon'), source: 'system_path' },
    ];

    for (const item of dirCandidates) {
      if (!item.dir) continue;
      const found = findPresentMonInDirectory(item.dir);
      if (found && !candidateEntries.some((c) => c.exePath === found)) {
        candidateEntries.push({ exePath: found, source: item.source });
      }
    }

    // Check if managed path was partially installed / missing binary despite manifest
    if (candidateEntries.length === 0 && managedManifest && managedManifest.version) {
      return {
        installed: true,
        healthy: false,
        healthIssue: 'Managed PresentMon binary is missing or deleted from disk.',
        installSource: 'managed',
        installedVersion: normalizeVersionString(managedManifest.version) || null,
        executablePath: managedExe,
        installDirectory: path.dirname(managedExe),
        cliCapabilities: null,
        isRunning,
      };
    }

    if (candidateEntries.length === 0) {
      return {
        installed: false,
        healthy: false,
        healthIssue: null,
        installSource: null,
        installedVersion: null,
        executablePath: null,
        installDirectory: null,
        cliCapabilities: null,
        isRunning,
      };
    }

    const chosen = candidateEntries[0];
    const [probe, meta] = await Promise.all([
      probeBinaryFunctionality(chosen.exePath),
      readExecutableMetadataWindows(chosen.exePath),
    ]);

    let resolvedVersion =
      (chosen.source === 'managed' && managedManifest?.version
        ? normalizeVersionString(managedManifest.version)
        : null) ||
      meta.fileVersion ||
      probe.cliVersion ||
      (chosen.source === 'system_msi' && regInfo?.DisplayVersion
        ? normalizeVersionString(regInfo.DisplayVersion)
        : null) ||
      null;

    // On managed installs without FileVersion metadata, keep persisted version as backup
    if (!resolvedVersion && chosen.exePath === persisted.presentMonInstallPath) {
      resolvedVersion = normalizeVersionString(persisted.presentMonVersion || '') || null;
    }

    let healthy = probe.healthy;
    let healthIssue = probe.issue;
    if (healthy && effectivePlatform === 'win32' && meta.signatureStatus && meta.signatureStatus !== 'Valid') {
      if (meta.signatureStatus === 'HashMismatch' || meta.signatureStatus === 'NotTrusted') {
        healthy = false;
        healthIssue = `Digital signature verification failed (${meta.signatureStatus}).`;
      }
    }

    return {
      installed: true,
      healthy,
      healthIssue,
      installSource: chosen.source,
      installedVersion: resolvedVersion,
      executablePath: chosen.exePath,
      installDirectory: path.dirname(chosen.exePath),
      cliCapabilities: probe.cliCapabilities,
      isRunning,
    };
  }

  async function fetchLatestOfficialRelease() {
    try {
      const releaseJson =
        typeof fetchReleaseOverride === 'function'
          ? await fetchReleaseOverride()
          : await httpsGetJsonWithRedirect(GITHUB_PRESENTMON_API_LATEST, 12000);
      const selected = selectBestPresentMonReleaseAsset(releaseJson);
      if (!selected) {
        return {
          release: null,
          error: 'Official PresentMon GitHub release contained no compatible Windows x64 asset.',
          errorCode: 'asset_missing',
        };
      }
      return { release: selected, error: null, errorCode: null };
    } catch (err) {
      return {
        release: null,
        error: err instanceof Error ? err.message : 'Unable to reach GitHub Releases.',
        errorCode: err?.code || 'http_error',
      };
    }
  }

  async function checkStatus({ isStartup = false, force = false } = {}) {
    if (activeCheckPromise) {
      return activeCheckPromise;
    }

    activeCheckPromise = (async () => {
      const persisted = readPersistedFlags();
      patchState({
        stage: 'checking',
        error: null,
        statusMessage: 'Checking PresentMon status...',
        declinedForVersion: persisted.presentMonDeclinedVersion,
        dismissedForVersion: persisted.presentMonDismissedVersion,
      });

      const localInfo = await detectInstalledPresentMon();
      let latestResult = {
        release: state.latestRelease,
        error: state.releaseError,
        errorCode: state.releaseErrorCode,
      };

      const shouldFetchRemote =
        force ||
        !state.latestRelease ||
        !state.lastCheckedAt ||
        Date.now() - state.lastCheckedAt > STARTUP_RECHECK_COOLDOWN_MS;

      if (shouldFetchRemote) {
        latestResult = await fetchLatestOfficialRelease();
      }

      const evalRes = evaluatePresentMonVersionAction({
        installed: localInfo.installed,
        healthy: localInfo.healthy,
        installedVersion: localInfo.installedVersion,
        latestVersion: latestResult.release?.version || null,
        isRunning: localInfo.isRunning,
      });

      const latestVer = latestResult.release?.version || null;
      const targetVerKey = evalRes.actionNeeded === 'repair_required' ? 'repair' : latestVer || 'initial';

      const alreadyDismissedOrDeclined =
        (persisted.presentMonDeclinedVersion &&
          (persisted.presentMonDeclinedVersion === targetVerKey ||
            persisted.presentMonDeclinedVersion === 'all')) ||
        (persisted.presentMonDismissedVersion &&
          persisted.presentMonDismissedVersion === targetVerKey);

      const needsAttention =
        evalRes.actionNeeded === 'install_required' ||
        evalRes.actionNeeded === 'update_available' ||
        evalRes.actionNeeded === 'repair_required' ||
        evalRes.actionNeeded === 'close_required_for_update';

      const shouldPrompt =
        effectivePlatform === 'win32' &&
        needsAttention &&
        (!isStartup || !alreadyDismissedOrDeclined);

      if (localInfo.installed && localInfo.healthy && localInfo.executablePath) {
        writePersistedFlags({
          presentMonInstallPath: localInfo.executablePath,
          presentMonVersion: localInfo.installedVersion || persisted.presentMonVersion,
        });
      }

      const checkedAt = Date.now();
      writePersistedFlags({ presentMonLastCheckedAt: checkedAt });

      patchState({
        stage: 'ready',
        actionNeeded: evalRes.actionNeeded,
        installed: localInfo.installed,
        healthy: localInfo.healthy,
        healthIssue: localInfo.healthIssue,
        installSource: localInfo.installSource,
        installedVersion: localInfo.installedVersion,
        executablePath: localInfo.executablePath,
        installDirectory: localInfo.installDirectory,
        cliCapabilities: localInfo.cliCapabilities,
        isRunning: localInfo.isRunning,
        latestRelease: latestResult.release,
        releaseError: latestResult.error,
        releaseErrorCode: latestResult.errorCode,
        shouldPrompt,
        declinedForVersion: persisted.presentMonDeclinedVersion,
        dismissedForVersion: persisted.presentMonDismissedVersion,
        lastCheckedAt: checkedAt,
        statusMessage: localInfo.healthIssue || '',
      });

      if (typeof onDependencyUpdated === 'function') {
        onDependencyUpdated(getState());
      }

      return getState();
    })().finally(() => {
      activeCheckPromise = null;
    });

    return activeCheckPromise;
  }

  async function verifyDownloadedArtifact(stagedFilePath, asset, sha256Actual) {
    if (!fs.existsSync(stagedFilePath)) {
      throw new Error('Staged PresentMon artifact is missing.');
    }

    const stat = fs.statSync(stagedFilePath);
    if (!stat.isFile() || stat.size < MIN_PRESENTMON_EXE_BYTES) {
      throw new Error(`Downloaded PresentMon artifact is too small or incomplete (${stat.size} bytes).`);
    }

    let sha256Verified = false;
    if (asset.expectedSha256) {
      if (sha256Actual.toLowerCase() !== asset.expectedSha256.toLowerCase()) {
        throw new Error(
          `SHA-256 verification failed. Expected ${asset.expectedSha256}, got ${sha256Actual}.`
        );
      }
      sha256Verified = true;
    }

    if (asset.assetKind === 'exe' && !verifyPeHeaderSync(stagedFilePath)) {
      throw new Error('Downloaded file is not a valid Windows x64 executable (invalid PE header).');
    }

    let signatureStatus = 'Skipped (Non-Windows Host)';
    let publisher = null;
    let signatureVerified = false;

    if (effectivePlatform === 'win32') {
      const meta = await readExecutableMetadataWindows(stagedFilePath);
      signatureStatus = meta.signatureStatus;
      publisher = meta.publisher;
      signatureVerified = meta.signatureVerified;

      if (meta.signatureStatus !== 'Valid') {
        throw new Error(
          `Authenticode digital signature check failed (${meta.signatureStatus}). Installation aborted.`
        );
      }
      if (!isTrustedIntelPublisher(meta.publisher || '')) {
        throw new Error(
          `Untrusted digital signature publisher (${meta.publisher || 'Unknown'}). Expected Intel Corporation.`
        );
      }
    }

    const verification = {
      sha256Actual,
      sha256Expected: asset.expectedSha256 || null,
      sha256Verified,
      signatureStatus,
      publisher,
      signatureVerified,
    };

    patchState({ verification });
    return verification;
  }

  async function promoteVerifiedExecutableAtomically(stagedFilePath, release, verification) {
    const toolsDir = getManagedToolsDir();
    const targetExe = getManagedExecutablePath();
    const backupExe = `${targetExe}.bak`;

    await fsp.mkdir(toolsDir, { recursive: true });
    safeRemoveSync(backupExe);

    const hadExisting = fs.existsSync(targetExe);
    if (hadExisting) {
      await fsp.rename(targetExe, backupExe);
    }

    try {
      await fsp.rename(stagedFilePath, targetExe);

      const probe = await probeBinaryFunctionality(targetExe);
      if (!probe.healthy) {
        throw new Error(probe.issue || 'Post-install PresentMon binary verification failed.');
      }

      await writeManagedManifest({
        version: release.version,
        tagName: release.tagName,
        assetName: release.assetName,
        assetKind: release.assetKind,
        assetUrl: release.assetUrl,
        sha256: verification.sha256Actual,
        publisher: verification.publisher,
        installedAt: new Date().toISOString(),
        cliCapabilities: probe.cliCapabilities,
      });

      safeRemoveSync(backupExe);
      return probe;
    } catch (err) {
      // Atomic rollback if promotion or post-check failed
      safeRemoveSync(targetExe);
      if (hadExisting && fs.existsSync(backupExe)) {
        try {
          await fsp.rename(backupExe, targetExe);
        } catch {
          // ignore
        }
      }
      throw err;
    }
  }

  async function extractZipAndFindExecutable(zipPath, extractDir) {
    await fsp.mkdir(extractDir, { recursive: true });
    if (effectivePlatform !== 'win32') {
      throw new Error('Zip extraction fallback runs on Windows desktop.');
    }
    const psScript = [
      '$ErrorActionPreference = "Stop";',
      'Add-Type -AssemblyName System.IO.Compression.FileSystem;',
      '$destFull = [System.IO.Path]::GetFullPath($env:PM_EXTRACT_DIR);',
      'if (-not $destFull.EndsWith([System.IO.Path]::DirectorySeparatorChar)) { $destFull = $destFull + [System.IO.Path]::DirectorySeparatorChar };',
      '$zip = [System.IO.Compression.ZipFile]::OpenRead($env:PM_ZIP_PATH);',
      'try {',
      '  foreach ($entry in $zip.Entries) {',
      '    $full = [System.IO.Path]::GetFullPath([System.IO.Path]::Combine($destFull, $entry.FullName));',
      '    if (-not $full.StartsWith($destFull, [System.StringComparison]::OrdinalIgnoreCase)) {',
      '      throw "Blocked unsafe archive entry path: $($entry.FullName)";',
      '    }',
      '  }',
      '} finally { $zip.Dispose() };',
      'Expand-Archive -LiteralPath $env:PM_ZIP_PATH -DestinationPath $env:PM_EXTRACT_DIR -Force;',
    ].join(' ');
    const res = await execHelper(
      'powershell.exe',
      ['-NoProfile', '-NonInteractive', '-ExecutionPolicy', 'Bypass', '-Command', psScript],
      {
        timeoutMs: 30000,
        env: { ...process.env, PM_ZIP_PATH: zipPath, PM_EXTRACT_DIR: extractDir },
      }
    );
    if (!res.ok) {
      throw new Error(res.stderr || 'Failed to extract PresentMon ZIP package.');
    }
    const found = findPresentMonRecursive(extractDir, 2);
    if (!found) {
      throw new Error('No PresentMon executable found inside downloaded ZIP archive.');
    }
    return found;
  }

  async function installMsiSilently(msiPath) {
    if (effectivePlatform !== 'win32') {
      throw new Error('MSI installation requires Windows.');
    }
    const res = await execHelper(
      'msiexec.exe',
      ['/i', msiPath, '/qn', '/norestart'],
      { timeoutMs: 120000 }
    );
    if (!res.ok && res.code !== 3010) {
      throw new Error(`Windows Installer exited with code ${res.code}.`);
    }
  }

  async function startInstallOrUpdate({ userConfirmed = false, mode = 'auto' } = {}) {
    if (!userConfirmed) {
      return getState();
    }

    if (effectivePlatform !== 'win32') {
      patchState({
        stage: 'error',
        error: 'Automatic PresentMon installation is only supported on Windows 10/11 desktop.',
        statusMessage: 'Automatic PresentMon installation is only supported on Windows 10/11 desktop.',
      });
      return getState();
    }

    if (activeInstallPromise) {
      return activeInstallPromise;
    }

    activeInstallPromise = (async () => {
      const stagingDir = getStagingDir();
      let stagedFilePath = '';
      let extractDir = '';

      try {
        activeAbortController = new AbortController();

        // Ensure any active SecretArea gaming capture is cleanly stopped first
        if (typeof stopActiveGamingCapture === 'function') {
          await Promise.resolve(stopActiveGamingCapture()).catch(() => {});
          await new Promise((resolve) => setTimeout(resolve, 250));
        }

        // Refresh local & latest release info first
        const refreshed = await checkStatus({ isStartup: false, force: true });
        if (!refreshed.latestRelease) {
          throw new Error(refreshed.releaseError || 'Latest PresentMon release metadata could not be retrieved.');
        }

        // Re-check running state in case an external PresentMon process still holds file locks
        const runningExternal = await isPresentMonProcessRunning();
        if (
          runningExternal &&
          (mode === 'update' ||
            mode === 'reinstall' ||
            refreshed.actionNeeded === 'update_available' ||
            refreshed.actionNeeded === 'close_required_for_update')
        ) {
          patchState({
            stage: 'waiting_for_close',
            actionNeeded: 'close_required_for_update',
            isRunning: true,
            error: null,
            statusMessage: 'Please close the active PresentMon instance before updating.',
          });
          return getState();
        }

        const release = refreshed.latestRelease;
        const safeFileName = sanitizeAssetFileName(release.assetName);
        await fsp.mkdir(stagingDir, { recursive: true });
        stagedFilePath = path.resolve(stagingDir, `${safeFileName}.part`);
        if (!stagedFilePath.startsWith(stagingDir + path.sep)) {
          throw new Error('Blocked unsafe staging file path.');
        }
        safeRemoveSync(stagedFilePath);

        patchState({
          stage: 'downloading',
          error: null,
          verification: null,
          shouldPrompt: true,
          downloadProgress: {
            percent: 0,
            downloadedBytes: 0,
            totalBytes: release.assetSizeBytes || 0,
            speedBytesPerSec: 0,
            etaSeconds: null,
          },
          statusMessage: `Downloading ${release.assetName}...`,
        });

        const dlRunner =
          typeof downloadOverride === 'function' ? downloadOverride : downloadFileWithRedirectAndHash;
        const { sha256Actual } = await dlRunner({
          targetUrl: release.assetUrl,
          destPath: stagedFilePath,
          expectedBytes: release.assetSizeBytes,
          signal: activeAbortController.signal,
          onProgress: (progress) => {
            patchState({
              stage: 'downloading',
              downloadProgress: progress,
            });
          },
        });

        patchState({
          stage: 'verifying',
          downloadProgress: {
            percent: 100,
            downloadedBytes: release.assetSizeBytes || state.downloadProgress?.downloadedBytes || 0,
            totalBytes: release.assetSizeBytes || state.downloadProgress?.totalBytes || 0,
            speedBytesPerSec: 0,
            etaSeconds: 0,
          },
          statusMessage: 'Verifying SHA-256 checksum & Intel signature...',
        });

        const verification = await verifyDownloadedArtifact(stagedFilePath, release, sha256Actual);

        patchState({
          stage: 'installing',
          statusMessage: 'Installing PresentMon atomically...',
        });

        if (release.assetKind === 'exe') {
          const renamedStagingExe = path.resolve(stagingDir, safeFileName);
          if (!renamedStagingExe.startsWith(stagingDir + path.sep)) {
            throw new Error('Blocked unsafe staging executable path.');
          }
          safeRemoveSync(renamedStagingExe);
          await fsp.rename(stagedFilePath, renamedStagingExe);
          stagedFilePath = renamedStagingExe;
          await promoteVerifiedExecutableAtomically(stagedFilePath, release, verification);
          stagedFilePath = '';
        } else if (release.assetKind === 'zip') {
          extractDir = path.resolve(stagingDir, `extract-${Date.now()}`);
          const extractedExe = await extractZipAndFindExecutable(stagedFilePath, extractDir);
          safeRemoveSync(stagedFilePath);
          stagedFilePath = '';
          const exeMeta = await readExecutableMetadataWindows(extractedExe);
          if (effectivePlatform === 'win32' && (!exeMeta.signatureVerified || exeMeta.signatureStatus !== 'Valid')) {
            throw new Error('Extracted PresentMon executable failed Intel Authenticode signature check.');
          }
          await promoteVerifiedExecutableAtomically(extractedExe, release, verification);
        } else if (release.assetKind === 'msi') {
          const stagedMsi = path.resolve(stagingDir, safeFileName);
          if (!stagedMsi.startsWith(stagingDir + path.sep)) {
            throw new Error('Blocked unsafe staging MSI path.');
          }
          safeRemoveSync(stagedMsi);
          await fsp.rename(stagedFilePath, stagedMsi);
          stagedFilePath = stagedMsi;
          await installMsiSilently(stagedMsi);
          safeRemoveSync(stagedMsi);
          stagedFilePath = '';
        }

        const postInfo = await detectInstalledPresentMon();
        if (!postInfo.installed || !postInfo.healthy) {
          throw new Error(
            postInfo.healthIssue || 'PresentMon post-installation verification did not succeed.'
          );
        }

        writePersistedFlags({
          presentMonInstallPath: postInfo.executablePath,
          presentMonVersion: postInfo.installedVersion || release.version,
          presentMonDismissedVersion: null,
          presentMonDeclinedVersion: null,
        });

        patchState({
          stage: 'completed',
          actionNeeded: 'up_to_date',
          installed: true,
          healthy: true,
          healthIssue: null,
          installSource: postInfo.installSource,
          installedVersion: postInfo.installedVersion || release.version,
          executablePath: postInfo.executablePath,
          installDirectory: postInfo.installDirectory,
          cliCapabilities: postInfo.cliCapabilities,
          isRunning: postInfo.isRunning,
          shouldPrompt: false,
          declinedForVersion: null,
          dismissedForVersion: null,
          error: null,
          statusMessage: `PresentMon v${postInfo.installedVersion || release.version} installed and verified.`,
        });

        if (typeof onDependencyUpdated === 'function') {
          onDependencyUpdated(getState());
        }
      } catch (err) {
        const isCancelled = err?.code === 'aborted' || activeAbortController?.signal?.aborted;
        const msg = isCancelled
          ? 'Download cancelled by user.'
          : err instanceof Error
          ? err.message
          : String(err || 'PresentMon setup failed.');

        patchState({
          stage: isCancelled ? 'cancelled' : 'error',
          error: isCancelled ? null : msg,
          downloadProgress: null,
          statusMessage: msg,
        });
      } finally {
        if (stagedFilePath) safeRemoveSync(stagedFilePath);
        if (extractDir && fs.existsSync(extractDir)) {
          try {
            fs.rmSync(extractDir, { recursive: true, force: true });
          } catch {
            // ignore
          }
        }
        activeAbortController = null;
        activeInstallPromise = null;
      }

      return getState();
    })();

    return activeInstallPromise;
  }

  function cancelOperation() {
    if (activeAbortController) {
      try {
        activeAbortController.abort('user_cancelled');
      } catch {
        // ignore
      }
    }
    return getState();
  }

  function dismissPrompt({ declinePermanently = false } = {}) {
    const targetVerKey =
      state.actionNeeded === 'repair_required'
        ? 'repair'
        : state.latestRelease?.version || 'initial';

    writePersistedFlags({
      presentMonDismissedVersion: targetVerKey,
      ...(declinePermanently ? { presentMonDeclinedVersion: targetVerKey } : {}),
    });

    patchState({
      shouldPrompt: false,
      dismissedForVersion: targetVerKey,
      ...(declinePermanently ? { declinedForVersion: targetVerKey } : {}),
    });
    return getState();
  }

  function openOfficialReleasesPage() {
    void shell.openExternal(OFFICIAL_PRESENTMON_RELEASES_URL);
    return true;
  }

  function getActiveExecutableInfo() {
    if (state.installed && state.healthy && state.executablePath && fs.existsSync(state.executablePath)) {
      return {
        available: true,
        path: state.executablePath,
        version: state.installedVersion,
        cliCapabilities: state.cliCapabilities,
      };
    }
    const managedExe = getManagedExecutablePath();
    if (fs.existsSync(managedExe)) {
      try {
        const st = fs.statSync(managedExe);
        if (st.size >= MIN_PRESENTMON_EXE_BYTES && verifyPeHeaderSync(managedExe)) {
          const manifest = readManagedManifest();
          return {
            available: true,
            path: managedExe,
            version: manifest?.version || null,
            cliCapabilities: manifest?.cliCapabilities || null,
          };
        }
      } catch {
        // ignore
      }
    }
    return { available: false, path: null, version: null, cliCapabilities: null };
  }

  function registerIpc(ipcMain, isTrustedSender) {
    ipcMain.handle('presentmon-setup:get-state', (event) => {
      if (!isTrustedSender(event)) return null;
      return getState();
    });

    ipcMain.handle('presentmon-setup:check', async (event, opts) => {
      if (!isTrustedSender(event)) return null;
      return checkStatus({ isStartup: false, force: Boolean(opts?.force ?? true) });
    });

    ipcMain.handle('presentmon-setup:install', async (event, opts) => {
      if (!isTrustedSender(event)) return null;
      return startInstallOrUpdate({
        userConfirmed: Boolean(opts?.userConfirmed),
        mode: opts?.mode || 'auto',
      });
    });

    ipcMain.handle('presentmon-setup:cancel', (event) => {
      if (!isTrustedSender(event)) return null;
      return cancelOperation();
    });

    ipcMain.handle('presentmon-setup:dismiss', (event, opts) => {
      if (!isTrustedSender(event)) return null;
      return dismissPrompt({ declinePermanently: Boolean(opts?.declinePermanently) });
    });

    ipcMain.handle('presentmon-setup:open-official', (event) => {
      if (!isTrustedSender(event)) return false;
      return openOfficialReleasesPage();
    });
  }

  function initStartupCheck() {
    if (effectivePlatform !== 'win32') {
      patchState({
        stage: 'ready',
        actionNeeded: 'unsupported_os',
        shouldPrompt: false,
        statusMessage: 'PresentMon frame-time telemetry requires Windows.',
      });
      return;
    }
    setTimeout(() => {
      void checkStatus({ isStartup: true, force: false });
    }, 2400);
  }

  function shutdown() {
    cancelOperation();
    // Clean up any leftover staging temp artifacts safely
    const stagingDir = getStagingDir();
    if (fs.existsSync(stagingDir)) {
      try {
        fs.rmSync(stagingDir, { recursive: true, force: true });
      } catch {
        // ignore
      }
    }
  }

  return {
    getState,
    getActiveExecutableInfo,
    detectInstalledPresentMon,
    checkStatus,
    startInstallOrUpdate,
    cancelOperation,
    dismissPrompt,
    registerIpc,
    initStartupCheck,
    shutdown,
  };
}

module.exports = {
  createPresentMonManager,
  isAllowedPresentMonUrl,
  normalizeVersionString,
  compareSemver,
  parseDigestString,
  parseSha256ForFile,
  selectBestPresentMonReleaseAsset,
  evaluatePresentMonVersionAction,
  verifyPeHeaderSync,
  parseCliHelpOutput,
  isTrustedIntelPublisher,
  GITHUB_PRESENTMON_API_LATEST,
  OFFICIAL_PRESENTMON_RELEASES_URL,
  MIN_PRESENTMON_EXE_BYTES,
};
