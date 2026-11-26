import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ArrowsClockwise, ArrowUpRight, X } from '@phosphor-icons/react';
import type { GameItem, SheetCatalogData } from '../types';
import type { AppLanguage, AppThemeMode } from '../services/launcherSettings';
import { resolveSheetRefItem } from '../utils/parsers';
import { GameCover } from './GameCover';
import { getTranslations } from '../i18n/translations';
import { playWheelTickSound, playWheelWinSound } from '../utils/uiCursorSounds';

type WheelPhase = 'spinning' | 'won';

interface SpinWheelModalProps {
  isOpen: boolean;
  catalog: SheetCatalogData;
  activeTheme?: AppThemeMode;
  language?: AppLanguage;
  enableSounds?: boolean;
  onSelectGame: (game: GameItem) => void;
  onClose: () => void;
}

const SLICE_COUNT = 8;
const SLICE_ANGLE = 360 / SLICE_COUNT; // 45 deg
const SPIN_DURATION_MS = 3800; // 3.8s crisp spin inside 3~5s window

const SLICE_COLORS = [
  { fill: '#ef4444', rim: '#dc2626', textShadow: 'rgba(127, 29, 29, 0.72)' },
  { fill: '#fbbf0d', rim: '#eab308', textShadow: 'rgba(120, 53, 15, 0.78)' },
  { fill: '#00c25c', rim: '#059669', textShadow: 'rgba(6, 78, 59, 0.72)' },
  { fill: '#0094df', rim: '#0284c7', textShadow: 'rgba(12, 74, 110, 0.75)' },
  { fill: '#ef4444', rim: '#dc2626', textShadow: 'rgba(127, 29, 29, 0.72)' },
  { fill: '#fbbf0d', rim: '#eab308', textShadow: 'rgba(120, 53, 15, 0.78)' },
  { fill: '#00c25c', rim: '#059669', textShadow: 'rgba(6, 78, 59, 0.72)' },
  { fill: '#0094df', rim: '#0284c7', textShadow: 'rgba(12, 74, 110, 0.75)' },
];

function polarToCartesian(cx: number, cy: number, radius: number, clockDeg: number) {
  const rad = ((clockDeg - 90) * Math.PI) / 180;
  return {
    x: cx + radius * Math.cos(rad),
    y: cy + radius * Math.sin(rad),
  };
}

const MARQUEE_BULBS = Array.from({ length: 12 }, (_, idx) => {
  const deg = idx * 30 + 15;
  const pt = polarToCartesian(200, 200, 175, deg);
  return { idx, x: pt.x, y: pt.y };
});

function buildWedgePath(
  cx: number,
  cy: number,
  rInner: number,
  rOuter: number,
  startDeg: number,
  endDeg: number
) {
  const outerStart = polarToCartesian(cx, cy, rOuter, startDeg);
  const outerEnd = polarToCartesian(cx, cy, rOuter, endDeg);
  if (rInner <= 0) {
    return `M ${cx} ${cy} L ${outerStart.x.toFixed(2)} ${outerStart.y.toFixed(2)} A ${rOuter} ${rOuter} 0 0 1 ${outerEnd.x.toFixed(2)} ${outerEnd.y.toFixed(2)} Z`;
  }
  const innerEnd = polarToCartesian(cx, cy, rInner, endDeg);
  const innerStart = polarToCartesian(cx, cy, rInner, startDeg);
  return `M ${innerStart.x.toFixed(2)} ${innerStart.y.toFixed(2)} L ${outerStart.x.toFixed(2)} ${outerStart.y.toFixed(2)} A ${rOuter} ${rOuter} 0 0 1 ${outerEnd.x.toFixed(2)} ${outerEnd.y.toFixed(2)} L ${innerEnd.x.toFixed(2)} ${innerEnd.y.toFixed(2)} A ${rInner} ${rInner} 0 0 0 ${innerStart.x.toFixed(2)} ${innerStart.y.toFixed(2)} Z`;
}

