import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowClockwise,
  ArrowDown,
  ArrowUp,
  CalendarCheck,
  Cpu,
  Database,
  Desktop,
  Fan,
  GameController,
  Gauge,
  GraphicsCard,
  HardDrive,
  Heartbeat,
  Lightning,
  Memory,
  Pause,
  Play,
  Plug,
  Pulse,
  Sparkle,
  Thermometer,
  WifiHigh,
  Wrench,
} from '@phosphor-icons/react';
import type {
  DataProvenance,
  DeepHardwareInventory,
  EffectivePerformanceConfig,
  GameItem,
  HardwareDbEntry,
  HardwareDbState,
  HardwareMonitorSnapshot,
  PresentMonSetupState,
  WorkloadProfileId,
} from '../types';
import type { AppLanguage } from '../services/launcherSettings';
import { getTranslations } from '../i18n/translations';
import { GamingPerformancePanel } from './hardware/GamingPerformancePanel';
import { GpuCapabilitiesPanel } from './hardware/GpuCapabilitiesPanel';
import { PcCleanerPanel } from './hardware/PcCleanerPanel';
import { HealthDiagnosticsPanel } from './hardware/HealthDiagnosticsPanel';
import { SystemInventoryPortsPanel } from './hardware/SystemInventoryPortsPanel';
import { CompatibilityUpgradeAdvisorPanel } from './hardware/CompatibilityUpgradeAdvisorPanel';
import { BenchmarksAndDatabasePanel } from './hardware/BenchmarksAndDatabasePanel';
import { OpenSourceToolsPanel } from './hardware/OpenSourceToolsPanel';
import {
  BUNDLED_HARDWARE_DATABASE,
  BUNDLED_HARDWARE_DB_UPDATED_AT,
  BUNDLED_HARDWARE_DB_VERSION,
} from '../data/hardwareDatabase';
import {
  collectBrowserDeepInventory,
  EMPTY_HARDWARE_SNAPSHOT,
  formatClockGhz,
  formatClockMhz,
  formatDiskSpeed,
  formatFanSpeed,
  formatNetworkSpeed,
  formatPercent,
  formatPowerWatts,
  formatStorageBytes,
  formatTemperatureC,
  formatUptime,
  formatVramMB,
  getDesktopHardwareIntelligenceBridge,
  getDesktopHardwareMonitorBridge,
  isValidMetric,
  selectPrimaryGpu,
} from '../services/hardwareMonitor';
import {
  computeHealthAssessment,
  loadUserPsuWatts,
  loadWorkloadProfile,
  mergeHardwareDatabases,
  saveUserPsuWatts,
  saveWorkloadProfile,
} from '../services/hardwareIntelligence';

interface HardwareMonitorViewProps {
  isDesktopApp: boolean;
  language?: AppLanguage;
  presentMonSetupState?: PresentMonSetupState;
  onOpenPresentMonManager?: () => void;
  catalogGames?: GameItem[];
  effectivePerformance?: EffectivePerformanceConfig;
}

interface TelemetrySample {
  timestamp: number;
  cpuPercent: number | null;
  ramPercent: number | null;
  gpuPercent: number | null;
  cpuTempC: number | null;
  gpuTempC: number | null;
  netDownBytes: number | null;
  netUpBytes: number | null;
}

const MAX_HISTORY_SAMPLES = 75;
const INTERVAL_OPTIONS = [1000, 1500, 2000, 3000, 5000] as const;

function getUsageTone(percent: number | null) {
  if (!isValidMetric(percent)) {
    return {
      stroke: 'stroke-slate-400 dark:stroke-slate-600',
      bar: 'bg-slate-400 dark:bg-slate-600',
      text: 'text-slate-500 dark:text-[#8b9bb4]',
    };
  }
  if (percent >= 88) {
    return {
      stroke: 'stroke-rose-500 dark:stroke-[#fb7185]',
      bar: 'bg-gradient-to-r from-rose-500 to-rose-400',
      text: 'text-rose-600 dark:text-[#fb7185]',
    };
  }
  if (percent >= 70) {
    return {
      stroke: 'stroke-amber-500 dark:stroke-[#fbbf24]',
      bar: 'bg-gradient-to-r from-amber-500 to-amber-400',
      text: 'text-amber-600 dark:text-[#fbbf24]',
    };
  }
  return {
    stroke: 'stroke-[#0284c7] dark:stroke-[#38bdf8]',
    bar: 'bg-gradient-to-r from-[#0284c7] to-[#38bdf8]',
    text: 'text-[#0284c7] dark:text-[#38bdf8]',
  };
}

function getTempTone(celsius: number | null): string {
  if (!isValidMetric(celsius) || celsius <= 0) {
    return 'text-slate-500 dark:text-[#8b9bb4]';
  }
  if (celsius >= 85) {
    return 'text-rose-600 dark:text-[#fb7185]';
  }
  if (celsius >= 72) {
    return 'text-amber-600 dark:text-[#fbbf24]';
  }
  return 'text-emerald-600 dark:text-[#34d399]';
}

const RadialGauge = memo(function RadialGauge({
  value,
  label,
  accentClass,
  naLabel,
}: {
  value: number | null;
  label: string;
  accentClass?: string;
  naLabel: string;
}) {
  const radius = 26;
  const circumference = 2 * Math.PI * radius;
  const clamped = isValidMetric(value) ? Math.max(0, Math.min(100, value)) : 0;
  const offset = circumference - (clamped / 100) * circumference;
  const tone = getUsageTone(value);

  return (
    <div className="relative w-[68px] h-[68px] shrink-0 flex items-center justify-center">
      <svg viewBox="0 0 64 64" className="w-full h-full -rotate-90" aria-hidden="true">
        <circle
          cx="32"
          cy="32"
          r={radius}
          fill="none"
          strokeWidth="5.5"
          className="stroke-slate-200 dark:stroke-white/[0.08]"
        />
        {isValidMetric(value) && (
          <circle
            cx="32"
            cy="32"
            r={radius}
            fill="none"
            strokeWidth="5.5"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            className={`${accentClass || tone.stroke} transition-[stroke-dashoffset] duration-300 ease-out`}
          />
        )}
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
        <span
          dir="ltr"
          className={`text-[13px] font-bold font-mono-tabular leading-none ${
            isValidMetric(value) ? 'text-slate-900 dark:text-white' : 'text-slate-400 dark:text-[#7c8da6]'
          }`}
        >
          {formatPercent(value, naLabel)}
        </span>
        <span className="text-[9px] uppercase tracking-wider text-slate-500 dark:text-[#8b9bb4] mt-0.5 leading-none">
          {label}
        </span>
      </div>
    </div>
  );
});

interface ChartSeriesConfig {
  key: string;
  label: string;
  colorClass: string;
  strokeHex: string;
  values: (number | null)[];
  formatValue: (v: number | null) => string;
}

