import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import {
  DEFAULT_LAUNCHER_SETTINGS,
  getEffectivePerformanceConfig,
} from '../src/services/launcherSettings.ts';
import { createBackgroundUpdateScheduler } from '../src/services/desktopUpdater.ts';
import { ALL_SHEET_TABS, EMPTY_SHEET_CATALOG, resolveSheetRefItem } from '../src/utils/parsers.ts';

const require = createRequire(import.meta.url);
const {
  PERF_PRESETS,
  DEFAULT_DESKTOP_PERF_CONFIG,
} = require('../electron/performanceConfig.cjs');

test('Renderer launcherSettings presets and Balanced defaults match electron/performanceConfig.cjs exactly', () => {
  const defaultEffective = getEffectivePerformanceConfig(DEFAULT_LAUNCHER_SETTINGS);
  assert.equal(defaultEffective.mode, DEFAULT_DESKTOP_PERF_CONFIG.mode);
  assert.equal(
    defaultEffective.hardwarePollIntervalMs,
    DEFAULT_DESKTOP_PERF_CONFIG.hardwarePollIntervalMs
  );
  assert.equal(
    defaultEffective.downloadUiThrottleMs,
    DEFAULT_DESKTOP_PERF_CONFIG.downloadUiThrottleMs
  );
  assert.equal(defaultEffective.torrentActivePollMs, DEFAULT_DESKTOP_PERF_CONFIG.torrentActivePollMs);
  assert.equal(defaultEffective.torrentIdlePollMs, DEFAULT_DESKTOP_PERF_CONFIG.torrentIdlePollMs);
  assert.equal(
    defaultEffective.pauseBackgroundWhenMinimized,
    DEFAULT_DESKTOP_PERF_CONFIG.pauseBackgroundWhenMinimized
  );
  assert.equal(defaultEffective.reduceVisualEffects, DEFAULT_DESKTOP_PERF_CONFIG.reduceVisualEffects);
  assert.equal(
    defaultEffective.deferBackgroundChecks,
    DEFAULT_DESKTOP_PERF_CONFIG.deferBackgroundChecks
  );

  for (const mode of ['eco', 'balanced', 'performance'] as const) {
    const rendererCfg = getEffectivePerformanceConfig({
      performanceMode: mode,
      performanceAdvanced: {
        ...DEFAULT_LAUNCHER_SETTINGS.performanceAdvanced,
        reduceVisualEffects: mode === 'eco',
        deferBackgroundChecks: mode === 'eco',
      },
    });
    const electronPreset = PERF_PRESETS[mode];
    assert.equal(rendererCfg.hardwarePollIntervalMs, electronPreset.hardwarePollIntervalMs);
    assert.equal(rendererCfg.downloadUiThrottleMs, electronPreset.downloadUiThrottleMs);
    assert.equal(rendererCfg.torrentActivePollMs, electronPreset.torrentActivePollMs);
    assert.equal(rendererCfg.torrentIdlePollMs, electronPreset.torrentIdlePollMs);
    assert.equal(rendererCfg.reduceVisualEffects, electronPreset.reduceVisualEffects);
    assert.equal(rendererCfg.deferBackgroundChecks, electronPreset.deferBackgroundChecks);
  }
});

