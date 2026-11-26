const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const fsp = fs.promises;
const os = require('node:os');
const path = require('node:path');
const Module = require('node:module');

const {
  classifyIsIntegratedGpu,
  sortGpusDiscreteFirst,
  matchWmiMonitors,
  resolveTpmState,
  normalizeCpuClockGhz,
  cleanStr,
} = require('../electron/hardware/deepInventoryCollector.cjs');

const {
  matchDisplayMonitors,
  isIntegratedGpuModel,
  determineHybridGpuMode,
} = require('../electron/hardware/displayLaptopAdapter.cjs');

const {
  createBenchmarkRunner,
  MAX_SAFE_CPU_TEMP_C,
  MAX_SAFE_GPU_TEMP_C,
} = require('../electron/hardware/benchmarkRunner.cjs');

// Load hardwareDbManager.cjs with a lightweight Electron dialog stub outside Electron runtime
function loadHardwareDbManager() {
  const origLoad = Module._load;
  Module._load = function patchedLoad(request, parent, isMain) {
    if (request === 'electron') {
      return {
        dialog: {
          showOpenDialog: async () => ({ canceled: true, filePaths: [] }),
        },
      };
    }
    return origLoad.call(this, request, parent, isMain);
  };
  try {
    return require('../electron/hardware/hardwareDbManager.cjs');
  } finally {
    Module._load = origLoad;
  }
}

const {
  DEFAULT_DB_FEED_URL,
  readBundledBaselineInfo,
  createHardwareDbManager,
  validateHardwareDbPayload,
  isSafeRemoteHttpsFeedUrl,
  isTrustedFeedHost,
} = loadHardwareDbManager();

test('GPU classification & discrete-first sorting (Intel Arc iGPU vs discrete Arc A/B)', () => {
  // Integrated GPUs (including Intel Core Ultra Arc Graphics / Arc 140V)
  assert.equal(classifyIsIntegratedGpu('Intel(R) Arc(TM) Graphics', 'Intel Corporation'), true);
  assert.equal(classifyIsIntegratedGpu('Intel(R) Arc(TM) 140V GPU', 'Intel'), true);
  assert.equal(classifyIsIntegratedGpu('Intel(R) UHD Graphics 770', 'Intel'), true);
  assert.equal(classifyIsIntegratedGpu('AMD Radeon(TM) Graphics', 'Advanced Micro Devices, Inc.'), true);

  assert.equal(isIntegratedGpuModel('Intel(R) Arc(TM) Graphics', 'Intel Corporation'), true);
  assert.equal(isIntegratedGpuModel('Intel(R) Arc(TM) 130V GPU', 'Intel'), true);

  // Discrete GPUs (including Intel Arc A770 / B580 / Arc Pro)
  assert.equal(classifyIsIntegratedGpu('Intel(R) Arc(TM) A770 Graphics', 'Intel Corporation'), false);
  assert.equal(classifyIsIntegratedGpu('Intel(R) Arc(TM) B580 Graphics', 'Intel Corporation'), false);
  assert.equal(classifyIsIntegratedGpu('Intel(R) Arc(TM) Pro A60', 'Intel'), false);
  assert.equal(classifyIsIntegratedGpu('NVIDIA GeForce RTX 4070', 'NVIDIA'), false);
  assert.equal(classifyIsIntegratedGpu('AMD Radeon RX 7800 XT', 'AMD'), false);

  assert.equal(isIntegratedGpuModel('Intel(R) Arc(TM) A770 Graphics', 'Intel'), false);
  assert.equal(isIntegratedGpuModel('NVIDIA GeForce RTX 4070', 'NVIDIA'), false);

  // Sorting places discrete GPU first regardless of input order
  const sorted = sortGpusDiscreteFirst([
    { id: 'v', model: 'Microsoft Basic Display Adapter', vendor: 'Microsoft', isIntegrated: true, vramMB: 0 },
    { id: 'igpu', model: 'Intel(R) Arc(TM) Graphics', vendor: 'Intel', isIntegrated: true, vramMB: 2048 },
    { id: 'dgpu', model: 'NVIDIA GeForce RTX 4070', vendor: 'NVIDIA', isIntegrated: false, vramMB: 12288 },
  ]);
  assert.equal(sorted[0].id, 'dgpu');
  assert.equal(sorted[1].id, 'igpu');
  assert.equal(sorted[2].id, 'v');

  // Hybrid GPU detection treats RTX + Intel Arc iGPU as Optimus/Hybrid
  const hybridMode = determineHybridGpuMode({
    gpus: [
      { model: 'NVIDIA GeForce RTX 4060 Laptop GPU', manufacturer: 'NVIDIA' },
      { model: 'Intel(R) Arc(TM) Graphics', manufacturer: 'Intel Corporation' },
    ],
    hasBattery: true,
  });
  assert.match(hybridMode, /Optimus|Hybrid/i);
});

