import { useState, type ReactNode } from 'react';
import {
  ArrowsClockwise,
  Check,
  Cpu,
  GraphicsCard,
  HardDrive,
  Info,
  Laptop,
  Memory,
  SlidersHorizontal,
  Warning,
  X,
} from '@phosphor-icons/react';
import type { CanRunEvaluation, RequirementCheckRow } from '../services/canRunIt';
import type { SystemHardwareSpecs } from '../services/systemSpecs';
import type { AppLanguage } from '../services/launcherSettings';
import { getTranslations } from '../i18n/translations';

function getRowIcon(key: RequirementCheckRow['key']): ReactNode {
  switch (key) {
    case 'gpu':
      return <GraphicsCard className="w-4 h-4" />;
    case 'cpu':
      return <Cpu className="w-4 h-4" />;
    case 'ram':
      return <Memory className="w-4 h-4" />;
    case 'space':
      return <HardDrive className="w-4 h-4" />;
  }
}

interface CanRunItHeroBadgeProps {
  evaluation: CanRunEvaluation;
  language?: AppLanguage;
  onClick?: () => void;
}

export function CanRunItHeroBadge({
  evaluation,
  language = 'en',
  onClick,
}: CanRunItHeroBadgeProps) {
  const t = getTranslations(language).detail;
  const isPass = evaluation.status === 'can-run';
  const isFail = evaluation.status === 'cannot-run';

  return (
    <button
      type="button"
      onClick={onClick}
      title={t.requirementsAndCanRun}
      className={`sa-ps5-compat-badge p-3 sm:p-3.5 rounded-xl text-start border backdrop-blur-md hover:-translate-y-0.5 transition-all duration-200 cursor-pointer ${
        isPass
          ? 'sa-ps5-compat-pass bg-[#0f1f19]/90 hover:bg-[#132920] border-emerald-500/40'
          : isFail
          ? 'sa-ps5-compat-fail bg-[#261217]/90 hover:bg-[#31161d] border-rose-500/45'
          : 'sa-ps5-compat-neutral bg-white/[0.06] hover:bg-white/[0.11] border-white/[0.12]'
      }`}
    >
      <div className="text-[10px] uppercase tracking-[0.08em] text-[#8b9bb4] font-semibold">
        {t.yourPcCanRun}
      </div>
      <div
        className={`mt-0.5 inline-flex items-center gap-1.5 text-[12.5px] sm:text-[13px] font-bold ${
          isPass
            ? 'text-[#4ade80]'
            : isFail
            ? 'text-[#f87171]'
            : 'text-[#cbd5e1]'
        }`}
      >
        {isPass && <Check weight="bold" className="w-3.5 h-3.5 shrink-0" />}
        {isFail && <X weight="bold" className="w-3.5 h-3.5 shrink-0" />}
        {!isPass && !isFail && <Info className="w-3.5 h-3.5 shrink-0" />}
        <span className="truncate">
          {isPass ? t.runsWell : isFail ? t.cantRun : t.checkSpecs}
        </span>
      </div>
      <div className="text-[10.5px] text-[#8b9bb4] truncate">
        {isFail && evaluation.weakLabels.length > 0
          ? `${t.weakPrefix}: ${evaluation.weakLabels.join(', ')}`
          : t.estimated}
      </div>
    </button>
  );
}

interface CanRunItPanelProps {
  evaluation: CanRunEvaluation;
  specs: SystemHardwareSpecs;
  language?: AppLanguage;
  isRefreshingSpecs?: boolean;
  onRefreshAutoSpecs?: () => void;
  onSaveCustomSpecs?: (next: SystemHardwareSpecs) => void;
  onResetCustomSpecs?: () => void;
}

