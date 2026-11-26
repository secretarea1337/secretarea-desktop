const PERF_PRESETS = Object.freeze({
  eco: Object.freeze({
    mode: 'eco',
    pauseBackgroundWhenMinimized: true,
    reduceVisualEffects: true,
    hardwarePollIntervalMs: 3000,
    downloadUiThrottleMs: 750,
    torrentActivePollMs: 3000,
    torrentIdlePollMs: 20000,
    adaptiveTorrentPolling: true,
    deferBackgroundChecks: true,
  }),
  balanced: Object.freeze({
    mode: 'balanced',
    pauseBackgroundWhenMinimized: true,
    reduceVisualEffects: false,
    hardwarePollIntervalMs: 1500,
    downloadUiThrottleMs: 350,
    torrentActivePollMs: 1500,
    torrentIdlePollMs: 12000,
    adaptiveTorrentPolling: true,
    deferBackgroundChecks: false,
  }),
  performance: Object.freeze({
    mode: 'performance',
    pauseBackgroundWhenMinimized: true,
    reduceVisualEffects: false,
    hardwarePollIntervalMs: 1000,
    downloadUiThrottleMs: 200,
    torrentActivePollMs: 1000,
    torrentIdlePollMs: 6000,
    adaptiveTorrentPolling: true,
    deferBackgroundChecks: false,
  }),
});

const DEFAULT_DESKTOP_PERF_CONFIG = PERF_PRESETS.balanced;

function getPresetPerformanceConfig(mode) {
  if (mode === 'eco') return { ...PERF_PRESETS.eco };
  if (mode === 'performance') return { ...PERF_PRESETS.performance };
  return { ...PERF_PRESETS.balanced };
}

function clampInt(val, min, max, fallback) {
  const num = Number(val);
  return Number.isFinite(num) ? Math.min(max, Math.max(min, Math.round(num))) : fallback;
}

function normalizePerformancePayload(raw) {
  const src = raw && typeof raw === 'object' ? raw : {};
  const mode = src.mode === 'eco' || src.mode === 'performance' ? src.mode : 'balanced';
  const preset = getPresetPerformanceConfig(mode);
  const isEco = mode === 'eco';
  const adaptiveTorrentPolling =
    typeof src.adaptiveTorrentPolling === 'boolean'
      ? src.adaptiveTorrentPolling
      : preset.adaptiveTorrentPolling;
  const torrentActivePollMs = clampInt(
    src.torrentActivePollMs,
    1000,
    10000,
    preset.torrentActivePollMs
  );
  const torrentIdlePollMs = adaptiveTorrentPolling
    ? clampInt(src.torrentIdlePollMs, 3000, 60000, preset.torrentIdlePollMs)
    : Math.max(3000, torrentActivePollMs);

  return {
    mode,
    pauseBackgroundWhenMinimized:
      typeof src.pauseBackgroundWhenMinimized === 'boolean'
        ? src.pauseBackgroundWhenMinimized
        : preset.pauseBackgroundWhenMinimized,
    reduceVisualEffects:
      isEco ||
      (typeof src.reduceVisualEffects === 'boolean'
        ? src.reduceVisualEffects
        : preset.reduceVisualEffects),
    hardwarePollIntervalMs: clampInt(
      src.hardwarePollIntervalMs,
      1000,
      10000,
      preset.hardwarePollIntervalMs
    ),
    downloadUiThrottleMs: clampInt(
      src.downloadUiThrottleMs,
      150,
      2000,
      preset.downloadUiThrottleMs
    ),
    torrentActivePollMs,
    torrentIdlePollMs,
    adaptiveTorrentPolling,
    deferBackgroundChecks:
      isEco ||
      (typeof src.deferBackgroundChecks === 'boolean'
        ? src.deferBackgroundChecks
        : preset.deferBackgroundChecks),
  };
}

function applyPerformanceConfigToSubsystems(cfg, subsystems = {}) {
  const normalized = normalizePerformancePayload(cfg);
  const { downloadManager, hardwareMonitor } = subsystems || {};
  if (downloadManager && typeof downloadManager.setPerformanceConfig === 'function') {
    downloadManager.setPerformanceConfig({
      throttleMs: normalized.downloadUiThrottleMs,
      torrentActivePollMs: normalized.torrentActivePollMs,
      torrentIdlePollMs: normalized.torrentIdlePollMs,
      adaptiveTorrentPolling: normalized.adaptiveTorrentPolling,
      pauseOnMinimize: normalized.pauseBackgroundWhenMinimized,
    });
  }
  if (hardwareMonitor && typeof hardwareMonitor.setPerformanceConfig === 'function') {
    hardwareMonitor.setPerformanceConfig({
      pauseOnMinimize: normalized.pauseBackgroundWhenMinimized,
      intervalMs: normalized.hardwarePollIntervalMs,
    });
  }
  return normalized;
}

module.exports = {
  PERF_PRESETS,
  DEFAULT_DESKTOP_PERF_CONFIG,
  getPresetPerformanceConfig,
  normalizePerformancePayload,
  applyPerformanceConfigToSubsystems,
};
