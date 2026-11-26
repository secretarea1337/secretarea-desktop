import { useEffect, useRef, useState } from 'react';
import { CaretDown, Check, Globe } from '@phosphor-icons/react';
import {
  DEALS_CURRENCY_OPTIONS,
  DEALS_REGION_OPTIONS,
  type DealsCurrencyCode,
  type DealsRegionCode,
  type ExchangeRateSnapshot,
} from '../../deals/types';
import { getCurrencyMeta, getRateForCurrency } from '../../deals/currencyService';
import type { AppThemeMode } from '../../services/launcherSettings';

interface CurrencySwitcherProps {
  selectedCurrency: DealsCurrencyCode;
  region: DealsRegionCode;
  fxSnapshot: ExchangeRateSnapshot | null;
  isLoadingFx: boolean;
  activeTheme: AppThemeMode;
  labels: {
    currencyLabel: string;
    regionLabel: string;
    allCurrenciesLabel: string;
    liveFxRateLabel: string;
    fxLoadingLabel: string;
    fxUnavailableLabel: string;
    currencyNames: Record<DealsCurrencyCode, string>;
  };
  onSelectCurrency: (currency: DealsCurrencyCode) => void;
  onSelectRegion: (region: DealsRegionCode) => void;
}

export function CurrencySwitcher({
  selectedCurrency,
  region,
  fxSnapshot,
  isLoadingFx,
  activeTheme,
  labels,
  onSelectCurrency,
  onSelectRegion,
}: CurrencySwitcherProps) {
  const [openMenu, setOpenMenu] = useState<'currency' | 'region' | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const isXbox = activeTheme === 'xbox';
  const isPs5 = activeTheme === 'ps5';

  useEffect(() => {
    if (!openMenu) return;
    const handlePointerDown = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpenMenu(null);
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setOpenMenu(null);
      }
    };
    document.addEventListener('mousedown', handlePointerDown);
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [openMenu]);

  const activeMeta = getCurrencyMeta(selectedCurrency);
  const activeRegion =
    DEALS_REGION_OPTIONS.find((opt) => opt.code === region) || DEALS_REGION_OPTIONS[0];
  const activeRate = getRateForCurrency('USD', selectedCurrency, fxSnapshot);

  const formatRatePreview = (code: DealsCurrencyCode): string => {
    if (code === 'USD') return '1.00';
    const r = getRateForCurrency('USD', code, fxSnapshot);
    if (!r) return '—';
    return code === 'JPY' ? r.toFixed(1) : r.toFixed(2);
  };

  const controlSurfaceClass = (isActive: boolean) =>
    isXbox
      ? `bg-[#09200d]/90 border ${
          isActive
            ? 'border-[#7cf25c] ring-2 ring-[#52e042]/20'
            : 'border-[#52e042]/28 hover:border-[#7cf25c]/70 hover:bg-[#0d2a12]'
        } text-white`
      : isPs5
      ? `bg-[#081a3d]/85 border ${
          isActive
            ? 'border-[#7cc4ff] ring-2 ring-[#7cc4ff]/20'
            : 'border-white/[0.15] hover:border-[#7cc4ff]/65 hover:bg-[#0b2350]/90'
        } text-white`
      : `bg-white hover:bg-slate-50 dark:bg-[#111923] dark:hover:bg-[#172230] border ${
          isActive
            ? 'border-[#0284c7] dark:border-[#38bdf8] ring-2 ring-sky-500/15'
            : 'border-slate-200/90 hover:border-slate-300 dark:border-white/[0.1] dark:hover:border-white/[0.22]'
        } text-slate-800 dark:text-[#e6eef8] shadow-xs`;

  const popoverSurfaceClass = isXbox
    ? 'bg-[#07180a]/98 border-[#52e042]/35 text-white'
    : isPs5
    ? 'bg-[#071636]/98 border-white/[0.16] text-white'
    : 'bg-white dark:bg-[#131b24] border-slate-200 dark:border-white/[0.12] text-slate-900 dark:text-white';

  return (
    <div ref={containerRef} className="relative w-full sm:w-auto">
      {/* Unified Modern Currency + Region Triggers */}
      <div className="grid grid-cols-2 sm:flex sm:items-center gap-2 min-w-0">
        {/* Currency Dropdown Trigger */}
        <button
          type="button"
          onClick={() => setOpenMenu((m) => (m === 'currency' ? null : 'currency'))}
          aria-expanded={openMenu === 'currency'}
          aria-haspopup="dialog"
          aria-label={labels.currencyLabel}
          className={`sa-ps5-subpanel w-full sm:w-auto inline-flex items-center justify-between gap-2 h-9 px-2.5 sm:px-3 rounded-xl text-[12.5px] font-semibold transition-all duration-150 whitespace-nowrap cursor-pointer min-w-0 active:scale-[0.98] ${controlSurfaceClass(
            openMenu === 'currency'
          )}`}
        >
          <span className="inline-flex items-center gap-2 min-w-0">
            <span
              dir="ltr"
              className={`inline-flex items-center justify-center min-w-[22px] h-[22px] px-1 rounded-md font-mono-tabular text-[11px] font-bold shrink-0 ${
                isXbox
                  ? 'bg-[#52e042]/18 text-[#6ee755]'
                  : isPs5
                  ? 'bg-[#0070d1]/30 text-[#7cc4ff]'
                  : 'bg-sky-500/12 text-[#0284c7] dark:text-[#38bdf8] sa-custom-accent-text'
              }`}
            >
              {activeMeta.symbol}
            </span>
            <span className="font-mono-tabular tracking-tight truncate">{selectedCurrency}</span>
            {selectedCurrency !== 'USD' && activeRate && (
              <span className="hidden xl:inline font-mono-tabular text-[11px] opacity-65 shrink-0">
                · 1$={formatRatePreview(selectedCurrency)}
              </span>
            )}
          </span>
          <CaretDown
            weight="bold"
            className={`w-3.5 h-3.5 shrink-0 opacity-65 transition-transform duration-150 ${
              openMenu === 'currency' ? 'rotate-180 opacity-100' : ''
            }`}
          />
        </button>

        {/* Region Dropdown Trigger (Replaces Raw Native Select) */}
        <button
          type="button"
          onClick={() => setOpenMenu((m) => (m === 'region' ? null : 'region'))}
          aria-expanded={openMenu === 'region'}
          aria-haspopup="dialog"
          aria-label={labels.regionLabel}
          className={`sa-ps5-subpanel w-full sm:w-auto inline-flex items-center justify-between gap-2 h-9 px-2.5 sm:px-3 rounded-xl text-[12.5px] font-semibold transition-all duration-150 whitespace-nowrap cursor-pointer min-w-0 active:scale-[0.98] ${controlSurfaceClass(
            openMenu === 'region'
          )}`}
        >
          <span className="inline-flex items-center gap-2 min-w-0">
            <Globe
              weight="duotone"
              className={`w-4 h-4 shrink-0 ${
                isXbox
                  ? 'text-[#6ee755]'
                  : isPs5
                  ? 'text-[#7cc4ff]'
                  : 'text-[#0284c7] dark:text-[#38bdf8] sa-custom-accent-text'
              }`}
            />
            <span className="truncate">
              <span className="font-mono-tabular">{activeRegion.code}</span>
              <span className="opacity-50 mx-1">·</span>
              <span>{activeRegion.label}</span>
            </span>
          </span>
          <CaretDown
            weight="bold"
            className={`w-3.5 h-3.5 shrink-0 opacity-65 transition-transform duration-150 ${
              openMenu === 'region' ? 'rotate-180 opacity-100' : ''
            }`}
          />
        </button>
      </div>

      {/* Multi-Currency Selector Popover */}
      {openMenu === 'currency' && (
        <div
          role="dialog"
          aria-label={labels.currencyLabel}
          className={`sa-ps5-panel absolute top-full start-0 sm:start-auto sm:end-0 mt-2 z-50 w-full sm:w-[390px] max-w-[calc(100vw-2rem)] rounded-2xl border shadow-2xl overflow-hidden ${popoverSurfaceClass}`}
        >
          {/* Popover Header with Live FX Telemetry */}
          <div className="px-4 py-3 border-b border-slate-200/80 dark:border-white/[0.08] flex flex-wrap items-center justify-between gap-2 bg-slate-50/80 dark:bg-[#0f161f]">
            <span className="text-[12.5px] font-bold tracking-tight">
              {labels.currencyLabel}
            </span>
            <span
              dir="ltr"
              className="inline-flex items-center gap-1.5 text-[11px] font-mono-tabular text-slate-500 dark:text-[#8b9bb4]"
            >
              <span
                className={`w-2 h-2 rounded-full shrink-0 ${
                  isLoadingFx
                    ? 'bg-amber-400 animate-pulse'
                    : fxSnapshot
                    ? 'bg-emerald-500'
                    : 'bg-slate-400'
                }`}
              />
              <span>
                {isLoadingFx
                  ? labels.fxLoadingLabel
                  : fxSnapshot
                  ? activeRate && selectedCurrency !== 'USD'
                    ? `${labels.liveFxRateLabel} · 1 USD = ${formatRatePreview(selectedCurrency)} ${selectedCurrency}`
                    : labels.liveFxRateLabel
                  : labels.fxUnavailableLabel}
              </span>
            </span>
          </div>

          {/* 2-Column Responsive Grid of All 10 Currencies */}
          <div className="p-3 grid grid-cols-1 sm:grid-cols-2 gap-1.5 max-h-[60vh] overflow-y-auto">
            {DEALS_CURRENCY_OPTIONS.map((opt) => {
              const active = selectedCurrency === opt.code;
              const rateStr = formatRatePreview(opt.code);
              return (
                <button
                  key={opt.code}
                  type="button"
                  aria-pressed={active}
                  onClick={() => {
                    onSelectCurrency(opt.code);
                    setOpenMenu(null);
                  }}
                  className={`sa-ps5-subpanel flex items-center justify-between gap-2 px-2.5 py-2 rounded-xl border text-start transition-all cursor-pointer active:scale-[0.98] ${
                    active
                      ? isXbox
                        ? 'bg-[#107C10]/30 border-[#6ee755] text-white'
                        : isPs5
                        ? 'bg-[#0070d1]/35 border-[#7cc4ff] text-white'
                        : 'bg-sky-500/12 border-[#0284c7] dark:border-[#38bdf8] text-slate-900 dark:text-white'
                      : 'bg-slate-50/70 hover:bg-slate-100 dark:bg-[#10161e]/75 dark:hover:bg-[#1b2432] border-slate-200/80 dark:border-white/[0.06] text-slate-800 dark:text-[#cbd6e4]'
                  }`}
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <span
                      dir="ltr"
                      className={`w-8 h-8 rounded-lg flex items-center justify-center font-mono-tabular text-[11.5px] font-bold shrink-0 ${
                        active
                          ? isXbox
                            ? 'bg-[#107C10] text-white'
                            : 'bg-[#0284c7] dark:bg-[#1a9fff] text-white'
                          : 'bg-slate-200/80 dark:bg-white/[0.06] text-slate-700 dark:text-[#cbd6e4]'
                      }`}
                    >
                      {opt.symbol}
                    </span>
                    <div className="min-w-0">
                      <div className="font-mono-tabular text-[12.5px] font-bold leading-tight">
                        {opt.code}
                      </div>
                      <div className="text-[11px] text-slate-500 dark:text-[#8b9bb4] truncate">
                        {labels.currencyNames[opt.code]}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-1 shrink-0">
                    <span
                      dir="ltr"
                      className="font-mono-tabular text-[11px] text-slate-500 dark:text-[#8b9bb4]"
                    >
                      {rateStr}
                    </span>
                    {active && (
                      <Check
                        weight="bold"
                        className={`w-3.5 h-3.5 shrink-0 ${
                          isXbox
                            ? 'text-[#6ee755]'
                            : 'text-[#0284c7] dark:text-[#38bdf8] sa-custom-accent-text'
                        }`}
                      />
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Store Region Selector Popover */}
      {openMenu === 'region' && (
        <div
          role="dialog"
          aria-label={labels.regionLabel}
          className={`sa-ps5-panel absolute top-full end-0 mt-2 z-50 w-full sm:w-[270px] max-w-[calc(100vw-2rem)] rounded-2xl border shadow-2xl overflow-hidden ${popoverSurfaceClass}`}
        >
          <div className="px-4 py-2.5 border-b border-slate-200/80 dark:border-white/[0.08] flex items-center justify-between gap-2 bg-slate-50/80 dark:bg-[#0f161f]">
            <span className="text-[12.5px] font-bold tracking-tight">{labels.regionLabel}</span>
            <span className="font-mono-tabular text-[11px] text-slate-500 dark:text-[#8b9bb4]">
              {activeRegion.code}
            </span>
          </div>

          <div className="p-2 space-y-1 max-h-[55vh] overflow-y-auto">
            {DEALS_REGION_OPTIONS.map((opt) => {
              const active = region === opt.code;
              return (
                <button
                  key={opt.code}
                  type="button"
                  aria-pressed={active}
                  onClick={() => {
                    onSelectRegion(opt.code);
                    setOpenMenu(null);
                  }}
                  className={`w-full flex items-center justify-between gap-2.5 px-3 py-2 rounded-xl text-start text-[12.5px] transition-colors cursor-pointer ${
                    active
                      ? isXbox
                        ? 'bg-[#107C10]/30 text-white font-semibold'
                        : isPs5
                        ? 'bg-[#0070d1]/35 text-white font-semibold'
                        : 'bg-sky-500/12 text-[#0284c7] dark:text-[#38bdf8] font-semibold'
                      : 'text-slate-700 dark:text-[#cbd6e4] hover:bg-slate-100 dark:hover:bg-white/[0.06]'
                  }`}
                >
                  <span className="flex items-center gap-2.5 min-w-0">
                    <span className="font-mono-tabular text-[11.5px] font-bold px-1.5 py-0.5 rounded bg-slate-200/75 dark:bg-white/[0.08] shrink-0">
                      {opt.code}
                    </span>
                    <span className="truncate">{opt.label}</span>
                  </span>
                  {active && <Check weight="bold" className="w-4 h-4 shrink-0" />}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
