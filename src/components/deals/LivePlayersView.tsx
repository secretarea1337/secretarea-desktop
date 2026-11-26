import { useMemo, useState } from 'react';
import {
  ArrowDownRight,
  ArrowSquareOut,
  ArrowUpRight,
  Bell,
  BellRinging,
  ChartLineUp,
  Info,
  MagnifyingGlass,
  Scales,
  TrendDown,
  TrendUp,
  Users,
} from '@phosphor-icons/react';
import { resolveDisplayPrice } from '../../deals/currencyService';
import type {
  CensusMoverEntry,
  DealsCurrencyCode,
  ExchangeRateSnapshot,
  GameHealthTier,
  LiveIntelligenceSnapshot,
  SteamLiveRankEntry,
} from '../../deals/types';
import type { AppThemeMode } from '../../services/launcherSettings';
import { MiniTrendSparkline } from './IntelligenceCharts';

type LiveSubTab = 'top100' | 'gainers' | 'decliners' | 'review-movers';

interface LivePlayersViewProps {
  snapshot: LiveIntelligenceSnapshot | null;
  isLoading: boolean;
  locale: string;
  activeTheme: AppThemeMode;
  selectedCurrency: DealsCurrencyCode;
  fxSnapshot: ExchangeRateSnapshot | null;
  comparedKeys: Set<string>;
  followedKeys: Set<string>;
  labels: {
    livePlayersTitle: string;
    livePlayersSubtitle: string;
    liveTabTop100: string;
    liveTabGainers: string;
    liveTabDecliners: string;
    liveTabReviewMovers: string;
    liveSearchPlaceholder: string;
    liveColRank: string;
    liveColGame: string;
    liveColPlayers: string;
    liveColPeak24h: string;
    liveColChange24h: string;
    liveColTrend7d: string;
    liveColPrice: string;
    liveColActions: string;
    healthLegendTitle: string;
    healthLegendDesc: string;
    healthTiers: Record<GameHealthTier, string>;
    compareAddBtn: string;
    compareAddedBadge: string;
    alertsFollowBtn: string;
    alertsFollowingBadge: string;
    freeBadge: string;
    noChartData: string;
  };
  onOpenGameByLiveEntry: (entry: SteamLiveRankEntry) => void;
  onOpenGameByAppId: (appId: string, title: string) => void;
  onToggleCompareLive: (entry: SteamLiveRankEntry) => void;
  onToggleAlertLive: (entry: SteamLiveRankEntry) => void;
  onOpenExternal: (url: string) => void;
}

const HEALTH_COLOR: Record<GameHealthTier, string> = {
  thriving: 'text-emerald-600 dark:text-[#4ade80]',
  healthy: 'text-sky-600 dark:text-[#38bdf8]',
  cooling: 'text-amber-600 dark:text-amber-300',
  quiet: 'text-slate-500 dark:text-[#9cb0c9]',
  dormant: 'text-rose-500 dark:text-rose-400',
  unknown: 'text-slate-400 dark:text-[#788ca8]',
};

