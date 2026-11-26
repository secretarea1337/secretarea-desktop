import { memo, useEffect, useMemo, useRef, useState } from 'react';
import { CaretDown, CaretUp, ChartLineUp } from '@phosphor-icons/react';
import type { AppLanguage } from '../services/launcherSettings';
import { getTranslations } from '../i18n/translations';
import { formatDownloadSpeed } from '../services/downloadManager';

type SpeedPeriodKey = '1m' | '5m' | '30m' | '1h';

interface SpeedSample {
  timestamp: number;
  downloadBytesPerSec: number;
  uploadBytesPerSec: number;
}

interface TorrentSpeedGraphProps {
  downloadBytesPerSec: number;
  uploadBytesPerSec: number;
  hasActiveTransfers: boolean;
  language?: AppLanguage;
  reduceVisualEffects?: boolean;
}

const PERIOD_SECONDS: Record<SpeedPeriodKey, number> = {
  '1m': 60,
  '5m': 300,
  '30m': 1800,
  '1h': 3600,
};

const MAX_HISTORY_SAMPLES = 3600;
const MIN_FLOOR_BYTES = 1.2 * 1024 * 1024; // 1.2 MiB/s baseline matching qBittorrent graph

function formatAxisRate(bytesPerSec: number, yMaxBytes: number): string {
  if (yMaxBytes < 1024 * 1024) {
    const kib = bytesPerSec / 1024;
    return `${kib.toFixed(kib >= 100 ? 0 : 1)} KiB/s`;
  }
  const mib = bytesPerSec / (1024 * 1024);
  return `${mib.toFixed(mib >= 10 ? 1 : 1)} MiB/s`;
}

function computeNiceYMax(peakBytes: number): number {
  const target = Math.max(MIN_FLOOR_BYTES, peakBytes * 1.18);
  const mib = target / (1024 * 1024);
  const niceMibSteps = [1.2, 2.0, 4.0, 8.0, 12.0, 20.0, 40.0, 80.0, 120.0, 200.0, 400.0, 1000.0];
  for (const step of niceMibSteps) {
    if (mib <= step) {
      return step * 1024 * 1024;
    }
  }
  return Math.ceil(mib / 100) * 100 * 1024 * 1024;
}

function downsampleSeries(samples: SpeedSample[], targetPoints: number): SpeedSample[] {
  if (samples.length <= targetPoints) return samples;
  const bucketSize = samples.length / targetPoints;
  const out: SpeedSample[] = [];
  for (let i = 0; i < targetPoints; i++) {
    const start = Math.floor(i * bucketSize);
    const end = Math.min(samples.length, Math.max(start + 1, Math.floor((i + 1) * bucketSize)));
    let maxDl = 0;
    let maxUl = 0;
    let sumDl = 0;
    let sumUl = 0;
    const count = end - start;
    for (let j = start; j < end; j++) {
      const s = samples[j];
      if (s.downloadBytesPerSec > maxDl) maxDl = s.downloadBytesPerSec;
      if (s.uploadBytesPerSec > maxUl) maxUl = s.uploadBytesPerSec;
      sumDl += s.downloadBytesPerSec;
      sumUl += s.uploadBytesPerSec;
    }
    const last = samples[end - 1];
    out.push({
      timestamp: last.timestamp,
      downloadBytesPerSec: maxDl > 0 ? Math.round(sumDl * 0.55 / count + maxDl * 0.45) : 0,
      uploadBytesPerSec: maxUl > 0 ? Math.round(sumUl * 0.55 / count + maxUl * 0.45) : 0,
    });
  }
  return out;
}

