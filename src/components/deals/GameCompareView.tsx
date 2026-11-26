import { useEffect, useState } from 'react';
import {
  MagnifyingGlass,
  Plus,
  Scales,
  SpinnerGap,
  Trash,
  X,
} from '@phosphor-icons/react';
import { resolveDisplayPrice } from '../../deals/currencyService';
import {
  loadGameIntelligenceDossier,
  searchIntelligenceGames,
  type DossierTargetInput,
  type IntelligenceSearchOption,
} from '../../deals/intelligenceAggregator';
import type {
  DealsCurrencyCode,
  DealsStoreInfo,
  ExchangeRateSnapshot,
  GameHealthTier,
  GameIntelligenceDossier,
} from '../../deals/types';
import type { AppThemeMode } from '../../services/launcherSettings';

export interface CompareSelectionItem extends DossierTargetInput {
  key: string;
  title: string;
}

interface GameCompareViewProps {
  selectedItems: CompareSelectionItem[];
  stores: DealsStoreInfo[];
  locale: string;
  activeTheme: AppThemeMode;
  selectedCurrency: DealsCurrencyCode;
  fxSnapshot: ExchangeRateSnapshot | null;
  labels: {
    compareTitle: string;
    compareSubtitle: string;
    compareSearchPlaceholder: string;
    compareAddBtn: string;
    compareRemoveBtn: string;
    compareClearBtn: string;
    compareEmptyTitle: string;
    compareEmptyDesc: string;
    compareMaxNotice: string;
    compareMetricCol: string;
    healthTiers: Record<GameHealthTier, string>;
    liveColPlayers: string;
    liveColPeak24h: string;
    liveColChange24h: string;
    healthStatusLabel: string;
    steamRatingCardTitle: string;
    metacriticScoreCardTitle: string;
    metacriticUserCardTitle: string;
    openCriticCardTitle: string;
    detailBestPriceLabel: string;
    detailHistoricalLowLabel: string;
    releaseDateLabel: string;
    developerLabel: string;
    freeBadge: string;
  };
  onAddSelection: (item: CompareSelectionItem) => void;
  onRemoveSelection: (key: string) => void;
  onClearAll: () => void;
}