export function LivePlayersView({
  snapshot,
  isLoading,
  locale,
  activeTheme,
  selectedCurrency,
  fxSnapshot,
  comparedKeys,
  followedKeys,
  labels,
  onOpenGameByLiveEntry,
  onOpenGameByAppId,
  onToggleCompareLive,
  onToggleAlertLive,
  onOpenExternal,
}: LivePlayersViewProps) {
  const [subTab, setSubTab] = useState<LiveSubTab>('top100');
  const [query, setQuery] = useState('');

  const isXbox = activeTheme === 'xbox';
  const isPs5 = activeTheme === 'ps5';

  const panelClass = isXbox
    ? 'bg-[#081a0b]/85 border-[#52e042]/24'
    : isPs5
    ? 'bg-[#061533]/80 border-white/[0.14]'
    : 'bg-white dark:bg-[#151c25] border-slate-200 dark:border-white/[0.08] shadow-sm dark:shadow-none';

  const activeRows = useMemo(() => {
    if (!snapshot) return [];
    const base =
      subTab === 'top100'
        ? snapshot.topPlayers
        : subTab === 'gainers'
        ? snapshot.biggestGains
        : snapshot.biggestDeclines;

    const q = query.trim().toLowerCase();
    if (!q) return base;
    return base.filter(
      (r) => r.title.toLowerCase().includes(q) || r.appId.includes(q)
    );
  }, [query, snapshot, subTab]);

  const filteredCensusMovers = useMemo(() => {
    if (!snapshot) return { rising: [] as CensusMoverEntry[], falling: [] as CensusMoverEntry[] };
    const q = query.trim().toLowerCase();
    const match = (m: CensusMoverEntry) =>
      !q || m.title.toLowerCase().includes(q) || m.appId.includes(q);
    return {
      rising: snapshot.censusRising.filter(match),
      falling: snapshot.censusFalling.filter(match),
    };
  }, [query, snapshot]);

  return (
    <div className="space-y-5">
      {/* Header + Sub-tabs + Filter */}
      <div className={`sa-ps5-panel rounded-2xl border p-4 sm:p-5 space-y-4 ${panelClass}`}>
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <Users className="w-5 h-5 text-sky-500 shrink-0" />
              <h2 className="font-display text-lg font-bold text-slate-900 dark:text-white">
                {labels.livePlayersTitle}
              </h2>
            </div>
            <p className="text-[12.5px] text-slate-500 dark:text-[#8b9bb4]">
              {labels.livePlayersSubtitle}
            </p>
          </div>

          <div className="relative w-full lg:w-72">
            <MagnifyingGlass className="w-4 h-4 text-slate-400 absolute start-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={labels.liveSearchPlaceholder}
              className="w-full min-h-[38px] ps-9 pe-3 rounded-lg border border-slate-200 dark:border-white/[0.1] bg-slate-50 dark:bg-[#10161e] text-[12.5px] text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#0284c7]"
            />
          </div>
        </div>

        <div
          className={`inline-flex flex-wrap items-center gap-1 p-1 rounded-xl border ${
            isXbox
              ? 'bg-[#061609]/85 border-[#52e042]/22'
              : isPs5
              ? 'bg-[#04112b]/85 border-white/[0.12]'
              : 'bg-slate-100/90 dark:bg-[#0e141c] border-slate-200/80 dark:border-white/[0.08]'
          }`}
        >
          {(
            [
              { id: 'top100', label: labels.liveTabTop100, icon: Users },
              { id: 'gainers', label: labels.liveTabGainers, icon: TrendUp },
              { id: 'decliners', label: labels.liveTabDecliners, icon: TrendDown },
              { id: 'review-movers', label: labels.liveTabReviewMovers, icon: ChartLineUp },
            ] as const
          ).map((tab) => {
            const Icon = tab.icon;
            const active = subTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                aria-pressed={active}
                onClick={() => setSubTab(tab.id)}
                className={`inline-flex items-center gap-1.5 h-8 px-3 rounded-lg text-[12.5px] font-semibold transition-all duration-150 whitespace-nowrap cursor-pointer active:scale-[0.98] ${
                  active
                    ? isXbox
                      ? 'bg-[#107C10] text-white shadow-xs'
                      : isPs5
                      ? 'bg-[#0070d1] text-white shadow-xs'
                      : 'bg-white dark:bg-[#1b2533] text-slate-900 dark:text-white shadow-xs ring-1 ring-slate-200/80 dark:ring-white/[0.1]'
                    : 'text-slate-600 dark:text-[#8fa3bd] hover:text-slate-900 dark:hover:text-white hover:bg-white/60 dark:hover:bg-white/[0.05]'
                }`}
              >
                <Icon weight={active ? 'fill' : 'regular'} className="w-4 h-4 shrink-0" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Loading skeleton */}
      {isLoading && !snapshot ? (
        <div className={`sa-ps5-panel rounded-2xl border p-6 space-y-3 animate-pulse ${panelClass}`}>
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="h-12 rounded-lg bg-slate-200 dark:bg-white/[0.06]" />
          ))}
        </div>
      ) : subTab === 'review-movers' ? (
        <div className="space-y-4">
          {/* Health Methodology Info Callout */}
          <div className={`sa-ps5-panel rounded-2xl border p-4 flex items-start gap-3 ${panelClass}`}>
            <Info className="w-5 h-5 text-sky-500 shrink-0 mt-0.5" />
            <div className="space-y-1 text-[12px]">
              <div className="font-bold text-slate-900 dark:text-white">
                {labels.healthLegendTitle}
              </div>
              <p className="text-slate-600 dark:text-[#9cb0c9]">{labels.healthLegendDesc}</p>
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 pt-1 font-semibold">
                {(['thriving', 'healthy', 'cooling', 'quiet', 'dormant'] as const).map((tier) => (
                  <span key={tier} className={HEALTH_COLOR[tier]}>
                    {labels.healthTiers[tier]}
                  </span>
                ))}
                <button
                  type="button"
                  onClick={() => onOpenExternal('https://thegamecensus.com/data')}
                  className="text-sky-600 dark:text-sky-400 hover:underline inline-flex items-center gap-1 cursor-pointer"
                >
                  <span>The Game Census (CC BY 4.0)</span>
                  <ArrowSquareOut className="w-3 h-3" />
                </button>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
            {[
              { title: labels.liveTabGainers, items: filteredCensusMovers.rising, rising: true },
              { title: labels.liveTabDecliners, items: filteredCensusMovers.falling, rising: false },
            ].map((col) => (
              <div key={col.title} className={`sa-ps5-panel rounded-2xl border p-4 space-y-3 ${panelClass}`}>
                <h3 className="font-display text-base font-bold flex items-center gap-2">
                  {col.rising ? (
                    <TrendUp className="w-4 h-4 text-emerald-500" />
                  ) : (
                    <TrendDown className="w-4 h-4 text-rose-500" />
                  )}
                  <span>{col.title}</span>
                </h3>
                <div className="divide-y divide-slate-200/80 dark:divide-white/[0.06]">
                  {col.items.map((m) => (
                    <div
                      key={`${col.title}-${m.appId}`}
                      onClick={() => onOpenGameByAppId(m.appId, m.title)}
                      role="button"
                      tabIndex={0}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          onOpenGameByAppId(m.appId, m.title);
                        }
                      }}
                      className="py-2.5 flex items-center justify-between gap-3 hover:bg-slate-50 dark:hover:bg-white/[0.03] px-2 rounded-lg cursor-pointer"
                    >
                      <div className="min-w-0">
                        <div className="font-semibold text-[13px] text-slate-900 dark:text-white truncate">
                          {m.title}
                        </div>
                        <div className="flex items-center gap-2 text-[11.5px] font-mono-tabular">
                          <span className={HEALTH_COLOR[m.healthTier]}>
                            {labels.healthTiers[m.healthTier]}
                          </span>
                          {m.ccuLatest !== null && (
                            <span dir="ltr" className="text-slate-500 dark:text-[#8b9bb4]">
                              · {m.ccuLatest.toLocaleString(locale)} CCU
                            </span>
                          )}
                          {m.recentReviews != null && m.baselineReviews != null && (
                            <span dir="ltr" className="text-slate-500 dark:text-[#8b9bb4]">
                              · {m.recentReviews.toLocaleString(locale)} vs {m.baselineReviews.toLocaleString(locale)}
                            </span>
                          )}
                        </div>
                      </div>
                      <div dir="ltr" className="text-end font-mono-tabular shrink-0">
                        {m.deltaPct != null ? (
                          <div
                            className={`text-[12.5px] font-bold ${
                              m.deltaPct >= 0
                                ? 'text-emerald-600 dark:text-emerald-400'
                                : 'text-rose-600 dark:text-rose-400'
                            }`}
                          >
                            {m.deltaPct >= 0 ? `+${m.deltaPct.toLocaleString(locale)}%` : `${m.deltaPct.toLocaleString(locale)}%`}
                          </div>
                        ) : m.positiveRatio !== null ? (
                          <div className="text-[12.5px] font-bold text-slate-900 dark:text-white">
                            {Math.round(m.positiveRatio * 100)}% pos
                          </div>
                        ) : null}
                        {(m.positiveVelocity > 0 || m.negativeVelocity > 0) && (
                          <div className="text-[11px] text-slate-500 dark:text-[#8b9bb4]">
                            {m.recentReviews != null
                              ? `${m.recentReviews.toLocaleString(locale)} rev`
                              : `+${m.positiveVelocity} / -${m.negativeVelocity}`}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                  {col.items.length === 0 && (
                    <div className="py-6 text-center text-[12.5px] text-slate-500">
                      {labels.noChartData}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className={`sa-ps5-panel rounded-2xl border overflow-hidden ${panelClass}`}>
          <div className="overflow-x-auto">
            <table className="w-full text-start border-collapse">
              <thead>
                <tr className="border-b border-slate-200 dark:border-white/[0.08] bg-slate-50/90 dark:bg-[#10161e] text-[11.5px] font-semibold text-slate-500 dark:text-[#8b9bb4]">
                  <th className="py-3 px-2.5 sm:px-3.5 text-start w-10 sm:w-14">{labels.liveColRank}</th>
                  <th className="py-3 px-2.5 sm:px-3 text-start">{labels.liveColGame}</th>
                  <th className="py-3 px-2 sm:px-3 text-end whitespace-nowrap">{labels.liveColPlayers}</th>
                  <th className="py-3 px-3 text-end whitespace-nowrap hidden md:table-cell">{labels.liveColPeak24h}</th>
                  <th className="py-3 px-2 sm:px-3 text-end whitespace-nowrap">{labels.liveColChange24h}</th>
                  <th className="py-3 px-3 text-center whitespace-nowrap hidden sm:table-cell">{labels.liveColTrend7d}</th>
                  <th className="py-3 px-3 text-end whitespace-nowrap hidden lg:table-cell">{labels.liveColPrice}</th>
                  <th className="py-3 px-2.5 sm:px-3.5 text-end whitespace-nowrap">{labels.liveColActions}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200/75 dark:divide-white/[0.06] text-[12.5px] sm:text-[13px]">
                {activeRows.map((entry, idx) => {
                  const pctChange =
                    typeof entry.dayChangeFraction === 'number'
                      ? entry.dayChangeFraction * 100
                      : null;
                  const isUp = (pctChange ?? 0) >= 0;
                  const compareKey = `steam:${entry.appId}`;
                  const isCompared = comparedKeys.has(compareKey);
                  const isFollowed = followedKeys.has(`steam:${entry.appId}:base`);

                  const priceDisplay =
                    entry.salePriceUsd !== null
                      ? resolveDisplayPrice({
                          amount: entry.salePriceUsd,
                          sourceCurrency: 'USD',
                          targetCurrency: selectedCurrency,
                          fxSnapshot,
                          locale,
                          freeLabel: labels.freeBadge,
                        })
                      : null;

                  return (
                    <tr
                      key={entry.appId}
                      onClick={() => onOpenGameByLiveEntry(entry)}
                      className="hover:bg-slate-50 dark:hover:bg-white/[0.03] transition-colors cursor-pointer"
                    >
                      <td dir="ltr" className="py-2.5 px-2.5 sm:px-3.5 font-mono-tabular font-bold text-slate-500 dark:text-[#8b9bb4]">
                        #{entry.rank > 0 ? entry.rank : idx + 1}
                      </td>
                      <td className="py-2.5 px-2.5 sm:px-3 min-w-[140px] sm:min-w-[200px]">
                        <div className="flex items-center gap-2 sm:gap-3 min-w-0">
                          {entry.headerImage && (
                            <img
                              src={entry.headerImage}
                              alt={entry.title}
                              loading="lazy"
                              referrerPolicy="no-referrer"
                              className="w-11 h-6 sm:w-16 sm:h-9 rounded object-cover shrink-0 bg-slate-200 dark:bg-[#0e141b]"
                            />
                          )}
                          <div className="min-w-0">
                            <div className="font-semibold text-slate-900 dark:text-white truncate max-w-[130px] xs:max-w-[180px] sm:max-w-[260px]">
                              {entry.title}
                            </div>
                            <div className="text-[11px] font-mono-tabular text-slate-500 dark:text-[#8b9bb4] flex items-center gap-1.5">
                              <span>App #{entry.appId}</span>
                              {entry.onSalePercent ? (
                                <span className="text-emerald-600 dark:text-[#4ade80] font-bold">
                                  · -{entry.onSalePercent}%
                                </span>
                              ) : null}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td dir="ltr" className="py-2.5 px-2 sm:px-3 text-end font-mono-tabular font-bold text-slate-900 dark:text-white whitespace-nowrap">
                        {entry.currentPlayers.toLocaleString(locale)}
                      </td>
                      <td dir="ltr" className="py-2.5 px-3 text-end font-mono-tabular text-slate-600 dark:text-[#9cb0c9] whitespace-nowrap hidden md:table-cell">
                        {entry.peak24h !== null ? entry.peak24h.toLocaleString(locale) : '—'}
                      </td>
                      <td dir="ltr" className="py-2.5 px-3 text-end font-mono-tabular whitespace-nowrap">
                        {pctChange !== null ? (
                          <span
                            className={`inline-flex items-center gap-0.5 font-semibold ${
                              isUp
                                ? 'text-emerald-600 dark:text-[#4ade80]'
                                : 'text-rose-600 dark:text-rose-400'
                            }`}
                          >
                            {isUp ? (
                              <ArrowUpRight className="w-3.5 h-3.5" />
                            ) : (
                              <ArrowDownRight className="w-3.5 h-3.5" />
                            )}
                            {pctChange >= 0 ? '+' : ''}
                            {pctChange.toFixed(1)}%
                          </span>
                        ) : (
                          <span className="text-slate-400">—</span>
                        )}
                      </td>
                      <td className="py-2.5 px-3 hidden sm:table-cell">
                        <div className="flex justify-center">
                          <MiniTrendSparkline
                            values={entry.trendSpark}
                            positive={isUp}
                            activeTheme={activeTheme}
                          />
                        </div>
                      </td>
                      <td dir="ltr" className="py-2.5 px-3 text-end font-mono-tabular whitespace-nowrap hidden lg:table-cell">
                        {priceDisplay ? (
                          <span className="font-semibold text-emerald-600 dark:text-[#4ade80]">
                            {priceDisplay.formatted}
                          </span>
                        ) : (
                          <span className="text-slate-400">—</span>
                        )}
                      </td>
                      <td
                        className="py-2.5 px-3.5 text-end whitespace-nowrap"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <div className="inline-flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => onToggleCompareLive(entry)}
                            title={isCompared ? labels.compareAddedBadge : labels.compareAddBtn}
                            className={`p-1.5 rounded-lg border transition-colors cursor-pointer ${
                              isCompared
                                ? 'bg-sky-500 text-white border-sky-500'
                                : 'bg-slate-100 hover:bg-slate-200 dark:bg-white/[0.06] dark:hover:bg-white/[0.12] border-slate-200 dark:border-white/[0.08] text-slate-600 dark:text-[#cbd6e4]'
                            }`}
                          >
                            <Scales className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => onToggleAlertLive(entry)}
                            title={isFollowed ? labels.alertsFollowingBadge : labels.alertsFollowBtn}
                            className={`p-1.5 rounded-lg border transition-colors cursor-pointer ${
                              isFollowed
                                ? 'bg-amber-500 text-white border-amber-500'
                                : 'bg-slate-100 hover:bg-slate-200 dark:bg-white/[0.06] dark:hover:bg-white/[0.12] border-slate-200 dark:border-white/[0.08] text-slate-600 dark:text-[#cbd6e4]'
                            }`}
                          >
                            {isFollowed ? (
                              <BellRinging weight="fill" className="w-3.5 h-3.5" />
                            ) : (
                              <Bell className="w-3.5 h-3.5" />
                            )}
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="px-4 py-2.5 border-t border-slate-200 dark:border-white/[0.08] flex flex-wrap items-center justify-between gap-2 text-[11.5px] text-slate-500 dark:text-[#8b9bb4]">
            <span>
              Sources:{' '}
              <button
                type="button"
                onClick={() => onOpenExternal('https://steamdata.dev/')}
                className="underline hover:text-slate-900 dark:hover:text-white cursor-pointer"
              >
                SteamData
              </button>
              {' · '}
              <button
                type="button"
                onClick={() => onOpenExternal('https://store.steampowered.com/charts/mostplayed')}
                className="underline hover:text-slate-900 dark:hover:text-white cursor-pointer"
              >
                Steam Charts
              </button>
              {' · '}
              <button
                type="button"
                onClick={() => onOpenExternal('https://thegamecensus.com/data')}
                className="underline hover:text-slate-900 dark:hover:text-white cursor-pointer"
              >
                The Game Census (CC BY 4.0)
              </button>
            </span>
            {snapshot?.fetchedAt && (
              <span dir="ltr" className="font-mono-tabular">
                {new Date(snapshot.fetchedAt).toLocaleTimeString(locale)}
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