test('Multi-monitor matching uses PNP/InstanceName/EDID instead of positional index and preserves GPU link', () => {
  const toCharCodes = (str) => Array.from(str).map((c) => c.charCodeAt(0));

  const siDisps = [
    {
      model: 'LG UltraGear',
      deviceName: '\\\\.\\DISPLAY1\\Monitor0',
      builtin: false,
      main: true,
      currentResX: 2560,
      currentResY: 1440,
      currentRefreshRate: 165,
    },
    {
      model: 'BOE Internal Panel',
      deviceName: '\\\\.\\DISPLAY2\\Monitor0',
      builtin: true,
      main: false,
      currentResX: 1920,
      currentResY: 1200,
      currentRefreshRate: 120,
    },
  ];

  // Reverse/shuffled order plus an inactive ghost entry
  const monIds = [
    {
      InstanceName: 'DISPLAY\\GHOST99\\1&AABBCC&0_0',
      UserFriendlyName: toCharCodes('Ghost Monitor'),
      ManufacturerName: toCharCodes('GHO'),
      SerialNumberID: toCharCodes('000'),
    },
    {
      InstanceName: 'DISPLAY\\BOE0ABC\\4&1122AA&0_0',
      UserFriendlyName: toCharCodes('BOE Internal Panel'),
      ManufacturerName: toCharCodes('BOE'),
      SerialNumberID: toCharCodes('SN-INT-2'),
    },
    {
      InstanceName: 'DISPLAY\\GSM7707\\4&3344BB&0_0',
      UserFriendlyName: toCharCodes('LG UltraGear'),
      ManufacturerName: toCharCodes('GSM'),
      SerialNumberID: toCharCodes('SN-LG-1'),
    },
  ];

  const monParams = [
    { InstanceName: 'DISPLAY\\GSM7707\\4&3344BB&0_0', MaxHorizontalImageSize: 60, MaxVerticalImageSize: 34 },
    { InstanceName: 'DISPLAY\\BOE0ABC\\4&1122AA&0_0', MaxHorizontalImageSize: 34, MaxVerticalImageSize: 22 },
  ];

  const monConns = [
    { InstanceName: 'DISPLAY\\GHOST99\\1&AABBCC&0_0', VideoOutputTechnology: 5, Active: false },
    { InstanceName: 'DISPLAY\\BOE0ABC\\4&1122AA&0_0', VideoOutputTechnology: 11, Active: true }, // eDP internal
    { InstanceName: 'DISPLAY\\GSM7707\\4&3344BB&0_0', VideoOutputTechnology: 10, Active: true }, // DisplayPort
  ];

  const videoCtrls = [
    { Name: 'Intel(R) UHD Graphics', AdapterCompatibility: 'Intel', PNPDeviceID: 'PCI\\VEN_8086&DEV_A780\\4&1122AA&0' },
    { Name: 'NVIDIA GeForce RTX 4070', AdapterCompatibility: 'NVIDIA', PNPDeviceID: 'PCI\\VEN_10DE&DEV_2786\\4&3344BB&0' },
  ];

  const deepMatched = matchWmiMonitors(siDisps, monIds, monParams, monConns, videoCtrls);
  assert.equal(deepMatched.length, 2);
  assert.equal(deepMatched[0].name, 'LG UltraGear');
  assert.equal(deepMatched[0].connectionType, 'DisplayPort');
  assert.equal(deepMatched[0].physicalWidthMm, 600);
  assert.equal(deepMatched[0].gpuPnpDeviceId, 'PCI\\VEN_10DE&DEV_2786\\4&3344BB&0');
  assert.equal(deepMatched[0].isInternal, false);

  assert.equal(deepMatched[1].name, 'BOE Internal Panel');
  assert.equal(deepMatched[1].connectionType, 'eDP (Internal)');
  assert.equal(deepMatched[1].physicalWidthMm, 340);
  assert.equal(deepMatched[1].gpuPnpDeviceId, 'PCI\\VEN_8086&DEV_A780\\4&1122AA&0');
  assert.equal(deepMatched[1].isInternal, true);

  const adapterMatched = matchDisplayMonitors(siDisps, monConns, monIds, videoCtrls);
  assert.equal(adapterMatched.length, 2);
  assert.equal(adapterMatched[0].model, 'LG UltraGear');
  assert.equal(adapterMatched[0].connectionType, 'DisplayPort');
  assert.equal(adapterMatched[0].gpuPnpDeviceId, 'PCI\\VEN_10DE&DEV_2786\\4&3344BB&0');
  assert.equal(adapterMatched[1].model, 'BOE Internal Panel');
  assert.equal(adapterMatched[1].connectionType, 'eDP (Internal)');
  assert.equal(adapterMatched[1].gpuPnpDeviceId, 'PCI\\VEN_8086&DEV_A780\\4&1122AA&0');
});