function buildStarPoints(cx: number, cy: number, outerR: number, innerR: number): string {
  const pts: string[] = [];
  for (let i = 0; i < 10; i++) {
    const angle = i * 36;
    const r = i % 2 === 0 ? outerR : innerR;
    const p = polarToCartesian(cx, cy, r, angle);
    pts.push(`${p.x.toFixed(2)},${p.y.toFixed(2)}`);
  }
  return pts.join(' ');
}

function truncateSliceLabel(name: string, maxLen = 11): string {
  const clean = name.replace(/\s*\([^)]*\)/g, '').trim();
  if (clean.length <= maxLen) return clean;
  return `${clean.slice(0, maxLen - 1).trimEnd()}…`;
}

// Pick 8 strictly distinct random items from PopularRepacks (no duplicates unless pool < 8)
function pickUniqueSlices(
  pool: GameItem[],
  forcedWinner: { item: GameItem; index: number }
): GameItem[] {
  const result: GameItem[] = new Array(SLICE_COUNT);
  const winnerKey = `${forcedWinner.item.tab}:${forcedWinner.item.id}`;
  const usedKeys = new Set<string>([winnerKey]);
  result[forcedWinner.index] = forcedWinner.item;

  const remaining = pool.filter((item) => `${item.tab}:${item.id}` !== winnerKey);
  // Fisher-Yates partial shuffle for unbiased unique selection
  for (let i = remaining.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [remaining[i], remaining[j]] = [remaining[j], remaining[i]];
  }

  let cursor = 0;
  for (let i = 0; i < SLICE_COUNT; i++) {
    if (result[i]) continue;
    let picked: GameItem | undefined;
    while (cursor < remaining.length) {
      const candidate = remaining[cursor++];
      const key = `${candidate.tab}:${candidate.id}`;
      if (!usedKeys.has(key)) {
        usedKeys.add(key);
        picked = candidate;
        break;
      }
    }
    if (!picked) {
      picked = pool[i % pool.length];
    }
    result[i] = picked;
  }
  return result;
}

function getSliceIndexAtPointer(rotationDeg: number): number {
  const normalized = ((-rotationDeg % 360) + 360) % 360;
  return Math.round(normalized / SLICE_ANGLE) % SLICE_COUNT;
}