export const TorrentSpeedGraph = memo(function TorrentSpeedGraph({
  downloadBytesPerSec,
  uploadBytesPerSec,
  hasActiveTransfers,
  language = 'en',
  reduceVisualEffects = false,
}: TorrentSpeedGraphProps) {
  const tr = getTranslations(language);
  const t = tr.downloads;

  const [period, setPeriod] = useState<SpeedPeriodKey>('5m');
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [showDownloadLine, setShowDownloadLine] = useState(true);
  const [showUploadLine, setShowUploadLine] = useState(true);
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);
  const [subTickProgress, setSubTickProgress] = useState(0);

  const liveSpeedRef = useRef({ downloadBytesPerSec, uploadBytesPerSec });
  liveSpeedRef.current = { downloadBytesPerSec, uploadBytesPerSec };

  const [history, setHistory] = useState<SpeedSample[]>(() => {
    const now = Date.now();
    const initialCount = 30;
    const seed: SpeedSample[] = [];
    for (let i = initialCount - 1; i >= 1; i--) {
      seed.push({
        timestamp: now - i * 1000,
        downloadBytesPerSec: 0,
        uploadBytesPerSec: 0,
      });
    }
    seed.push({
      timestamp: now,
      downloadBytesPerSec,
      uploadBytesPerSec,
    });
    return seed;
  });

  // Sample speeds every 1s only while transfers are active and visible; otherwise back off to 10s when idle & expanded
  const lastSampleTimeRef = useRef<number>(Date.now());
  const isActiveGraph = hasActiveTransfers || downloadBytesPerSec > 0 || uploadBytesPerSec > 0;

  useEffect(() => {
    if (isCollapsed) return;
    const sampleIntervalMs = isActiveGraph ? 1000 : 10000;
    const timer = window.setInterval(() => {
      if (typeof document !== 'undefined' && document.hidden) return;
      const now = Date.now();
      lastSampleTimeRef.current = now;
      const { downloadBytesPerSec: dl, uploadBytesPerSec: ul } = liveSpeedRef.current;
      setHistory((prev) => {
        const cleanDl = Math.max(0, dl);
        const cleanUl = Math.max(0, ul);
        const last = prev[prev.length - 1];
        const secondLast = prev[prev.length - 2];
        // When idle and already bookended by 0/0, update timestamp in place on last sample instead of cloning 3600 elements
        if (
          cleanDl === 0 &&
          cleanUl === 0 &&
          last &&
          secondLast &&
          last.downloadBytesPerSec === 0 &&
          last.uploadBytesPerSec === 0 &&
          secondLast.downloadBytesPerSec === 0 &&
          secondLast.uploadBytesPerSec === 0
        ) {
          const copy = prev.slice();
          copy[copy.length - 1] = { timestamp: now, downloadBytesPerSec: 0, uploadBytesPerSec: 0 };
          return copy;
        }
        const next = [
          ...prev,
          {
            timestamp: now,
            downloadBytesPerSec: cleanDl,
            uploadBytesPerSec: cleanUl,
          },
        ];
        return next.length > MAX_HISTORY_SAMPLES
          ? next.slice(next.length - MAX_HISTORY_SAMPLES)
          : next;
      });
    }, sampleIntervalMs);
    return () => window.clearInterval(timer);
  }, [isCollapsed, isActiveGraph]);

  // Sub-second slide interpolation while transfers are active (disabled in Eco/reduced-effects & hidden states)
  useEffect(() => {
    if (isCollapsed || reduceVisualEffects) {
      setSubTickProgress(0);
      return;
    }
    const prefersReduced =
      typeof window !== 'undefined' &&
      window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    if (
      prefersReduced ||
      (typeof document !== 'undefined' && document.hidden) ||
      !isActiveGraph
    ) {
      setSubTickProgress(0);
      return;
    }

    let rafId = 0;
    let lastPaint = 0;
    const step = (ts: number) => {
      if (typeof document !== 'undefined' && document.hidden) {
        rafId = 0;
        return;
      }
      if (ts - lastPaint >= 95) {
        lastPaint = ts;
        const elapsed = Math.min(1, Math.max(0, (Date.now() - lastSampleTimeRef.current) / 1000));
        setSubTickProgress(elapsed);
      }
      rafId = window.requestAnimationFrame(step);
    };
    rafId = window.requestAnimationFrame(step);
    return () => {
      if (rafId) window.cancelAnimationFrame(rafId);
    };
  }, [isCollapsed, isActiveGraph, reduceVisualEffects]);

  const visibleSamples = useMemo(() => {
    const targetSec = PERIOD_SECONDS[period];
    const now = history[history.length - 1]?.timestamp || Date.now();
    const cutoff = now - targetSec * 1000;
    const sliced = history.filter((s) => s.timestamp >= cutoff);

    // Pad baseline left with zeros when history hasn't filled the selected window yet
    const maxSlots = Math.min(targetSec, 180);
    const padded =
      sliced.length < maxSlots
        ? [
            ...Array.from({ length: maxSlots - sliced.length }, (_, idx) => ({
              timestamp: cutoff + idx * ((targetSec * 1000) / maxSlots),
              downloadBytesPerSec: 0,
              uploadBytesPerSec: 0,
            })),
            ...sliced,
          ]
        : sliced;

    return downsampleSeries(padded, 140);
  }, [history, period]);

  const peakVisibleBytes = useMemo(() => {
    let peak = 0;
    for (const s of visibleSamples) {
      if (showDownloadLine && s.downloadBytesPerSec > peak) peak = s.downloadBytesPerSec;
      if (showUploadLine && s.uploadBytesPerSec > peak) peak = s.uploadBytesPerSec;
    }
    if (showDownloadLine && downloadBytesPerSec > peak) peak = downloadBytesPerSec;
    if (showUploadLine && uploadBytesPerSec > peak) peak = uploadBytesPerSec;
    return peak;
  }, [visibleSamples, showDownloadLine, showUploadLine, downloadBytesPerSec, uploadBytesPerSec]);

  const yMaxBytes = useMemo(() => computeNiceYMax(peakVisibleBytes), [peakVisibleBytes]);

  const svgWidth = 960;
  const svgHeight = 200;
  const padTop = 10;
  const padBottom = 8;
  const plotHeight = svgHeight - padTop - padBottom;

  const chartGeometry = useMemo(() => {
    const count = visibleSamples.length;
    if (count === 0) {
      return { dlPoints: '', dlArea: '', ulPoints: '', ulArea: '', coords: [] as { x: number; yDl: number; yUl: number }[] };
    }
    const stepX = count > 1 ? svgWidth / (count - 1) : svgWidth;
    const shiftX = hasActiveTransfers ? subTickProgress * Math.min(stepX * 0.45, 4) : 0;

    const coords = visibleSamples.map((s, idx) => {
      const rawX = idx === count - 1 ? svgWidth : Math.max(0, idx * stepX - shiftX);
      const ratioDl = Math.min(1, Math.max(0, s.downloadBytesPerSec / yMaxBytes));
      const ratioUl = Math.min(1, Math.max(0, s.uploadBytesPerSec / yMaxBytes));
      const yDl = padTop + plotHeight * (1 - ratioDl);
      const yUl = padTop + plotHeight * (1 - ratioUl);
      return { x: Number(rawX.toFixed(1)), yDl: Number(yDl.toFixed(1)), yUl: Number(yUl.toFixed(1)) };
    });

    const dlPoints = coords.map((c) => `${c.x},${c.yDl}`).join(' ');
    const ulPoints = coords.map((c) => `${c.x},${c.yUl}`).join(' ');
    const baseLineY = (padTop + plotHeight).toFixed(1);
    const dlArea = `0,${baseLineY} ${dlPoints} ${svgWidth},${baseLineY}`;
    const ulArea = `0,${baseLineY} ${ulPoints} ${svgWidth},${baseLineY}`;

    return { dlPoints, dlArea, ulPoints, ulArea, coords };
  }, [visibleSamples, yMaxBytes, hasActiveTransfers, subTickProgress, plotHeight]);

  const yTicks = useMemo(
    () => [1, 0.75, 0.5, 0.25, 0].map((fraction) => formatAxisRate(yMaxBytes * fraction, yMaxBytes)),
    [yMaxBytes]
  );

  const inspectedSample =
    hoverIndex !== null && visibleSamples[hoverIndex] ? visibleSamples[hoverIndex] : null;
  const inspectedCoord =
    hoverIndex !== null && chartGeometry.coords[hoverIndex] ? chartGeometry.coords[hoverIndex] : null;
  const lastCoord = chartGeometry.coords[chartGeometry.coords.length - 1] || null;

  return (
    <section
      aria-label={t.speedGraphTitle}
      className="sa-ps5-panel rounded-xl bg-white dark:bg-[#171d25] border border-slate-200 dark:border-white/[0.08] p-3.5 sm:p-4 shadow-xs dark:shadow-md space-y-3"
    >
      {/* Top Toolbar: Period Selector + Live Readouts + Collapse Toggle */}
      <div className="flex flex-wrap items-center justify-between gap-2.5">
        <div className="flex flex-wrap items-center gap-3 min-w-0">
          <div className="flex items-center gap-2">
            <ChartLineUp className="w-4 h-4 text-emerald-600 dark:text-[#7dd934] shrink-0" />
            <h2 className="text-[13px] sm:text-[13.5px] font-bold text-slate-900 dark:text-white whitespace-nowrap">
              {t.speedGraphTitle}
            </h2>
          </div>

          <label className="inline-flex items-center gap-2 text-[12px] text-slate-600 dark:text-[#9cb0c9]">
            <span className="font-medium whitespace-nowrap">{t.periodLabel}</span>
            <select
              value={period}
              onChange={(e) => setPeriod(e.target.value as SpeedPeriodKey)}
              className="min-h-[34px] px-2.5 py-1 rounded-lg bg-slate-50 dark:bg-[#10151c] border border-slate-200 dark:border-white/[0.12] text-[12px] font-semibold text-slate-800 dark:text-white focus:border-[#0284c7] dark:focus:border-[#38bdf8] focus:outline-none cursor-pointer"
            >
              <option value="1m">{t.period1m}</option>
              <option value="5m">{t.period5m}</option>
              <option value="30m">{t.period30m}</option>
              <option value="1h">{t.period1h}</option>
            </select>
          </label>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div
            dir="ltr"
            className="flex items-center gap-3 text-[12px] font-mono-tabular font-semibold"
          >
            <span className="text-emerald-700 dark:text-[#7dd934]">
              ↓ {formatDownloadSpeed(downloadBytesPerSec)}
            </span>
            <span className="text-sky-700 dark:text-[#38bdf8]">
              ↑ {formatDownloadSpeed(uploadBytesPerSec)}
            </span>
          </div>

          <button
            type="button"
            onClick={() => setIsCollapsed((prev) => !prev)}
            className="inline-flex items-center gap-1 min-h-[34px] px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-[#1f2835] dark:hover:bg-[#293546] border border-slate-200 dark:border-white/[0.1] text-[11.5px] font-semibold text-slate-700 dark:text-[#d5e0ee] transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            {isCollapsed ? (
              <>
                <CaretDown className="w-3.5 h-3.5" />
                <span>{t.showGraphBtn}</span>
              </>
            ) : (
              <>
                <CaretUp className="w-3.5 h-3.5" />
                <span>{t.hideGraphBtn}</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Animated Time-Series Plot Area */}
      {!isCollapsed && (
        <div
          dir="ltr"
          className="relative rounded-lg bg-slate-50 dark:bg-[#11151b] border border-slate-200 dark:border-white/[0.08] p-2.5 sm:p-3 overflow-hidden"
        >
          <div className="flex items-stretch gap-2.5 sm:gap-3 h-[156px] sm:h-[188px]">
            {/* Y-Axis Speed Scale Labels */}
            <div className="flex flex-col justify-between py-1 text-end text-[10.5px] sm:text-[11px] font-mono-tabular text-slate-500 dark:text-[#9eb0c7] select-none shrink-0 w-[62px] sm:w-[70px]">
              {yTicks.map((tick, idx) => (
                <span key={idx} className="leading-none whitespace-nowrap">
                  {tick}
                </span>
              ))}
            </div>

            {/* Interactive SVG Speed Graph */}
            <div
              className="relative flex-1 min-w-0 h-full cursor-crosshair select-none"
              onPointerMove={(e) => {
                const rect = e.currentTarget.getBoundingClientRect();
                if (rect.width <= 0 || visibleSamples.length === 0) return;
                const rel = Math.min(1, Math.max(0, (e.clientX - rect.left) / rect.width));
                const idx = Math.round(rel * (visibleSamples.length - 1));
                setHoverIndex(idx);
              }}
              onPointerLeave={() => setHoverIndex(null)}
            >
              {/* Top-left Legend matching screenshot */}
              <div className="absolute top-1.5 left-2 z-10 flex flex-col items-start gap-0.5 text-[11.5px] sm:text-[12px] font-semibold">
                <button
                  type="button"
                  onClick={() => setShowUploadLine((prev) => !prev)}
                  className={`underline underline-offset-4 decoration-2 transition-opacity cursor-pointer ${
                    showUploadLine ? 'opacity-100' : 'opacity-40'
                  } text-sky-600 dark:text-[#38bdf8]`}
                >
                  {t.totalUploadLabel}
                </button>
                <button
                  type="button"
                  onClick={() => setShowDownloadLine((prev) => !prev)}
                  className={`underline underline-offset-4 decoration-2 transition-opacity cursor-pointer ${
                    showDownloadLine ? 'opacity-100' : 'opacity-40'
                  } text-emerald-600 dark:text-[#7dd934]`}
                >
                  {t.totalDownloadLabel}
                </button>
              </div>

              {/* Hover Inspection Readout */}
              {inspectedSample && inspectedCoord && (
                <div className="absolute top-1.5 right-2 z-10 px-2.5 py-1.5 rounded-md bg-white/95 dark:bg-[#1a222d]/95 border border-slate-200 dark:border-white/[0.12] text-[11px] font-mono-tabular shadow-sm pointer-events-none flex items-center gap-3">
                  <span className="text-slate-500 dark:text-[#8b9bb4]">
                    {new Date(inspectedSample.timestamp).toLocaleTimeString([], {
                      hour: '2-digit',
                      minute: '2-digit',
                      second: '2-digit',
                    })}
                  </span>
                  <span className="font-semibold text-emerald-700 dark:text-[#7dd934]">
                    ↓ {formatDownloadSpeed(inspectedSample.downloadBytesPerSec)}
                  </span>
                  <span className="font-semibold text-sky-700 dark:text-[#38bdf8]">
                    ↑ {formatDownloadSpeed(inspectedSample.uploadBytesPerSec)}
                  </span>
                </div>
              )}

              <svg
                viewBox={`0 0 ${svgWidth} ${svgHeight}`}
                preserveAspectRatio="none"
                className="w-full h-full overflow-visible"
              >
                <defs>
                  <linearGradient id="sa-dl-grad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#7dd934" stopOpacity="0.32" />
                    <stop offset="100%" stopColor="#7dd934" stopOpacity="0.02" />
                  </linearGradient>
                  <linearGradient id="sa-ul-grad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#38bdf8" stopOpacity="0.24" />
                    <stop offset="100%" stopColor="#38bdf8" stopOpacity="0.01" />
                  </linearGradient>
                </defs>

                {/* Horizontal Dashed Gridlines */}
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
                      className="text-slate-300/85 dark:text-white/[0.12]"
                      strokeWidth="1"
                    />
                  );
                })}

                {/* Vertical Dashed Gridlines */}
                {[0, 0.2, 0.4, 0.6, 0.8, 1].map((frac, idx) => {
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
                      className="text-slate-300/70 dark:text-white/[0.09]"
                      strokeWidth="1"
                    />
                  );
                })}

                {/* Download Area + Polyline */}
                {showDownloadLine && chartGeometry.dlPoints && (
                  <>
                    <polygon points={chartGeometry.dlArea} fill="url(#sa-dl-grad)" />
                    <polyline
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2.4"
                      strokeLinejoin="round"
                      strokeLinecap="round"
                      points={chartGeometry.dlPoints}
                      className="text-emerald-600 dark:text-[#7dd934]"
                    />
                  </>
                )}

                {/* Upload Area + Polyline */}
                {showUploadLine && chartGeometry.ulPoints && (
                  <>
                    <polygon points={chartGeometry.ulArea} fill="url(#sa-ul-grad)" />
                    <polyline
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinejoin="round"
                      strokeLinecap="round"
                      points={chartGeometry.ulPoints}
                      className="text-sky-600 dark:text-[#38bdf8]"
                    />
                  </>
                )}

                {/* Active Live Endpoint Indicator */}
                {lastCoord && (downloadBytesPerSec > 0 || uploadBytesPerSec > 0) && (
                  <>
                    {showDownloadLine && downloadBytesPerSec > 0 && (
                      <circle
                        cx={lastCoord.x}
                        cy={lastCoord.yDl}
                        r="4.5"
                        className="fill-emerald-500 dark:fill-[#7dd934] stroke-white dark:stroke-[#11151b]"
                        strokeWidth="1.5"
                      />
                    )}
                    {showUploadLine && uploadBytesPerSec > 0 && (
                      <circle
                        cx={lastCoord.x}
                        cy={lastCoord.yUl}
                        r="4"
                        className="fill-sky-500 dark:fill-[#38bdf8] stroke-white dark:stroke-[#11151b]"
                        strokeWidth="1.5"
                      />
                    )}
                  </>
                )}

                {/* Hover Vertical Cursor */}
                {inspectedCoord && (
                  <line
                    x1={inspectedCoord.x}
                    x2={inspectedCoord.x}
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
      )}
    </section>
  );
});
