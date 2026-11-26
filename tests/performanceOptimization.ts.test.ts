import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import {
  compareAppVersions,
  DEFAULT_LAUNCHER_SETTINGS,
  getEffectivePerformanceConfig,
} from '../src/services/launcherSettings.ts';
import { createBackgroundUpdateScheduler } from '../src/services/desktopUpdater.ts';
import {
  buildNotificationFeed,
  MAX_NOTIFICATION_FEED_ITEMS,
  reconcileCatalogNotifications,
} from '../src/services/notificationCenter.ts';
import { buildMergedReleaseHistory } from '../src/data/releaseChangelog.ts';
import { ALL_SHEET_TABS, EMPTY_SHEET_CATALOG, resolveSheetRefItem } from '../src/utils/parsers.ts';
import type { GameItem } from '../src/types.ts';

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

test('buildNotificationFeed strictly returns only the 3 newest updates or newly added games', () => {
  const makeGame = (id: string, name: string, dateTimestamp: number, isNew = false): GameItem => ({
    id,
    tab: 'game',
    category: 'Games',
    name,
    version: 'v1.0',
    repackSize: '12 GB',
    repackSizeMB: 12288,
    originalSize: '24 GB',
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
    isNew,
    parsedTools: [],
    dateAdded: '',
    dateTimestamp,
    rawFields: {},
  });

  const games = Array.from({ length: 20 }, (_, i) =>
    makeGame(String(i + 1), `Game ${i + 1}`, 1000 + i * 100, i >= 17)
  );
  const catalog = {
    ...EMPTY_SHEET_CATALOG,
    game: games,
    upcoming: [makeGame('u1', 'Upcoming 1', 999999)],
  };

  const feed = buildNotificationFeed(catalog, []);
  assert.equal(MAX_NOTIFICATION_FEED_ITEMS, 3);
  assert.equal(feed.length, 3);
  assert.deepEqual(
    feed.map((f) => f.title),
    ['Game 20', 'Game 19', 'Game 18']
  );

  // Live diff update takes priority and total count remains capped at 3
  const liveFeed = buildNotificationFeed(catalog, [
    {
      id: 'live:upd:game:5:10',
      importance: 'important',
      tab: 'game',
      kind: 'version_update',
      title: 'Game 5',
      subtitle: 'v2.0',
      timestamp: Date.now(),
      isLiveDiff: true,
    },
  ]);
  assert.equal(liveFeed.length, 3);
  assert.equal(liveFeed[0].title, 'Game 5');

  // Stale live events from removed/fallback rows never lock out newer Google Sheet additions
  const freshFeed = buildNotificationFeed(catalog, [
    {
      id: 'live:add:game:9999',
      importance: 'important',
      tab: 'game',
      kind: 'new_addition',
      title: 'Stale Old Snapshot Item',
      subtitle: 'v1.0',
      timestamp: 500,
      isLiveDiff: true,
    },
  ]);
  assert.deepEqual(
    freshFeed.map((f) => f.title),
    ['Game 20', 'Game 19', 'Game 18']
  );
});

test('reconcileCatalogNotifications ignores static fallback syncs and only records real live Google Sheet changes', () => {
  const store = new Map<string, string>();
  const prevStorage = (globalThis as { localStorage?: Storage }).localStorage;
  (globalThis as { localStorage?: unknown }).localStorage = {
    getItem: (k: string) => store.get(k) ?? null,
    setItem: (k: string, v: string) => {
      store.set(k, String(v));
    },
    removeItem: (k: string) => {
      store.delete(k);
    },
  };

  try {
    const makeRow = (id: string, name: string, dateTimestamp: number): GameItem => ({
      id,
      tab: 'game',
      category: 'Games',
      name,
      version: 'v1.0',
      repackSize: '10 GB',
      repackSizeMB: 10240,
      originalSize: '20 GB',
      genreList: [],
      genresRaw: '',
      languages: 'English',
      repackBy: 'FitGirl',
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
      dateAdded: new Date(dateTimestamp).toISOString(),
      dateTimestamp,
      rawFields: {},
    });

    const fallbackCatalog = {
      ...EMPTY_SHEET_CATALOG,
      game: [makeRow('1', 'Old Snapshot Game', 1700000000000)],
    };

    // Fallback load MUST NOT touch baseline or create diff events
    const fallbackRes = reconcileCatalogNotifications(fallbackCatalog, { isLiveSync: false });
    assert.equal(fallbackRes.newEvents.length, 0);
    assert.equal(store.has('secretarea_notif_baseline_v2'), false);

    // First live GAS sync initializes baseline cleanly without flooding diffs
    const liveCatalog1 = {
      ...EMPTY_SHEET_CATALOG,
      game: [
        makeRow('1', 'Old Snapshot Game', 1700000000000),
        makeRow('425', 'Phantom Blade Zero', 1795472192127),
      ],
    };
    const firstLive = reconcileCatalogNotifications(liveCatalog1, { isLiveSync: true });
    assert.equal(firstLive.newEvents.length, 0);
    assert.equal(store.has('secretarea_notif_baseline_v2'), true);

    // Next live GAS sync detects real newly added game cleanly
    const liveCatalog2 = {
      ...EMPTY_SHEET_CATALOG,
      game: [
        ...liveCatalog1.game,
        makeRow('426', 'Tokyo Xtreme Racer', 1795597192892),
      ],
    };
    const secondLive = reconcileCatalogNotifications(liveCatalog2, { isLiveSync: true });
    assert.equal(secondLive.newEvents.length, 1);
    assert.equal(secondLive.newEvents[0].title, 'Tokyo Xtreme Racer');

    const finalFeed = buildNotificationFeed(liveCatalog2, secondLive.allEvents);
    assert.equal(finalFeed[0].title, 'Tokyo Xtreme Racer');
    assert.equal(finalFeed[1].title, 'Phantom Blade Zero');
  } finally {
    if (prevStorage) {
      (globalThis as { localStorage?: Storage }).localStorage = prevStorage;
    } else {
      delete (globalThis as { localStorage?: unknown }).localStorage;
    }
  }
});

test('Update History resolves v1.0.12 changelog cleanly and never clones v1.0.3 for future versions', () => {
  assert.equal(compareAppVersions('1.0.12', '1.0.11'), 1);
  assert.equal(compareAppVersions('1.0.12', '1.0.12'), 0);

  const history = buildMergedReleaseHistory({
    language: 'en',
    currentVersion: '1.0.12',
  });
  const currentEntry = history.find((r) => r.version === '1.0.12');
  assert.ok(currentEntry);
  assert.match(currentEntry.releaseTitle, /What's New|Notification/i);

  const futureHistory = buildMergedReleaseHistory({
    language: 'en',
    currentVersion: '1.0.99',
  });
  const futureEntry = futureHistory.find((r) => r.version === '1.0.99');
  assert.ok(futureEntry);
  assert.notEqual(
    futureEntry.items[0]?.title,
    'Hardware Monitor & Gaming Performance Center'
  );
});
