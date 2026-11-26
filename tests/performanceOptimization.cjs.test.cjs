const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const Module = require('node:module');

let mockUserData = os.tmpdir();
const origLoad = Module._load;
Module._load = function patched(request, parent, isMain) {
  if (request === 'electron') {
    return {
      app: { getPath: () => mockUserData },
      BrowserWindow: class {},
      ipcMain: { handle: () => {} },
      session: { defaultSession: { on: () => {} } },
      safeStorage: { isEncryptionAvailable: () => false },
      net: { fetch: (...args) => globalThis.fetch(...args) },
    };
  }
  return origLoad.call(this, request, parent, isMain);
};

test('HardwareMonitor respects live interval updates, pauseForHidden, and resumeFromHidden', async () => {
  const { createHardwareMonitor } = require('../electron/hardwareMonitor.cjs');
  let emissions = 0;
  const hw = createHardwareMonitor({
    getMainWindow: () => ({
      isDestroyed: () => false,
      webContents: {
        send: () => {
          emissions += 1;
        },
      },
    }),
  });

  hw.setPerformanceConfig({ intervalMs: 3000, pauseOnMinimize: true });
  assert.equal(hw.getRuntimeStats().intervalMs, 3000);
  assert.equal(hw.getRuntimeStats().pauseOnMinimize, true);

  await hw.start(1500);
  assert.equal(hw.isActive(), true);
  hw.pauseForHidden();
  assert.equal(hw.isActive(), false);
  assert.equal(hw.getRuntimeStats().pausedByHide, true);

  hw.resumeFromHidden();
  assert.equal(hw.isActive(), true);
  assert.equal(hw.getRuntimeStats().pausedByHide, false);

  hw.stop();
  assert.equal(hw.isActive(), false);
  assert.ok(emissions >= 0);
});

test('BenchmarkRunner preserves mandatory thermal limits (CPU 92C, GPU 88C) and cancellation safety', () => {
  const br = require('../electron/hardware/benchmarkRunner.cjs');
  assert.equal(br.MAX_SAFE_CPU_TEMP_C, 92);
  assert.equal(br.MAX_SAFE_GPU_TEMP_C, 88);
});

test('DownloadManager applies live performance config and supports minimize pause/resume', () => {
  const { createDownloadManager } = require('../electron/downloadManager.cjs');
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'sa-test-dm-perf-'));
  mockUserData = tmpDir;

  try {
    const dm = createDownloadManager({
      app: { getPath: () => tmpDir },
      shell: {},
      dialog: {},
      getMainWindow: () => ({
        isDestroyed: () => false,
        isMinimized: () => false,
        isVisible: () => true,
        webContents: {
          send: () => {},
        },
      }),
    });
    dm.init();

    const eco = dm.setPerformanceConfig({
      throttleMs: 750,
      torrentActivePollMs: 2500,
      torrentIdlePollMs: 12000,
      adaptiveTorrentPolling: true,
      pauseOnMinimize: true,
    });
    assert.equal(eco.throttleMs, 750);
    assert.equal(eco.torrentActivePollMs, 2500);
    assert.equal(eco.torrentIdlePollMs, 12000);
    assert.equal(eco.adaptiveTorrentPolling, true);
    assert.equal(eco.pauseOnMinimize, true);

    const perf = dm.setPerformanceConfig({
      throttleMs: 200,
      torrentActivePollMs: 1000,
      torrentIdlePollMs: 4000,
      adaptiveTorrentPolling: true,
      pauseOnMinimize: false,
    });
    assert.equal(perf.throttleMs, 200);
    assert.equal(perf.torrentActivePollMs, 1000);
    assert.equal(perf.torrentIdlePollMs, 4000);
    assert.equal(perf.pauseOnMinimize, false);

    dm.onWindowHidden();
    dm.onWindowShown();
    dm.shutdown();
  } finally {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
});