export function GameCompareView({
  selectedItems,
  stores,
  locale,
  activeTheme,
  selectedCurrency,
  fxSnapshot,
  labels,
  onAddSelection,
  onRemoveSelection,
  onClearAll,
}: GameCompareViewProps) {
  const [searchInput, setSearchInput] = useState('');
  const [searchResults, setSearchResults] = useState<IntelligenceSearchOption[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  const [dossiers, setDossiers] = useState<Record<string, GameIntelligenceDossier>>({});
  const [loadingKeys, setLoadingKeys] = useState<Set<string>>(new Set());

  const isXbox = activeTheme === 'xbox';
  const isPs5 = activeTheme === 'ps5';
  const panelClass = isXbox
    ? 'bg-[#081a0b]/85 border-[#52e042]/24'
    : isPs5
    ? 'bg-[#061533]/80 border-white/[0.14]'
    : 'bg-white dark:bg-[#151c25] border-slate-200 dark:border-white/[0.08] shadow-sm dark:shadow-none';

  // Search debounced
  useEffect(() => {
    const q = searchInput.trim();
    if (!q) {
      setSearchResults([]);
      return;
    }
    const timer = window.setTimeout(() => {
      setIsSearching(true);
      void searchIntelligenceGames(q)
        .then(setSearchResults)
        .finally(() => setIsSearching(false));
    }, 340);
    return () => window.clearTimeout(timer);
  }, [searchInput]);

  // Fetch dossier for any newly added compare item
  useEffect(() => {
    for (const item of selectedItems) {
      if (dossiers[item.key] || loadingKeys.has(item.key)) continue;
      setLoadingKeys((prev) => new Set(prev).add(item.key));
      void loadGameIntelligenceDossier(item, stores, '7d')
        .then((dossier) => {
          setDossiers((prev) => ({ ...prev, [item.key]: dossier }));
        })
        .finally(() => {
          setLoadingKeys((prev) => {
            const next = new Set(prev);
            next.delete(item.key);
            return next;
          });
        });
    }
  }, [dossiers, loadingKeys, selectedItems, stores]);

  const formatMoneyUsd = (amount: number | null | undefined) => {
    if (amount === null || amount === undefined || !Number.isFinite(amount)) return '—';
    return resolveDisplayPrice({
      amount,
      sourceCurrency: 'USD',
      targetCurrency: selectedCurrency,
      fxSnapshot,
      locale,
      freeLabel: labels.freeBadge,
    }).formatted;
  };

  return (
    <div className="space-y-5">
      {/* Search & Controls */}
      <div className={`sa-ps5-panel rounded-2xl border p-4 sm:p-5 space-y-4 ${panelClass}`}>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <Scales className="w-5 h-5 text-sky-500 shrink-0" />
              <h2 className="font-display text-lg font-bold text-slate-900 dark:text-white">
                {labels.compareTitle}
              </h2>
            </div>
            <p className="text-[12.5px] text-slate-500 dark:text-[#8b9bb4]">
              {labels.compareSubtitle}
            </p>
          </div>

          {selectedItems.length > 0 && (
            <button
              type="button"
              onClick={onClearAll}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-rose-500/35 text-rose-600 dark:text-rose-400 hover:bg-rose-500/10 text-[12px] font-semibold cursor-pointer self-start sm:self-auto"
            >
              <Trash className="w-3.5 h-3.5" />
              <span>{labels.compareClearBtn}</span>
            </button>
          )}
        </div>

        {/* Add Game Search */}
        <div className="relative">
          <div className="relative flex items-center">
            <MagnifyingGlass className="w-4 h-4 text-slate-400 absolute start-3 pointer-events-none" />
            <input
              type="text"
              value={searchInput}
              disabled={selectedItems.length >= 4}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder={
                selectedItems.length >= 4
                  ? labels.compareMaxNotice
                  : labels.compareSearchPlaceholder
              }
              className="w-full min-h-[40px] ps-9 pe-9 rounded-xl border border-slate-200 dark:border-white/[0.1] bg-slate-50 dark:bg-[#10161e] text-[13px] text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#0284c7] disabled:opacity-55"
            />
            {isSearching && (
              <SpinnerGap className="w-4 h-4 text-sky-500 animate-spin absolute end-3" />
            )}
          </div>

          {searchResults.length > 0 && (
            <div className="mt-2 rounded-xl border border-slate-200 dark:border-white/[0.1] bg-white dark:bg-[#10161e] divide-y divide-slate-200/70 dark:divide-white/[0.06] max-h-64 overflow-y-auto shadow-lg">
              {searchResults.map((res) => {
                const alreadyAdded = selectedItems.some((s) => s.key === res.key);
                return (
                  <button
                    key={res.key}
                    type="button"
                    disabled={alreadyAdded || selectedItems.length >= 4}
                    onClick={() => {
                      onAddSelection({
                        key: res.key,
                        title: res.title,
                        steamAppId: res.steamAppId,
                        cheapsharkGameId: res.cheapsharkGameId,
                        thumbUrl: res.thumbUrl,
                      });
                      setSearchInput('');
                      setSearchResults([]);
                    }}
                    className="w-full px-3.5 py-2.5 flex items-center justify-between gap-3 text-start hover:bg-slate-50 dark:hover:bg-white/[0.04] disabled:opacity-45 cursor-pointer"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      {res.thumbUrl && (
                        <img
                          src={res.thumbUrl}
                          alt={res.title}
                          referrerPolicy="no-referrer"
                          className="w-12 h-7 rounded object-cover shrink-0"
                        />
                      )}
                      <div className="min-w-0">
                        <div className="text-[13px] font-semibold text-slate-900 dark:text-white truncate">
                          {res.title}
                        </div>
                        <div className="text-[11px] font-mono-tabular text-slate-500 dark:text-[#8b9bb4]">
                          {res.currentPlayers !== null
                            ? `${res.currentPlayers.toLocaleString(locale)} playing`
                            : res.steamAppId
                            ? `Steam #${res.steamAppId}`
                            : 'PC Game'}
                          {res.salePriceUsd !== null
                            ? ` · ${formatMoneyUsd(res.salePriceUsd)}`
                            : ''}
                        </div>
                      </div>
                    </div>
                    <Plus className="w-4 h-4 text-sky-500 shrink-0" />
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {selectedItems.length === 0 ? (
        <div className={`sa-ps5-panel rounded-2xl border p-10 text-center space-y-2.5 ${panelClass}`}>
          <Scales className="w-9 h-9 text-slate-400 mx-auto" />
          <h3 className="font-display text-base font-bold text-slate-900 dark:text-white">
            {labels.compareEmptyTitle}
          </h3>
          <p className="text-[13px] text-slate-500 dark:text-[#8b9bb4]">
            {labels.compareEmptyDesc}
          </p>
        </div>
      ) : (
        <div className={`sa-ps5-panel rounded-2xl border overflow-hidden ${panelClass}`}>
          <div className="overflow-x-auto">
            <table className="w-full text-start border-collapse">
              <thead>
                <tr className="border-b border-slate-200 dark:border-white/[0.08] bg-slate-50 dark:bg-[#10161e]">
                  <th className="p-2.5 sm:p-3.5 text-start text-[12px] font-bold text-slate-500 dark:text-[#8b9bb4] w-28 sm:w-44 md:w-48">
                    {labels.compareMetricCol}
                  </th>
                  {selectedItems.map((item) => {
                    const d = dossiers[item.key];
                    const img = d?.headerImage || item.thumbUrl;
                    return (
                      <th key={item.key} className="p-2.5 sm:p-3.5 text-start min-w-[155px] sm:min-w-[200px] align-top">
                        <div className="flex items-start justify-between gap-2">
                          <div className="space-y-2 min-w-0">
                            {img && (
                              <img
                                src={img}
                                alt={item.title}
                                referrerPolicy="no-referrer"
                                className="w-28 sm:w-36 aspect-[16/9] rounded-lg object-cover bg-slate-200 dark:bg-[#0e141b]"
                              />
                            )}
                            <div className="font-display text-[13px] sm:text-[13.5px] font-bold text-slate-900 dark:text-white line-clamp-2">
                              {d?.title || item.title}
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={() => onRemoveSelection(item.key)}
                            aria-label={labels.compareRemoveBtn}
                            className="p-1.5 rounded-lg hover:bg-rose-500/15 text-slate-400 hover:text-rose-500 cursor-pointer shrink-0"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      </th>
                    );
                  })}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200/80 dark:divide-white/[0.06] text-[12.5px]">
                {[
                  {
                    label: labels.liveColPlayers,
                    render: (d: GameIntelligenceDossier) =>
                      d.currentPlayers !== null ? d.currentPlayers.toLocaleString(locale) : '—',
                  },
                  {
                    label: labels.liveColPeak24h,
                    render: (d: GameIntelligenceDossier) =>
                      d.peak24h !== null ? d.peak24h.toLocaleString(locale) : '—',
                  },
                  {
                    label: labels.liveColChange24h,
                    render: (d: GameIntelligenceDossier) =>
                      d.dayChangeFraction !== null
                        ? `${d.dayChangeFraction >= 0 ? '+' : ''}${(d.dayChangeFraction * 100).toFixed(1)}%`
                        : '—',
                  },
                  {
                    label: labels.healthStatusLabel,
                    render: (d: GameIntelligenceDossier) => labels.healthTiers[d.healthTier],
                  },
                  {
                    label: labels.steamRatingCardTitle,
                    render: (d: GameIntelligenceDossier) =>
                      d.criticCards.steamUserRating.scorePercent !== null
                        ? `${d.criticCards.steamUserRating.scorePercent}% (${(
                            d.criticCards.steamUserRating.reviewCount ?? 0
                          ).toLocaleString(locale)})`
                        : '—',
                  },
                  {
                    label: labels.metacriticScoreCardTitle,
                    render: (d: GameIntelligenceDossier) =>
                      d.criticCards.metacriticMetascore.score !== null
                        ? `${d.criticCards.metacriticMetascore.score} / 100`
                        : '—',
                  },
                  {
                    label: labels.metacriticUserCardTitle,
                    render: (d: GameIntelligenceDossier) =>
                      d.criticCards.metacriticUserScore.score !== null
                        ? `${d.criticCards.metacriticUserScore.score} / 10`
                        : '—',
                  },
                  {
                    label: labels.openCriticCardTitle,
                    render: (d: GameIntelligenceDossier) =>
                      d.criticCards.openCriticScore.topCriticScore !== null
                        ? `${d.criticCards.openCriticScore.topCriticScore} / 100`
                        : '—',
                  },
                  {
                    label: labels.detailBestPriceLabel,
                    render: (d: GameIntelligenceDossier) =>
                      d.dealSummary?.bestOffer
                        ? `${formatMoneyUsd(d.dealSummary.bestOffer.salePrice)} (-${
                            d.dealSummary.bestOffer.savingsPercent
                          }%) · ${d.dealSummary.bestOffer.storeName}`
                        : '—',
                  },
                  {
                    label: labels.detailHistoricalLowLabel,
                    render: (d: GameIntelligenceDossier) =>
                      d.dealSummary?.cheapestEver
                        ? formatMoneyUsd(d.dealSummary.cheapestEver.price)
                        : '—',
                  },
                  {
                    label: labels.releaseDateLabel,
                    render: (d: GameIntelligenceDossier) => d.releaseDateText || '—',
                  },
                  {
                    label: labels.developerLabel,
                    render: (d: GameIntelligenceDossier) =>
                      d.developers.length > 0 ? d.developers.join(', ') : '—',
                  },
                ].map((row) => (
                  <tr key={row.label} className="hover:bg-slate-50/70 dark:hover:bg-white/[0.02]">
                    <td className="py-2.5 px-3.5 font-semibold text-slate-600 dark:text-[#9cb0c9]">
                      {row.label}
                    </td>
                    {selectedItems.map((item) => {
                      const d = dossiers[item.key];
                      const loading = loadingKeys.has(item.key);
                      return (
                        <td
                          key={`${row.label}-${item.key}`}
                          dir="ltr"
                          className="py-2.5 px-3.5 font-mono-tabular font-semibold text-slate-900 dark:text-white"
                        >
                          {loading && !d ? (
                            <SpinnerGap className="w-4 h-4 text-sky-500 animate-spin" />
                          ) : d ? (
                            row.render(d)
                          ) : (
                            '—'
                          )}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