export function CanRunItPanel({
  evaluation,
  specs,
  language = 'en',
  isRefreshingSpecs = false,
  onRefreshAutoSpecs,
  onSaveCustomSpecs,
  onResetCustomSpecs,
}: CanRunItPanelProps) {
  const t = getTranslations(language).detail;
  const [showEditor, setShowEditor] = useState(false);
  const [draftGpu, setDraftGpu] = useState(specs.gpuName);
  const [draftCpu, setDraftCpu] = useState(specs.cpuName);
  const [draftRam, setDraftRam] = useState(specs.ramGB !== null ? String(specs.ramGB) : '');
  const [draftSpace, setDraftSpace] = useState(
    specs.freeSpaceGB !== null ? String(specs.freeSpaceGB) : ''
  );

  const openEditor = () => {
    setDraftGpu(specs.gpuName);
    setDraftCpu(specs.cpuName);
    setDraftRam(specs.ramGB !== null ? String(specs.ramGB) : '');
    setDraftSpace(specs.freeSpaceGB !== null ? String(specs.freeSpaceGB) : '');
    setShowEditor((prev) => !prev);
  };

  const handleApplyDraft = (e: React.FormEvent) => {
    e.preventDefault();
    if (!onSaveCustomSpecs) return;
    const numRam = Number(draftRam);
    const parsedRam =
      draftRam.trim() !== '' && Number.isFinite(numRam) && numRam > 0
        ? Math.max(1, numRam)
        : specs.ramGB;
    const parsedSpace =
      draftSpace.trim() === '' ? null : Math.max(0, Number(draftSpace) || 0);
    onSaveCustomSpecs({
      ...specs,
      source: 'custom',
      gpuName: draftGpu.trim() || specs.gpuName,
      cpuName: draftCpu.trim() || specs.cpuName,
      ramGB: parsedRam,
      ramIsApprox: false,
      freeSpaceGB: parsedSpace,
      detectedAt: new Date().toISOString(),
    });
    setShowEditor(false);
  };

  const isPass = evaluation.status === 'can-run';
  const isFail = evaluation.status === 'cannot-run';

  return (
    <div className="sa-ps5-panel p-4 sm:p-5 rounded-lg bg-white dark:bg-[#11161d] border border-slate-200 dark:border-white/[0.08] space-y-4">
      {/* Header Row */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Laptop className="w-4 h-4 text-[#0284c7] dark:text-[#66c0f4] shrink-0" />
          <h3 className="text-[14px] sm:text-[15px] font-bold text-slate-900 dark:text-white tracking-tight">
            {t.canRunItTitle}
          </h3>
          <span className="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-white/[0.06] text-[10px] font-medium text-slate-600 dark:text-[#8b9bb4] uppercase tracking-wider">
            {specs.source === 'electron'
              ? t.thisPcAuto
              : specs.source === 'custom'
              ? t.customPc
              : t.detectedPc}
          </span>
        </div>

        <div className="flex items-center gap-2 text-[11.5px]">
          <span className="text-slate-500 dark:text-[#8b9bb4] hidden sm:inline">
            {t.thisPcVsMinimum}
          </span>
          {onRefreshAutoSpecs && (
            <button
              type="button"
              onClick={onRefreshAutoSpecs}
              disabled={isRefreshingSpecs}
              className="inline-flex items-center gap-1 px-2 py-1 rounded bg-slate-100 hover:bg-slate-200 dark:bg-[#1a222d] dark:hover:bg-[#243040] border border-slate-300 dark:border-white/[0.08] text-slate-700 hover:text-slate-950 dark:text-[#9fb0c7] dark:hover:text-white transition-colors cursor-pointer disabled:opacity-50"
            >
              <ArrowsClockwise
                className={`w-3.5 h-3.5 ${isRefreshingSpecs ? 'animate-spin' : ''}`}
              />
              <span>{t.scan}</span>
            </button>
          )}
          {onSaveCustomSpecs && (
            <button
              type="button"
              onClick={openEditor}
              className="inline-flex items-center gap-1 px-2 py-1 rounded bg-slate-100 hover:bg-slate-200 dark:bg-[#1a222d] dark:hover:bg-[#243040] border border-slate-300 dark:border-white/[0.08] text-[#0284c7] hover:text-slate-950 dark:text-[#66c0f4] dark:hover:text-white transition-colors cursor-pointer"
            >
              <SlidersHorizontal className="w-3 h-3" />
              <span>{showEditor ? t.close : t.myPc}</span>
            </button>
          )}
        </div>
      </div>

      {/* Verdict Status Box */}
      {evaluation.status !== 'unknown' ? (
        <div
          className={`p-3.5 sm:p-4 rounded-md border flex items-start gap-3.5 ${
            isPass
              ? 'sa-ps5-verdict-pass bg-gradient-to-r from-emerald-50 via-emerald-50/70 to-teal-50/40 dark:from-[#0e261c] dark:via-[#0e2119] dark:to-[#11191d] border-emerald-300 dark:border-emerald-500/45'
              : 'sa-ps5-verdict-fail bg-gradient-to-r from-rose-50 via-rose-50/70 to-red-50/40 dark:from-[#2c1218] dark:via-[#241217] dark:to-[#181317] border-rose-300 dark:border-rose-500/50'
          }`}
        >
          <div
            className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 mt-0.5 ${
              isPass
                ? 'bg-emerald-600 text-white dark:bg-[#4ade80] dark:text-[#08130d]'
                : 'bg-rose-600 text-white dark:bg-[#f87171] dark:text-[#1a090d]'
            }`}
          >
            {isPass ? (
              <Check weight="bold" className="w-4.5 h-4.5" />
            ) : (
              <Warning weight="bold" className="w-4.5 h-4.5" />
            )}
          </div>

          <div className="min-w-0 flex-1 space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <span
                className={`text-[14px] sm:text-[15px] font-bold ${
                  isPass
                    ? 'text-emerald-800 dark:text-[#4ade80]'
                    : 'text-rose-800 dark:text-[#fca5a5]'
                }`}
              >
                {evaluation.headline}
              </span>
              <span className="px-2 py-0.5 rounded bg-slate-900/[0.06] dark:bg-white/[0.08] text-[10.5px] font-medium text-slate-700 dark:text-[#cbd5e1]">
                {t.estimated}
              </span>
              {isFail && evaluation.weakLabels.length > 0 && (
                <span className="px-2 py-0.5 rounded bg-rose-500/15 dark:bg-rose-500/20 border border-rose-400/50 dark:border-rose-400/45 text-[10.5px] font-bold text-rose-800 dark:text-[#fda4af]">
                  {t.weakPrefix}: {evaluation.weakLabels.join(' & ')}
                </span>
              )}
            </div>
            <p
              className={`text-[12.5px] leading-snug ${
                isPass
                  ? 'text-emerald-900/90 dark:text-[#a7f3d0]/85'
                  : 'text-rose-900/90 dark:text-[#fecaca]'
              }`}
            >
              {evaluation.summaryText}
            </p>
          </div>
        </div>
      ) : (
        <div className="sa-ps5-subpanel p-3.5 rounded-md border border-slate-200 dark:border-white/[0.08] bg-slate-50 dark:bg-[#151c26] flex items-center gap-3 text-[12.5px] text-slate-700 dark:text-[#aeb9c7]">
          <Info className="w-4 h-4 text-[#0284c7] dark:text-[#66c0f4] shrink-0" />
          <span>{evaluation.summaryText}</span>
        </div>
      )}

      {/* Optional My PC Hardware Override Editor */}
      {showEditor && onSaveCustomSpecs && (
        <form
          onSubmit={handleApplyDraft}
          className="sa-ps5-subpanel p-3.5 rounded-md bg-slate-50 dark:bg-[#161d28] border border-sky-300 dark:border-[#1a9fff]/35 space-y-3"
        >
          <div className="flex items-center justify-between gap-2">
            <span className="text-[11.5px] font-bold uppercase tracking-wider text-[#0284c7] dark:text-[#66c0f4]">
              {t.pcSpecsHeading}
            </span>
            {specs.source === 'custom' && onResetCustomSpecs && (
              <button
                type="button"
                onClick={() => {
                  onResetCustomSpecs();
                  setShowEditor(false);
                }}
                className="text-[11px] font-semibold text-[#0284c7] hover:text-slate-900 dark:text-[#66c0f4] dark:hover:text-white cursor-pointer"
              >
                {t.resetAuto}
              </button>
            )}
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            <label className="space-y-1 text-[11px] text-slate-600 dark:text-[#9fb0c7]">
              <span>{t.gpuInput}</span>
              <input
                type="text"
                dir="ltr"
                value={draftGpu}
                onChange={(e) => setDraftGpu(e.target.value)}
                placeholder="e.g. GeForce RTX 4050 Laptop"
                className="w-full px-2.5 py-1.5 rounded bg-white dark:bg-[#0f141b] border border-slate-300 dark:border-white/[0.1] text-[12px] text-slate-900 dark:text-white focus:outline-none focus:border-[#1a9fff]"
              />
            </label>
            <label className="space-y-1 text-[11px] text-slate-600 dark:text-[#9fb0c7]">
              <span>{t.cpuInput}</span>
              <input
                type="text"
                dir="ltr"
                value={draftCpu}
                onChange={(e) => setDraftCpu(e.target.value)}
                placeholder="e.g. Core i7-12650H"
                className="w-full px-2.5 py-1.5 rounded bg-white dark:bg-[#0f141b] border border-slate-300 dark:border-white/[0.1] text-[12px] text-slate-900 dark:text-white focus:outline-none focus:border-[#1a9fff]"
              />
            </label>
            <label className="space-y-1 text-[11px] text-slate-600 dark:text-[#9fb0c7]">
              <span>{t.ramInput}</span>
              <input
                type="number"
                min={1}
                max={512}
                value={draftRam}
                onChange={(e) => setDraftRam(e.target.value)}
                className="w-full px-2.5 py-1.5 rounded bg-white dark:bg-[#0f141b] border border-slate-300 dark:border-white/[0.1] text-[12px] text-slate-900 dark:text-white focus:outline-none focus:border-[#1a9fff]"
              />
            </label>
            <label className="space-y-1 text-[11px] text-slate-600 dark:text-[#9fb0c7]">
              <span>{t.spaceInput}</span>
              <input
                type="number"
                min={0}
                step="0.1"
                value={draftSpace}
                onChange={(e) => setDraftSpace(e.target.value)}
                placeholder="e.g. 120"
                className="w-full px-2.5 py-1.5 rounded bg-white dark:bg-[#0f141b] border border-slate-300 dark:border-white/[0.1] text-[12px] text-slate-900 dark:text-white focus:outline-none focus:border-[#1a9fff]"
              />
            </label>
          </div>
          <div className="flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={() => setShowEditor(false)}
              className="px-3 py-1.5 rounded bg-slate-200 hover:bg-slate-300 dark:bg-[#232b36] dark:hover:bg-[#2d3847] text-[12px] text-slate-800 dark:text-[#c6d4df] cursor-pointer"
            >
              {t.cancel}
            </button>
            <button
              type="submit"
              className="px-3 py-1.5 rounded bg-[#1a9fff] hover:bg-[#38adff] text-[12px] font-semibold text-white cursor-pointer"
            >
              {t.compareSpecs}
            </button>
          </div>
        </form>
      )}

      {/* Breakdown Comparison Rows */}
      {evaluation.rows.length > 0 && (
        <div className="divide-y divide-slate-200 dark:divide-white/[0.06]">
          {evaluation.rows.map((row) => (
            <div
              key={row.key}
              className="py-2.5 first:pt-1 last:pb-0 flex items-center justify-between gap-3"
            >
              <div className="flex items-start gap-3 min-w-0">
                <div
                  className={`p-2 rounded shrink-0 mt-0.5 ${
                    row.status === 'pass'
                      ? 'bg-emerald-500/15 dark:bg-emerald-500/10 text-emerald-700 dark:text-[#4ade80]'
                      : row.status === 'fail'
                      ? 'bg-rose-500/15 text-rose-700 dark:text-[#f87171]'
                      : 'bg-slate-100 dark:bg-[#1a222e] text-[#0284c7] dark:text-[#66c0f4]'
                  }`}
                >
                  {getRowIcon(row.key)}
                </div>

                <div className="min-w-0">
                  <div className="text-[11.5px] text-slate-600 dark:text-[#8b9bb4] leading-snug break-words">
                    <span>{row.label}</span>
                    {row.requiredText && (
                      <span> · {t.needsPrefix} {row.requiredText}</span>
                    )}
                  </div>
                  <div className="mt-0.5 text-[13px] sm:text-[13.5px] font-semibold text-slate-900 dark:text-white truncate">
                    {row.userText}
                  </div>
                </div>
              </div>

              <div
                className={`text-[12.5px] sm:text-[13px] font-bold font-mono-tabular whitespace-nowrap shrink-0 ${
                  row.status === 'pass'
                    ? 'text-emerald-700 dark:text-[#4ade80]'
                    : row.status === 'fail'
                    ? 'text-rose-700 dark:text-[#f87171]'
                    : 'text-slate-600 dark:text-[#94a3b8]'
                }`}
              >
                {row.statusText}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