test('Background update scheduler skips when hidden, resumes on visibility restoration, and avoids duplicate timers', async () => {
  let hidden = true;
  let checks = 0;
  let listeners: Record<string, () => void> = {};
  let nextTimerId = 1;
  const timeouts = new Map<number, { cb: () => void; ms: number }>();
  const intervals = new Map<number, { cb: () => void; ms: number }>();

  const scheduler = createBackgroundUpdateScheduler({
    isHidden: () => hidden,
    pauseBackgroundWhenMinimized: true,
    startupDelayMs: 5000,
    intervalMs: 1800000,
    onCheck: async () => {
      checks += 1;
    },
    doc: {
      addEventListener: (ev, fn) => {
        listeners[ev] = fn;
      },
      removeEventListener: (ev) => {
        delete listeners[ev];
      },
    },
    timerApi: {
      setTimeout: (cb, ms) => {
        const id = nextTimerId++;
        timeouts.set(id, { cb, ms });
        return id as unknown as ReturnType<typeof setTimeout>;
      },
      clearTimeout: (id) => {
        timeouts.delete(id as unknown as number);
      },
      setInterval: (cb, ms) => {
        const id = nextTimerId++;
        intervals.set(id, { cb, ms });
        return id as unknown as ReturnType<typeof setInterval>;
      },
      clearInterval: (id) => {
        intervals.delete(id as unknown as number);
      },
    },
  });

  assert.equal(timeouts.size, 1);
  assert.equal(intervals.size, 1);
  assert.ok(listeners.visibilitychange);

  // Startup fires while minimized/hidden -> skipped and marked pending
  const startupEntry = Array.from(timeouts.values())[0];
  startupEntry.cb();
  assert.equal(checks, 0);
  assert.equal(scheduler.isPendingWhileHidden(), true);

  // Interval fires while minimized/hidden -> still skipped
  const intervalEntry = Array.from(intervals.values())[0];
  intervalEntry.cb();
  assert.equal(checks, 0);
  assert.equal(scheduler.isPendingWhileHidden(), true);

  // Restoring visibility triggers deferred check once
  hidden = false;
  listeners.visibilitychange();
  await new Promise((r) => setTimeout(r, 0));
  assert.equal(checks, 1);
  assert.equal(scheduler.isPendingWhileHidden(), false);

  // Visible interval tick executes normally
  intervalEntry.cb();
  await new Promise((r) => setTimeout(r, 0));
  assert.equal(checks, 2);

  // Disposing cleans up all timers & listeners cleanly
  scheduler.dispose();
  assert.equal(timeouts.size, 0);
  assert.equal(intervals.size, 0);
  assert.equal(listeners.visibilitychange, undefined);

  // Disposing prevents any late checks
  hidden = true;
  scheduler.handleVisibilityChange();
  assert.equal(checks, 2);
});

test('Background update scheduler allows background checks when pauseBackgroundWhenMinimized is disabled', async () => {
  let checks = 0;
  const intervals = new Map<number, () => void>();
  let nextId = 1;

  const scheduler = createBackgroundUpdateScheduler({
    isHidden: () => true,
    pauseBackgroundWhenMinimized: false,
    startupDelayMs: 5000,
    intervalMs: 1800000,
    onCheck: async () => {
      checks += 1;
    },
    doc: null,
    timerApi: {
      setTimeout: (cb) => {
        cb();
        return nextId++ as unknown as ReturnType<typeof setTimeout>;
      },
      clearTimeout: () => {},
      setInterval: (cb) => {
        const id = nextId++;
        intervals.set(id, cb);
        return id as unknown as ReturnType<typeof setInterval>;
      },
      clearInterval: (id) => {
        intervals.delete(id as unknown as number);
      },
    },
  });

  await new Promise((r) => setTimeout(r, 0));
  assert.equal(checks, 1);
  for (const cb of intervals.values()) cb();
  await new Promise((r) => setTimeout(r, 0));
  assert.equal(checks, 2);
  scheduler.dispose();
  assert.equal(intervals.size, 0);
});

test('EMPTY_SHEET_CATALOG and resolveSheetRefItem resolve catalog tokens without importing ExtrasView', () => {
  assert.deepEqual(Object.keys(EMPTY_SHEET_CATALOG), ALL_SHEET_TABS);
  const item = resolveSheetRefItem('g1', {
    ...EMPTY_SHEET_CATALOG,
    game: [
      {
        id: '1',
        tab: 'game',
        category: 'Games',
        name: 'Test Game',
        version: '1.0',
        repackSize: '10 GB',
        repackSizeMB: 10240,
        originalSize: '20 GB',
        genreList: [],
        genresRaw: '',
        languages: 'English',
        repackBy: '',
        coverImage: '',
        galleryImages: [],
        galleryVideos: [],
        description: '',
        parsedRequirements: { raw: '' },
        parsedSteps: [],
        mirrors: [],
        primaryMagnet: '',
        trailerUrl: '',
        embedTrailerUrl: '',
        isPinned: false,
        isFree: false,
        isNew: false,
        parsedTools: [],
        dateAdded: '',
        dateTimestamp: 0,
        rawFields: {},
      },
    ],
  });
  assert.equal(item?.name, 'Test Game');
  assert.equal(resolveSheetRefItem('invalid:99', EMPTY_SHEET_CATALOG), null);
});
