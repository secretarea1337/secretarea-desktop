import { useMemo, useState } from 'react';
import {
  Briefcase,
  CalendarCheck,
  GameController,
  Lightbulb,
  Wrench,
} from '@phosphor-icons/react';
import type {
  DataProvenance,
  DeepHardwareInventory,
  FutureTargetYear,
  GameItem,
  HardwareDbEntry,
  HardwareMonitorSnapshot,
  HealthAssessmentReport,
} from '../../types';
import {
  computeFutureProjection,
  evaluateCatalogGamesOnCurrentPc,
} from '../../services/hardwareIntelligence';
import { ExpandablePanel, ProvenanceTag } from './SharedIntelligenceUi';

interface CompatibilityUpgradeAdvisorPanelProps {
  snapshot: HardwareMonitorSnapshot;
  inventory: DeepHardwareInventory;
  assessment: HealthAssessmentReport;
  dbEntries: HardwareDbEntry[];
  catalogGames: GameItem[];
  userPsuWatts: number | null;
  onChangeUserPsuWatts: (watts: number | null) => void;
  provenanceLabels: Record<DataProvenance, string>;
  t: Record<string, string>;
}

const FUTURE_YEARS: Array<{ year: FutureTargetYear; label: string }> = [
  { year: 2027, label: '2027' },
  { year: 2028, label: '2028' },
  { year: 2029, label: '2029' },
  { year: 2030, label: '2030' },
  { year: 2032, label: 'Beyond 2030' },
];