export function SpinWheelModal({
  isOpen,
  catalog,
  activeTheme = 'default',
  language = 'en',
  enableSounds = true,
  onSelectGame,
  onClose,
}: SpinWheelModalProps) {
  const t = getTranslations(language);
  const sw = t.spinWheel;
  const isPs5Theme = activeTheme === 'ps5';
  const isXboxTheme = activeTheme === 'xbox';

  const [phase, setPhase] = useState<WheelPhase>('spinning');
  const [winner, setWinner] = useState<GameItem | null>(null);
  const [wheelSlices, setWheelSlices] = useState<GameItem[]>([]);

  // Direct DOM refs eliminate 60fps React re-renders so the desktop app stays silky fast
  const wheelGroupRef = useRef<SVGGElement | null>(null);
  const pointerRef = useRef<HTMLDivElement | null>(null);
  const tickerTextRef = useRef<HTMLSpanElement | null>(null);

  const angleRef = useRef(0);
  const phaseRef = useRef<WheelPhase>('spinning');
  const enableSoundsRef = useRef(enableSounds);
  const rafRef = useRef<number | null>(null);
  const pointerResetTimerRef = useRef<number | null>(null);
  const lastSpokeIdxRef = useRef(0);
  const recentKeysRef = useRef<string[]>([]);

  useEffect(() => {
    enableSoundsRef.current = enableSounds;
  }, [enableSounds]);

  // Unique entries strictly from Google Sheet `PopularRepacks` (Most Popular Games)
  const popularPool = useMemo(() => {
    const rows = catalog.popularrepacks || [];
    const byKey = new Map<string, GameItem>();
    const seenNames = new Set<string>();

    for (const row of rows) {
      const tokens = (row.rawFields['Game ID'] || '')
        .split(/[,\s|]+/)
        .map((tok) => tok.trim())
        .filter(Boolean);

      for (const tok of tokens) {
        const target = resolveSheetRefItem(tok, catalog);
        if (!target) continue;
        const key = `${target.tab}:${target.id}`;
        const normName = target.name.trim().toLowerCase();
        if (!byKey.has(key) && !seenNames.has(normName)) {
          byKey.set(key, target);
          seenNames.add(normName);
        }
      }
    }

    const resolved = Array.from(byKey.values());
    if (resolved.length > 0) return resolved;
    return catalog.game || [];
  }, [catalog]);

  const stopAnimations = useCallback(() => {
    if (rafRef.current !== null) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
    if (pointerResetTimerRef.current !== null) {
      window.clearTimeout(pointerResetTimerRef.current);
      pointerResetTimerRef.current = null;
    }
  }, []);

  const triggerPointerFlick = useCallback((strength = 1) => {
    const el = pointerRef.current;
    if (!el) return;
    el.style.transition = 'transform 40ms ease-out';
    el.style.transform = `rotate(${-18 * strength}deg)`;
    if (pointerResetTimerRef.current !== null) {
      window.clearTimeout(pointerResetTimerRef.current);
    }
    pointerResetTimerRef.current = window.setTimeout(() => {
      if (pointerRef.current) {
        pointerRef.current.style.transition =
          'transform 130ms cubic-bezier(0.22, 1, 0.36, 1)';
        pointerRef.current.style.transform = 'rotate(0deg)';
      }
    }, 85);
  }, []);

  const startSpin = useCallback(() => {
    if (popularPool.length === 0) return;
    stopAnimations();

    // Pick a winner avoiding previously spun titles
    const maxHistory = Math.min(20, Math.floor(popularPool.length / 2));
    const recentSet = new Set(recentKeysRef.current.slice(0, maxHistory));
    const freshCandidates = popularPool.filter(
      (item) => !recentSet.has(`${item.tab}:${item.id}`)
    );
    const poolToPick = freshCandidates.length > 0 ? freshCandidates : popularPool;
    const chosenWinner = poolToPick[Math.floor(Math.random() * poolToPick.length)];
    const winnerSliceIndex = Math.floor(Math.random() * SLICE_COUNT);

    const nextSlices = pickUniqueSlices(popularPool, {
      item: chosenWinner,
      index: winnerSliceIndex,
    });

    setWheelSlices(nextSlices);
    setWinner(null);
    setPhase('spinning');
    phaseRef.current = 'spinning';

    const startAngle = angleRef.current % 360;
    angleRef.current = startAngle;
    const desiredMod = (360 - winnerSliceIndex * SLICE_ANGLE) % 360;
    let deltaToDesired = desiredMod - startAngle;
    if (deltaToDesired < 0) deltaToDesired += 360;

    // 5 full revolutions + exact alignment onto winning slice
    const targetAngle = startAngle + 5 * 360 + deltaToDesired;
    const startTime = performance.now();
    lastSpokeIdxRef.current = Math.floor((startAngle + SLICE_ANGLE / 2) / SLICE_ANGLE);

    const animateSpin = (now: number) => {
      const elapsed = now - startTime;
      const tNorm = Math.min(elapsed / SPIN_DURATION_MS, 1);
      const eased = 1 - Math.pow(1 - tNorm, 4.1);
      const currentAngle = startAngle + (targetAngle - startAngle) * eased;

      angleRef.current = currentAngle;
      if (wheelGroupRef.current) {
        wheelGroupRef.current.style.transform = `rotate(${currentAngle.toFixed(2)}deg)`;
      }

      const activeIdx = getSliceIndexAtPointer(currentAngle);
      const activeTitle = nextSlices[activeIdx]?.name || '';
      if (tickerTextRef.current && tickerTextRef.current.textContent !== activeTitle) {
        tickerTextRef.current.textContent = activeTitle;
      }

      const spokeIdx = Math.floor((currentAngle + SLICE_ANGLE / 2) / SLICE_ANGLE);
      if (spokeIdx !== lastSpokeIdxRef.current) {
        lastSpokeIdxRef.current = spokeIdx;
        if (enableSoundsRef.current) {
          playWheelTickSound();
        }
        triggerPointerFlick(tNorm < 0.72 ? 1.1 : 0.7);
      }

      if (tNorm < 1) {
        rafRef.current = requestAnimationFrame(animateSpin);
      } else {
        angleRef.current = targetAngle;
        if (wheelGroupRef.current) {
          wheelGroupRef.current.style.transform = `rotate(${targetAngle.toFixed(2)}deg)`;
        }
        if (tickerTextRef.current) {
          tickerTextRef.current.textContent = chosenWinner.name;
        }

        const winKey = `${chosenWinner.tab}:${chosenWinner.id}`;
        recentKeysRef.current = [
          winKey,
          ...recentKeysRef.current.filter((k) => k !== winKey),
        ].slice(0, 24);

        phaseRef.current = 'won';
        setWinner(chosenWinner);
        setPhase('won');

        if (enableSoundsRef.current) {
          playWheelWinSound();
        }
      }
    };

    rafRef.current = requestAnimationFrame(animateSpin);
  }, [popularPool, stopAnimations, triggerPointerFlick]);

  // Auto-start spinning the moment the modal opens
  useEffect(() => {
    if (!isOpen) {
      stopAnimations();
      return;
    }
    const rafId = requestAnimationFrame(() => {
      startSpin();
    });
    return () => {
      cancelAnimationFrame(rafId);
      stopAnimations();
    };
  }, [isOpen, startSpin, stopAnimations]);

  // Escape closes when finished spinning
  useEffect(() => {
    if (!isOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && phaseRef.current !== 'spinning') {
        onClose();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const accentBtnClass = isXboxTheme
    ? 'bg-[#107C10] hover:bg-[#149414] text-white border border-[#6ee755]/60'
    : isPs5Theme
    ? 'bg-white text-[#041432] hover:bg-[#e5f1ff]'
    : 'bg-gradient-to-r from-[#0284c7] to-[#2563eb] hover:from-[#0369a1] hover:to-[#1d4ed8] text-white';

  const secondaryBtnClass = isPs5Theme
    ? 'bg-white/[0.12] hover:bg-white/[0.2] border border-white/[0.22] text-white'
    : isXboxTheme
    ? 'bg-[#113017] hover:bg-[#184420] border border-[#52e042]/40 text-[#ecfdf0]'
    : 'bg-slate-100 hover:bg-slate-200 dark:bg-white/[0.08] dark:hover:bg-white/[0.14] border border-slate-200 dark:border-white/[0.12] text-slate-900 dark:text-white';

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={sw.spinBtn}
      className="fixed inset-0 z-[80] flex items-center justify-center p-3 sm:p-5 bg-slate-950/75"
      onClick={(e) => {
        if (e.target === e.currentTarget && phase !== 'spinning') {
          onClose();
        }
      }}
    >
      <div
        className={`relative w-full max-w-md sm:max-w-lg rounded-2xl border shadow-2xl p-5 sm:p-6 transition-colors ${
          isPs5Theme
            ? 'bg-[#03153a] border-white/[0.18] text-white'
            : isXboxTheme
            ? 'bg-[#07190b] border-[#52e042]/30 text-[#ecfdf0]'
            : 'bg-white dark:bg-[#111722] border-slate-200 dark:border-white/[0.12] text-slate-900 dark:text-white'
        }`}
      >
        {/* Minimal Corner Close Button */}
        <button
          type="button"
          onClick={() => {
            if (phase !== 'spinning') onClose();
          }}
          disabled={phase === 'spinning'}
          aria-label={t.updateHistory.closeBtn}
          className={`absolute top-3.5 end-3.5 z-20 w-8 h-8 rounded-full inline-flex items-center justify-center transition-colors ${
            phase === 'spinning'
              ? 'opacity-30 cursor-not-allowed'
              : 'cursor-pointer hover:bg-slate-100 dark:hover:bg-white/[0.1]'
          }`}
        >
          <X weight="bold" className="w-4 h-4" />
        </button>

        <div className="flex flex-col items-center gap-4">
          {/* Spin Wheel Visual */}
          <div className="relative w-full max-w-[280px] sm:max-w-[310px] aspect-square flex items-center justify-center select-none">
            {/* Top Golden Pointer Triangle */}
            <div
              ref={pointerRef}
              aria-hidden="true"
              style={{ transformOrigin: '50% 22%' }}
              className="absolute top-0 left-1/2 -translate-x-1/2 z-20 drop-shadow-[0_3px_6px_rgba(0,0,0,0.45)] pointer-events-none"
            >
              <svg width="36" height="38" viewBox="0 0 42 44" fill="none">
                <path
                  d="M7 6C7 3.8 8.8 2 11 2H31C33.2 2 35 3.8 35 6C35 8.5 33.8 11.4 31.8 15.1L23.9 29.8C22.6 32.2 19.4 32.2 18.1 29.8L10.2 15.1C8.2 11.4 7 8.5 7 6Z"
                  fill="#fbbf0d"
                  stroke="#f59e0b"
                  strokeWidth="2.5"
                />
                <path d="M12.5 7.5H29.5L21 23.5L12.5 7.5Z" fill="#fde047" opacity="0.7" />
              </svg>
            </div>

            <svg
              viewBox="0 0 400 400"
              className="w-full h-full drop-shadow-[0_14px_28px_rgba(0,0,0,0.35)]"
              aria-hidden="true"
            >
              <circle cx="200" cy="200" r="190" fill="#1e2d3d" stroke="#334155" strokeWidth="3" />
              <circle cx="200" cy="200" r="161" fill="#0f172a" />

              {MARQUEE_BULBS.map((b) => (
                <circle key={b.idx} cx={b.x} cy={b.y} r="4.8" fill="#ffffff" />
              ))}

              <g
                ref={wheelGroupRef}
                style={{
                  transformOrigin: '200px 200px',
                  willChange: 'transform',
                }}
              >
                {SLICE_COLORS.map((color, idx) => {
                  const startDeg = idx * SLICE_ANGLE - SLICE_ANGLE / 2;
                  const endDeg = idx * SLICE_ANGLE + SLICE_ANGLE / 2;
                  const centerDeg = idx * SLICE_ANGLE;
                  const sliceItem = wheelSlices[idx];
                  const starPt = polarToCartesian(200, 200, 92, centerDeg);

                  return (
                    <g key={idx}>
                      <path
                        d={buildWedgePath(200, 200, 0, 159, startDeg, endDeg)}
                        fill={color.fill}
                        stroke="#1e2d3d"
                        strokeWidth="1.2"
                      />
                      <path
                        d={buildWedgePath(200, 200, 147, 159, startDeg, endDeg)}
                        fill={color.rim}
                        opacity="0.82"
                      />
                      <polygon
                        points={buildStarPoints(starPt.x, starPt.y, 11, 4.8)}
                        fill="#ffffff"
                        transform={`rotate(${centerDeg}, ${starPt.x}, ${starPt.y})`}
                      />
                      {sliceItem && (
                        <g transform={`rotate(${centerDeg}, 200, 200)`}>
                          <text
                            x="200"
                            y="67"
                            textAnchor="middle"
                            fill="#ffffff"
                            fontSize="10.2"
                            fontWeight="800"
                            letterSpacing="0.02em"
                            style={{
                              paintOrder: 'stroke',
                              stroke: color.textShadow,
                              strokeWidth: '2.6px',
                              strokeLinejoin: 'round',
                            }}
                          >
                            {truncateSliceLabel(sliceItem.name, 11)}
                          </text>
                        </g>
                      )}
                    </g>
                  );
                })}
              </g>

              <circle cx="200" cy="200" r="54" fill="#1e2d3d" />
            </svg>

            {/* Center SPIN Badge */}
            <button
              type="button"
              onClick={startSpin}
              disabled={phase === 'spinning'}
              aria-label={sw.spinBtn}
              className={`absolute w-[22%] aspect-square rounded-full bg-white text-[#1e2d3d] border-4 border-[#1e2d3d] flex items-center justify-center font-display font-black text-xs sm:text-sm tracking-tight transition-transform ${
                phase === 'spinning'
                  ? 'cursor-default opacity-95'
                  : 'cursor-pointer hover:scale-105 active:scale-95'
              }`}
            >
              {phase === 'spinning' ? '•••' : 'SPIN'}
            </button>
          </div>

          {/* While Spinning: Live Random Popular Game Titles Ticker */}
          {phase === 'spinning' && (
            <div
              className={`w-full px-4 py-2.5 rounded-xl border text-center ${
                isPs5Theme
                  ? 'bg-white/[0.08] border-white/[0.16]'
                  : isXboxTheme
                  ? 'bg-[#0e2613] border-[#52e042]/30'
                  : 'bg-slate-100 dark:bg-white/[0.05] border-slate-200 dark:border-white/[0.1]'
              }`}
            >
              <span
                ref={tickerTextRef}
                className="block text-sm sm:text-base font-display font-bold truncate"
              >
                {wheelSlices[0]?.name || sw.spinningLabel}
              </span>
            </div>
          )}

          {/* Stopped Result: Image Card + Title + 2 Buttons */}
          {phase === 'won' && winner && (
            <div className="w-full space-y-4">
              <div
                className={`flex items-center gap-3.5 p-3 rounded-2xl border ${
                  isPs5Theme
                    ? 'bg-white/[0.08] border-white/[0.18]'
                    : isXboxTheme
                    ? 'bg-[#0d2411] border-[#52e042]/35'
                    : 'bg-slate-50 dark:bg-[#171f2e] border-slate-200 dark:border-white/[0.1]'
                }`}
              >
                <div className="w-20 sm:w-24 aspect-[3/4] rounded-xl overflow-hidden shrink-0 border border-slate-200 dark:border-white/[0.1] shadow-md">
                  <GameCover
                    src={winner.coverImage}
                    alt={winner.name}
                    priority
                    className="w-full h-full object-cover"
                  />
                </div>
                <h3 className="font-display text-base sm:text-lg font-bold leading-snug line-clamp-3 min-w-0">
                  {winner.name}
                </h3>
              </div>

              {/* Exactly 2 Buttons: Spin the Wheel & View game detail */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <button
                  type="button"
                  onClick={startSpin}
                  className={`py-2.5 px-4 rounded-xl text-xs sm:text-sm font-bold inline-flex items-center justify-center gap-1.5 whitespace-nowrap shrink-0 cursor-pointer transition-all ${secondaryBtnClass}`}
                >
                  <ArrowsClockwise weight="bold" className="w-4 h-4 shrink-0" />
                  <span>{sw.spinBtn}</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onSelectGame(winner);
                  }}
                  className={`py-2.5 px-4 rounded-xl text-xs sm:text-sm font-bold inline-flex items-center justify-center gap-1.5 whitespace-nowrap shrink-0 cursor-pointer transition-all shadow-md ${accentBtnClass}`}
                >
                  <span>{sw.viewGameBtn}</span>
                  <ArrowUpRight weight="bold" className="w-4 h-4 shrink-0" />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
