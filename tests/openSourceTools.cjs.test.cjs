'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const fs = require('node:fs');
const fsp = fs.promises;
const os = require('node:os');
const path = require('node:path');

const {
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
} = require('../electron/hardware/openSourceToolsManager.cjs');

const {
  parseLhmBridgeOutput,
  summarizeLhmCoverage,
  isValidDllPath,
  readManagedLhmSensors,
} = require('../electron/hardware/lhmLibBridge.cjs');

/**
 * Builds a minimal valid uncompressed (STORE) PKZIP archive in-memory for tests.
 */
function buildStoredZipBuffer(entries) {
  const localParts = [];
  const centralParts = [];
  let offset = 0;

  for (const { name, data } of entries) {
    const nameBuf = Buffer.from(name, 'utf8');
    const contentBuf = Buffer.isBuffer(data) ? data : Buffer.from(data, 'utf8');

    const local = Buffer.alloc(30 + nameBuf.length);
    local.writeUInt32LE(0x04034b50, 0);
    local.writeUInt16LE(20, 4);
    local.writeUInt16LE(0, 6);
    local.writeUInt16LE(0, 8); // stored
    local.writeUInt16LE(0, 10);
    local.writeUInt16LE(0, 12);
    local.writeUInt32LE(0, 14); // crc ignored by extractor
    local.writeUInt32LE(contentBuf.length, 18);
    local.writeUInt32LE(contentBuf.length, 22);
    local.writeUInt16LE(nameBuf.length, 26);
    local.writeUInt16LE(0, 28);
    nameBuf.copy(local, 30);

    const central = Buffer.alloc(46 + nameBuf.length);
    central.writeUInt32LE(0x02014b50, 0);
    central.writeUInt16LE(20, 4);
    central.writeUInt16LE(20, 6);
    central.writeUInt16LE(0, 8);
    central.writeUInt16LE(0, 10); // stored
    central.writeUInt16LE(0, 12);
    central.writeUInt16LE(0, 14);
    central.writeUInt32LE(0, 16);
    central.writeUInt32LE(contentBuf.length, 20);
    central.writeUInt32LE(contentBuf.length, 24);
    central.writeUInt16LE(nameBuf.length, 28);
    central.writeUInt16LE(0, 30);
    central.writeUInt16LE(0, 32);
    central.writeUInt16LE(0, 34);
    central.writeUInt16LE(0, 36);
    central.writeUInt32LE(0, 38);
    central.writeUInt32LE(offset, 42);
    nameBuf.copy(central, 46);

    localParts.push(local, contentBuf);
    centralParts.push(central);
    offset += local.length + contentBuf.length;
  }

  const cdBuffer = Buffer.concat(centralParts);
  const eocd = Buffer.alloc(22);
  eocd.writeUInt32LE(0x06054b50, 0);
  eocd.writeUInt16LE(0, 4);
  eocd.writeUInt16LE(0, 6);
  eocd.writeUInt16LE(entries.length, 8);
  eocd.writeUInt16LE(entries.length, 10);
  eocd.writeUInt32LE(cdBuffer.length, 12);
  eocd.writeUInt32LE(offset, 16);
  eocd.writeUInt16LE(0, 20);

  return Buffer.concat([...localParts, cdBuffer, eocd]);
}

test('Software eligibility: approves LibreHardwareMonitor (MPL-2.0) and strictly excludes HWiNFO64, CPU-Z, GPU-Z', () => {
  const catalog = getApprovedToolCatalog();
  assert.equal(catalog.length, 1);
  assert.equal(catalog[0].id, 'librehardwaremonitor');
  assert.equal(catalog[0].licenseId, 'MPL-2.0');
  assert.equal(isApprovedToolId('librehardwaremonitor'), true);

  for (const excludedId of ['hwinfo64', 'cpuz', 'gpuz', 'cpu-z', 'gpu-z', 'hwinfo']) {
    assert.equal(isApprovedToolId(excludedId), false);
    assert.equal(catalog.some((c) => c.id === excludedId), false);
  }

  const excludedNames = EXCLUDED_PROPRIETARY_TOOLS_POLICY.map((e) => e.id);
  assert.deepEqual(excludedNames.sort(), ['cpuz', 'gpuz', 'hwinfo64']);
});