const LiveTelemetryChart = memo(function LiveTelemetryChart({
  title,
  series,
  timestamps,
  yMax,
  yAxisTicks,
  peakLabel,
  avgLabel,
  naLabel,
}: {
  title: string;
  series: ChartSeriesConfig[];
  timestamps: number[];
  yMax: number;
  yAxisTicks: string[];
  peakLabel: string;
  avgLabel: string;
  naLabel: string;
}) {
  const [hoverIdx, setHoverIdx] = useState<number | null>(null);
  const svgWidth = 560;
  const svgHeight = 148;
  const padTop = 8;
  const padBottom = 8;
  const plotHeight = svgHeight - padTop - padBottom;
  const safeMax = yMax > 0 ? yMax : 100;

  const builtSeries = useMemo(() => {
    const count = Math.max(2, series[0]?.values.length || 0);
    const stepX = count > 1 ? svgWidth / (count - 1) : svgWidth;

    return series.map((s) => {
      const padded =
        s.values.length < count
          ? [...Array<number | null>(count - s.values.length).fill(null), ...s.values]
          : s.values;

      const coords: { x: number; y: number; val: number }[] = [];
      const segments: string[][] = [];
      let currentSeg: string[] = [];

      padded.forEach((val, idx) => {
        const x = Number((idx * stepX).toFixed(1));
        if (isValidMetric(val)) {
          const ratio = Math.min(1, Math.max(0, val / safeMax));
          const y = Number((padTop + plotHeight * (1 - ratio)).toFixed(1));
          coords.push({ x, y, val });
          currentSeg.push(`${x},${y}`);
        } else if (currentSeg.length > 0) {
          segments.push(currentSeg);
          currentSeg = [];
        }
      });
      if (currentSeg.length > 0) segments.push(currentSeg);

      const numericVals = padded.filter((v): v is number => isValidMetric(v));
      const latest = numericVals.length > 0 ? numericVals[numericVals.length - 1] : null;
      const peak = numericVals.length > 0 ? Math.max(...numericVals) : null;
      const avg =
        numericVals.length > 0
          ? numericVals.reduce((a, b) => a + b, 0) / numericVals.length
          : null;

      return {
        ...s,
        padded,
        segments,
        lastCoord: coords[coords.length - 1] || null,
        latest,
        peak,
        avg,
      };
    });
  }, [series, safeMax, plotHeight]);

  const sampleCount = builtSeries[0]?.padded.length || 0;
  const hoverX =
    hoverIdx !== null && sampleCount > 1
      ? Number(((hoverIdx / (sampleCount - 1)) * svgWidth).toFixed(1))
      : null;

  return (
    <div className="sa-ps5-panel rounded-xl bg-white dark:bg-[#171d25] border border-slate-200 dark:border-white/[0.08] p-3.5 sm:p-4 shadow-xs dark:shadow-md flex flex-col gap-3">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <h3 className="text-[13px] sm:text-[13.5px] font-bold text-slate-900 dark:text-white">
          {title}
        </h3>
        <div className="flex flex-wrap items-center gap-3 text-[11.5px]">
          {builtSeries.map((s) => (
            <div key={s.key} className="inline-flex items-center gap-1.5">
              <span
                className="w-2.5 h-2.5 rounded-full shrink-0"
                style={{ backgroundColor: s.strokeHex }}
              />
              <span className="text-slate-600 dark:text-[#9cb0c9] font-medium">{s.label}:</span>
              <span
                dir="ltr"
                className="font-mono-tabular font-bold text-slate-900 dark:text-white"
              >
                {s.formatValue(s.latest)}
              </span>
            </div>
          ))}
        </div>
      </div>

      <div
        dir="ltr"
        className="relative rounded-lg bg-slate-50 dark:bg-[#11151b] border border-slate-200 dark:border-white/[0.07] p-2.5 overflow-hidden"
      >
        <div className="flex items-stretch gap-2 h-[136px] sm:h-[148px]">
          <div className="flex flex-col justify-between py-1 text-end text-[10px] font-mono-tabular text-slate-500 dark:text-[#8b9bb4] select-none shrink-0 w-[68px]">
            {yAxisTicks.map((tick, idx) => (
              <span key={idx} className="leading-none whitespace-nowrap">
                {tick}
              </span>
            ))}
          </div>

          <div
            className="relative flex-1 min-w-0 h-full cursor-crosshair select-none"
            onPointerMove={(e) => {
              const rect = e.currentTarget.getBoundingClientRect();
              if (rect.width <= 0 || sampleCount <= 1) return;
              const rel = Math.min(1, Math.max(0, (e.clientX - rect.left) / rect.width));
              setHoverIdx(Math.round(rel * (sampleCount - 1)));
            }}
            onPointerLeave={() => setHoverIdx(null)}
          >
            {hoverIdx !== null && (
              <div className="absolute top-1 right-1 max-w-[calc(100%-8px)] z-10 px-2 py-1 rounded bg-white/95 dark:bg-[#1a222d]/95 border border-slate-200 dark:border-white/[0.12] text-[10.5px] font-mono-tabular shadow-sm pointer-events-none flex flex-wrap items-center gap-x-2.5 gap-y-0.5">
                {timestamps[hoverIdx] ? (
                  <span className="text-slate-500 dark:text-[#8b9bb4]">
                    {new Date(timestamps[hoverIdx]).toLocaleTimeString([], {
                      hour: '2-digit',
                      minute: '2-digit',
                      second: '2-digit',
                    })}
                  </span>
                ) : null}
                {builtSeries.map((s) => (
                  <span key={s.key} className="font-semibold" style={{ color: s.strokeHex }}>
                    {s.label}: {s.formatValue(s.padded[hoverIdx] ?? null)}
                  </span>
                ))}
              </div>
            )}

            <svg
              viewBox={`0 0 ${svgWidth} ${svgHeight}`}
              preserveAspectRatio="none"
              className="w-full h-full overflow-visible"
            >
              {[0, 0.25, 0.5, 0.75, 1].map((frac, idx) => {
                const y = padTop + plotHeight * frac;
                return (
                  <line
                    key={`h-${idx}`}
                    x1={0}
                    x2={svgWidth}
                    y1={y}
                    y2={y}
                    stroke="currentColor"
                    strokeDasharray="4 4"
                    strokeWidth="1"
                    className="text-slate-300/80 dark:text-white/[0.1]"
                  />
                );
              })}

              {[0, 0.25, 0.5, 0.75, 1].map((frac, idx) => {
                const x = svgWidth * frac;
                return (
                  <line
                    key={`v-${idx}`}
                    x1={x}
                    x2={x}
                    y1={padTop}
                    y2={padTop + plotHeight}
                    stroke="currentColor"
                    strokeDasharray="4 4"
                    strokeWidth="1"
                    className="text-slate-300/60 dark:text-white/[0.07]"
                  />
                );
              })}

              {builtSeries.map((s) =>
                s.segments.map((seg, segIdx) => {
                  const pts = seg.join(' ');
                  const firstX = seg[0]?.split(',')[0] ?? '0';
                  const lastX = seg[seg.length - 1]?.split(',')[0] ?? String(svgWidth);
                  const baseLineY = (padTop + plotHeight).toFixed(1);
                  return (
                    <g key={`${s.key}-${segIdx}`}>
                      {seg.length > 1 && (
                        <polygon
                          points={`${firstX},${baseLineY} ${pts} ${lastX},${baseLineY}`}
                          fill={s.strokeHex}
                          fillOpacity="0.12"
                        />
                      )}
                      {seg.length > 1 && (
                        <polyline
                          fill="none"
                          stroke={s.strokeHex}
                          strokeWidth="2.2"
                          strokeLinejoin="round"
                          strokeLinecap="round"
                          points={pts}
                        />
                      )}
                    </g>
                  );
                })
              )}

              {builtSeries.map((s) =>
                s.lastCoord ? (
                  <circle
                    key={`dot-${s.key}`}
                    cx={s.lastCoord.x}
                    cy={s.lastCoord.y}
                    r="3.8"
                    fill={s.strokeHex}
                    className="stroke-white dark:stroke-[#11151b]"
                    strokeWidth="1.5"
                  />
                ) : null
              )}

              {hoverX !== null && (
                <line
                  x1={hoverX}
                  x2={hoverX}
                  y1={padTop}
                  y2={padTop + plotHeight}
                  stroke="currentColor"
                  strokeWidth="1"
                  className="text-slate-500 dark:text-white/40"
                />
              )}
            </svg>
          </div>
        </div>
      </div>

      {/* Historical Min / Avg / Peak Summary Strip */}
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-slate-500 dark:text-[#8b9bb4]">
        {builtSeries.map((s) => (
          <div key={`stat-${s.key}`} className="flex items-center gap-2">
            <span className="font-semibold text-slate-700 dark:text-[#c7d4e5]">{s.label}</span>
            <span dir="ltr" className="font-mono-tabular">
              {avgLabel}: {s.avg !== null ? s.formatValue(s.avg) : naLabel}
            </span>
            <span aria-hidden="true" className="opacity-40">
              •
            </span>
            <span dir="ltr" className="font-mono-tabular">
              {peakLabel}: {s.peak !== null ? s.formatValue(s.peak) : naLabel}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
});

const MetricRow = memo(function MetricRow({
  label,
  value,
  valueClassName = 'text-slate-900 dark:text-white',
  ltr = true,
}: {
  label: string;
  value: string;
  valueClassName?: string;
  ltr?: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-3 py-1.5 border-b border-slate-100 dark:border-white/[0.06] last:border-b-0 min-w-0">
      <span className="text-[12px] text-slate-600 dark:text-[#9cb0c9] shrink-0">{label}</span>
      <span
        dir={ltr ? 'ltr' : undefined}
        title={value}
        className={`text-[12.5px] font-semibold font-mono-tabular text-end min-w-0 truncate ${valueClassName}`}
      >
        {value}
      </span>
    </div>
  );
});

export function HardwareMonitorView({
  isDesktopApp,
  language = 'en',
  presentMonSetupState,
  onOpenPresentMonManager,
  catalogGames = [],
  effectivePerformance,
}: HardwareMonitorViewProps) {
  const tr = getTranslations(language);
  const t = tr.hardware;
  const naLabel = t.naValue;

  const bridge = useMemo(() => getDesktopHardwareMonitorBridge(), []);
  const intelBridge = useMemo(() => getDesktopHardwareIntelligenceBridge(), []);
  const hasDesktopTelemetry = Boolean(isDesktopApp && bridge);

  const [activeTab, setActiveTab] = useState<
    'overview' | 'health' | 'inventory' | 'advisors' | 'benchmarks' | 'gaming' | 'technologies' | 'cleaner' | 'tools'
  >('overview');
  const [snapshot, setSnapshot] = useState<HardwareMonitorSnapshot>(EMPTY_HARDWARE_SNAPSHOT);
  const [isMonitoring, setIsMonitoring] = useState<boolean>(hasDesktopTelemetry);
  const [intervalMs, setIntervalMs] = useState<number>(
    () => effectivePerformance?.hardwarePollIntervalMs ?? 1500
  );
  const hasManualIntervalRef = useRef<boolean>(false);
  const [isRefreshingOnce, setIsRefreshingOnce] = useState<boolean>(false);
  const [history, setHistory] = useState<TelemetrySample[]>([]);
  const lastSampleTsRef = useRef<number>(0);

  const [workload, setWorkload] = useState<WorkloadProfileId>(() => loadWorkloadProfile());
  const [userPsuWatts, setUserPsuWatts] = useState<number | null>(() => loadUserPsuWatts());
  const [deepInventory, setDeepInventory] = useState<DeepHardwareInventory | null>(null);
  const [isLoadingDeepInventory, setIsLoadingDeepInventory] = useState<boolean>(false);
  const [dbState, setDbState] = useState<HardwareDbState>({
    dbVersion: BUNDLED_HARDWARE_DB_VERSION,
    lastUpdatedAt: BUNDLED_HARDWARE_DB_UPDATED_AT,
    lastCheckedAt: null,
    updateFeedUrl: 'https://raw.githubusercontent.com/secretarea1337/secretarea-desktop/main/hardware-db.json',
    entryCount: BUNDLED_HARDWARE_DATABASE.length,
    hasBackup: false,
    lastError: null,
    sourceLabel: 'Bundled Offline Hardware Database',
    customEntriesCount: 0,
  });
  const [customDbEntries, setCustomDbEntries] = useState<HardwareDbEntry[]>([]);

  const hasRequestedDeepRef = useRef<boolean>(false);
  const hasRequestedDbRef = useRef<boolean>(false);

  const loadDeepInventory = useCallback(
    async (forceRefresh = false) => {
      setIsLoadingDeepInventory(true);
      try {
        if (hasDesktopTelemetry && intelBridge) {
          const inv = await intelBridge.getDeepInventory(forceRefresh);
          if (inv) {
            setDeepInventory(inv);
            return;
          }
        }
        const browserInv = await collectBrowserDeepInventory();
        setDeepInventory(browserInv);
      } finally {
        setIsLoadingDeepInventory(false);
      }
    },
    [hasDesktopTelemetry, intelBridge]
  );

  // Lazy-load heavy 35-query deep inventory ONLY when entering deep diagnostics/inventory/advisor tabs
  useEffect(() => {
    const needsDeepInventory =
      activeTab === 'health' || activeTab === 'inventory' || activeTab === 'advisors';
    if (needsDeepInventory && !hasRequestedDeepRef.current) {
      hasRequestedDeepRef.current = true;
      void loadDeepInventory(false);
    }
  }, [activeTab, loadDeepInventory]);

  // Lazy-load hardware DB metadata/entries only when entering tabs that inspect/update DB
  useEffect(() => {
    const needsDb =
      activeTab === 'benchmarks' || activeTab === 'health' || activeTab === 'advisors';
    if (needsDb && !hasRequestedDbRef.current && hasDesktopTelemetry && intelBridge) {
      hasRequestedDbRef.current = true;
      void intelBridge.getDbState().then((st) => {
        if (st) setDbState(st);
      });
      void intelBridge.getDbEntries().then((entries) => {
        if (Array.isArray(entries)) setCustomDbEntries(entries);
      });
    }
  }, [activeTab, hasDesktopTelemetry, intelBridge]);

  const mergedDbEntries = useMemo(
    () => mergeHardwareDatabases(customDbEntries),
    [customDbEntries]
  );

  const activeInventory = deepInventory;

  const assessment = useMemo(() => {
    if (!activeInventory) return null;
    return computeHealthAssessment({
      snapshot,
      inventory: activeInventory,
      workload,
      dbEntries: mergedDbEntries,
      userPsuWatts,
    });
  }, [snapshot, activeInventory, workload, mergedDbEntries, userPsuWatts]);

  const provenanceLabels = useMemo<Record<DataProvenance, string>>(
    () => ({
      detected: t.provDetected,
      measured: t.provMeasured,
      manufacturer_spec: t.provSpec,
      estimated: t.provEstimated,
      not_supported: t.provNotSupported,
      not_detected: t.provNotDetected,
      sensor_unavailable: t.provSensorUnavailable,
      unknown: t.provUnknown,
      requires_admin: t.provRequiresAdmin,
    }),
    [t]
  );

  const handleChangeWorkload = useCallback((next: WorkloadProfileId) => {
    setWorkload(next);
    saveWorkloadProfile(next);
  }, []);

  const handleChangeUserPsuWatts = useCallback((next: number | null) => {
    setUserPsuWatts(next);
    saveUserPsuWatts(next);
  }, []);

  const appendSnapshot = useCallback((next: HardwareMonitorSnapshot | null) => {
    if (!next) return;
    setSnapshot(next);
    if (next.timestamp && next.timestamp !== lastSampleTsRef.current) {
      lastSampleTsRef.current = next.timestamp;
      const primaryGpu = selectPrimaryGpu(next.gpus);
      const fallbackGpuTemp =
        (next.gpus || [])
          .map((g) => g.temperatureCelsius)
          .find((v): v is number => isValidMetric(v) && v > 0) ?? null;
      const sample: TelemetrySample = {
        timestamp: next.timestamp,
        cpuPercent: next.cpu.usagePercent,
        ramPercent: next.ram.usagePercent,
        gpuPercent: primaryGpu?.utilizationPercent ?? null,
        cpuTempC: next.cpu.temperatureCelsius,
        gpuTempC: primaryGpu?.temperatureCelsius ?? fallbackGpuTemp,
        netDownBytes: next.network.totalDownloadBytesPerSec,
        netUpBytes: next.network.totalUploadBytesPerSec,
      };
      setHistory((prev) => {
        const updated = [...prev, sample];
        return updated.length > MAX_HISTORY_SAMPLES
          ? updated.slice(updated.length - MAX_HISTORY_SAMPLES)
          : updated;
      });
    }
  }, []);

  const intervalMsRef = useRef<number>(intervalMs);
  intervalMsRef.current = intervalMs;
  const pauseWhenHiddenRef = useRef<boolean>(
    effectivePerformance?.pauseBackgroundWhenMinimized !== false
  );
  pauseWhenHiddenRef.current = effectivePerformance?.pauseBackgroundWhenMinimized !== false;

  // Live-sync sampling interval from Performance Settings unless overridden locally in this view
  useEffect(() => {
    const nextPerfInterval = effectivePerformance?.hardwarePollIntervalMs;
    if (!nextPerfInterval || hasManualIntervalRef.current) return;
    setIntervalMs(nextPerfInterval);
    if (bridge && isMonitoring) {
      void bridge.setInterval(nextPerfInterval);
    }
  }, [effectivePerformance?.hardwarePollIntervalMs, bridge, isMonitoring]);

  // Subscribe and start polling ONLY while Hardware Monitor view is mounted and monitoring is active
  useEffect(() => {
    if (!bridge) {
      setIsMonitoring(false);
      return;
    }

    let mounted = true;
    const unsubscribe = bridge.onUpdate((incoming) => {
      if (!mounted) return;
      if (pauseWhenHiddenRef.current && typeof document !== 'undefined' && document.hidden) {
        return;
      }
      appendSnapshot(incoming);
    });

    if (isMonitoring) {
      void bridge.start(intervalMsRef.current).then((initial) => {
        if (mounted && initial) {
          appendSnapshot(initial);
        }
      });
    } else {
      void bridge.stop();
      if (lastSampleTsRef.current === 0) {
        void bridge.getSnapshot().then((snap) => {
          if (mounted && snap && lastSampleTsRef.current === 0) {
            appendSnapshot(snap);
          }
        });
      }
    }

    return () => {
      mounted = false;
      unsubscribe();
      void bridge.stop();
    };
  }, [bridge, isMonitoring, appendSnapshot]);

  const handleToggleMonitoring = useCallback(() => {
    if (!bridge) return;
    setIsMonitoring((prev) => !prev);
  }, [bridge]);

  const handleChangeInterval = useCallback(
    (nextMs: number) => {
      hasManualIntervalRef.current = true;
      setIntervalMs(nextMs);
      if (bridge) {
        void bridge.setInterval(nextMs);
      }
    },
    [bridge]
  );

  const handleManualRefresh = useCallback(async () => {
    if (!bridge || isRefreshingOnce) return;
    setIsRefreshingOnce(true);
    try {
      const snap = await bridge.getSnapshot();
      appendSnapshot(snap);
    } finally {
      setIsRefreshingOnce(false);
    }
  }, [bridge, isRefreshingOnce, appendSnapshot]);

  const primaryGpu = selectPrimaryGpu(snapshot.gpus);
  const activeNet = snapshot.network.activeInterface;

  const timestamps = useMemo(() => history.map((h) => h.timestamp), [history]);

  const networkChartScale = useMemo(() => {
    let peakBytes = 0;
    for (const h of history) {
      if (isValidMetric(h.netDownBytes) && h.netDownBytes > peakBytes) peakBytes = h.netDownBytes;
      if (isValidMetric(h.netUpBytes) && h.netUpBytes > peakBytes) peakBytes = h.netUpBytes;
    }
    const minFloor = 256 * 1024; // 256 KB/s baseline
    const target = Math.max(minFloor, peakBytes * 1.2);
    const mb = target / (1024 * 1024);
    const stepsMb = [0.25, 0.5, 1, 2, 5, 10, 25, 50, 100, 250, 500, 1000];
    let yMax = 1000 * 1024 * 1024;
    for (const step of stepsMb) {
      if (mb <= step) {
        yMax = step * 1024 * 1024;
        break;
      }
    }
    const ticks = [1, 0.75, 0.5, 0.25, 0].map((frac) =>
      formatNetworkSpeed(yMax * frac, naLabel)
    );
    return { yMax, ticks };
  }, [history, naLabel]);

  const intervalOptions = [
    { ms: 1000, label: t.interval1s },
    { ms: 1500, label: t.interval1500ms },
    { ms: 2000, label: t.interval2s },
    { ms: 3000, label: t.interval3s },
    { ms: 5000, label: t.interval5s },
  ];

  const cpuCoresThreadsText =
    isValidMetric(snapshot.cpu.physicalCores) || isValidMetric(snapshot.cpu.logicalThreads)
      ? `${snapshot.cpu.physicalCores ?? naLabel} ${t.coresUnit} / ${
          snapshot.cpu.logicalThreads ?? naLabel
        } ${t.threadsUnit}`
      : naLabel;

  return (
    <div className="flex-1 min-h-0 overflow-y-auto bg-slate-50 dark:bg-[#0e141b] text-slate-900 dark:text-white">
      <div className="w-full max-w-[1600px] mx-auto px-3 sm:px-5 lg:px-8 py-4 sm:py-6 space-y-5 sm:space-y-6">
        {/* Header Bar */}
        <section className="sa-ps5-panel rounded-xl bg-white dark:bg-[#171d25] border border-slate-200 dark:border-white/[0.08] p-4 sm:p-5 shadow-xs dark:shadow-md">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            <div className="space-y-1 min-w-0">
              <div className="flex flex-wrap items-center gap-2.5">
                <div className="w-9 h-9 rounded-lg bg-sky-500/12 dark:bg-[#38bdf8]/15 border border-sky-500/25 dark:border-[#38bdf8]/30 flex items-center justify-center shrink-0">
                  <Pulse weight="duotone" className="w-5 h-5 text-[#0284c7] dark:text-[#38bdf8]" />
                </div>
                <div className="min-w-0">
                  <h1 className="font-display text-[19px] sm:text-[22px] font-bold tracking-tight text-slate-900 dark:text-white truncate">
                    {t.pageTitle}
                  </h1>
                  <p className="text-[12.5px] sm:text-[13px] text-slate-600 dark:text-[#9cb0c9]">
                    {t.pageSubtitle}
                  </p>
                </div>
              </div>
            </div>

            {/* Monitoring Controls */}
            <div className="flex flex-wrap items-center gap-2.5 shrink-0">
              {/* Live State Indicator */}
              <div
                className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border text-[12px] font-semibold whitespace-nowrap ${
                  !hasDesktopTelemetry
                    ? 'bg-amber-50 dark:bg-amber-500/10 border-amber-200 dark:border-amber-400/30 text-amber-800 dark:text-amber-300'
                    : isMonitoring
                    ? 'bg-emerald-50 dark:bg-emerald-500/10 border-emerald-200 dark:border-emerald-400/30 text-emerald-700 dark:text-[#34d399]'
                    : 'bg-slate-100 dark:bg-white/[0.05] border-slate-200 dark:border-white/[0.1] text-slate-600 dark:text-[#9cb0c9]'
                }`}
              >
                <span
                  aria-hidden="true"
                  className={`w-2 h-2 rounded-full shrink-0 ${
                    !hasDesktopTelemetry
                      ? 'bg-amber-500'
                      : isMonitoring
                      ? effectivePerformance?.reduceVisualEffects
                        ? 'bg-emerald-500'
                        : 'bg-emerald-500 motion-safe:animate-pulse'
                      : 'bg-slate-400 dark:bg-slate-500'
                  }`}
                />
                <span>
                  {!hasDesktopTelemetry
                    ? t.statusWebPreview
                    : isMonitoring
                    ? t.statusActive
                    : t.statusStopped}
                </span>
              </div>

              {/* Interval Selector */}
              <label className="inline-flex items-center gap-2 text-[12px] text-slate-600 dark:text-[#9cb0c9]">
                <span className="font-medium whitespace-nowrap">{t.intervalLabel}:</span>
                <select
                  value={intervalMs}
                  disabled={!hasDesktopTelemetry}
                  onChange={(e) => handleChangeInterval(Number(e.target.value))}
                  aria-label={t.intervalLabel}
                  className="min-h-[36px] px-2.5 py-1 rounded-lg bg-slate-50 dark:bg-[#10151c] border border-slate-200 dark:border-white/[0.12] text-[12px] font-mono-tabular font-semibold text-slate-800 dark:text-white focus:border-[#0284c7] dark:focus:border-[#38bdf8] focus:outline-none disabled:opacity-50 cursor-pointer"
                >
                  {intervalOptions.map((opt) => (
                    <option key={opt.ms} value={opt.ms}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </label>

              {/* Refresh Single Snapshot Button */}
              <button
                type="button"
                disabled={!hasDesktopTelemetry || isRefreshingOnce}
                onClick={() => void handleManualRefresh()}
                className="inline-flex items-center gap-1.5 min-h-[36px] px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-[#1f2835] dark:hover:bg-[#293546] border border-slate-200 dark:border-white/[0.1] text-[12px] font-semibold text-slate-700 dark:text-[#d5e0ee] transition-colors disabled:opacity-45 whitespace-nowrap shrink-0 cursor-pointer"
              >
                <ArrowClockwise
                  className={`w-4 h-4 ${isRefreshingOnce ? 'motion-safe:animate-spin' : ''}`}
                />
                <span>{t.refreshNow}</span>
              </button>

              {/* Start / Stop Monitoring Toggle */}
              <button
                type="button"
                disabled={!hasDesktopTelemetry}
                onClick={handleToggleMonitoring}
                className={`inline-flex items-center gap-1.5 min-h-[36px] px-3.5 py-1.5 rounded-lg text-[12.5px] font-semibold transition-colors disabled:opacity-45 whitespace-nowrap shrink-0 cursor-pointer ${
                  isMonitoring
                    ? 'bg-rose-600 hover:bg-rose-700 text-white'
                    : 'bg-[#0284c7] hover:bg-[#0369a1] dark:bg-[#0ea5e9] dark:hover:bg-[#0284c7] text-white'
                }`}
              >
                {isMonitoring ? (
                  <>
                    <Pause weight="fill" className="w-3.5 h-3.5" />
                    <span>{t.stopMonitoring}</span>
                  </>
                ) : (
                  <>
                    <Play weight="fill" className="w-3.5 h-3.5" />
                    <span>{t.startMonitoring}</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Host / Uptime Meta Strip when Desktop Telemetry available */}
          {hasDesktopTelemetry && (snapshot.hostname || isValidMetric(snapshot.uptimeSeconds)) && (
            <div className="mt-3 pt-3 border-t border-slate-100 dark:border-white/[0.06] flex flex-wrap items-center gap-x-5 gap-y-1 text-[11.5px] text-slate-500 dark:text-[#8b9bb4]">
              {snapshot.hostname && (
                <span>
                  {t.hostLabel}:{' '}
                  <strong dir="ltr" className="font-mono-tabular text-slate-700 dark:text-[#d5e0ee]">
                    {snapshot.hostname}
                  </strong>
                </span>
              )}
              {isValidMetric(snapshot.uptimeSeconds) && (
                <span>
                  {t.uptimeLabel}:{' '}
                  <strong dir="ltr" className="font-mono-tabular text-slate-700 dark:text-[#d5e0ee]">
                    {formatUptime(snapshot.uptimeSeconds, naLabel)}
                  </strong>
                </span>
              )}
              {snapshot.timestamp > 0 && (
                <span>
                  {t.lastUpdatedLabel}:{' '}
                  <strong dir="ltr" className="font-mono-tabular text-slate-700 dark:text-[#d5e0ee]">
                    {new Date(snapshot.timestamp).toLocaleTimeString([], {
                      hour: '2-digit',
                      minute: '2-digit',
                      second: '2-digit',
                    })}
                  </strong>
                </span>
              )}
            </div>
          )}

          {/* Web Preview Notice */}
          {!hasDesktopTelemetry && (
            <div className="mt-3.5 rounded-lg bg-amber-50 dark:bg-amber-500/[0.08] border border-amber-200 dark:border-amber-400/25 px-3.5 py-2.5 flex items-start gap-2.5 text-[12.5px]">
              <Desktop className="w-4.5 h-4.5 text-amber-600 dark:text-amber-300 shrink-0 mt-0.5" />
              <div className="space-y-0.5">
                <div className="font-semibold text-amber-900 dark:text-amber-200">
                  {t.webPreviewTitle}
                </div>
                <p className="text-amber-800/90 dark:text-amber-200/80 leading-relaxed">
                  {t.webPreviewBody}
                </p>
              </div>
            </div>
          )}
        </section>

        {/* Sub-Navigation Tabs for Live Telemetry, Health Diagnostics, Inventory/Ports, Advisors/2030, Benchmarks/DB, Gaming, GPU Tech, and PC Cleaner */}
        <nav
          aria-label={t.pageTitle}
          className="flex flex-wrap items-center gap-2 border-b border-slate-200 dark:border-white/[0.08] pb-3"
        >
          {(
            [
              { id: 'overview', label: t.tabOverview, Icon: Pulse },
              { id: 'health', label: t.tabHealth, Icon: Heartbeat },
              { id: 'inventory', label: t.tabInventoryPorts, Icon: Plug },
              { id: 'advisors', label: t.tabAdvisors2030, Icon: CalendarCheck },
              { id: 'benchmarks', label: t.tabBenchmarksDb, Icon: Database },
              { id: 'gaming', label: t.tabGaming, Icon: GameController },
              { id: 'technologies', label: t.tabTechnologies, Icon: GraphicsCard },
              { id: 'cleaner', label: t.tabCleaner, Icon: Sparkle },
              { id: 'tools', label: t.tabOpenSourceTools, Icon: Wrench },
            ] as const
          ).map(({ id, label, Icon }) => {
            const active = activeTab === id;
            return (
              <button
                key={id}
                type="button"
                onClick={() => setActiveTab(id)}
                className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-lg text-[12.5px] font-semibold border transition-colors whitespace-nowrap cursor-pointer ${
                  active
                    ? 'bg-[#0284c7] dark:bg-[#0ea5e9] border-[#0284c7] dark:border-[#38bdf8] text-white shadow-xs'
                    : 'bg-white dark:bg-[#171d25] border-slate-200 dark:border-white/[0.08] text-slate-700 dark:text-[#cbd5e1] hover:bg-slate-100 dark:hover:bg-[#1e2633]'
                }`}
              >
                <Icon weight={active ? 'fill' : 'duotone'} className="w-4 h-4 shrink-0" />
                <span>{label}</span>
              </button>
            );
          })}
        </nav>

        {(activeTab === 'health' || activeTab === 'inventory' || activeTab === 'advisors') &&
          !activeInventory && (
            <div className="sa-ps5-panel rounded-xl bg-white dark:bg-[#171d25] border border-slate-200 dark:border-white/[0.08] p-8 flex items-center justify-center gap-3 text-[13px] font-medium text-slate-600 dark:text-[#9cb0c9]">
              <ArrowClockwise className="w-4.5 h-4.5 motion-safe:animate-spin text-[#0284c7] dark:text-[#38bdf8]" />
              <span>{t.intelRefreshDeepScan}...</span>
            </div>
          )}

        {activeTab === 'health' && activeInventory && assessment && (
          <HealthDiagnosticsPanel
            isDesktopApp={hasDesktopTelemetry}
            snapshot={snapshot}
            inventory={activeInventory}
            isLoadingInventory={isLoadingDeepInventory}
            onRefreshInventory={() => void loadDeepInventory(true)}
            assessment={assessment}
            workload={workload}
            onChangeWorkload={handleChangeWorkload}
            provenanceLabels={provenanceLabels}
            t={t as unknown as Record<string, string>}
          />
        )}

        {activeTab === 'inventory' && activeInventory && (
          <SystemInventoryPortsPanel
            snapshot={snapshot}
            inventory={activeInventory}
            provenanceLabels={provenanceLabels}
            t={t as unknown as Record<string, string>}
          />
        )}

        {activeTab === 'advisors' && activeInventory && assessment && (
          <CompatibilityUpgradeAdvisorPanel
            snapshot={snapshot}
            inventory={activeInventory}
            assessment={assessment}
            dbEntries={mergedDbEntries}
            catalogGames={catalogGames}
            userPsuWatts={userPsuWatts}
            onChangeUserPsuWatts={handleChangeUserPsuWatts}
            provenanceLabels={provenanceLabels}
            t={t as unknown as Record<string, string>}
          />
        )}

        {activeTab === 'benchmarks' && (
          <BenchmarksAndDatabasePanel
            isDesktopApp={hasDesktopTelemetry}
            dbState={dbState}
            dbEntries={mergedDbEntries}
            onDbUpdated={(nextState, nextEntries) => {
              setDbState(nextState);
              setCustomDbEntries(nextEntries);
            }}
            t={t as unknown as Record<string, string>}
          />
        )}

        {activeTab === 'gaming' && (
          <GamingPerformancePanel
            isDesktopApp={hasDesktopTelemetry}
            language={language}
            snapshot={snapshot}
            presentMonSetupState={presentMonSetupState}
            onOpenPresentMonManager={onOpenPresentMonManager}
          />
        )}

        {activeTab === 'technologies' && (
          <GpuCapabilitiesPanel language={language} snapshot={snapshot} />
        )}

        {activeTab === 'cleaner' && (
          <PcCleanerPanel isDesktopApp={hasDesktopTelemetry} language={language} />
        )}

        {activeTab === 'tools' && (
          <OpenSourceToolsPanel
            isDesktopApp={hasDesktopTelemetry}
            t={t as unknown as Record<string, string>}
          />
        )}

        {activeTab === 'overview' && (
          <>
            {/* SECTION A: System Overview */}
            <section aria-labelledby="hw-overview-heading" className="space-y-3">
          <h2
            id="hw-overview-heading"
            className="text-[13px] font-bold uppercase tracking-wider text-slate-500 dark:text-[#8b9bb4] px-0.5"
          >
            {t.sectionOverview}
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3.5">
            {/* CPU Overview Card */}
            <div className="sa-ps5-panel rounded-xl bg-white dark:bg-[#171d25] border border-slate-200 dark:border-white/[0.08] p-4 shadow-xs dark:shadow-md flex items-center gap-3.5">
              <RadialGauge
                value={snapshot.cpu.usagePercent}
                label="CPU"
                naLabel={naLabel}
              />
              <div className="min-w-0 flex-1 space-y-1">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[11.5px] font-bold uppercase tracking-wider text-slate-500 dark:text-[#8b9bb4]">
                    CPU
                  </span>
                  <span
                    dir="ltr"
                    className={`inline-flex items-center gap-1 text-[12px] font-mono-tabular font-bold ${getTempTone(
                      snapshot.cpu.temperatureCelsius
                    )}`}
                  >
                    <Thermometer className="w-3.5 h-3.5" />
                    {formatTemperatureC(snapshot.cpu.temperatureCelsius, naLabel)}
                  </span>
                </div>
                <p
                  className="text-[13px] font-semibold text-slate-900 dark:text-white truncate"
                  title={snapshot.cpu.model || naLabel}
                >
                  {snapshot.cpu.model || naLabel}
                </p>
                <div
                  dir="ltr"
                  className="flex flex-wrap items-center gap-x-2.5 gap-y-0.5 text-[11.5px] font-mono-tabular text-slate-600 dark:text-[#9cb0c9]"
                >
                  <span>{formatClockGhz(snapshot.cpu.clockSpeedGhz, naLabel)}</span>
                  <span aria-hidden="true" className="opacity-40">
                    •
                  </span>
                  <span>
                    {isValidMetric(snapshot.cpu.logicalThreads)
                      ? `${snapshot.cpu.logicalThreads} ${t.threadsUnit}`
                      : naLabel}
                  </span>
                </div>
              </div>
            </div>

            {/* GPU Overview Card */}
            <div className="sa-ps5-panel rounded-xl bg-white dark:bg-[#171d25] border border-slate-200 dark:border-white/[0.08] p-4 shadow-xs dark:shadow-md flex items-center gap-3.5">
              <RadialGauge
                value={primaryGpu?.utilizationPercent ?? null}
                label="GPU"
                accentClass="stroke-violet-500 dark:stroke-[#a78bfa]"
                naLabel={naLabel}
              />
              <div className="min-w-0 flex-1 space-y-1">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[11.5px] font-bold uppercase tracking-wider text-slate-500 dark:text-[#8b9bb4]">
                    GPU {snapshot.gpus.length > 1 ? `(${snapshot.gpus.length})` : ''}
                  </span>
                  <span
                    dir="ltr"
                    className={`inline-flex items-center gap-1 text-[12px] font-mono-tabular font-bold ${getTempTone(
                      primaryGpu?.temperatureCelsius ?? null
                    )}`}
                  >
                    <Thermometer className="w-3.5 h-3.5" />
                    {formatTemperatureC(primaryGpu?.temperatureCelsius ?? null, naLabel)}
                  </span>
                </div>
                <p
                  className="text-[13px] font-semibold text-slate-900 dark:text-white truncate"
                  title={primaryGpu?.model || naLabel}
                >
                  {primaryGpu?.model || naLabel}
                </p>
                <div
                  dir="ltr"
                  className="text-[11.5px] font-mono-tabular text-slate-600 dark:text-[#9cb0c9] truncate"
                >
                  VRAM:{' '}
                  {isValidMetric(primaryGpu?.vramUsedMB) && isValidMetric(primaryGpu?.vramTotalMB)
                    ? `${formatVramMB(primaryGpu.vramUsedMB, naLabel)} / ${formatVramMB(
                        primaryGpu.vramTotalMB,
                        naLabel
                      )}`
                    : isValidMetric(primaryGpu?.vramTotalMB)
                    ? formatVramMB(primaryGpu.vramTotalMB, naLabel)
                    : naLabel}
                </div>
              </div>
            </div>

            {/* RAM Overview Card */}
            <div className="sa-ps5-panel rounded-xl bg-white dark:bg-[#171d25] border border-slate-200 dark:border-white/[0.08] p-4 shadow-xs dark:shadow-md flex items-center gap-3.5">
              <RadialGauge
                value={snapshot.ram.usagePercent}
                label="RAM"
                accentClass="stroke-emerald-500 dark:stroke-[#34d399]"
                naLabel={naLabel}
              />
              <div className="min-w-0 flex-1 space-y-1">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[11.5px] font-bold uppercase tracking-wider text-slate-500 dark:text-[#8b9bb4]">
                    RAM
                  </span>
                  <span
                    dir="ltr"
                    className="text-[11.5px] font-mono-tabular font-semibold text-emerald-700 dark:text-[#34d399]"
                  >
                    {snapshot.ram.memoryType || naLabel}
                  </span>
                </div>
                <p dir="ltr" className="text-[13px] font-semibold font-mono-tabular text-slate-900 dark:text-white truncate">
                  {isValidMetric(snapshot.ram.usedBytes) && isValidMetric(snapshot.ram.totalBytes)
                    ? `${formatStorageBytes(snapshot.ram.usedBytes, naLabel)} / ${formatStorageBytes(
                        snapshot.ram.totalBytes,
                        naLabel
                      )}`
                    : naLabel}
                </p>
                <div
                  dir="ltr"
                  className="text-[11.5px] font-mono-tabular text-slate-600 dark:text-[#9cb0c9] truncate"
                >
                  {isValidMetric(snapshot.ram.speedMhz)
                    ? `${snapshot.ram.speedMhz} MHz`
                    : `${t.availableRamLabel}: ${formatStorageBytes(
                        snapshot.ram.availableBytes,
                        naLabel
                      )}`}
                </div>
              </div>
            </div>

            {/* Storage Overview Card */}
            <div className="sa-ps5-panel rounded-xl bg-white dark:bg-[#171d25] border border-slate-200 dark:border-white/[0.08] p-4 shadow-xs dark:shadow-md flex items-center gap-3.5">
              <RadialGauge
                value={snapshot.storageTotals.usagePercent}
                label="DISK"
                accentClass="stroke-amber-500 dark:stroke-[#fbbf24]"
                naLabel={naLabel}
              />
              <div className="min-w-0 flex-1 space-y-1">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[11.5px] font-bold uppercase tracking-wider text-slate-500 dark:text-[#8b9bb4]">
                    {t.storageTitle}
                  </span>
                  <span dir="ltr" className="text-[11px] font-mono-tabular text-slate-500 dark:text-[#8b9bb4]">
                    {snapshot.storage.length > 0 ? `${snapshot.storage.length}` : naLabel}
                  </span>
                </div>
                <p dir="ltr" className="text-[13px] font-semibold font-mono-tabular text-slate-900 dark:text-white truncate">
                  {isValidMetric(snapshot.storageTotals.usedBytes) &&
                  isValidMetric(snapshot.storageTotals.totalBytes)
                    ? `${formatStorageBytes(
                        snapshot.storageTotals.usedBytes,
                        naLabel
                      )} / ${formatStorageBytes(snapshot.storageTotals.totalBytes, naLabel)}`
                    : naLabel}
                </p>
                <div
                  dir="ltr"
                  className="flex flex-wrap items-center gap-x-2 text-[11px] font-mono-tabular text-slate-600 dark:text-[#9cb0c9]"
                >
                  <span>
                    R: {formatDiskSpeed(snapshot.storageTotals.readBytesPerSec, naLabel)}
                  </span>
                  <span aria-hidden="true" className="opacity-40">
                    •
                  </span>
                  <span>
                    W: {formatDiskSpeed(snapshot.storageTotals.writeBytesPerSec, naLabel)}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* SECTION B: Live Performance Graphs */}
        <section aria-labelledby="hw-performance-heading" className="space-y-3">
          <h2
            id="hw-performance-heading"
            className="text-[13px] font-bold uppercase tracking-wider text-slate-500 dark:text-[#8b9bb4] px-0.5"
          >
            {t.sectionPerformance}
          </h2>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-3.5">
            <LiveTelemetryChart
              title={t.chartCpuRamTitle}
              timestamps={timestamps}
              yMax={100}
              yAxisTicks={['100%', '75%', '50%', '25%', '0%']}
              peakLabel={t.peakLabel}
              avgLabel={t.avgLabel}
              naLabel={naLabel}
              series={[
                {
                  key: 'cpu',
                  label: t.chartCpuLoad,
                  colorClass: 'text-[#38bdf8]',
                  strokeHex: '#38bdf8',
                  values: history.map((h) => h.cpuPercent),
                  formatValue: (v) => formatPercent(v, naLabel),
                },
                {
                  key: 'ram',
                  label: t.chartRamLoad,
                  colorClass: 'text-[#34d399]',
                  strokeHex: '#34d399',
                  values: history.map((h) => h.ramPercent),
                  formatValue: (v) => formatPercent(v, naLabel),
                },
              ]}
            />

            <LiveTelemetryChart
              title={t.chartGpuTempTitle}
              timestamps={timestamps}
              yMax={100}
              yAxisTicks={['100', '75', '50', '25', '0']}
              peakLabel={t.peakLabel}
              avgLabel={t.avgLabel}
              naLabel={naLabel}
              series={[
                {
                  key: 'gpu-load',
                  label: t.chartGpuLoad,
                  colorClass: 'text-[#a78bfa]',
                  strokeHex: '#a78bfa',
                  values: history.map((h) => h.gpuPercent),
                  formatValue: (v) => formatPercent(v, naLabel),
                },
                {
                  key: 'cpu-temp',
                  label: t.chartCpuTemp,
                  colorClass: 'text-[#fbbf24]',
                  strokeHex: '#fbbf24',
                  values: history.map((h) => h.cpuTempC),
                  formatValue: (v) => formatTemperatureC(v, naLabel),
                },
                {
                  key: 'gpu-temp',
                  label: t.chartGpuTemp,
                  colorClass: 'text-[#fb7185]',
                  strokeHex: '#fb7185',
                  values: history.map((h) => h.gpuTempC),
                  formatValue: (v) => formatTemperatureC(v, naLabel),
                },
              ]}
            />

            <LiveTelemetryChart
              title={t.chartNetworkTitle}
              timestamps={timestamps}
              yMax={networkChartScale.yMax}
              yAxisTicks={networkChartScale.ticks}
              peakLabel={t.peakLabel}
              avgLabel={t.avgLabel}
              naLabel={naLabel}
              series={[
                {
                  key: 'net-dl',
                  label: t.chartNetDownload,
                  colorClass: 'text-[#7dd934]',
                  strokeHex: '#22c55e',
                  values: history.map((h) => h.netDownBytes),
                  formatValue: (v) => formatNetworkSpeed(v, naLabel),
                },
                {
                  key: 'net-ul',
                  label: t.chartNetUpload,
                  colorClass: 'text-[#38bdf8]',
                  strokeHex: '#0ea5e9',
                  values: history.map((h) => h.netUpBytes),
                  formatValue: (v) => formatNetworkSpeed(v, naLabel),
                },
              ]}
            />
          </div>
        </section>

        {/* SECTION C: Hardware Details */}
        <section aria-labelledby="hw-details-heading" className="space-y-3">
          <h2
            id="hw-details-heading"
            className="text-[13px] font-bold uppercase tracking-wider text-slate-500 dark:text-[#8b9bb4] px-0.5"
          >
            {t.sectionDetails}
          </h2>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* CPU Details Panel */}
            <article className="sa-ps5-panel rounded-xl bg-white dark:bg-[#171d25] border border-slate-200 dark:border-white/[0.08] p-4 sm:p-5 shadow-xs dark:shadow-md space-y-3.5">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2.5 min-w-0">
                  <Cpu weight="duotone" className="w-5 h-5 text-[#0284c7] dark:text-[#38bdf8] shrink-0" />
                  <h3 className="text-[15px] font-bold text-slate-900 dark:text-white truncate">
                    {t.cpuTitle}
                  </h3>
                </div>
                <span
                  dir="ltr"
                  className="text-[13.5px] font-bold font-mono-tabular text-[#0284c7] dark:text-[#38bdf8]"
                >
                  {formatPercent(snapshot.cpu.usagePercent, naLabel)}
                </span>
              </div>

              {/* Animated CPU Usage Bar */}
              <div className="w-full h-2 rounded-full bg-slate-100 dark:bg-white/[0.07] overflow-hidden">
                <div
                  className={`h-full rounded-full transition-[width] duration-300 ease-out ${
                    getUsageTone(snapshot.cpu.usagePercent).bar
                  }`}
                  style={{
                    width: `${
                      isValidMetric(snapshot.cpu.usagePercent)
                        ? Math.max(0, Math.min(100, snapshot.cpu.usagePercent))
                        : 0
                    }%`,
                  }}
                />
              </div>

              <div className="divide-y divide-slate-100 dark:divide-white/[0.06]">
                <MetricRow label={t.modelLabel} value={snapshot.cpu.model || naLabel} />
                {snapshot.cpu.series && (
                  <MetricRow label={t.cpuSeriesLabel} value={snapshot.cpu.series} ltr={false} />
                )}
                {snapshot.cpu.generation && (
                  <MetricRow label={t.cpuGenerationLabel} value={snapshot.cpu.generation} ltr={false} />
                )}
                <MetricRow
                  label={t.usageLabel}
                  value={formatPercent(snapshot.cpu.usagePercent, naLabel)}
                />
                <MetricRow
                  label={t.temperatureLabel}
                  value={formatTemperatureC(snapshot.cpu.temperatureCelsius, naLabel)}
                  valueClassName={getTempTone(snapshot.cpu.temperatureCelsius)}
                />
                <MetricRow
                  label={t.clockSpeedLabel}
                  value={formatClockGhz(snapshot.cpu.clockSpeedGhz, naLabel)}
                />
                <MetricRow label={t.coresThreadsLabel} value={cpuCoresThreadsText} />
                <MetricRow
                  label={t.powerLabel}
                  value={formatPowerWatts(snapshot.cpu.powerWatts, naLabel)}
                />
              </div>

              {/* Per-Core / Logical Thread Load Strip */}
              {snapshot.cpu.coreLoads.length > 0 && (
                <div className="pt-2 border-t border-slate-100 dark:border-white/[0.06] space-y-2">
                  <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-[#8b9bb4]">
                    {t.perCoreUsageLabel}
                  </div>
                  <div
                    dir="ltr"
                    className="grid grid-cols-3 sm:grid-cols-6 md:grid-cols-8 gap-1.5"
                  >
                    {snapshot.cpu.coreLoads.slice(0, 64).map((load, idx) => (
                      <div
                        key={`core-${idx}`}
                        className="rounded-md bg-slate-50 dark:bg-[#11151b] border border-slate-200/80 dark:border-white/[0.06] px-2 py-1"
                      >
                        <div className="flex items-center justify-between text-[10px] font-mono-tabular">
                          <span className="text-slate-500 dark:text-[#8b9bb4]">#{idx}</span>
                          <span className="font-semibold text-slate-800 dark:text-white">
                            {Math.round(load)}%
                          </span>
                        </div>
                        <div className="mt-1 h-1 rounded-full bg-slate-200 dark:bg-white/[0.08] overflow-hidden">
                          <div
                            className="h-full bg-[#0284c7] dark:bg-[#38bdf8] transition-[width] duration-300"
                            style={{ width: `${Math.max(0, Math.min(100, load))}%` }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </article>

            {/* RAM Details Panel */}
            <article className="sa-ps5-panel rounded-xl bg-white dark:bg-[#171d25] border border-slate-200 dark:border-white/[0.08] p-4 sm:p-5 shadow-xs dark:shadow-md space-y-3.5">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2.5 min-w-0">
                  <Memory weight="duotone" className="w-5 h-5 text-emerald-600 dark:text-[#34d399] shrink-0" />
                  <h3 className="text-[15px] font-bold text-slate-900 dark:text-white truncate">
                    {t.ramTitle}
                  </h3>
                </div>
                <span
                  dir="ltr"
                  className="text-[13.5px] font-bold font-mono-tabular text-emerald-600 dark:text-[#34d399]"
                >
                  {formatPercent(snapshot.ram.usagePercent, naLabel)}
                </span>
              </div>

              {/* Animated RAM Memory Bar */}
              <div className="w-full h-2.5 rounded-full bg-slate-100 dark:bg-white/[0.07] overflow-hidden">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-emerald-600 to-emerald-400 dark:from-[#10b981] dark:to-[#34d399] transition-[width] duration-300 ease-out"
                  style={{
                    width: `${
                      isValidMetric(snapshot.ram.usagePercent)
                        ? Math.max(0, Math.min(100, snapshot.ram.usagePercent))
                        : 0
                    }%`,
                  }}
                />
              </div>

              <div className="divide-y divide-slate-100 dark:divide-white/[0.06]">
                <MetricRow
                  label={t.totalRamLabel}
                  value={formatStorageBytes(snapshot.ram.totalBytes, naLabel)}
                />
                <MetricRow
                  label={t.usedRamLabel}
                  value={formatStorageBytes(snapshot.ram.usedBytes, naLabel)}
                />
                <MetricRow
                  label={t.availableRamLabel}
                  value={formatStorageBytes(snapshot.ram.availableBytes, naLabel)}
                />
                <MetricRow
                  label={t.usageLabel}
                  value={formatPercent(snapshot.ram.usagePercent, naLabel)}
                />
                <MetricRow
                  label={t.memoryTypeLabel}
                  value={snapshot.ram.memoryType || naLabel}
                />
                <MetricRow
                  label={t.memorySpeedLabel}
                  value={
                    isValidMetric(snapshot.ram.speedMhz)
                      ? `${snapshot.ram.speedMhz} MHz`
                      : naLabel
                  }
                />
                <MetricRow
                  label={t.ramChannelsLabel}
                  value={snapshot.ram.channelMode || naLabel}
                  ltr={false}
                />
                <MetricRow
                  label={t.ramSlotsLabel}
                  value={
                    isValidMetric(snapshot.ram.populatedSlots)
                      ? String(snapshot.ram.populatedSlots)
                      : naLabel
                  }
                />
              </div>
            </article>
          </div>

          {/* Multi-GPU Panel */}
          <article className="sa-ps5-panel rounded-xl bg-white dark:bg-[#171d25] border border-slate-200 dark:border-white/[0.08] p-4 sm:p-5 shadow-xs dark:shadow-md space-y-4">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <GraphicsCard
                  weight="duotone"
                  className="w-5 h-5 text-violet-600 dark:text-[#a78bfa] shrink-0"
                />
                <h3 className="text-[15px] font-bold text-slate-900 dark:text-white">
                  {t.gpuTitle}
                </h3>
              </div>
              {snapshot.gpus.length > 0 && (
                <span
                  dir="ltr"
                  className="text-[12px] font-mono-tabular font-semibold text-slate-500 dark:text-[#8b9bb4]"
                >
                  {snapshot.gpus.length}
                </span>
              )}
            </div>

            {snapshot.gpus.length === 0 ? (
              <p className="text-[12.5px] text-slate-500 dark:text-[#8b9bb4] py-2">
                {t.noGpuDetected}
              </p>
            ) : (
              <div className="grid grid-cols-1 xl:grid-cols-2 gap-3.5">
                {snapshot.gpus.map((gpu) => {
                  const vramText =
                    isValidMetric(gpu.vramUsedMB) && isValidMetric(gpu.vramTotalMB)
                      ? `${formatVramMB(gpu.vramUsedMB, naLabel)} / ${formatVramMB(
                          gpu.vramTotalMB,
                          naLabel
                        )}`
                      : isValidMetric(gpu.vramTotalMB)
                      ? `${naLabel} / ${formatVramMB(gpu.vramTotalMB, naLabel)}`
                      : naLabel;

                  return (
                    <div
                      key={gpu.id}
                      className="sa-ps5-subpanel rounded-lg bg-slate-50/90 dark:bg-[#11161d] border border-slate-200/80 dark:border-white/[0.07] p-3.5 space-y-3"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="text-[11px] font-bold uppercase tracking-wider text-violet-700 dark:text-[#a78bfa]">
                            {gpu.manufacturer || naLabel}
                          </div>
                          <h4 className="text-[13.5px] font-bold text-slate-900 dark:text-white truncate">
                            {gpu.model || naLabel}
                          </h4>
                        </div>
                        <span
                          dir="ltr"
                          className="text-[13px] font-bold font-mono-tabular text-violet-700 dark:text-[#a78bfa] shrink-0"
                        >
                          {formatPercent(gpu.utilizationPercent, naLabel)}
                        </span>
                      </div>

                      <div className="w-full h-1.5 rounded-full bg-slate-200 dark:bg-white/[0.08] overflow-hidden">
                        <div
                          className="h-full rounded-full bg-gradient-to-r from-violet-600 to-fuchsia-500 dark:from-[#8b5cf6] dark:to-[#c084fc] transition-[width] duration-300 ease-out"
                          style={{
                            width: `${
                              isValidMetric(gpu.utilizationPercent)
                                ? Math.max(0, Math.min(100, gpu.utilizationPercent))
                                : 0
                            }%`,
                          }}
                        />
                      </div>

                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-4 gap-y-2 text-[12px]">
                        <div>
                          <div className="text-[11px] text-slate-500 dark:text-[#8b9bb4]">
                            {t.temperatureLabel}
                          </div>
                          <div
                            dir="ltr"
                            className={`font-mono-tabular font-semibold ${getTempTone(
                              gpu.temperatureCelsius
                            )}`}
                          >
                            {formatTemperatureC(gpu.temperatureCelsius, naLabel)}
                          </div>
                        </div>

                        <div>
                          <div className="text-[11px] text-slate-500 dark:text-[#8b9bb4]">
                            {t.vramLabel}
                          </div>
                          <div
                            dir="ltr"
                            className="font-mono-tabular font-semibold text-slate-900 dark:text-white"
                          >
                            {vramText}
                          </div>
                        </div>

                        <div>
                          <div className="text-[11px] text-slate-500 dark:text-[#8b9bb4]">
                            {t.clockSpeedLabel}
                          </div>
                          <div
                            dir="ltr"
                            className="font-mono-tabular font-semibold text-slate-900 dark:text-white"
                          >
                            {formatClockMhz(gpu.clockSpeedMhz, naLabel)}
                          </div>
                        </div>

                        <div>
                          <div className="text-[11px] text-slate-500 dark:text-[#8b9bb4] inline-flex items-center gap-1">
                            <Fan className="w-3 h-3" />
                            <span>{t.fanSpeedLabel}</span>
                          </div>
                          <div
                            dir="ltr"
                            className="font-mono-tabular font-semibold text-slate-900 dark:text-white"
                          >
                            {formatFanSpeed(gpu.fanSpeedRpm, gpu.fanSpeedPercent, naLabel)}
                          </div>
                        </div>

                        <div>
                          <div className="text-[11px] text-slate-500 dark:text-[#8b9bb4] inline-flex items-center gap-1">
                            <Lightning className="w-3 h-3" />
                            <span>{t.powerLabel}</span>
                          </div>
                          <div
                            dir="ltr"
                            className="font-mono-tabular font-semibold text-slate-900 dark:text-white"
                          >
                            {formatPowerWatts(gpu.powerWatts, naLabel)}
                          </div>
                        </div>

                        <div>
                          <div className="text-[11px] text-slate-500 dark:text-[#8b9bb4]">
                            {t.manufacturerLabel}
                          </div>
                          <div className="font-semibold text-slate-900 dark:text-white">
                            {gpu.manufacturer || naLabel}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </article>

          {/* Storage Drives + Network Activity */}
          <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
            {/* Storage Drives Panel (2 cols on xl) */}
            <article className="xl:col-span-2 sa-ps5-panel rounded-xl bg-white dark:bg-[#171d25] border border-slate-200 dark:border-white/[0.08] p-4 sm:p-5 shadow-xs dark:shadow-md space-y-4">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2.5">
                  <HardDrive
                    weight="duotone"
                    className="w-5 h-5 text-amber-600 dark:text-[#fbbf24] shrink-0"
                  />
                  <h3 className="text-[15px] font-bold text-slate-900 dark:text-white">
                    {t.storageTitle}
                  </h3>
                </div>
                <span
                  dir="ltr"
                  className="text-[12px] font-mono-tabular font-semibold text-slate-500 dark:text-[#8b9bb4]"
                >
                  {snapshot.storage.length > 0 ? `${snapshot.storage.length}` : naLabel}
                </span>
              </div>

              {snapshot.storage.length === 0 ? (
                <p className="text-[12.5px] text-slate-500 dark:text-[#8b9bb4] py-2">
                  {t.noStorageDetected}
                </p>
              ) : (
                <div className="space-y-3">
                  {snapshot.storage.map((drive) => (
                    <div
                      key={drive.id}
                      className="sa-ps5-subpanel rounded-lg bg-slate-50/90 dark:bg-[#11161d] border border-slate-200/80 dark:border-white/[0.07] p-3.5 space-y-2.5"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <h4 className="text-[13.5px] font-bold text-slate-900 dark:text-white truncate">
                              {drive.name}
                            </h4>
                            <span className="px-1.5 py-0.5 rounded bg-slate-200/80 dark:bg-white/[0.08] text-[10.5px] font-mono-tabular font-bold text-slate-700 dark:text-[#d5e0ee] shrink-0">
                              {drive.driveType || naLabel}
                            </span>
                          </div>
                          <p className="text-[11.5px] text-slate-500 dark:text-[#8b9bb4] truncate">
                            {drive.model || naLabel}
                          </p>
                        </div>

                        <div className="flex items-center gap-3 shrink-0">
                          <span
                            dir="ltr"
                            className={`text-[12px] font-mono-tabular font-semibold ${getTempTone(
                              drive.temperatureCelsius
                            )}`}
                          >
                            {formatTemperatureC(drive.temperatureCelsius, naLabel)}
                          </span>
                          <span
                            dir="ltr"
                            className="text-[13px] font-bold font-mono-tabular text-slate-900 dark:text-white"
                          >
                            {formatPercent(drive.usagePercent, naLabel)}
                          </span>
                        </div>
                      </div>

                      <div className="w-full h-1.5 rounded-full bg-slate-200 dark:bg-white/[0.08] overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-[width] duration-300 ease-out ${
                            getUsageTone(drive.usagePercent).bar
                          }`}
                          style={{
                            width: `${
                              isValidMetric(drive.usagePercent)
                                ? Math.max(0, Math.min(100, drive.usagePercent))
                                : 0
                            }%`,
                          }}
                        />
                      </div>

                      <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 text-[11.5px]">
                        <div className="min-w-0">
                          <div className="text-slate-500 dark:text-[#8b9bb4] truncate">{t.capacityLabel}</div>
                          <div dir="ltr" className="font-mono-tabular font-semibold text-slate-900 dark:text-white truncate">
                            {formatStorageBytes(drive.totalBytes, naLabel)}
                          </div>
                        </div>
                        <div className="min-w-0">
                          <div className="text-slate-500 dark:text-[#8b9bb4] truncate">{t.usedSpaceLabel}</div>
                          <div dir="ltr" className="font-mono-tabular font-semibold text-slate-900 dark:text-white truncate">
                            {formatStorageBytes(drive.usedBytes, naLabel)}
                          </div>
                        </div>
                        <div className="min-w-0">
                          <div className="text-slate-500 dark:text-[#8b9bb4] truncate">{t.freeSpaceLabel}</div>
                          <div dir="ltr" className="font-mono-tabular font-semibold text-slate-900 dark:text-white truncate">
                            {formatStorageBytes(drive.freeBytes, naLabel)}
                          </div>
                        </div>
                        <div className="min-w-0">
                          <div className="text-slate-500 dark:text-[#8b9bb4] truncate">{t.readSpeedLabel}</div>
                          <div dir="ltr" className="font-mono-tabular font-semibold text-emerald-700 dark:text-[#34d399] truncate">
                            {formatDiskSpeed(drive.readBytesPerSec, naLabel)}
                          </div>
                        </div>
                        <div className="min-w-0">
                          <div className="text-slate-500 dark:text-[#8b9bb4] truncate">{t.writeSpeedLabel}</div>
                          <div dir="ltr" className="font-mono-tabular font-semibold text-sky-700 dark:text-[#38bdf8] truncate">
                            {formatDiskSpeed(drive.writeBytesPerSec, naLabel)}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </article>

            {/* Network Details Panel (1 col on xl) */}
            <article className="sa-ps5-panel rounded-xl bg-white dark:bg-[#171d25] border border-slate-200 dark:border-white/[0.08] p-4 sm:p-5 shadow-xs dark:shadow-md space-y-4">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2.5 min-w-0">
                  <WifiHigh
                    weight="duotone"
                    className="w-5 h-5 text-sky-600 dark:text-[#38bdf8] shrink-0"
                  />
                  <h3 className="text-[15px] font-bold text-slate-900 dark:text-white truncate">
                    {t.networkTitle}
                  </h3>
                </div>
                <Gauge className="w-4 h-4 text-slate-400 dark:text-[#7c8da6] shrink-0" />
              </div>

              {/* Live DL / UL Cards */}
              <div className="grid grid-cols-2 gap-2.5">
                <div className="sa-ps5-subpanel rounded-lg bg-slate-50 dark:bg-[#11161d] border border-slate-200/80 dark:border-white/[0.07] p-3">
                  <div className="flex items-center gap-1.5 text-[11px] text-slate-500 dark:text-[#8b9bb4]">
                    <ArrowDown className="w-3.5 h-3.5 text-emerald-600 dark:text-[#34d399]" />
                    <span>{t.downloadSpeedLabel}</span>
                  </div>
                  <div
                    dir="ltr"
                    className="mt-1 text-[15px] font-bold font-mono-tabular text-emerald-700 dark:text-[#34d399]"
                  >
                    {formatNetworkSpeed(snapshot.network.totalDownloadBytesPerSec, naLabel)}
                  </div>
                </div>

                <div className="sa-ps5-subpanel rounded-lg bg-slate-50 dark:bg-[#11161d] border border-slate-200/80 dark:border-white/[0.07] p-3">
                  <div className="flex items-center gap-1.5 text-[11px] text-slate-500 dark:text-[#8b9bb4]">
                    <ArrowUp className="w-3.5 h-3.5 text-sky-600 dark:text-[#38bdf8]" />
                    <span>{t.uploadSpeedLabel}</span>
                  </div>
                  <div
                    dir="ltr"
                    className="mt-1 text-[15px] font-bold font-mono-tabular text-sky-700 dark:text-[#38bdf8]"
                  >
                    {formatNetworkSpeed(snapshot.network.totalUploadBytesPerSec, naLabel)}
                  </div>
                </div>
              </div>

              {!activeNet ? (
                <p className="text-[12.5px] text-slate-500 dark:text-[#8b9bb4]">
                  {t.noNetworkDetected}
                </p>
              ) : (
                <div className="divide-y divide-slate-100 dark:divide-white/[0.06]">
                  <MetricRow
                    label={t.activeInterfaceLabel}
                    value={activeNet.displayName || activeNet.iface}
                    ltr={false}
                  />
                  <MetricRow
                    label={t.linkStateLabel}
                    value={activeNet.operstate ? activeNet.operstate.toUpperCase() : naLabel}
                  />
                  <MetricRow
                    label={t.linkSpeedLabel}
                    value={
                      isValidMetric(activeNet.speedMbps) ? `${activeNet.speedMbps} Mbps` : naLabel
                    }
                  />
                  <MetricRow
                    label={t.totalRxLabel}
                    value={formatStorageBytes(activeNet.totalRxBytes, naLabel)}
                  />
                  <MetricRow
                    label={t.totalTxLabel}
                    value={formatStorageBytes(activeNet.totalTxBytes, naLabel)}
                  />
                </div>
              )}

              {snapshot.network.interfaces.length > 1 && (
                <div className="pt-2 border-t border-slate-100 dark:border-white/[0.06] space-y-1.5">
                  {snapshot.network.interfaces.slice(0, 4).map((iface) => (
                    <div
                      key={iface.iface}
                      className="flex items-center justify-between gap-2 text-[11px] text-slate-600 dark:text-[#9cb0c9]"
                    >
                      <span className="truncate font-medium">{iface.displayName}</span>
                      <span dir="ltr" className="font-mono-tabular shrink-0">
                        ↓ {formatNetworkSpeed(iface.downloadBytesPerSec, naLabel)} / ↑{' '}
                        {formatNetworkSpeed(iface.uploadBytesPerSec, naLabel)}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </article>
          </div>
        </section>
          </>
        )}
      </div>
    </div>
  );
}