export function CompatibilityUpgradeAdvisorPanel({
  snapshot,
  inventory,
  assessment,
  dbEntries,
  catalogGames,
  userPsuWatts,
  onChangeUserPsuWatts,
  provenanceLabels,
  t,
}: CompatibilityUpgradeAdvisorPanelProps) {
  const [targetYear, setTargetYear] = useState<FutureTargetYear>(2030);
  const [gameQuery, setGameQuery] = useState('');
  const [psuDraft, setPsuDraft] = useState(userPsuWatts ? String(userPsuWatts) : '');

  const futureProjection = useMemo(
    () =>
      computeFutureProjection({
        targetYear,
        snapshot,
        inventory,
        dbEntries,
      }),
    [targetYear, snapshot, inventory, dbEntries]
  );

  const catalogChecks = useMemo(
    () =>
      evaluateCatalogGamesOnCurrentPc({
        games: catalogGames,
        snapshot,
        inventory,
        searchQuery: gameQuery,
      }),
    [catalogGames, snapshot, inventory, gameQuery]
  );

  const handleApplyPsu = () => {
    const parsed = Number(psuDraft.trim());
    if (!psuDraft.trim() || !Number.isFinite(parsed) || parsed < 150) {
      onChangeUserPsuWatts(null);
      return;
    }
    onChangeUserPsuWatts(Math.round(parsed));
  };

  return (
    <div className="space-y-4">
      {/* 1. Future Compatibility & 2030+ Advisor */}
      <ExpandablePanel
        title={t.future2030Title}
        subtitle={t.future2030Subtitle}
        icon={<CalendarCheck weight="duotone" className="w-4.5 h-4.5" />}
        rightSlot={
          <div className="flex flex-wrap items-center gap-1.5">
            {FUTURE_YEARS.map((fy) => {
              const active = targetYear === fy.year;
              return (
                <button
                  key={fy.year}
                  type="button"
                  onClick={() => setTargetYear(fy.year)}
                  className={`px-2.5 py-1 rounded-md text-[11.5px] font-semibold border transition-colors cursor-pointer whitespace-nowrap ${
                    active
                      ? 'bg-[#0284c7] dark:bg-[#0ea5e9] border-[#0284c7] text-white'
                      : 'bg-slate-50 dark:bg-[#10151c] border-slate-200 dark:border-white/[0.08] text-slate-700 dark:text-[#cbd5e1] hover:bg-slate-100 dark:hover:bg-[#1e2633]'
                  }`}
                >
                  {fy.label}
                </button>
              );
            })}
          </div>
        }
      >
        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg bg-slate-50 dark:bg-[#10151c] border border-slate-200/80 dark:border-white/[0.06] p-3.5">
            <div>
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-[#8b9bb4]">
                {t.futureProjectedVerdict} ({targetYear === 2032 ? '2030+' : targetYear})
              </span>
              <div className="text-[18px] font-display font-bold text-slate-900 dark:text-white">
                {futureProjection.overallVerdict}
              </div>
            </div>
            <div dir="ltr" className="text-[22px] font-mono-tabular font-bold text-[#0284c7] dark:text-[#38bdf8]">
              {futureProjection.readinessScore !== null ? `${futureProjection.readinessScore} / 100` : t.naValue}
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div className="rounded-lg bg-emerald-50/50 dark:bg-emerald-500/[0.05] border border-emerald-200/80 dark:border-emerald-400/20 p-3.5 space-y-1.5">
              <h4 className="text-[12px] font-bold uppercase tracking-wider text-emerald-700 dark:text-[#34d399]">
                {t.futureVerifiedFactsTitle}
              </h4>
              <ul className="space-y-1 text-[12px] text-slate-700 dark:text-[#d5e0ee] list-disc list-inside">
                {futureProjection.verifiedFacts.map((fact, i) => (
                  <li key={i}>{fact}</li>
                ))}
              </ul>
            </div>

            <div className="rounded-lg bg-amber-50/60 dark:bg-amber-500/[0.05] border border-amber-200/80 dark:border-amber-400/20 p-3.5 space-y-1.5">
              <h4 className="text-[12px] font-bold uppercase tracking-wider text-amber-700 dark:text-amber-300">
                {t.futureForwardEstimatesTitle}
              </h4>
              <ul className="space-y-1 text-[12px] text-slate-700 dark:text-[#d5e0ee] list-disc list-inside">
                {futureProjection.forwardEstimates.map((est, i) => (
                  <li key={i}>{est}</li>
                ))}
              </ul>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-5 gap-2.5">
            {futureProjection.workloadForecasts.map((wf) => {
              const tone =
                wf.outlook === 'Strong'
                  ? 'text-emerald-600 dark:text-[#34d399]'
                  : wf.outlook === 'Adequate'
                  ? 'text-[#0284c7] dark:text-[#38bdf8]'
                  : wf.outlook === 'Strained'
                  ? 'text-amber-600 dark:text-[#fbbf24]'
                  : 'text-rose-600 dark:text-[#fb7185]';
              return (
                <div
                  key={wf.name}
                  className="sa-ps5-subpanel rounded-lg bg-slate-50 dark:bg-[#10151c] border border-slate-200/80 dark:border-white/[0.06] p-3 space-y-1"
                >
                  <div className="text-[12px] font-bold text-slate-900 dark:text-white">{wf.name}</div>
                  <div className={`text-[12px] font-bold uppercase ${tone}`}>{wf.outlook}</div>
                  <p className="text-[11px] text-slate-600 dark:text-[#9cb0c9] leading-snug">{wf.reason}</p>
                </div>
              );
            })}
          </div>
        </div>
      </ExpandablePanel>

      {/* 2. Smart Upgrade Advisor (Compatibility-Verified + Optional PSU Wattage Input) */}
      <ExpandablePanel
        title={t.upgradeAdvisorTitle}
        subtitle={t.upgradeAdvisorSubtitle}
        icon={<Lightbulb weight="duotone" className="w-4.5 h-4.5" />}
      >
        <div className="space-y-4">
          {inventory.system.formFactor !== 'laptop' && (
            <div className="flex flex-wrap items-center gap-2.5 rounded-lg bg-slate-50 dark:bg-[#10151c] border border-slate-200/80 dark:border-white/[0.06] p-3">
              <label className="text-[12px] font-semibold text-slate-700 dark:text-[#cbd5e1] flex items-center gap-2">
                <span>{t.psuWattageInputLabel}:</span>
                <input
                  type="number"
                  min={150}
                  max={2500}
                  value={psuDraft}
                  onChange={(e) => setPsuDraft(e.target.value)}
                  placeholder="e.g. 650"
                  dir="ltr"
                  className="w-28 min-h-[34px] px-2.5 py-1 rounded-md bg-white dark:bg-[#171d25] border border-slate-200 dark:border-white/[0.12] text-[12px] font-mono-tabular text-slate-900 dark:text-white focus:border-[#0284c7] focus:outline-none"
                />
              </label>
              <button
                type="button"
                onClick={handleApplyPsu}
                className="min-h-[34px] px-3 py-1 rounded-md bg-[#0284c7] hover:bg-[#0369a1] text-white text-[12px] font-semibold cursor-pointer transition-colors"
              >
                {t.psuApplyBtn}
              </button>
              <span className="text-[11.5px] text-slate-500 dark:text-[#8b9bb4]">{t.psuOptionalHint}</span>
            </div>
          )}

          {assessment.upgradeRecommendations.length === 0 ? (
            <div className="rounded-lg bg-emerald-50/70 dark:bg-emerald-500/[0.08] border border-emerald-200 dark:border-emerald-400/25 p-3.5 text-[12.5px] text-emerald-800 dark:text-[#34d399]">
              {t.upgradeNoneNeeded}
            </div>
          ) : (
            <div className="space-y-3">
              {assessment.upgradeRecommendations.map((u) => (
                <div
                  key={u.id}
                  className="sa-ps5-subpanel rounded-lg bg-slate-50 dark:bg-[#10151c] border border-slate-200/80 dark:border-white/[0.06] p-4 space-y-2"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <span className="text-[11px] font-bold uppercase tracking-wider text-[#0284c7] dark:text-[#38bdf8]">
                        {u.priority} Priority · {u.component}
                      </span>
                      <h4 className="text-[14px] font-bold text-slate-900 dark:text-white">{u.recommendedUpgrade}</h4>
                    </div>
                    <span
                      className={`text-[11px] font-bold uppercase ${
                        u.compatibilityVerified
                          ? 'text-emerald-600 dark:text-[#34d399]'
                          : 'text-amber-600 dark:text-amber-300'
                      }`}
                    >
                      {u.compatibilityVerified ? t.compatVerified : t.compatCheckNeeded}
                    </span>
                  </div>
                  <div className="text-[12px] text-slate-600 dark:text-[#9cb0c9]">
                    <strong>Current:</strong> {u.currentItem}
                  </div>
                  <p className="text-[12px] text-slate-700 dark:text-[#d5e0ee]">{u.whyRecommended}</p>
                  <p className="text-[12px] text-emerald-700 dark:text-[#34d399]">
                    <strong>Benefit:</strong> {u.expectedBenefit}
                  </p>
                  <p className="text-[11.5px] text-slate-500 dark:text-[#8b9bb4]">
                    <strong>Compatibility:</strong> {u.compatibilityNotes}
                  </p>
                  {u.prerequisites.length > 0 && (
                    <ul className="text-[11.5px] text-slate-500 dark:text-[#8b9bb4] list-disc list-inside">
                      {u.prerequisites.map((pre, i) => (
                        <li key={i}>{pre}</li>
                      ))}
                    </ul>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </ExpandablePanel>

      {/* 3. Gaming Compatibility & Catalog Checker */}
      <ExpandablePanel
        title={t.gamingCompatTitle}
        subtitle={t.gamingCompatSubtitle}
        icon={<GameController weight="duotone" className="w-4.5 h-4.5" />}
      >
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3">
            {assessment.gamingSuitability.resolutions.map((r) => (
              <div
                key={r.resolution}
                className="sa-ps5-subpanel rounded-lg bg-slate-50 dark:bg-[#10151c] border border-slate-200/80 dark:border-white/[0.06] p-3.5 space-y-1"
              >
                <div className="flex items-center justify-between">
                  <span dir="ltr" className="text-[14px] font-bold font-mono-tabular text-slate-900 dark:text-white">
                    {r.resolution}
                  </span>
                  <span className="text-[11.5px] font-bold text-[#0284c7] dark:text-[#38bdf8]">{r.verdict}</span>
                </div>
                <div className="text-[12px] font-semibold text-slate-700 dark:text-[#d5e0ee]">{r.recommendedPreset}</div>
                <p className="text-[11.5px] text-slate-500 dark:text-[#8b9bb4] leading-snug">{r.notes}</p>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-2.5">
            {assessment.gamingSuitability.featureMatrix.map((f) => (
              <div
                key={f.name}
                className="rounded-lg bg-slate-50 dark:bg-[#10151c] border border-slate-200/80 dark:border-white/[0.06] px-3 py-2 flex items-center justify-between gap-2"
              >
                <div className="min-w-0">
                  <div className="text-[11.5px] text-slate-500 dark:text-[#8b9bb4] truncate">{f.name}</div>
                  <div className="text-[12px] font-semibold text-slate-900 dark:text-white truncate">{f.status}</div>
                </div>
                <ProvenanceTag provenance={f.provenance} labels={provenanceLabels} />
              </div>
            ))}
          </div>

          {/* Catalog Game Compatibility Search */}
          {catalogGames.length > 0 && (
            <div className="pt-2 border-t border-slate-100 dark:border-white/[0.06] space-y-2.5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h4 className="text-[12.5px] font-bold uppercase tracking-wider text-slate-500 dark:text-[#8b9bb4]">
                  {t.catalogGamesCheckTitle}
                </h4>
                <input
                  type="search"
                  value={gameQuery}
                  onChange={(e) => setGameQuery(e.target.value)}
                  placeholder={t.catalogSearchPlaceholder}
                  className="min-h-[34px] px-3 py-1 rounded-lg bg-slate-50 dark:bg-[#10151c] border border-slate-200 dark:border-white/[0.12] text-[12px] text-slate-900 dark:text-white placeholder:text-slate-400 focus:border-[#0284c7] focus:outline-none w-full sm:w-64"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-2.5">
                {catalogChecks.map(({ game, evaluation }) => {
                  const tone =
                    evaluation.status === 'can-run'
                      ? 'text-emerald-600 dark:text-[#34d399]'
                      : evaluation.status === 'cannot-run'
                      ? 'text-rose-600 dark:text-[#fb7185]'
                      : 'text-slate-500 dark:text-[#8b9bb4]';
                  return (
                    <div
                      key={game.id}
                      className="rounded-lg bg-slate-50 dark:bg-[#10151c] border border-slate-200/80 dark:border-white/[0.06] px-3 py-2.5 flex items-center justify-between gap-2"
                    >
                      <div className="min-w-0">
                        <div className="text-[12.5px] font-bold text-slate-900 dark:text-white truncate">
                          {game.name}
                        </div>
                        <div className="text-[11px] text-slate-500 dark:text-[#8b9bb4] truncate">
                          {evaluation.summaryText}
                        </div>
                      </div>
                      <span className={`text-[11px] font-bold whitespace-nowrap shrink-0 ${tone}`}>
                        {evaluation.shortBadge}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </ExpandablePanel>

      {/* 4. Professional Software & Maintenance Advisories */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <ExpandablePanel
          title={t.proCompatTitle}
          icon={<Briefcase weight="duotone" className="w-4.5 h-4.5" />}
          defaultExpanded={false}
        >
          <div className="space-y-2.5">
            {assessment.proCompatibility.map((p) => (
              <div
                key={p.workload}
                className="rounded-lg bg-slate-50 dark:bg-[#10151c] border border-slate-200/80 dark:border-white/[0.06] p-3 space-y-1"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[13px] font-bold text-slate-900 dark:text-white">{p.workload}</span>
                  <span className="text-[11.5px] font-bold text-[#0284c7] dark:text-[#38bdf8]">{p.verdict}</span>
                </div>
                <p className="text-[11.5px] text-slate-600 dark:text-[#9cb0c9]">{p.reason}</p>
              </div>
            ))}
          </div>
        </ExpandablePanel>

        <ExpandablePanel
          title={t.maintenanceTitle}
          subtitle={t.maintenanceSafetyNote}
          icon={<Wrench weight="duotone" className="w-4.5 h-4.5" />}
          defaultExpanded={false}
        >
          <div className="space-y-2.5">
            {assessment.maintenanceAdvisories.map((m) => (
              <div
                key={m.id}
                className="rounded-lg bg-slate-50 dark:bg-[#10151c] border border-slate-200/80 dark:border-white/[0.06] p-3 space-y-1.5"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[13px] font-bold text-slate-900 dark:text-white">{m.title}</span>
                  <span
                    className={`text-[11px] font-bold uppercase ${
                      m.priority === 'Critical'
                        ? 'text-rose-600 dark:text-[#fb7185]'
                        : m.priority === 'High'
                        ? 'text-amber-600 dark:text-[#fbbf24]'
                        : 'text-[#0284c7] dark:text-[#38bdf8]'
                    }`}
                  >
                    {m.priority}
                  </span>
                </div>
                <p className="text-[11.5px] text-slate-600 dark:text-[#9cb0c9]">{m.whyItMatters}</p>
                <ul className="text-[11.5px] text-slate-700 dark:text-[#d5e0ee] list-disc list-inside space-y-0.5">
                  {m.steps.map((s, i) => (
                    <li key={i}>{s}</li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </ExpandablePanel>
      </div>
    </div>
  );
}