test('TPM provenance & clock/SKU cleaning never misrepresent permissions/unknown as Not Detected or 0/-', () => {
  assert.equal(resolveTpmState({ platform: 'darwin' }).status, 'not_supported');
  assert.equal(
    resolveTpmState({ platform: 'linux', linuxTpmInfo: { present: null, permissionDenied: true } }).status,
    'requires_admin'
  );
  // Missing read without permissionDenied on Linux stays unknown (not not_detected)
  assert.equal(
    resolveTpmState({ platform: 'linux', linuxTpmInfo: { present: null, permissionDenied: false } }).status,
    'unknown'
  );
  // Non-admin Windows never says not_detected
  assert.equal(
    resolveTpmState({ platform: 'win32', winData: { isAdmin: false, tpm: null, tpmErr: null, tpmPnp: [] } }).status,
    'requires_admin'
  );
  // Admin Windows with error still unknown rather than false Not Detected
  assert.equal(
    resolveTpmState({ platform: 'win32', winData: { isAdmin: true, tpm: null, tpmErr: 'CIM timeout', tpmPnp: [] } }).status,
    'unknown'
  );
  // Admin Windows confirmed empty TPM and no PnP device -> not_detected
  assert.equal(
    resolveTpmState({ platform: 'win32', winData: { isAdmin: true, tpm: null, tpmErr: null, tpmPnp: [] } }).status,
    'not_detected'
  );

  // Zero clocks and placeholder SKUs return null
  assert.equal(normalizeCpuClockGhz(0), null);
  assert.equal(normalizeCpuClockGhz('0'), null);
  assert.equal(normalizeCpuClockGhz(-1), null);
  assert.equal(normalizeCpuClockGhz(3.85), 3.85);
  assert.equal(cleanStr('-'), null);
  assert.equal(cleanStr('To Be Filled By O.E.M.'), null);
  assert.equal(cleanStr('Default string'), null);
  assert.equal(cleanStr('ASUS ROG Strix'), 'ASUS ROG Strix');
});