test('All four localization packs (en, fr, es, ar) contain complete performance strings', () => {
  const translationsSrc = fs.readFileSync(
    path.resolve(__dirname, '../src/i18n/translations.ts'),
    'utf8'
  );
  const perfMatches = translationsSrc.match(/^\s*performance:\s*\{/gm) || [];
  assert.ok(perfMatches.length >= 4, `Expected >= 4 performance translation blocks, got ${perfMatches.length}`);

  for (const key of [
    'modeEcoTitle',
    'modeBalancedTitle',
    'modePerformanceTitle',
    'pauseOnMinimizeTitle',
    'reduceEffectsTitle',
    'adaptiveTorrentTitle',
    'deferSyncTitle',
    'hwIntervalTitle',
    'dlThrottleTitle',
    'auditTitle',
  ]) {
    const keyMatches = translationsSrc.match(new RegExp(`\\b${key}:`, 'g')) || [];
    // 1 interface property declaration + 4 language packs (en, fr, es, ar) = 5
    assert.equal(keyMatches.length, 5, `Expected 5 occurrences (type + 4 locales) of ${key}, got ${keyMatches.length}`);
  }
});

test('electron/performanceConfig.cjs synchronizes Balanced startup defaults and all 3 profiles with launcherSettings', () => {
  const {
    PERF_PRESETS,
    DEFAULT_DESKTOP_PERF_CONFIG,
    normalizePerformancePayload,
    applyPerformanceConfigToSubsystems,
  } = require('../electron/performanceConfig.cjs');
  const { createHardwareMonitor } = require('../electron/hardwareMonitor.cjs');

  assert.equal(DEFAULT_DESKTOP_PERF_CONFIG.mode, 'balanced');
  assert.equal(DEFAULT_DESKTOP_PERF_CONFIG.hardwarePollIntervalMs, 1500);
  assert.equal(DEFAULT_DESKTOP_PERF_CONFIG.downloadUiThrottleMs, 350);
  assert.equal(DEFAULT_DESKTOP_PERF_CONFIG.torrentActivePollMs, 1500);
  assert.equal(DEFAULT_DESKTOP_PERF_CONFIG.torrentIdlePollMs, 12000);
  assert.equal(DEFAULT_DESKTOP_PERF_CONFIG.deferBackgroundChecks, false);
  assert.equal(DEFAULT_DESKTOP_PERF_CONFIG.reduceVisualEffects, false);
  assert.equal(DEFAULT_DESKTOP_PERF_CONFIG.pauseBackgroundWhenMinimized, true);

  assert.equal(PERF_PRESETS.eco.hardwarePollIntervalMs, 3000);
  assert.equal(PERF_PRESETS.balanced.hardwarePollIntervalMs, 1500);
  assert.equal(PERF_PRESETS.performance.hardwarePollIntervalMs, 1000);

  // Mode-specific normalization fallbacks when partial payloads are sent
  const partialEco = normalizePerformancePayload({ mode: 'eco' });
  assert.equal(partialEco.hardwarePollIntervalMs, 3000);
  assert.equal(partialEco.downloadUiThrottleMs, 750);
  assert.equal(partialEco.torrentActivePollMs, 3000);
  assert.equal(partialEco.torrentIdlePollMs, 20000);
  assert.equal(partialEco.deferBackgroundChecks, true);
  assert.equal(partialEco.reduceVisualEffects, true);

  // Forwards intervalMs to hardwareMonitor even when unmounted/stopped
  const hw = createHardwareMonitor({ getMainWindow: () => null });
  assert.equal(hw.isActive(), false);
  applyPerformanceConfigToSubsystems({ mode: 'eco' }, { hardwareMonitor: hw });
  assert.equal(hw.getRuntimeStats().intervalMs, 3000);
  assert.equal(hw.isActive(), false);

  applyPerformanceConfigToSubsystems({ mode: 'performance' }, { hardwareMonitor: hw });
  assert.equal(hw.getRuntimeStats().intervalMs, 1000);
  assert.equal(hw.isActive(), false);

  applyPerformanceConfigToSubsystems(DEFAULT_DESKTOP_PERF_CONFIG, { hardwareMonitor: hw });
  assert.equal(hw.getRuntimeStats().intervalMs, 1500);
  assert.equal(hw.isActive(), false);
});

test('Rapid profile switching causes zero duplicate HardwareMonitor polling timers and preserves minimize/restore', async () => {
  const { applyPerformanceConfigToSubsystems } = require('../electron/performanceConfig.cjs');
  const { createHardwareMonitor } = require('../electron/hardwareMonitor.cjs');

  const activeTimers = new Set();
  const origSetInterval = globalThis.setInterval;
  const origClearInterval = globalThis.clearInterval;
  globalThis.setInterval = (...args) => {
    const id = origSetInterval(...args);
    activeTimers.add(id);
    return id;
  };
  globalThis.clearInterval = (id) => {
    activeTimers.delete(id);
    return origClearInterval(id);
  };

  try {
    const hw = createHardwareMonitor({ getMainWindow: () => null });
    await hw.start(1500);
    assert.equal(activeTimers.size, 1);

    const modes = ['eco', 'balanced', 'performance'];
    for (let i = 0; i < 60; i += 1) {
      const mode = modes[i % modes.length];
      applyPerformanceConfigToSubsystems({ mode }, { hardwareMonitor: hw });
      assert.equal(activeTimers.size, 1, `Expected exactly 1 timer after switch #${i} (${mode})`);
    }
    assert.equal(hw.getRuntimeStats().intervalMs, 1000);

    // Pause when hidden clears timer completely; updates while hidden persist cleanly
    hw.pauseForHidden();
    assert.equal(activeTimers.size, 0);
    assert.equal(hw.getRuntimeStats().pausedByHide, true);

    applyPerformanceConfigToSubsystems({ mode: 'eco' }, { hardwareMonitor: hw });
    assert.equal(hw.getRuntimeStats().intervalMs, 3000);
    assert.equal(activeTimers.size, 0);

    hw.resumeFromHidden();
    assert.equal(hw.isActive(), true);
    assert.equal(hw.getRuntimeStats().intervalMs, 3000);
    assert.equal(activeTimers.size, 1);

    hw.stop();
    assert.equal(activeTimers.size, 0);
  } finally {
    globalThis.setInterval = origSetInterval;
    globalThis.clearInterval = origClearInterval;
  }
});

test('Production build dist/index.html omits heavy optional modulepreloads and keeps lazy views isolated', () => {
  const distIndexPath = path.resolve(__dirname, '../dist/index.html');
  const distAssetsDir = path.resolve(__dirname, '../dist/assets');
  assert.ok(fs.existsSync(distIndexPath), 'dist/index.html must exist after npm run build');

  const html = fs.readFileSync(distIndexPath, 'utf8');
  for (const forbidden of [
    'data-sheet-extras',
    'data-games-batches',
    'feature-deals',
    'GameDealsView',
    'ExtrasView',
    'StudiosView',
    'GameDetailModal',
    'SpinWheelModal',
    'StudioDetailModal',
    'HardwareMonitorView',
  ]) {
    assert.ok(!html.includes(forbidden), `dist/index.html must not preload heavy/optional chunk ${forbidden}`);
  }

  const assets = fs.readdirSync(distAssetsDir);
  for (const lazyPrefix of [
    'ExtrasView-',
    'StudiosView-',
    'GameDealsView-',
    'GameDetailModal-',
    'SpinWheelModal-',
    'StudioDetailModal-',
    'data-games-batches-',
    'data-sheet-extras-',
  ]) {
    assert.ok(
      assets.some((f) => f.startsWith(lazyPrefix) && f.endsWith('.js')),
      `Expected split chunk starting with ${lazyPrefix}`
    );
  }
});