test('Host security allowlist: permits official GitHub & NuGet HTTPS URLs only', () => {
  assert.equal(isAllowedToolUrl('https://api.github.com/repos/LibreHardwareMonitor/LibreHardwareMonitor/releases/latest'), true);
  assert.equal(isAllowedToolUrl('https://github.com/LibreHardwareMonitor/LibreHardwareMonitor/releases/download/v0.9.6/LibreHardwareMonitor.zip'), true);
  assert.equal(isAllowedToolUrl('https://objects.githubusercontent.com/github-production-release-asset/123'), true);
  assert.equal(isAllowedToolUrl('https://api.nuget.org/v3-flatcontainer/librehardwaremonitorlib/0.9.6/librehardwaremonitorlib.0.9.6.nupkg'), true);

  // Reject unapproved mirrors, HTTP, localhost, private IP, credentials
  assert.equal(isAllowedToolUrl('http://github.com/LibreHardwareMonitor/LibreHardwareMonitor/releases/latest'), false);
  assert.equal(isAllowedToolUrl('https://mirror.example.com/LibreHardwareMonitor.zip'), false);
  assert.equal(isAllowedToolUrl('https://www.hwinfo.com/download/'), false);
  assert.equal(isAllowedToolUrl('https://127.0.0.1/tool.zip'), false);
  assert.equal(isAllowedToolUrl('https://user:pass@github.com/a/b'), false);
});

test('Release selection: chooses universal Windows LibreHardwareMonitor.zip dynamically and ignores prereleases/drafts', () => {
  const mockRelease = {
    tag_name: 'v0.9.6',
    name: 'v0.9.6',
    draft: false,
    prerelease: false,
    published_at: '2026-02-14T11:44:20Z',
    html_url: 'https://github.com/LibreHardwareMonitor/LibreHardwareMonitor/releases/tag/v0.9.6',
    body: 'Release notes for 0.9.6',
    assets: [
      {
        name: 'LibreHardwareMonitor.NET.10.zip',
        size: 8889121,
        digest: 'sha256:29739c4959b01b348fddad87664066634bcfd4f46e9bf41e4e916c318bcfdb99',
        browser_download_url: 'https://github.com/LibreHardwareMonitor/LibreHardwareMonitor/releases/download/v0.9.6/LibreHardwareMonitor.NET.10.zip',
      },
      {
        name: 'LibreHardwareMonitor.zip',
        size: 6632626,
        digest: 'sha256:086d9f1b5a99e643edc2cfaaac16051685b551e4c5ac0b32a57c58c0e529c001',
        browser_download_url: 'https://github.com/LibreHardwareMonitor/LibreHardwareMonitor/releases/download/v0.9.6/LibreHardwareMonitor.zip',
      },
    ],
  };

  const selected = selectBestStableReleaseAsset(mockRelease);
  assert.ok(selected);
  assert.equal(selected.sourceType, 'github_release');
  assert.equal(selected.version, '0.9.6');
  assert.equal(selected.assetName, 'LibreHardwareMonitor.zip');
  assert.equal(selected.expectedSha256, '086d9f1b5a99e643edc2cfaaac16051685b551e4c5ac0b32a57c58c0e529c001');

  // Prerelease / draft GitHub release falls back to stable NuGet, skipping -pre versions
  const prereleaseOnly = { ...mockRelease, prerelease: true };
  const nugetIndex = {
    versions: ['0.9.4', '0.9.5', '0.9.6', '0.9.7-pre781', '0.9.7-pre785'],
  };
  const fallback = selectBestStableReleaseAsset(prereleaseOnly, nugetIndex);
  assert.ok(fallback);
  assert.equal(fallback.sourceType, 'nuget');
  assert.equal(fallback.version, '0.9.6');
  assert.equal(fallback.assetKind, 'nupkg');
});