test('Benchmark runner preserves 92°C limit, thermal auto-aborts via getFreshSnapshot, and cancels cleanly', async () => {
  assert.equal(MAX_SAFE_CPU_TEMP_C, 92);
  assert.equal(MAX_SAFE_GPU_TEMP_C, 88);

  // 1. Thermal abort when cached snapshot is stale/null and getFreshSnapshot reports >= 92°C
  const hotRunner = createBenchmarkRunner({
    getMainWindow: () => null,
    getLatestSnapshot: () => ({ timestamp: Date.now() - 10000, cpu: { temperatureCelsius: 60 }, gpus: [] }),
    getFreshSnapshot: async () => ({ timestamp: Date.now(), cpu: { temperatureCelsius: 92 }, gpus: [] }),
  });
  const hotOutcome = await hotRunner.runBenchmark(['cpu_single']);
  assert.equal(hotOutcome.ok, true);
  assert.equal(hotOutcome.abortedForSafety, true);
  assert.equal(hotOutcome.results.length, 0);

  // 2. Worker cancellation during cpu_multi terminates quickly
  const cancelRunner = createBenchmarkRunner({
    getMainWindow: () => null,
    getLatestSnapshot: () => ({ timestamp: Date.now(), cpu: { temperatureCelsius: 55 }, gpus: [] }),
  });
  const runPromise = cancelRunner.runBenchmark(['cpu_multi']);
  setTimeout(() => {
    cancelRunner.cancel();
  }, 60);
  const cancelOutcome = await runPromise;
  assert.equal(cancelOutcome.ok, true);
  assert.equal(cancelOutcome.cancelled, true);

  // 3. Network latency probe cancellation destroys tracked sockets promptly
  const netMod = require('node:net');
  const { EventEmitter } = require('node:events');
  const origCreateConnection = netMod.createConnection;
  let destroyedCount = 0;
  netMod.createConnection = () => {
    const sock = new EventEmitter();
    sock.destroy = () => {
      destroyedCount += 1;
      process.nextTick(() => sock.emit('close'));
    };
    return sock;
  };
  try {
    const netCancelRunner = createBenchmarkRunner({
      getMainWindow: () => null,
      getLatestSnapshot: () => ({ timestamp: Date.now(), cpu: { temperatureCelsius: 55 }, gpus: [] }),
    });
    const netPromise = netCancelRunner.runBenchmark(['network_latency']);
    setTimeout(() => {
      netCancelRunner.cancel();
    }, 30);
    const netOutcome = await netPromise;
    assert.equal(netOutcome.ok, true);
    assert.equal(netOutcome.cancelled, true);
    assert.equal(destroyedCount >= 1, true);
  } finally {
    netMod.createConnection = origCreateConnection;
  }
});

