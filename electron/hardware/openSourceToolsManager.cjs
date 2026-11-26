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
const zlib = require('zlib');
const { inspectDllFileMetadata } = require('./lhmLibBridge.cjs');

const USER_AGENT = 'SecretArea-Desktop/1.0 (+https://github.com/secretarea1337/secretarea-desktop)';

const ALLOWED_TOOL_HOSTS = [
  'api.github.com',
  'github.com',
  'objects.githubusercontent.com',
  'release-assets.githubusercontent.com',
  'codeload.github.com',
  'api.nuget.org',
];

const APPROVED_OSS_TOOLS = Object.freeze({
  librehardwaremonitor: Object.freeze({
    id: 'librehardwaremonitor',
    name: 'LibreHardwareMonitorLib',
    displayName: 'LibreHardwareMonitor (LibreHardwareMonitorLib)',
    category: 'sensors_telemetry',
    eligible: true,
    licenseId: 'MPL-2.0',
    licenseName: 'Mozilla Public License 2.0',
    licenseUrl: 'https://github.com/LibreHardwareMonitor/LibreHardwareMonitor/blob/master/LICENSE',
    repositoryUrl: 'https://github.com/LibreHardwareMonitor/LibreHardwareMonitor',
    websiteUrl: 'https://github.com/LibreHardwareMonitor/LibreHardwareMonitor',
    sourceCodeUrl: 'https://github.com/LibreHardwareMonitor/LibreHardwareMonitor',
    nugetUrl: 'https://www.nuget.org/packages/LibreHardwareMonitorLib/',
    officialReleasesUrl: 'https://github.com/LibreHardwareMonitor/LibreHardwareMonitor/releases/latest',
    releasesLatestApiUrl: 'https://api.github.com/repos/LibreHardwareMonitor/LibreHardwareMonitor/releases/latest',
    nugetIndexApiUrl: 'https://api.nuget.org/v3-flatcontainer/librehardwaremonitorlib/index.json',
    nugetNuspecTemplateUrl:
      'https://api.nuget.org/v3-flatcontainer/librehardwaremonitorlib/{version}/librehardwaremonitorlib.nuspec',
    nugetPackageTemplateUrl:
      'https://api.nuget.org/v3-flatcontainer/librehardwaremonitorlib/{version}/librehardwaremonitorlib.{version}.nupkg',
    supportsDirectLibrary: true,
    requiresStandaloneGui: false,
    requiresPermanentAdmin: false,
    description:
      'Open-source hardware sensor engine integrated directly via LibreHardwareMonitorLib.dll for CPU, GPU, motherboard, VRM, RAM, storage, fan RPM, voltage, clock, and power telemetry.',
    adminNote:
      'Runs safely under a standard user account for GPU, NVMe/storage, and memory telemetry. Kernel-level Ring0 motherboard SuperIO, VRM, voltage, and fan RPM sensors may require Administrator privileges when accessed.',
  }),
});

/**
 * Policy audit record of evaluated proprietary utilities that are permanently excluded.
 * These entries are NEVER offered in the UI, NEVER downloaded, NEVER bundled, and NEVER executed.
 */
const EXCLUDED_PROPRIETARY_TOOLS_POLICY = Object.freeze([
  Object.freeze({
    id: 'hwinfo64',
    name: 'HWiNFO64',
    officialUrl: 'https://www.hwinfo.com/download/',
    eligible: false,
    licenseClassification: 'Proprietary closed-source freeware (non-commercial free; Pro license for commercial use)',
    reason: 'Closed-source proprietary software; source code is not open source and redistribution is restricted.',
  }),
  Object.freeze({
    id: 'cpuz',
    name: 'CPU-Z',
    officialUrl: 'https://www.cpuid.com/softwares/cpu-z.html',
    eligible: false,
    licenseClassification: 'Proprietary closed-source freeware (CPUID)',
    reason: 'Closed-source proprietary software; no OSI-approved open-source license.',
  }),
  Object.freeze({
    id: 'gpuz',
    name: 'GPU-Z',
    officialUrl: 'https://www.techpowerup.com/gpuz/',
    eligible: false,
    licenseClassification: 'Proprietary closed-source freeware (TechPowerUp)',
    reason: 'Closed-source proprietary software; no OSI-approved open-source license.',
  }),
]);

const MAX_EXTRACTED_TOTAL_BYTES = 128 * 1024 * 1024;
const MAX_ZIP_ENTRIES = 2500;
const AUTO_CHECK_COOLDOWN_MS = 6 * 60 * 60 * 1000;

function isApprovedToolId(toolId) {
  return typeof toolId === 'string' && Object.prototype.hasOwnProperty.call(APPROVED_OSS_TOOLS, toolId);
}

function getApprovedToolCatalog() {
  return Object.values(APPROVED_OSS_TOOLS);
}

function isPrivateOrLoopbackHost(hostname) {
  const h = String(hostname || '').toLowerCase();
  if (!h) return true;
  if (h === 'localhost' || h.endsWith('.local') || h.endsWith('.internal')) return true;
  if (/^\d{1,3}(?:\.\d{1,3}){3}$/.test(h)) return true;
  if (h.includes(':')) return true;
  return false;
}