test('Version comparison and update state classification', () => {
  assert.equal(normalizeVersionString('v0.9.6'), '0.9.6');
  assert.equal(compareSemver('0.9.6', '0.9.5'), 1);
  assert.equal(compareSemver('0.9.6', '0.9.6'), 0);
  assert.equal(compareSemver('0.9.5', '0.9.6'), -1);

  assert.equal(evaluateToolUpdateState({ installed: false, healthy: false, installedVersion: null, latestVersion: '0.9.6' }), 'install_required');
  assert.equal(evaluateToolUpdateState({ installed: true, healthy: false, installedVersion: '0.9.5', latestVersion: '0.9.6' }), 'repair_required');
  assert.equal(evaluateToolUpdateState({ installed: true, healthy: true, installedVersion: '0.9.5', latestVersion: '0.9.6' }), 'update_available');
  assert.equal(evaluateToolUpdateState({ installed: true, healthy: true, installedVersion: '0.9.6', latestVersion: '0.9.6' }), 'up_to_date');
  assert.equal(evaluateToolUpdateState({ installed: true, healthy: true, installedVersion: '0.9.7', latestVersion: '0.9.6' }), 'newer_installed');
});

test('Zip-Slip protection rejects archives attempting path traversal', async () => {
  const tmpDir = await fsp.mkdtemp(path.join(os.tmpdir(), 'sa-oss-zipslip-'));
  try {
    const zipBuf = buildStoredZipBuffer([
      { name: '../../evil.dll', data: 'MZbad' },
      { name: 'LibreHardwareMonitorLib.dll', data: 'MZgood' },
    ]);
    const zipPath = path.join(tmpDir, 'test.zip');
    await fsp.writeFile(zipPath, zipBuf);

    const outDir = path.join(tmpDir, 'out');
    await extractZipArchiveSafely(zipPath, outDir);
    assert.equal(fs.existsSync(path.join(outDir, 'LibreHardwareMonitorLib.dll')), true);
    assert.equal(fs.existsSync(path.join(tmpDir, 'evil.dll')), false);
  } finally {
    await fsp.rm(tmpDir, { recursive: true, force: true });
  }
});