test('Hardware DB integrity: dynamic 40 baseline, SSRF/schema checks, first-import backup & multi-step rollback', async () => {
  const baseline = readBundledBaselineInfo();
  assert.equal(baseline.count, 40);
  assert.notEqual(baseline.count, 68);
  assert.equal(isTrustedFeedHost(DEFAULT_DB_FEED_URL), true);
  assert.equal(isTrustedFeedHost('https://evil.example.com/hardware-db.json'), false);

  // SSRF / scheme rejection
  assert.equal(isSafeRemoteHttpsFeedUrl('http://raw.githubusercontent.com/a/b.json'), false);
  assert.equal(isSafeRemoteHttpsFeedUrl('https://127.0.0.1/db.json'), false);
  assert.equal(isSafeRemoteHttpsFeedUrl('https://localhost/db.json'), false);
  assert.equal(isSafeRemoteHttpsFeedUrl('https://192.168.1.50/db.json'), false);
  assert.equal(isSafeRemoteHttpsFeedUrl('https://[::1]/db.json'), false);
  assert.equal(isSafeRemoteHttpsFeedUrl(DEFAULT_DB_FEED_URL), true);

  // Schema validation rejects prototype pollution IDs & bad release years
  const badProto = validateHardwareDbPayload({
    schemaVersion: 1,
    dbVersion: '2026.12',
    entries: [
      {
        id: '__proto__',
        category: 'gpu',
        family: 'Test GPU',
        matchPatterns: ['test'],
        releaseYear: 2025,
        tierScore: 500,
      },
    ],
  });
  assert.equal(badProto.valid, false);

  const badYear = validateHardwareDbPayload({
    schemaVersion: 1,
    dbVersion: '2026.12',
    entries: [
      {
        id: 'gpu-bad-year',
        category: 'gpu',
        family: 'Future GPU',
        matchPatterns: ['future'],
        releaseYear: 1800,
        tierScore: 500,
      },
    ],
  });
  assert.equal(badYear.valid, false);

  const tmpDir = await fsp.mkdtemp(path.join(os.tmpdir(), 'secretarea-hwdb-test-'));
  try {
    const mgr = createHardwareDbManager({
      getMainWindow: () => null,
      getUserDataPath: () => tmpDir,
    });

    const initialState = await mgr.getState();
    assert.equal(initialState.entryCount, 40);
    assert.equal(initialState.hasBackup, false);

    // Custom non-default feed requires explicit consent
    const consentBlocked = await mgr.checkUpdate('https://example.com/custom-hw.json');
    assert.equal(consentBlocked.updated, false);
    assert.match(consentBlocked.error, /consent/i);

    // Private IP blocked even with consent
    const ssrfBlocked = await mgr.checkUpdate('https://127.0.0.1/custom-hw.json', { allowCustomFeed: true });
    assert.equal(ssrfBlocked.updated, false);
    assert.match(ssrfBlocked.error, /unsafe/i);

    // Import #1 creates baseline restore sentinel
    const imp1 = await mgr.importPayloadObject({
      schemaVersion: 1,
      dbVersion: '2026.12-custom-1',
      entries: [
        {
          id: 'gpu-custom-test-1',
          category: 'gpu',
          vendor: 'NVIDIA',
          family: 'GeForce RTX 5090 Ti Test',
          generation: 'Blackwell Test',
          architecture: 'Blackwell',
          matchPatterns: ['rtx\\s*5090\\s*ti\\s*test'],
          releaseYear: 2026,
          tierScore: 999,
          specsSummary: 'Test spec',
          supportedTechnologies: ['DLSS 4'],
          driverSupportStatus: 'active',
          limitations: [],
          recommendedSuccessor: null,
          suitability2030Score: 99,
        },
      ],
    });
    assert.equal(imp1.imported, true);
    assert.equal(imp1.state.hasBackup, true);
    assert.equal(imp1.state.entryCount, 41);

    // Import #2 backs up Import #1
    const imp2 = await mgr.importPayloadObject({
      schemaVersion: 1,
      dbVersion: '2026.12-custom-2',
      entries: [
        {
          id: 'cpu-custom-test-2',
          category: 'cpu',
          vendor: 'AMD',
          family: 'Ryzen 9 9950X3D Test',
          generation: 'Zen 5',
          architecture: 'Zen 5',
          matchPatterns: ['9950x3d\\s*test'],
          releaseYear: 2025,
          tierScore: 960,
          specsSummary: 'Test CPU',
          supportedTechnologies: ['AVX-512'],
          driverSupportStatus: 'active',
          limitations: [],
          recommendedSuccessor: null,
          suitability2030Score: 95,
        },
        {
          id: 'gpu-custom-test-2',
          category: 'gpu',
          vendor: 'AMD',
          family: 'Radeon RX 9070 XT Test',
          generation: 'RDNA 4',
          architecture: 'RDNA 4',
          matchPatterns: ['9070\\s*xt\\s*test'],
          releaseYear: 2025,
          tierScore: 860,
          specsSummary: 'Test GPU',
          supportedTechnologies: ['FSR 4'],
          driverSupportStatus: 'active',
          limitations: [],
          recommendedSuccessor: null,
          suitability2030Score: 89,
        },
      ],
    });
    assert.equal(imp2.imported, true);
    assert.equal(imp2.state.entryCount, 42);
    assert.equal(imp2.state.hasBackup, true);

    // First rollback restores Import #1 and preserves baseline sentinel!
    const rb1 = await mgr.rollbackToBackup();
    assert.equal(rb1.ok, true);
    assert.equal(rb1.state.dbVersion, '2026.12-custom-1');
    assert.equal(rb1.state.entryCount, 41);
    assert.equal(rb1.state.hasBackup, true);

    // Second rollback reaches bundled 40-entry baseline
    const rb2 = await mgr.rollbackToBackup();
    assert.equal(rb2.ok, true);
    assert.equal(rb2.state.entryCount, 40);
    assert.equal(rb2.state.customEntriesCount, 0);
    assert.equal(rb2.state.hasBackup, false);
  } finally {
    await fsp.rm(tmpDir, { recursive: true, force: true }).catch(() => {});
  }
});