function isAllowedToolUrl(rawUrl) {
  if (typeof rawUrl !== 'string' || !rawUrl.trim()) return false;
  try {
    const parsed = new URL(rawUrl.trim());
    if (parsed.protocol !== 'https:') return false;
    if (parsed.username || parsed.password) return false;
    const host = parsed.hostname.toLowerCase();
    if (isPrivateOrLoopbackHost(host)) return false;
    return ALLOWED_TOOL_HOSTS.some((allowed) => host === allowed || host.endsWith(`.${allowed}`));
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

function cleanReleaseNotes(rawBody) {
  if (typeof rawBody !== 'string') return null;
  const trimmed = rawBody.replace(/\r\n/g, '\n').trim();
  if (!trimmed) return null;
  return trimmed.slice(0, 6000);
}

function selectBestStableNugetPackage(nugetIndexJson, toolMeta = APPROVED_OSS_TOOLS.librehardwaremonitor) {
  if (!nugetIndexJson || !Array.isArray(nugetIndexJson.versions)) return null;
  const stableVersions = nugetIndexJson.versions
    .map((v) => String(v || '').trim())
    .filter((v) => /^\d+\.\d+\.\d+(?:\.\d+)?$/.test(v)); // Rejects -pre*, -alpha*, -beta*, -rc*
  if (stableVersions.length === 0) return null;

  stableVersions.sort((a, b) => compareSemver(b, a));
  const latest = stableVersions[0];
  const downloadUrl = toolMeta.nugetPackageTemplateUrl.replace(/\{version\}/g, encodeURIComponent(latest));
  if (!isAllowedToolUrl(downloadUrl)) return null;

  return {
    sourceType: 'nuget',
    version: normalizeVersionString(latest),
    rawVersion: latest,
    tagName: `v${latest}`,
    releaseName: `${toolMeta.name} ${latest} (NuGet)`,
    releaseDate: null,
    releaseNotes: `Official NuGet package ${toolMeta.name} v${latest} (MPL-2.0).`,
    releaseUrl: toolMeta.nugetUrl,
    assetName: `librehardwaremonitorlib.${latest}.nupkg`,
    assetSizeBytes: null,
    assetKind: 'nupkg',
    downloadUrl,
    expectedSha256: null,
    checksumAssetUrl: null,
  };
}

function selectBestStableReleaseAsset(
  releaseJson,
  nugetIndexJson = null,
  toolMeta = APPROVED_OSS_TOOLS.librehardwaremonitor
) {
  if (releaseJson && typeof releaseJson === 'object') {
    if (releaseJson.draft || releaseJson.prerelease) {
      // Strictly reject draft/prerelease GitHub releases
      return selectBestStableNugetPackage(nugetIndexJson, toolMeta);
    }

    const tagName = String(releaseJson.tag_name || '').trim();
    const version = normalizeVersionString(tagName || releaseJson.name || '');
    const assets = Array.isArray(releaseJson.assets) ? releaseJson.assets : [];

    const usableAssets = assets.filter((asset) => {
      const name = String(asset?.name || '');
      const lower = name.toLowerCase();
      const url = String(asset?.browser_download_url || '');
      if (!name || !isAllowedToolUrl(url)) return false;
      if (
        lower.includes('symbol') ||
        lower.includes('.pdb') ||
        lower.includes('source') ||
        lower.includes('arm64') ||
        lower.includes('x86') ||
        lower.includes('win32') ||
        lower.endsWith('.sha256') ||
        lower.endsWith('.asc') ||
        lower.endsWith('.sig')
      ) {
        return false;
      }
      return lower.endsWith('.zip') || lower.endsWith('.nupkg');
    });

    // Prefer universal .NET Framework 4.7.2 build (works on Windows 10/11 built-in .NET without extra runtime)
    let selected =
      usableAssets.find(
        (a) => /^librehardwaremonitor\.zip$/i.test(String(a.name || ''))
      ) ||
      usableAssets.find(
        (a) => /\.zip$/i.test(String(a.name || '')) && !/\.net\.\d+/i.test(String(a.name || ''))
      ) ||
      usableAssets.find((a) => /\.nupkg$/i.test(String(a.name || ''))) ||
      null;

    if (version && selected) {
      const releaseUrl =
        typeof releaseJson.html_url === 'string' && isAllowedToolUrl(releaseJson.html_url)
          ? releaseJson.html_url
          : toolMeta.officialReleasesUrl;
      const expectedSha256 =
        parseDigestString(selected.digest) || parseSha256ForFile(releaseJson.body, selected.name);
      const checksumAsset = assets.find((a) => {
        const lower = String(a?.name || '').toLowerCase();
        const url = String(a?.browser_download_url || '');
        if (!isAllowedToolUrl(url)) return false;
        return (
          lower === `${String(selected.name).toLowerCase()}.sha256` ||
          lower.includes('sha256sum') ||
          lower.includes('checksums')
        );
      });

      return {
        sourceType: 'github_release',
        version,
        rawVersion: tagName || version,
        tagName: tagName || `v${version}`,
        releaseName: String(releaseJson.name || tagName || version).trim(),
        releaseDate:
          typeof releaseJson.published_at === 'string' ? releaseJson.published_at : null,
        releaseNotes: cleanReleaseNotes(releaseJson.body),
        releaseUrl,
        assetName: String(selected.name),
        assetSizeBytes: Number.isFinite(Number(selected.size)) ? Number(selected.size) : null,
        assetKind: String(selected.name).toLowerCase().endsWith('.nupkg') ? 'nupkg' : 'zip',
        downloadUrl: String(selected.browser_download_url),
        expectedSha256,
        checksumAssetUrl: checksumAsset ? String(checksumAsset.browser_download_url) : null,
      };
    }

    // Release exists cleanly on GitHub, but has no compatible Windows binary asset -> use NuGet fallback
    const nugetFallback = selectBestStableNugetPackage(nugetIndexJson, toolMeta);
    if (nugetFallback) {
      return {
        ...nugetFallback,
        releaseDate:
          typeof releaseJson.published_at === 'string' ? releaseJson.published_at : nugetFallback.releaseDate,
        releaseNotes: cleanReleaseNotes(releaseJson.body) || nugetFallback.releaseNotes,
      };
    }

    return null;
  }

  return selectBestStableNugetPackage(nugetIndexJson, toolMeta);
}

function evaluateToolUpdateState({ installed, healthy, installedVersion, latestVersion }) {
  if (!installed) {
    return 'install_required';
  }
  if (!healthy) {
    return 'repair_required';
  }
  const latestNorm = normalizeVersionString(latestVersion);
  const instNorm = normalizeVersionString(installedVersion);
  if (!latestNorm || !instNorm) {
    return 'up_to_date';
  }
  const cmp = compareSemver(latestNorm, instNorm);
  if (cmp > 0) return 'update_available';
  if (cmp < 0) return 'newer_installed';
  return 'up_to_date';
}

function sanitizeZipEntryPath(rawName) {
  const normalized = String(rawName || '')
    .replace(/\\/g, '/')
    .replace(/^\/+/, '');
  if (!normalized || normalized.includes('\0')) return null;
  const parts = normalized.split('/').filter((p) => p && p !== '.');
  if (parts.length === 0 || parts.some((p) => p === '..' || /^[a-zA-Z]:$/.test(p))) {
    return null;
  }
  return parts.join('/');
}

/**
 * Pure-Node safe ZIP / NUPKG extractor with Zip-Slip & extraction size limits.
 */
async function extractZipArchiveSafely(zipFilePath, destDir) {
  const buf = await fsp.readFile(zipFilePath);
  if (buf.length < 22) {
    throw new Error('Archive file is truncated or invalid.');
  }

  // Locate End of Central Directory (0x06054b50) scanning from end
  const minOffset = Math.max(0, buf.length - 65557);
  let eocdOffset = -1;
  for (let i = buf.length - 22; i >= minOffset; i--) {
    if (buf.readUInt32LE(i) === 0x06054b50) {
      eocdOffset = i;
      break;
    }
  }
  if (eocdOffset === -1) {
    throw new Error('Invalid ZIP archive: End of Central Directory record missing.');
  }

  const totalEntries = buf.readUInt16LE(eocdOffset + 10);
  const cdOffset = buf.readUInt32LE(eocdOffset + 16);
  if (totalEntries > MAX_ZIP_ENTRIES) {
    throw new Error('Archive exceeds maximum allowed entry count.');
  }
  if (cdOffset >= buf.length) {
    throw new Error('Invalid ZIP Central Directory offset.');
  }

  const resolvedDest = path.resolve(destDir);
  await fsp.mkdir(resolvedDest, { recursive: true });

  let cursor = cdOffset;
  let totalWrittenBytes = 0;

  for (let idx = 0; idx < totalEntries; idx++) {
    if (cursor + 46 > buf.length || buf.readUInt32LE(cursor) !== 0x02014b50) {
      throw new Error('Corrupted ZIP Central Directory header.');
    }
    const compressionMethod = buf.readUInt16LE(cursor + 10);
    const compressedSize = buf.readUInt32LE(cursor + 20);
    const uncompressedSize = buf.readUInt32LE(cursor + 24);
    const fileNameLen = buf.readUInt16LE(cursor + 28);
    const extraLen = buf.readUInt16LE(cursor + 30);
    const commentLen = buf.readUInt16LE(cursor + 32);
    const localHeaderOffset = buf.readUInt32LE(cursor + 42);

    const rawName = buf.toString('utf8', cursor + 46, cursor + 46 + fileNameLen);
    cursor += 46 + fileNameLen + extraLen + commentLen;

    const safeRel = sanitizeZipEntryPath(rawName);
    if (!safeRel) continue;
    if (rawName.endsWith('/')) continue;

    if (uncompressedSize > MAX_EXTRACTED_TOTAL_BYTES || totalWrittenBytes + uncompressedSize > MAX_EXTRACTED_TOTAL_BYTES) {
      throw new Error('Archive expanded size exceeds safety limit.');
    }

    if (localHeaderOffset + 30 > buf.length || buf.readUInt32LE(localHeaderOffset) !== 0x04034b50) {
      throw new Error(`Invalid local file header for ${safeRel}.`);
    }
    const localNameLen = buf.readUInt16LE(localHeaderOffset + 26);
    const localExtraLen = buf.readUInt16LE(localHeaderOffset + 28);
    const dataStart = localHeaderOffset + 30 + localNameLen + localExtraLen;
    const dataEnd = dataStart + compressedSize;
    if (dataEnd > buf.length) {
      throw new Error(`Truncated compressed payload for ${safeRel}.`);
    }

    const compressedSlice = buf.subarray(dataStart, dataEnd);
    let content;
    if (compressionMethod === 0) {
      content = compressedSlice;
    } else if (compressionMethod === 8) {
      content = zlib.inflateRawSync(compressedSlice, { maxOutputLength: MAX_EXTRACTED_TOTAL_BYTES });
    } else {
      throw new Error(`Unsupported ZIP compression method (${compressionMethod}) for ${safeRel}.`);
    }

    totalWrittenBytes += content.length;
    if (totalWrittenBytes > MAX_EXTRACTED_TOTAL_BYTES) {
      throw new Error('Archive expanded size exceeds safety limit.');
    }

    const outPath = path.resolve(resolvedDest, safeRel);
    if (outPath !== resolvedDest && !outPath.startsWith(resolvedDest + path.sep)) {
      throw new Error('Blocked unsafe path traversal inside archive.');
    }

    await fsp.mkdir(path.dirname(outPath), { recursive: true });
    await fsp.writeFile(outPath, content);
  }
}

function findFileRecursiveSync(rootDir, targetFileName, preferSubpathRegex = null) {
  if (!rootDir || !fs.existsSync(rootDir)) return [];
  const matches = [];
  const walk = (dir, depth) => {
    if (depth > 5) return;
    let entries = [];
    try {
      entries = fs.readdirSync(dir, { withFileTypes: true });
    } catch {
      return;
    }
    for (const ent of entries) {
      const full = path.join(dir, ent.name);
      if (ent.isFile() && ent.name.toLowerCase() === targetFileName.toLowerCase()) {
        matches.push(full);
      } else if (ent.isDirectory()) {
        walk(full, depth + 1);
      }
    }
  };
  walk(rootDir, 0);
  if (preferSubpathRegex && matches.length > 1) {
    const preferred = matches.find((m) => preferSubpathRegex.test(m.replace(/\\/g, '/')));
    if (preferred) return [preferred, ...matches.filter((m) => m !== preferred)];
  }
  return matches;
}

function fetchHttpsJsonWithRateLimit(targetUrl, acceptHeader = 'application/vnd.github+json,application/json') {
  return new Promise((resolve, reject) => {
    if (!isAllowedToolUrl(targetUrl)) {
      reject(new Error('Blocked request to unapproved host.'));
      return;
    }

    const req = https.get(
      targetUrl,
      {
        timeout: 8000,
        headers: {
          'User-Agent': USER_AGENT,
          Accept: acceptHeader,
        },
      },
      (res) => {
        const status = res.statusCode || 0;
        const rateLimitRemaining = res.headers['x-ratelimit-remaining'];
        const rateLimitReset = res.headers['x-ratelimit-reset'];

        if (status === 403 || status === 429) {
          res.resume();
          const isRateLimit = rateLimitRemaining === '0' || status === 429;
          const resetDate = rateLimitReset ? new Date(Number(rateLimitReset) * 1000).toLocaleTimeString() : null;
          const err = new Error(
            isRateLimit
              ? `GitHub API rate limit reached${resetDate ? ` (resets at ${resetDate})` : ''}. Official NuGet fallback remains available.`
              : `Upstream API returned HTTP ${status}.`
          );
          err.code = isRateLimit ? 'rate_limited' : `http_${status}`;
          reject(err);
          return;
        }

        if (status !== 200) {
          res.resume();
          const err = new Error(`Upstream API returned HTTP ${status}.`);
          err.code = `http_${status}`;
          reject(err);
          return;
        }

        let body = '';
        res.setEncoding('utf8');
        res.on('data', (chunk) => {
          if (body.length < 1024 * 1024) {
            body += chunk;
          }
        });
        res.on('end', () => {
          try {
            resolve({
              data: JSON.parse(body),
              rateLimitRemaining: rateLimitRemaining !== undefined ? Number(rateLimitRemaining) : null,
            });
          } catch {
            reject(new Error('Invalid JSON response from upstream API.'));
          }
        });
      }
    );

    req.on('timeout', () => {
      req.destroy(new Error('Timed out connecting to official release server.'));
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

function fetchHttpsText(targetUrl, maxBytes = 128 * 1024, maxRedirects = 4) {
  return new Promise((resolve) => {
    if (!isAllowedToolUrl(targetUrl)) {
      resolve(null);
      return;
    }
    const req = https.get(
      targetUrl,
      {
        timeout: 6500,
        headers: { 'User-Agent': USER_AGENT, Accept: 'text/plain,*/*' },
      },
      (res) => {
        const status = res.statusCode || 0;
        if ([301, 302, 307, 308].includes(status) && res.headers.location && maxRedirects > 0) {
          res.resume();
          try {
            const nextUrl = new URL(res.headers.location, targetUrl).toString();
            fetchHttpsText(nextUrl, maxBytes, maxRedirects - 1).then(resolve);
          } catch {
            resolve(null);
          }
          return;
        }
        if (status < 200 || status >= 300) {
          res.resume();
          resolve(null);
          return;
        }
        let body = '';
        res.setEncoding('utf8');
        res.on('data', (chunk) => {
          if (body.length < maxBytes) body += chunk;
        });
        res.on('end', () => resolve(body));
      }
    );
    req.on('timeout', () => {
      req.destroy();
      resolve(null);
    });
    req.on('error', () => resolve(null));
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

    if (!isAllowedToolUrl(targetUrl)) {
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
            reject(new Error('Too many HTTP redirects while downloading tool archive.'));
            return;
          }
          let nextUrl;
          try {
            nextUrl = new URL(res.headers.location, targetUrl).toString();
          } catch {
            reject(new Error('Invalid redirect URL while downloading tool archive.'));
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
          reject(new Error(`Official archive download failed with HTTP ${status}.`));
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
      req.destroy(new Error('Download connection timed out.'));
    });

    req.on('error', (err) => {
      reject(err);
    });
  });
}

async function copyDirRecursive(srcDir, destDir) {
  await fsp.mkdir(destDir, { recursive: true });
  const entries = await fsp.readdir(srcDir, { withFileTypes: true });
  for (const ent of entries) {
    const srcPath = path.join(srcDir, ent.name);
    const destPath = path.join(destDir, ent.name);
    if (ent.isDirectory()) {
      await copyDirRecursive(srcPath, destPath);
    } else if (ent.isFile()) {
      await fsp.copyFile(srcPath, destPath);
    }
  }
}

async function safeRemoveRecursive(targetPath) {
  if (!targetPath) return;
  try {
    await fsp.rm(targetPath, { recursive: true, force: true });
  } catch {
    // ignore cleanup failure
  }
}

function createOpenSourceToolsManager({
  getMainWindow,
  getUserDataPath,
  readSettings,
  writeSettings,
  platformOverride,
  fetchGithubReleaseOverride,
  fetchNugetIndexOverride,
  fetchTextOverride,
  downloadOverride,
  inspectDllOverride,
  onToolInstalledOrRolledBack,
} = {}) {
  const effectivePlatform = platformOverride || process.platform;
  const fetchGithub = fetchGithubReleaseOverride || fetchHttpsJsonWithRateLimit;
  const fetchNuget = fetchNugetIndexOverride || ((url) => fetchHttpsJsonWithRateLimit(url, 'application/json'));
  const fetchText = fetchTextOverride || fetchHttpsText;
  const runDownload = downloadOverride || downloadFileWithRedirectAndHash;
  const inspectDll = inspectDllOverride || ((p) => inspectDllFileMetadata(p, { platformOverride: effectivePlatform }));

  let activeAbortController = null;
  let activeInstallPromise = null;
  let activeCheckPromise = null;

  function resolveToolsBaseDir() {
    const userData =
      typeof getUserDataPath === 'function' && getUserDataPath()
        ? getUserDataPath()
        : typeof app?.getPath === 'function'
        ? app.getPath('userData')
        : process.cwd();
    return path.join(userData, 'tools');
  }

  function getToolPaths(toolId) {
    const base = path.join(resolveToolsBaseDir(), toolId);
    return {
      baseDir: base,
      currentDir: path.join(base, 'current'),
      backupDir: path.join(base, 'backup'),
      manifestPath: path.join(base, 'current', 'secretarea-tool-manifest.json'),
      backupManifestPath: path.join(base, 'backup', 'secretarea-tool-manifest.json'),
    };
  }

  function readManifestSync(manifestPath) {
    try {
      if (!fs.existsSync(manifestPath)) return null;
      const parsed = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
      return parsed && typeof parsed === 'object' ? parsed : null;
    } catch {
      return null;
    }
  }

  function buildInitialToolItem(meta) {
    return {
      id: meta.id,
      name: meta.name,
      displayName: meta.displayName,
      category: meta.category,
      licenseId: meta.licenseId,
      licenseName: meta.licenseName,
      licenseUrl: meta.licenseUrl,
      repositoryUrl: meta.repositoryUrl,
      websiteUrl: meta.websiteUrl,
      sourceCodeUrl: meta.sourceCodeUrl,
      nugetUrl: meta.nugetUrl,
      officialReleasesUrl: meta.officialReleasesUrl,
      supportsDirectLibrary: meta.supportsDirectLibrary,
      requiresStandaloneGui: meta.requiresStandaloneGui,
      requiresPermanentAdmin: meta.requiresPermanentAdmin,
      description: meta.description,
      adminNote: meta.adminNote,
      stage: 'idle', // idle | checking | ready | downloading | verifying | installing | completed | error | cancelled
      statusBadge: 'not_installed', // not_installed | installed | update_available | up_to_date | newer_installed | repair_required
      actionNeeded: 'install_required',
      installed: false,
      healthy: false,
      healthIssue: null,
      installedVersion: null,
      installedSource: null,
      installDirectory: null,
      libraryPath: null,
      hasBackup: false,
      backupVersion: null,
      latestRelease: null,
      updateAvailable: false,
      lastCheckedAt: null,
      lastRateLimitRemaining: null,
      progress: null,
      verification: null,
      error: null,
    };
  }

  const toolsState = {
    librehardwaremonitor: buildInitialToolItem(APPROVED_OSS_TOOLS.librehardwaremonitor),
  };

  let managerMeta = {
    platform: effectivePlatform,
    platformSupported: effectivePlatform === 'win32',
    isElevated: null,
    approvedCount: Object.keys(APPROVED_OSS_TOOLS).length,
    policySummary: 'Only verified free and open-source tools with compatible OSI licenses are eligible.',
  };

  function emitState() {
    const win = typeof getMainWindow === 'function' ? getMainWindow() : null;
    if (win && !win.isDestroyed()) {
      win.webContents.send('oss-tools:status', getSnapshot());
    }
  }

  function patchToolState(toolId, patch, emit = true) {
    if (!isApprovedToolId(toolId)) return;
    Object.assign(toolsState[toolId], patch);
    if (emit) emitState();
  }

  function getSnapshot() {
    return {
      ...managerMeta,
      tools: Object.values(toolsState).map((t) => ({
        ...t,
        latestRelease: t.latestRelease ? { ...t.latestRelease } : null,
        progress: t.progress ? { ...t.progress } : null,
        verification: t.verification ? { ...t.verification } : null,
      })),
    };
  }

  async function refreshInstalledStatus(toolId = 'librehardwaremonitor') {
    if (!isApprovedToolId(toolId)) return null;
    const meta = APPROVED_OSS_TOOLS[toolId];
    const paths = getToolPaths(toolId);
    const currentManifest = readManifestSync(paths.manifestPath);
    const backupManifest = readManifestSync(paths.backupManifestPath);

    let dllCandidates = findFileRecursiveSync(
      paths.currentDir,
      'LibreHardwareMonitorLib.dll',
      /net472|net4/i
    );
    const backupDllCandidates = findFileRecursiveSync(
      paths.backupDir,
      'LibreHardwareMonitorLib.dll',
      /net472|net4/i
    );

    const dllPath = dllCandidates[0] || null;
    let installed = Boolean(dllPath);
    let healthy = false;
    let healthIssue = null;
    let installedVersion = currentManifest?.version || null;

    if (dllPath) {
      const dllMeta = await inspectDll(dllPath).catch(() => ({ validPe: false, fileVersion: null }));
      if (!dllMeta?.validPe) {
        healthy = false;
        healthIssue = 'Installed LibreHardwareMonitorLib.dll failed binary integrity verification.';
      } else {
        healthy = true;
        if (!installedVersion && dllMeta.fileVersion) {
          installedVersion = normalizeVersionString(dllMeta.fileVersion);
        }
      }
    }

    const latestVersion = toolsState[toolId].latestRelease?.version || null;
    const actionNeeded = evaluateToolUpdateState({
      installed,
      healthy,
      installedVersion,
      latestVersion,
    });
    const statusBadge = !installed
      ? 'not_installed'
      : !healthy
      ? 'repair_required'
      : actionNeeded === 'update_available'
      ? 'update_available'
      : actionNeeded === 'newer_installed'
      ? 'newer_installed'
      : 'up_to_date';

    const hasBackup = Boolean(backupDllCandidates[0]);
    const backupVersion = hasBackup ? backupManifest?.version || null : null;

    // Also hydrate persisted last check metadata from launcher settings
    const settings = typeof readSettings === 'function' ? readSettings() : {};
    const persistedTool = settings?.openSourceTools?.[toolId] || null;

    patchToolState(
      toolId,
      {
        installed,
        healthy,
        healthIssue,
        installedVersion,
        installedSource: currentManifest?.sourceType || (installed ? 'managed' : null),
        installDirectory: installed ? paths.currentDir : null,
        libraryPath: dllPath,
        hasBackup,
        backupVersion,
        actionNeeded,
        statusBadge,
        updateAvailable: actionNeeded === 'update_available',
        lastCheckedAt: toolsState[toolId].lastCheckedAt || persistedTool?.lastCheckedAt || null,
        latestRelease: toolsState[toolId].latestRelease || persistedTool?.latestRelease || null,
        verification: currentManifest?.verification || toolsState[toolId].verification || null,
      },
      false
    );

    // Recompute update state if persisted latestRelease existed
    if (toolsState[toolId].latestRelease?.version) {
      const recomputed = evaluateToolUpdateState({
        installed,
        healthy,
        installedVersion,
        latestVersion: toolsState[toolId].latestRelease.version,
      });
      patchToolState(
        toolId,
        {
          actionNeeded: recomputed,
          updateAvailable: recomputed === 'update_available',
          statusBadge: !installed
            ? 'not_installed'
            : !healthy
            ? 'repair_required'
            : recomputed === 'update_available'
            ? 'update_available'
            : recomputed === 'newer_installed'
            ? 'newer_installed'
            : 'up_to_date',
        },
        false
      );
    }

    return toolsState[toolId];
  }

  function persistToolSettings(toolId, data) {
    if (typeof writeSettings !== 'function') return;
    try {
      const existing = typeof readSettings === 'function' ? readSettings() : {};
      const prevMap = existing?.openSourceTools && typeof existing.openSourceTools === 'object' ? existing.openSourceTools : {};
      writeSettings({
        openSourceTools: {
          ...prevMap,
          [toolId]: {
            ...(prevMap[toolId] || {}),
            ...data,
          },
        },
      });
    } catch {
      // ignore settings write errors
    }
  }

  async function checkUpdates({ toolId = 'librehardwaremonitor', force = true } = {}) {
    if (!isApprovedToolId(toolId)) {
      return { ok: false, error: 'Requested tool is not approved under SecretArea open-source policy.', state: getSnapshot() };
    }

    if (activeCheckPromise && !force) {
      return activeCheckPromise;
    }

    activeCheckPromise = (async () => {
      const meta = APPROVED_OSS_TOOLS[toolId];
      await refreshInstalledStatus(toolId);

      patchToolState(toolId, {
        stage: 'checking',
        error: null,
      });

      let githubReleaseJson = null;
      let nugetIndexJson = null;
      let githubError = null;
      let nugetError = null;
      let rateLimitRemaining = null;

      try {
        const ghRes = await fetchGithub(meta.releasesLatestApiUrl);
        githubReleaseJson = ghRes?.data || ghRes;
        if (typeof ghRes?.rateLimitRemaining === 'number' && Number.isFinite(ghRes.rateLimitRemaining)) {
          rateLimitRemaining = ghRes.rateLimitRemaining;
        }
      } catch (err) {
        githubError = err;
      }

      // Check whether GitHub yielded a usable release asset; if not or if GitHub failed/rate-limited, query official NuGet
      let candidate = selectBestStableReleaseAsset(githubReleaseJson, null, meta);
      if (!candidate) {
        try {
          const nuRes = await fetchNuget(meta.nugetIndexApiUrl);
          nugetIndexJson = nuRes?.data || nuRes;
          candidate = selectBestStableReleaseAsset(githubReleaseJson, nugetIndexJson, meta);
        } catch (err) {
          nugetError = err;
        }
      }

      const checkedAt = new Date().toISOString();

      if (!candidate) {
        const errMsg =
          githubError?.message ||
          nugetError?.message ||
          'Unable to resolve a verified stable release from GitHub or NuGet.';
        patchToolState(toolId, {
          stage: 'error',
          error: errMsg,
          lastCheckedAt: checkedAt,
          lastRateLimitRemaining: rateLimitRemaining,
        });
        return { ok: false, error: errMsg, state: getSnapshot() };
      }

      const cur = toolsState[toolId];
      const actionNeeded = evaluateToolUpdateState({
        installed: cur.installed,
        healthy: cur.healthy,
        installedVersion: cur.installedVersion,
        latestVersion: candidate.version,
      });

      const statusBadge = !cur.installed
        ? 'not_installed'
        : !cur.healthy
        ? 'repair_required'
        : actionNeeded === 'update_available'
        ? 'update_available'
        : actionNeeded === 'newer_installed'
        ? 'newer_installed'
        : 'up_to_date';

      patchToolState(toolId, {
        stage: 'ready',
        error: null,
        latestRelease: candidate,
        actionNeeded,
        statusBadge,
        updateAvailable: actionNeeded === 'update_available',
        lastCheckedAt: checkedAt,
        lastRateLimitRemaining: rateLimitRemaining,
      });

      persistToolSettings(toolId, {
        lastCheckedAt: checkedAt,
        latestRelease: candidate,
      });

      return { ok: true, state: getSnapshot() };
    })().finally(() => {
      activeCheckPromise = null;
    });

    return activeCheckPromise;
  }

  async function installOrUpdate({ toolId = 'librehardwaremonitor', userConfirmed = false } = {}) {
    if (!isApprovedToolId(toolId)) {
      return {
        ok: false,
        error: 'Blocked: requested software is excluded by SecretArea open-source eligibility policy.',
        state: getSnapshot(),
      };
    }

    if (userConfirmed !== true) {
      return {
        ok: false,
        error: 'Explicit user confirmation is required before downloading or installing open-source tools.',
        state: getSnapshot(),
      };
    }

    if (activeInstallPromise) {
      return activeInstallPromise;
    }

    activeInstallPromise = (async () => {
      const meta = APPROVED_OSS_TOOLS[toolId];
      const paths = getToolPaths(toolId);

      await refreshInstalledStatus(toolId);

      // Ensure fresh release metadata from official source
      if (!toolsState[toolId].latestRelease) {
        const checkRes = await checkUpdates({ toolId, force: true });
        if (!checkRes.ok || !toolsState[toolId].latestRelease) {
          return {
            ok: false,
            error: checkRes.error || 'Failed to resolve latest official stable release.',
            state: getSnapshot(),
          };
        }
      }

      const release = toolsState[toolId].latestRelease;
      if (!release?.downloadUrl || !isAllowedToolUrl(release.downloadUrl)) {
        const msg = 'Blocked unapproved download host for release asset.';
        patchToolState(toolId, { stage: 'error', error: msg });
        return { ok: false, error: msg, state: getSnapshot() };
      }

      activeAbortController = new AbortController();
      const stagingRoot = path.join(paths.baseDir, `_staging_${Date.now()}`);
      const archivePath = path.join(stagingRoot, path.basename(release.assetName || 'package.zip'));
      const extractDir = path.join(stagingRoot, 'extracted');
      const normalizedDir = path.join(stagingRoot, 'normalized');

      try {
        await fsp.mkdir(stagingRoot, { recursive: true });

        patchToolState(toolId, {
          stage: 'downloading',
          error: null,
          progress: {
            percent: 0,
            downloadedBytes: 0,
            totalBytes: release.assetSizeBytes || 0,
            speedBytesPerSec: 0,
            etaSeconds: null,
          },
        });

        const dl = await runDownload({
          targetUrl: release.downloadUrl,
          destPath: archivePath,
          expectedBytes: release.assetSizeBytes || 0,
          signal: activeAbortController.signal,
          onProgress: (p) => {
            patchToolState(toolId, { stage: 'downloading', progress: p });
          },
        });

        patchToolState(toolId, {
          stage: 'verifying',
          progress: {
            percent: 100,
            downloadedBytes: dl.downloadedBytes,
            totalBytes: dl.downloadedBytes,
            speedBytesPerSec: 0,
            etaSeconds: 0,
          },
        });

        let expectedSha256 = release.expectedSha256 || null;
        if (!expectedSha256 && release.checksumAssetUrl && isAllowedToolUrl(release.checksumAssetUrl)) {
          const sumText = await fetchText(release.checksumAssetUrl);
          expectedSha256 = parseSha256ForFile(sumText, release.assetName);
        }

        const actualSha256 = String(dl.sha256Actual || '').toLowerCase();
        if (expectedSha256 && actualSha256 && expectedSha256.toLowerCase() !== actualSha256) {
          throw new Error(
            `SHA-256 verification failed for ${release.assetName}. Expected ${expectedSha256.slice(0, 12)}..., got ${actualSha256.slice(0, 12)}...`
          );
        }

        patchToolState(toolId, { stage: 'installing' });
        await extractZipArchiveSafely(archivePath, extractDir);

        // Locate LibreHardwareMonitorLib.dll cleanly
        const foundDlls = findFileRecursiveSync(
          extractDir,
          'LibreHardwareMonitorLib.dll',
          /lib\/net472\/|net472/i
        );
        if (foundDlls.length === 0) {
          throw new Error('Downloaded official package does not contain LibreHardwareMonitorLib.dll.');
        }

        const selectedDll = foundDlls[0];
        const dllMeta = await inspectDll(selectedDll);
        if (!dllMeta?.validPe) {
          throw new Error('Extracted LibreHardwareMonitorLib.dll failed PE binary integrity validation.');
        }

        await fsp.mkdir(normalizedDir, { recursive: true });
        await fsp.copyFile(selectedDll, path.join(normalizedDir, 'LibreHardwareMonitorLib.dll'));

        // Copy sibling dependency DLLs (e.g. HidSharp.dll) & license notices when present
        const selectedDllFolder = path.dirname(selectedDll);
        const siblingEntries = await fsp.readdir(selectedDllFolder, { withFileTypes: true }).catch(() => []);
        for (const ent of siblingEntries) {
          if (!ent.isFile()) continue;
          const lower = ent.name.toLowerCase();
          if (
            lower === 'hidsharp.dll' ||
            lower === 'license' ||
            lower === 'license.txt' ||
            lower === 'license.md' ||
            lower === 'license.html'
          ) {
            await fsp.copyFile(path.join(selectedDllFolder, ent.name), path.join(normalizedDir, ent.name));
          }
        }

        // Also check archive root for LICENSE files
        const rootEntries = await fsp.readdir(extractDir, { withFileTypes: true }).catch(() => []);
        for (const ent of rootEntries) {
          if (!ent.isFile()) continue;
          const lower = ent.name.toLowerCase();
          if (lower.startsWith('license') || lower === 'notice' || lower === 'notice.txt') {
            await fsp.copyFile(path.join(extractDir, ent.name), path.join(normalizedDir, ent.name));
          }
        }

        const installedVersion = normalizeVersionString(release.version || dllMeta.fileVersion);
        const verification = {
          sha256Expected: expectedSha256 ? expectedSha256.toLowerCase() : null,
          sha256Actual: actualSha256 || null,
          sha256Verified: Boolean(expectedSha256 && actualSha256 && expectedSha256.toLowerCase() === actualSha256),
          binaryValidPe: true,
          fileVersion: dllMeta.fileVersion || installedVersion,
          sourceHost: new URL(release.downloadUrl).hostname,
          verifiedAt: new Date().toISOString(),
        };

        const manifest = {
          toolId,
          name: meta.name,
          licenseId: meta.licenseId,
          version: installedVersion,
          rawVersion: release.rawVersion || installedVersion,
          sourceType: release.sourceType,
          assetName: release.assetName,
          releaseDate: release.releaseDate,
          releaseUrl: release.releaseUrl,
          installedAt: new Date().toISOString(),
          verification,
        };
        await fsp.writeFile(
          path.join(normalizedDir, 'secretarea-tool-manifest.json'),
          JSON.stringify(manifest, null, 2),
          'utf8'
        );

        // Preserve previous healthy installation in backupDir for rollback
        const tempPrevDir = path.join(paths.baseDir, `_prev_${Date.now()}`);
        let movedOldToTemp = false;
        if (fs.existsSync(paths.currentDir)) {
          await fsp.rename(paths.currentDir, tempPrevDir);
          movedOldToTemp = true;
        }

        try {
          await fsp.rename(normalizedDir, paths.currentDir);
          if (movedOldToTemp) {
            await safeRemoveRecursive(paths.backupDir);
            await fsp.rename(tempPrevDir, paths.backupDir);
          }
        } catch (swapErr) {
          // Restore prior currentDir if atomic promotion failed
          if (movedOldToTemp && fs.existsSync(tempPrevDir) && !fs.existsSync(paths.currentDir)) {
            await fsp.rename(tempPrevDir, paths.currentDir).catch(() => {});
          }
          throw swapErr;
        }

        await refreshInstalledStatus(toolId);
        patchToolState(toolId, {
          stage: 'completed',
          error: null,
          progress: {
            percent: 100,
            downloadedBytes: dl.downloadedBytes,
            totalBytes: dl.downloadedBytes,
            speedBytesPerSec: 0,
            etaSeconds: 0,
          },
          verification,
        });

        if (typeof onToolInstalledOrRolledBack === 'function') {
          try {
            onToolInstalledOrRolledBack(toolId);
          } catch {
            // ignore hook errors
          }
        }

        return { ok: true, state: getSnapshot() };
      } catch (err) {
        const isAborted = err?.code === 'aborted' || activeAbortController?.signal?.aborted;
        await refreshInstalledStatus(toolId);
        patchToolState(toolId, {
          stage: isAborted ? 'cancelled' : 'error',
          error: isAborted ? 'Download cancelled by user.' : String(err?.message || 'Installation failed.'),
          progress: null,
        });
        return {
          ok: false,
          cancelled: Boolean(isAborted),
          error: isAborted ? 'Download cancelled by user.' : String(err?.message || 'Installation failed.'),
          state: getSnapshot(),
        };
      } finally {
        activeAbortController = null;
        await safeRemoveRecursive(stagingRoot);
      }
    })().finally(() => {
      activeInstallPromise = null;
    });

    return activeInstallPromise;
  }

  async function rollback({ toolId = 'librehardwaremonitor', userConfirmed = false } = {}) {
    if (!isApprovedToolId(toolId)) {
      return { ok: false, error: 'Requested tool is not approved.', state: getSnapshot() };
    }
    if (userConfirmed !== true) {
      return { ok: false, error: 'Explicit user confirmation is required to roll back.', state: getSnapshot() };
    }
    if (activeInstallPromise) {
      return { ok: false, error: 'Cannot roll back while an installation is in progress.', state: getSnapshot() };
    }

    const paths = getToolPaths(toolId);
    const backupDlls = findFileRecursiveSync(paths.backupDir, 'LibreHardwareMonitorLib.dll', /net472|net4/i);
    if (backupDlls.length === 0) {
      return { ok: false, error: 'No backed-up previous version is available for rollback.', state: getSnapshot() };
    }

    const tempCurrentDir = path.join(paths.baseDir, `_rollback_tmp_${Date.now()}`);
    let movedCurrent = false;
    try {
      if (fs.existsSync(paths.currentDir)) {
        await fsp.rename(paths.currentDir, tempCurrentDir);
        movedCurrent = true;
      }
      await copyDirRecursive(paths.backupDir, paths.currentDir);
      if (movedCurrent) {
        await safeRemoveRecursive(tempCurrentDir);
      }
      await refreshInstalledStatus(toolId);
      patchToolState(toolId, {
        stage: 'completed',
        error: null,
      });

      if (typeof onToolInstalledOrRolledBack === 'function') {
        try {
          onToolInstalledOrRolledBack(toolId);
        } catch {
          // ignore
        }
      }

      return { ok: true, state: getSnapshot() };
    } catch (err) {
      if (movedCurrent && fs.existsSync(tempCurrentDir) && !fs.existsSync(paths.currentDir)) {
        await fsp.rename(tempCurrentDir, paths.currentDir).catch(() => {});
      }
      patchToolState(toolId, {
        stage: 'error',
        error: String(err?.message || 'Rollback failed.'),
      });
      return { ok: false, error: String(err?.message || 'Rollback failed.'), state: getSnapshot() };
    }
  }

  function cancel({ toolId = 'librehardwaremonitor' } = {}) {
    if (activeAbortController) {
      activeAbortController.abort();
      patchToolState(toolId, {
        stage: 'cancelled',
        error: 'Download cancelled by user.',
        progress: null,
      });
      return { ok: true };
    }
    return { ok: false };
  }

  async function openExternalLink({ toolId = 'librehardwaremonitor', kind = 'releases' } = {}) {
    if (!isApprovedToolId(toolId)) return { ok: false, error: 'Unapproved tool.' };
    const meta = APPROVED_OSS_TOOLS[toolId];
    const latestUrl = toolsState[toolId]?.latestRelease?.releaseUrl;
    let url = meta.officialReleasesUrl;
    if (kind === 'repository' || kind === 'source') url = meta.repositoryUrl;
    else if (kind === 'website') url = meta.websiteUrl;
    else if (kind === 'license') url = meta.licenseUrl;
    else if (kind === 'nuget') url = meta.nugetUrl;
    else if (kind === 'releases' && latestUrl && isAllowedToolUrl(latestUrl)) url = latestUrl;

    if (!isAllowedToolUrl(url)) {
      return { ok: false, error: 'Blocked unapproved external URL.' };
    }
    if (shell?.openExternal) {
      await shell.openExternal(url);
      return { ok: true, url };
    }
    return { ok: false, error: 'Desktop external browser bridge unavailable.' };
  }

  function getInstalledLibraryInfo(toolId = 'librehardwaremonitor') {
    if (!isApprovedToolId(toolId)) {
      return { installed: false, healthy: false, version: null, dllPath: null, dirPath: null };
    }
    const paths = getToolPaths(toolId);
    const manifest = readManifestSync(paths.manifestPath);
    const dlls = findFileRecursiveSync(paths.currentDir, 'LibreHardwareMonitorLib.dll', /net472|net4/i);
    const dllPath = dlls[0] || null;
    const cur = toolsState[toolId];
    return {
      installed: Boolean(dllPath),
      healthy: Boolean(dllPath && cur?.healthy !== false),
      version: manifest?.version || cur?.installedVersion || null,
      dllPath,
      dirPath: dllPath ? paths.currentDir : null,
      requiresAdminHint: Boolean(managerMeta.isElevated === false),
    };
  }

  async function initStartupCheck() {
    await refreshInstalledStatus('librehardwaremonitor');
    if (effectivePlatform !== 'win32') {
      return;
    }
    const settings = typeof readSettings === 'function' ? readSettings() : {};
    const lastCheckedRaw = settings?.openSourceTools?.librehardwaremonitor?.lastCheckedAt;
    const lastCheckedMs = lastCheckedRaw ? Date.parse(lastCheckedRaw) : 0;
    if (!lastCheckedMs || Date.now() - lastCheckedMs >= AUTO_CHECK_COOLDOWN_MS) {
      setTimeout(() => {
        void checkUpdates({ toolId: 'librehardwaremonitor', force: false });
      }, 4500);
    }
  }

  function setElevationHint(isElevated) {
    if (typeof isElevated === 'boolean') {
      managerMeta.isElevated = isElevated;
    }
  }

  function registerIpc(ipcMain, isTrustedSender) {
    ipcMain.handle('oss-tools:get-state', async (event) => {
      if (!isTrustedSender(event)) return null;
      await refreshInstalledStatus('librehardwaremonitor');
      return getSnapshot();
    });

    ipcMain.handle('oss-tools:check-updates', async (event, payload) => {
      if (!isTrustedSender(event)) return null;
      const toolId = payload?.toolId || 'librehardwaremonitor';
      return checkUpdates({ toolId, force: payload?.force !== false });
    });

    ipcMain.handle('oss-tools:install-or-update', async (event, payload) => {
      if (!isTrustedSender(event)) return { ok: false, error: 'Untrusted IPC sender.' };
      const toolId = payload?.toolId || 'librehardwaremonitor';
      return installOrUpdate({
        toolId,
        userConfirmed: Boolean(payload?.userConfirmed),
      });
    });

    ipcMain.handle('oss-tools:cancel', (event, payload) => {
      if (!isTrustedSender(event)) return { ok: false };
      return cancel({ toolId: payload?.toolId || 'librehardwaremonitor' });
    });

    ipcMain.handle('oss-tools:rollback', async (event, payload) => {
      if (!isTrustedSender(event)) return { ok: false, error: 'Untrusted IPC sender.' };
      return rollback({
        toolId: payload?.toolId || 'librehardwaremonitor',
        userConfirmed: Boolean(payload?.userConfirmed),
      });
    });

    ipcMain.handle('oss-tools:open-link', async (event, payload) => {
      if (!isTrustedSender(event)) return { ok: false };
      return openExternalLink({
        toolId: payload?.toolId || 'librehardwaremonitor',
        kind: payload?.kind || 'releases',
      });
    });
  }

  function shutdown() {
    if (activeAbortController) {
      activeAbortController.abort();
      activeAbortController = null;
    }
  }

  return {
    registerIpc,
    getState: async () => {
      await refreshInstalledStatus('librehardwaremonitor');
      return getSnapshot();
    },
    getSnapshot,
    checkUpdates,
    installOrUpdate,
    rollback,
    cancel,
    openExternalLink,
    getInstalledLibraryInfo,
    setElevationHint,
    initStartupCheck,
    shutdown,
  };
}

module.exports = {
  APPROVED_OSS_TOOLS,
  EXCLUDED_PROPRIETARY_TOOLS_POLICY,
  isApprovedToolId,
  getApprovedToolCatalog,
  isAllowedToolUrl,
  normalizeVersionString,
  compareSemver,
  parseDigestString,
  parseSha256ForFile,
  selectBestStableNugetPackage,
  selectBestStableReleaseAsset,
  evaluateToolUpdateState,
  extractZipArchiveSafely,
  createOpenSourceToolsManager,
};