test('OpenSourceToolsManager full lifecycle: check -> approval guard -> SHA-256 mismatch abort -> install v1 -> update v2 -> rollback v1', async () => {
  const tmpRoot = await fsp.mkdtemp(path.join(os.tmpdir(), 'sa-oss-mgr-'));
  try {
    const dllV1 = Buffer.from('MZ_FAKE_LHM_V1_BINARY_PAYLOAD');
    const zipV1 = buildStoredZipBuffer([
      { name: 'LibreHardwareMonitorLib.dll', data: dllV1 },
      { name: 'HidSharp.dll', data: 'MZ_HID_V1' },
      { name: 'LICENSE', data: 'Mozilla Public License Version 2.0' },
    ]);
    const shaV1 = crypto.createHash('sha256').update(zipV1).digest('hex');

    const dllV2 = Buffer.from('MZ_FAKE_LHM_V2_BINARY_PAYLOAD');
    const zipV2 = buildStoredZipBuffer([
      { name: 'lib/net472/LibreHardwareMonitorLib.dll', data: dllV2 },
      { name: 'LICENSE', data: 'Mozilla Public License Version 2.0' },
    ]);
    const shaV2 = crypto.createHash('sha256').update(zipV2).digest('hex');

    let currentMockRelease = {
      tag_name: 'v0.9.5',
      name: 'v0.9.5',
      draft: false,
      prerelease: false,
      published_at: '2026-01-10T10:00:00Z',
      html_url: 'https://github.com/LibreHardwareMonitor/LibreHardwareMonitor/releases/tag/v0.9.5',
      body: 'Initial test release',
      assets: [
        {
          name: 'LibreHardwareMonitor.zip',
          size: zipV1.length,
          digest: `sha256:${shaV1}`,
          browser_download_url: 'https://github.com/LibreHardwareMonitor/LibreHardwareMonitor/releases/download/v0.9.5/LibreHardwareMonitor.zip',
        },
      ],
    };

    let mockDownloadPayload = zipV1;
    let forceBadDigest = false;
    let persistedSettings = {};

    const mgr = createOpenSourceToolsManager({
      platformOverride: 'win32',
      getUserDataPath: () => tmpRoot,
      readSettings: () => persistedSettings,
      writeSettings: (next) => {
        persistedSettings = { ...persistedSettings, ...next };
      },
      fetchGithubReleaseOverride: async () => ({ data: currentMockRelease, rateLimitRemaining: 58 }),
      downloadOverride: async ({ destPath, onProgress }) => {
        await fsp.writeFile(destPath, mockDownloadPayload);
        if (typeof onProgress === 'function') {
          onProgress({ percent: 100, downloadedBytes: mockDownloadPayload.length, totalBytes: mockDownloadPayload.length, speedBytesPerSec: 1024, etaSeconds: 0 });
        }
        const realHash = crypto.createHash('sha256').update(mockDownloadPayload).digest('hex');
        return {
          filePath: destPath,
          downloadedBytes: mockDownloadPayload.length,
          sha256Actual: forceBadDigest ? '0'.repeat(64) : realHash,
        };
      },
      inspectDllOverride: async (dllPath) => {
        const b = await fsp.readFile(dllPath);
        return { validPe: b.subarray(0, 2).toString('ascii') === 'MZ', fileVersion: null };
      },
    });

    // Reject excluded proprietary tools immediately
    const badCheck = await mgr.checkUpdates({ toolId: 'hwinfo64' });
    assert.equal(badCheck.ok, false);

    // Check release v0.9.5
    const checkRes1 = await mgr.checkUpdates({ toolId: 'librehardwaremonitor', force: true });
    assert.equal(checkRes1.ok, true);
    assert.equal(checkRes1.state.tools[0].latestRelease.version, '0.9.5');
    assert.equal(checkRes1.state.tools[0].statusBadge, 'not_installed');

    // Guard requires explicit user confirmation
    const unconfirmed = await mgr.installOrUpdate({ toolId: 'librehardwaremonitor', userConfirmed: false });
    assert.equal(unconfirmed.ok, false);

    // SHA-256 verification failure aborts cleanly without installing
    forceBadDigest = true;
    const badShaInstall = await mgr.installOrUpdate({ toolId: 'librehardwaremonitor', userConfirmed: true });
    assert.equal(badShaInstall.ok, false);
    assert.match(badShaInstall.error, /SHA-256 verification failed/i);
    assert.equal(mgr.getInstalledLibraryInfo().installed, false);
    forceBadDigest = false;

    // Install v0.9.5 cleanly
    const installV1 = await mgr.installOrUpdate({ toolId: 'librehardwaremonitor', userConfirmed: true });
    assert.equal(installV1.ok, true);
    const info1 = mgr.getInstalledLibraryInfo();
    assert.equal(info1.installed, true);
    assert.equal(info1.version, '0.9.5');
    assert.equal(installV1.state.tools[0].statusBadge, 'up_to_date');
    assert.equal(installV1.state.tools[0].hasBackup, false);
    assert.equal(installV1.state.tools[0].verification.sha256Verified, true);

    // Simulate new GitHub release v0.9.6 & update
    currentMockRelease = {
      tag_name: 'v0.9.6',
      name: 'v0.9.6',
      draft: false,
      prerelease: false,
      published_at: '2026-02-14T11:44:20Z',
      html_url: 'https://github.com/LibreHardwareMonitor/LibreHardwareMonitor/releases/tag/v0.9.6',
      body: 'Bugfix release 0.9.6',
      assets: [
        {
          name: 'LibreHardwareMonitor.zip',
          size: zipV2.length,
          digest: `sha256:${shaV2}`,
          browser_download_url: 'https://github.com/LibreHardwareMonitor/LibreHardwareMonitor/releases/download/v0.9.6/LibreHardwareMonitor.zip',
        },
      ],
    };
    mockDownloadPayload = zipV2;

    const checkRes2 = await mgr.checkUpdates({ toolId: 'librehardwaremonitor', force: true });
    assert.equal(checkRes2.state.tools[0].statusBadge, 'update_available');

    const updateV2 = await mgr.installOrUpdate({ toolId: 'librehardwaremonitor', userConfirmed: true });
    assert.equal(updateV2.ok, true);
    assert.equal(mgr.getInstalledLibraryInfo().version, '0.9.6');
    assert.equal(updateV2.state.tools[0].hasBackup, true);
    assert.equal(updateV2.state.tools[0].backupVersion, '0.9.5');

    // Rollback to v0.9.5
    const rollbackRes = await mgr.rollback({ toolId: 'librehardwaremonitor', userConfirmed: true });
    assert.equal(rollbackRes.ok, true);
    assert.equal(mgr.getInstalledLibraryInfo().version, '0.9.5');
    assert.equal(rollbackRes.state.tools[0].statusBadge, 'update_available');
  } finally {
    await fsp.rm(tmpRoot, { recursive: true, force: true });
  }
});

test('OpenSourceToolsManager handles GitHub rate limits via NuGet fallback', async () => {
  const tmpRoot = await fsp.mkdtemp(path.join(os.tmpdir(), 'sa-oss-rl-'));
  try {
    const mgr = createOpenSourceToolsManager({
      platformOverride: 'win32',
      getUserDataPath: () => tmpRoot,
      fetchGithubReleaseOverride: async () => {
        const err = new Error('GitHub API rate limit reached.');
        err.code = 'rate_limited';
        throw err;
      },
      fetchNugetIndexOverride: async () => ({
        data: { versions: ['0.9.4', '0.9.6', '0.9.7-pre785'] },
      }),
    });

    const res = await mgr.checkUpdates({ toolId: 'librehardwaremonitor', force: true });
    assert.equal(res.ok, true);
    assert.equal(res.state.tools[0].latestRelease.sourceType, 'nuget');
    assert.equal(res.state.tools[0].latestRelease.version, '0.9.6');
  } finally {
    await fsp.rm(tmpRoot, { recursive: true, force: true });
  }
});

test('lhmLibBridge validates DLL paths and safely surfaces standard-user vs elevated Ring0 coverage', async () => {
  assert.equal(isValidDllPath('C:\\Tools\\LibreHardwareMonitorLib.dll'), true);
  assert.equal(isValidDllPath('C:\\Tools\\evil.exe'), false);
  assert.equal(isValidDllPath('C:\\Tools\\a\0b.dll'), false);

  const nonAdminParsed = parseLhmBridgeOutput(
    JSON.stringify({
      ok: true,
      isAdmin: false,
      sensors: [
        { Name: 'GPU Core', SensorType: 'Temperature', Value: 54.5, Identifier: '/gpu-nvidia/0/temperature/0', HardwareType: 'GpuNvidia', HardwareName: 'RTX 4070' },
        { Name: 'Temperature', SensorType: 'Temperature', Value: 39, Identifier: '/nvme/0/temperature/0', HardwareType: 'Storage', HardwareName: 'Samsung 990 Pro' },
      ],
      errors: [],
    })
  );
  assert.equal(nonAdminParsed.ok, true);
  assert.equal(nonAdminParsed.sensors.length, 2);
  assert.equal(nonAdminParsed.coverage.hasGpuSensors, true);
  assert.equal(nonAdminParsed.coverage.hasStorageSensors, true);
  assert.equal(nonAdminParsed.coverage.hasMotherboardSensors, false);
  assert.equal(nonAdminParsed.requiresAdminHint, true);

  const nonWinRes = await readManagedLhmSensors({
    dllPath: '/tmp/LibreHardwareMonitorLib.dll',
    platformOverride: 'linux',
  });
  assert.equal(nonWinRes.ok, false);
  assert.match(nonWinRes.error, /Windows-only/i);

  const cov = summarizeLhmCoverage([
    { SensorType: 'Fan', HardwareType: 'SuperIO', Identifier: '/lpc/nct6798d/fan/0' },
    { SensorType: 'Temperature', HardwareType: 'Cpu', Identifier: '/amdcpu/0/temperature/2' },
    { SensorType: 'Voltage', HardwareType: 'Motherboard', Identifier: '/lpc/nct6798d/voltage/0' },
  ], true);
  assert.equal(cov.hasFanSensors, true);
  assert.equal(cov.hasCpuSensors, true);
  assert.equal(cov.hasMotherboardSensors, true);
  assert.equal(cov.hasVoltageSensors, true);
  assert.equal(cov.requiresAdminHint, false);
});
