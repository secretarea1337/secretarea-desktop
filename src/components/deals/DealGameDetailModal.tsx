import { useEffect, useState } from 'react';
import {
  ArrowSquareOut,
  Bell,
  BellRinging,
  ChartLineUp,
  CheckCircle,
  ClockCounterClockwise,
  GameController,
  Info,
  Key,
  Newspaper,
  Scales,
  SpinnerGap,
  Star,
  ThumbsDown,
  ThumbsUp,
  Trophy,
  Users,
  WarningCircle,
  X,
} from '@phosphor-icons/react';
import { resolveDisplayPrice } from '../../deals/currencyService';
import { isSafeExternalHttpUrl } from '../../deals/httpClient';
import {
  loadGameIntelligenceDossier,
  type DossierTargetInput,
} from '../../deals/intelligenceAggregator';
import { SteamDataProvider } from '../../deals/providers/steamDataProvider';
import { GameCensusProvider } from '../../deals/providers/gameCensusProvider';
import type {
  DealsCurrencyCode,
  DealsStoreInfo,
  ExchangeRateSnapshot,
  GameHealthTier,
  GameIntelligenceDossier,
  PlayerHistoryPoint,
  PlayerHistoryRange,
} from '../../deals/types';
import type { AppThemeMode } from '../../services/launcherSettings';
import {
  PlayerHistoryChart,
  PriceHistoryChart,
  ReviewDailyTrendChart,
} from './IntelligenceCharts';

type ModalTab = 'overview' | 'charts' | 'reviews' | 'stats';

interface DealGameDetailModalProps {
  target: DossierTargetInput | null;
  stores: DealsStoreInfo[];
  locale: string;
  activeTheme: AppThemeMode;
  selectedCurrency: DealsCurrencyCode;
  fxSnapshot: ExchangeRateSnapshot | null;
  isCompared?: boolean;
  isFollowed?: boolean;
  labels: {
    detailOffersTitle: string;
    detailHistoricalLowLabel: string;
    detailHistoricalDatePrefix: string;
    detailBestPriceLabel: string;
    detailLoadingOffers: string;
    detailCurrencyNotice: string;
    detailStoreCol: string;
    detailOriginalCol: string;
    detailCurrentCol: string;
    detailDiscountCol: string;
    detailActionCol: string;
    detailCloseBtn: string;
    viewDealBtn: string;
    freeBadge: string;
    modalTabOverview: string;
    modalTabCharts: string;
    modalTabReviewsCritics: string;
    modalTabStatsNews: string;
    playerChartTitle: string;
    priceChartTitle: string;
    noChartData: string;
    discountShameWarning: string;
    criticsSectionTitle: string;
    criticsSeparateNote: string;
    steamRatingCardTitle: string;
    metacriticScoreCardTitle: string;
    metacriticUserCardTitle: string;
    openCriticCardTitle: string;
    keyRequiredBadge: string;
    configureKeyAction: string;
    reviewsPositiveLabel: string;
    reviewsNegativeLabel: string;
    reviewsDailyTrendTitle: string;
    reviewsRecentTitle: string;
    reviewsSnapshotNote: string;
    achievementsTitle: string;
    newsUpdatesTitle: string;
    updateImpactLabel: string;
    developerLabel: string;
    publisherLabel: string;
    releaseDateLabel: string;
    platformsLabel: string;
    healthStatusLabel: string;
    sourcesLabel: string;
    liveColPlayers: string;
    healthTiers: Record<GameHealthTier, string>;
    compareAddBtn: string;
    compareAddedBadge: string;
    alertsFollowBtn: string;
    alertsFollowingBadge: string;
  };
  onClose: () => void;
  onOpenExternal: (url: string) => void;
  onToggleCompare?: (dossier: GameIntelligenceDossier) => void;
  onToggleAlert?: (dossier: GameIntelligenceDossier) => void;
  onOpenApiKeysModal?: () => void;
}

const HEALTH_COLOR: Record<GameHealthTier, string> = {
  thriving: 'text-emerald-600 dark:text-[#4ade80]',
  healthy: 'text-sky-600 dark:text-[#38bdf8]',
  cooling: 'text-amber-600 dark:text-amber-300',
  quiet: 'text-slate-500 dark:text-[#9cb0c9]',
  dormant: 'text-rose-500 dark:text-rose-400',
  unknown: 'text-slate-400 dark:text-[#788ca8]',
};

const RANGE_OPTIONS: PlayerHistoryRange[] = ['24h', '7d', '30d', '90d', '1y', 'all'];

export function DealGameDetailModal({
  target,
  stores,
  locale,
  activeTheme,
  selectedCurrency,
  fxSnapshot,
  isCompared = false,
  isFollowed = false,
  labels,
  onClose,
  onOpenExternal,
  onToggleCompare,
  onToggleAlert,
  onOpenApiKeysModal,
}: DealGameDetailModalProps) {
  const [dossier, setDossier] = useState<GameIntelligenceDossier | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<ModalTab>('overview');
  const [chartRange, setChartRange] = useState<PlayerHistoryRange>('7d');
  const [rangePoints, setRangePoints] = useState<PlayerHistoryPoint[] | null>(null);
  const [isLoadingRange, setIsLoadingRange] = useState(false);
  const [imgFailed, setImgFailed] = useState(false);

  const isXbox = activeTheme === 'xbox';
  const isPs5 = activeTheme === 'ps5';

  useEffect(() => {
    setImgFailed(false);
    setActiveTab('overview');
    setChartRange('7d');
    setRangePoints(null);

    if (!target) {
      setDossier(null);
      setIsLoading(false);
      return;
    }

    let alive = true;
    setIsLoading(true);
    void loadGameIntelligenceDossier(target, stores, '7d')
      .then((res) => {
        if (alive) setDossier(res);
      })
      .finally(() => {
        if (alive) setIsLoading(false);
      });

    return () => {
      alive = false;
    };
  }, [stores, target]);

  useEffect(() => {
    if (!target) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [onClose, target]);

  const handleChangeRange = async (nextRange: PlayerHistoryRange) => {
    setChartRange(nextRange);
    if (!dossier?.steamAppId) return;
    setIsLoadingRange(true);
    try {
      if (nextRange === 'all') {
        const census = await GameCensusProvider.fetchDailyPlayerHistory(dossier.steamAppId);
        if (census.length > 0) {
          setRangePoints(census);
          return;
        }
      }
      const sd = await SteamDataProvider.fetchPlayerHistory(dossier.steamAppId, nextRange);
      setRangePoints(sd.points);
    } finally {
      setIsLoadingRange(false);
    }
  };

  if (!target) return null;

  const displayTitle =
    dossier?.title ||
    target.title ||
    target.dealGame?.title ||
    target.liveEntry?.title ||
    'Game Intelligence';
  const displayThumb =
    dossier?.headerImage ||
    target.thumbUrl ||
    target.dealGame?.thumbUrl ||
    target.liveEntry?.headerImage ||
    null;

  const dealGame = dossier?.dealSummary || target.dealGame || null;
  const bestOffer = dealGame?.bestOffer || null;

  const bestPriceResolved = bestOffer
    ? resolveDisplayPrice({
        amount: bestOffer.isFreeNow ? 0 : bestOffer.salePrice,
        sourceCurrency: bestOffer.currency,
        targetCurrency: selectedCurrency,
        fxSnapshot,
        locale,
        freeLabel: labels.freeBadge,
      })
    : null;

  const historicalResolved = dealGame?.cheapestEver
    ? resolveDisplayPrice({
        amount: dealGame.cheapestEver.price,
        sourceCurrency: dealGame.cheapestEver.currency,
        targetCurrency: selectedCurrency,
        fxSnapshot,
        locale,
        freeLabel: labels.freeBadge,
      })
    : null;

  const historicalDate = dealGame?.cheapestEver?.dateTimestamp
    ? new Date(dealGame.cheapestEver.dateTimestamp * 1000).toLocaleDateString(locale, {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      })
    : null;

  const chartPoints = rangePoints !== null ? rangePoints : dossier?.playerHistory || [];

  const modalTabs: Array<{ id: ModalTab; label: string; icon: typeof ChartLineUp }> = [
    { id: 'overview', label: labels.modalTabOverview, icon: GameController },
    { id: 'charts', label: labels.modalTabCharts, icon: ChartLineUp },
    { id: 'reviews', label: labels.modalTabReviewsCritics, icon: Star },
    { id: 'stats', label: labels.modalTabStatsNews, icon: Trophy },
  ];

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="deal-detail-title"
      className="fixed inset-0 z-[75] flex items-center justify-center p-2.5 sm:p-5 bg-slate-950/65 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className={`sa-ps5-panel w-full max-w-4xl max-h-[92dvh] flex flex-col rounded-2xl border shadow-2xl overflow-hidden ${
          isXbox
            ? 'bg-[#081a0b] border-[#52e042]/35 text-white'
            : isPs5
            ? 'bg-[#061533] border-white/[0.16] text-white'
            : 'bg-white dark:bg-[#151c25] border-slate-200 dark:border-white/[0.1] text-slate-900 dark:text-white'
        }`}
      >
        {/* Header */}
        <div className="shrink-0 p-4 sm:p-5 border-b border-slate-200 dark:border-white/[0.08] space-y-3.5">
          <div className="flex items-start sm:items-center justify-between gap-3">
            <div className="flex flex-col xs:flex-row xs:items-center gap-3.5 min-w-0 flex-1">
              <div className="w-28 sm:w-32 aspect-[16/9] rounded-lg overflow-hidden bg-slate-200 dark:bg-[#0e141b] border border-slate-200 dark:border-white/[0.08] shrink-0">
                {displayThumb && !imgFailed ? (
                  <img
                    src={displayThumb}
                    alt={displayTitle}
                    referrerPolicy="no-referrer"
                    onError={() => setImgFailed(true)}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <GameController className="w-6 h-6 text-slate-400" />
                  </div>
                )}
              </div>

              <div className="min-w-0 space-y-1">
                <h2
                  id="deal-detail-title"
                  className="font-display text-base sm:text-xl font-bold text-slate-900 dark:text-white leading-tight [text-wrap:balance]"
                >
                  {displayTitle}
                </h2>
                <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[12px] text-slate-500 dark:text-[#8b9bb4]">
                  {(dossier?.steamAppId || target.steamAppId) && (
                    <span dir="ltr" className="font-mono-tabular">
                      Steam App #{dossier?.steamAppId || target.steamAppId}
                    </span>
                  )}
                  {dossier?.currentPlayers !== null && dossier?.currentPlayers !== undefined && (
                    <>
                      <span aria-hidden="true">·</span>
                      <span dir="ltr" className="inline-flex items-center gap-1 font-mono-tabular font-semibold text-emerald-600 dark:text-[#4ade80]">
                        <Users className="w-3.5 h-3.5" />
                        {dossier.currentPlayers.toLocaleString(locale)} playing
                      </span>
                    </>
                  )}
                  {dossier?.healthTier && dossier.healthTier !== 'unknown' && (
                    <>
                      <span aria-hidden="true">·</span>
                      <span className={`font-semibold ${HEALTH_COLOR[dossier.healthTier]}`}>
                        {labels.healthTiers[dossier.healthTier]}
                      </span>
                    </>
                  )}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-1.5 shrink-0">
              {dossier && onToggleAlert && (
                <button
                  type="button"
                  onClick={() => onToggleAlert(dossier)}
                  title={isFollowed ? labels.alertsFollowingBadge : labels.alertsFollowBtn}
                  className={`p-2 rounded-lg border transition-colors cursor-pointer ${
                    isFollowed
                      ? 'bg-amber-500 text-white border-amber-500'
                      : 'bg-slate-100 hover:bg-slate-200 dark:bg-white/[0.06] dark:hover:bg-white/[0.12] border-slate-200 dark:border-white/[0.08]'
                  }`}
                >
                  {isFollowed ? (
                    <BellRinging weight="fill" className="w-4 h-4" />
                  ) : (
                    <Bell className="w-4 h-4" />
                  )}
                </button>
              )}
              {dossier && onToggleCompare && (
                <button
                  type="button"
                  onClick={() => onToggleCompare(dossier)}
                  title={isCompared ? labels.compareAddedBadge : labels.compareAddBtn}
                  className={`p-2 rounded-lg border transition-colors cursor-pointer ${
                    isCompared
                      ? 'bg-sky-500 text-white border-sky-500'
                      : 'bg-slate-100 hover:bg-slate-200 dark:bg-white/[0.06] dark:hover:bg-white/[0.12] border-slate-200 dark:border-white/[0.08]'
                  }`}
                >
                  <Scales className="w-4 h-4" />
                </button>
              )}
              <button
                type="button"
                onClick={onClose}
                aria-label={labels.detailCloseBtn}
                className="p-2 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-white/[0.06] dark:hover:bg-white/[0.12] text-slate-600 dark:text-[#cbd6e4] transition-colors cursor-pointer"
              >
                <X weight="bold" className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Modal Sub-Tabs */}
          <div
            className={`inline-flex flex-wrap items-center gap-1 p-1 rounded-xl border ${
              isXbox
                ? 'bg-[#061609]/85 border-[#52e042]/22'
                : isPs5
                ? 'bg-[#04112b]/85 border-white/[0.12]'
                : 'bg-slate-100/90 dark:bg-[#0e141c] border-slate-200/80 dark:border-white/[0.08]'
            }`}
          >
            {modalTabs.map((tab) => {
              const Icon = tab.icon;
              const active = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  aria-pressed={active}
                  onClick={() => setActiveTab(tab.id)}
                  className={`inline-flex items-center gap-1.5 h-8 px-3 rounded-lg text-[12px] font-semibold whitespace-nowrap cursor-pointer transition-all duration-150 active:scale-[0.98] ${
                    active
                      ? isXbox
                        ? 'bg-[#107C10] text-white shadow-xs'
                        : isPs5
                        ? 'bg-[#0070d1] text-white shadow-xs'
                        : 'bg-white dark:bg-[#1b2533] text-slate-900 dark:text-white shadow-xs ring-1 ring-slate-200/80 dark:ring-white/[0.1]'
                      : 'text-slate-600 dark:text-[#8fa3bd] hover:text-slate-900 dark:hover:text-white hover:bg-white/60 dark:hover:bg-white/[0.05]'
                  }`}
                >
                  <Icon weight={active ? 'fill' : 'regular'} className="w-3.5 h-3.5 shrink-0" />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Summary KPI Bar */}
        <div className="shrink-0 grid grid-cols-1 sm:grid-cols-2 divide-y sm:divide-y-0 sm:divide-x divide-slate-200 dark:divide-white/[0.08] bg-slate-50/75 dark:bg-[#10161e]/80 border-b border-slate-200 dark:border-white/[0.08]">
          <div className="px-4 sm:px-5 py-2.5 flex items-center justify-between gap-3">
            <span className="flex items-center gap-2 text-[12px] font-medium text-slate-600 dark:text-[#9cb0c9]">
              <CheckCircle weight="fill" className="w-4 h-4 text-emerald-500 shrink-0" />
              <span>{labels.detailBestPriceLabel}</span>
            </span>
            <div dir="ltr" className="text-end font-mono-tabular">
              <span className="text-[14.5px] font-bold text-emerald-600 dark:text-[#4ade80]">
                {bestPriceResolved ? bestPriceResolved.formatted : '—'}
              </span>
              {bestPriceResolved?.isConverted && (
                <div className="text-[10px] text-slate-500 dark:text-[#8b9bb4]">
                  ≈ {bestPriceResolved.sourceFormatted} {bestPriceResolved.sourceCurrency}
                </div>
              )}
            </div>
          </div>

          <div className="px-4 sm:px-5 py-2.5 flex items-center justify-between gap-3">
            <span className="flex items-center gap-2 text-[12px] font-medium text-slate-600 dark:text-[#9cb0c9]">
              <ClockCounterClockwise className="w-4 h-4 text-sky-500 shrink-0" />
              <span>{labels.detailHistoricalLowLabel}</span>
            </span>
            <div dir="ltr" className="text-end font-mono-tabular">
              <span className="text-[13px] font-bold text-slate-900 dark:text-white">
                {historicalResolved
                  ? `${historicalResolved.formatted}${historicalDate ? ` · ${historicalDate}` : ''}`
                  : '—'}
              </span>
            </div>
          </div>
        </div>

        {/* Modal Body */}
        <div className="flex-1 min-h-0 overflow-y-auto p-4 sm:p-5 space-y-5">
          {isLoading && (
            <div className="flex items-center gap-2 text-[12.5px] text-sky-500">
              <SpinnerGap className="w-4 h-4 animate-spin shrink-0" />
              <span>{labels.detailLoadingOffers}</span>
            </div>
          )}

          {/* TAB 1: OVERVIEW & STORES */}
          {activeTab === 'overview' && (
            <div className="space-y-5">
              {dossier?.shortDescription && (
                <p className="text-[13px] leading-relaxed text-slate-600 dark:text-[#b4c5dc]">
                  {dossier.shortDescription}
                </p>
              )}

              {/* Metadata Grid */}
              {dossier && (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-[12px]">
                  <div className="rounded-xl border border-slate-200 dark:border-white/[0.08] bg-slate-50/70 dark:bg-[#10161e] p-3">
                    <div className="text-slate-500 dark:text-[#8b9bb4]">{labels.developerLabel}</div>
                    <div className="font-semibold mt-0.5 truncate">
                      {dossier.developers.join(', ') || '—'}
                    </div>
                  </div>
                  <div className="rounded-xl border border-slate-200 dark:border-white/[0.08] bg-slate-50/70 dark:bg-[#10161e] p-3">
                    <div className="text-slate-500 dark:text-[#8b9bb4]">{labels.publisherLabel}</div>
                    <div className="font-semibold mt-0.5 truncate">
                      {dossier.publishers.join(', ') || '—'}
                    </div>
                  </div>
                  <div className="rounded-xl border border-slate-200 dark:border-white/[0.08] bg-slate-50/70 dark:bg-[#10161e] p-3">
                    <div className="text-slate-500 dark:text-[#8b9bb4]">{labels.releaseDateLabel}</div>
                    <div className="font-semibold mt-0.5">{dossier.releaseDateText || '—'}</div>
                  </div>
                  <div className="rounded-xl border border-slate-200 dark:border-white/[0.08] bg-slate-50/70 dark:bg-[#10161e] p-3">
                    <div className="text-slate-500 dark:text-[#8b9bb4]">{labels.platformsLabel}</div>
                    <div className="font-semibold mt-0.5">
                      {[
                        dossier.platforms.windows && 'Windows',
                        dossier.platforms.mac && 'macOS',
                        dossier.platforms.linux && 'Linux',
                      ]
                        .filter(Boolean)
                        .join(' · ') || 'PC'}
                    </div>
                  </div>
                </div>
              )}

              {/* Multi-store Comparison Table */}
              {dealGame && dealGame.offers.length > 0 && (
                <div className="space-y-2.5">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <h3 className="text-[13.5px] font-bold">
                      {labels.detailOffersTitle} ({dealGame.offers.length})
                    </h3>
                    <span className="text-[11.5px] text-slate-500 dark:text-[#8b9bb4]">
                      {labels.detailCurrencyNotice}
                    </span>
                  </div>

                  <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-white/[0.08]">
                    <table className="w-full text-start border-collapse">
                      <thead>
                        <tr className="border-b border-slate-200 dark:border-white/[0.08] bg-slate-50 dark:bg-[#10161e] text-[11.5px] font-semibold text-slate-500 dark:text-[#8b9bb4]">
                          <th className="py-2.5 px-3.5 text-start">{labels.detailStoreCol}</th>
                          <th className="py-2.5 px-3 text-end">{labels.detailOriginalCol}</th>
                          <th className="py-2.5 px-3 text-end">{labels.detailCurrentCol}</th>
                          <th className="py-2.5 px-3 text-end">{labels.detailDiscountCol}</th>
                          <th className="py-2.5 px-3.5 text-end">{labels.detailActionCol}</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200/80 dark:divide-white/[0.06] text-[13px]">
                        {dealGame.offers.map((offer) => {
                          const rowCurrent = resolveDisplayPrice({
                            amount: offer.isFreeNow ? 0 : offer.salePrice,
                            sourceCurrency: offer.currency,
                            targetCurrency: selectedCurrency,
                            fxSnapshot,
                            locale,
                            freeLabel: labels.freeBadge,
                          });
                          const rowOriginal =
                            offer.normalPrice > 0
                              ? resolveDisplayPrice({
                                  amount: offer.normalPrice,
                                  sourceCurrency: offer.currency,
                                  targetCurrency: selectedCurrency,
                                  fxSnapshot,
                                  locale,
                                  freeLabel: labels.freeBadge,
                                })
                              : null;

                          return (
                            <tr
                              key={`${offer.provider}:${offer.storeId}:${offer.offerId}`}
                              className="hover:bg-slate-50/90 dark:hover:bg-white/[0.03]"
                            >
                              <td className="py-2.5 px-3.5">
                                <div className="flex items-center gap-2.5">
                                  {offer.storeIconUrl && (
                                    <img
                                      src={offer.storeIconUrl}
                                      alt={offer.storeName}
                                      referrerPolicy="no-referrer"
                                      className="w-5 h-5 rounded-sm object-contain shrink-0"
                                    />
                                  )}
                                  <span className="font-semibold whitespace-nowrap">
                                    {offer.storeName}
                                  </span>
                                </div>
                              </td>
                              <td dir="ltr" className="py-2.5 px-3 text-end font-mono-tabular text-slate-400 line-through whitespace-nowrap">
                                {rowOriginal ? rowOriginal.formatted : '—'}
                              </td>
                              <td dir="ltr" className="py-2.5 px-3 text-end font-mono-tabular font-bold whitespace-nowrap">
                                <div className={offer.isFreeNow ? 'text-emerald-500' : ''}>
                                  {rowCurrent.formatted}
                                </div>
                              </td>
                              <td dir="ltr" className="py-2.5 px-3 text-end font-mono-tabular whitespace-nowrap">
                                {offer.savingsPercent > 0 ? (
                                  <span className="font-bold text-emerald-600 dark:text-[#4ade80]">
                                    -{offer.savingsPercent}%
                                  </span>
                                ) : (
                                  <span className="text-slate-400">0%</span>
                                )}
                              </td>
                              <td className="py-2.5 px-3.5 text-end">
                                <button
                                  type="button"
                                  onClick={() => {
                                    if (isSafeExternalHttpUrl(offer.dealUrl)) {
                                      onOpenExternal(offer.dealUrl);
                                    }
                                  }}
                                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-semibold text-white cursor-pointer ${
                                    isXbox
                                      ? 'bg-[#107C10] hover:bg-[#159315]'
                                      : 'bg-[#0284c7] hover:bg-[#0369a1] dark:bg-[#1a9fff] dark:hover:bg-[#38adff]'
                                  }`}
                                >
                                  <span>{labels.viewDealBtn}</span>
                                  <ArrowSquareOut className="w-3.5 h-3.5" />
                                </button>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 2: CHARTS */}
          {activeTab === 'charts' && (
            <div className="space-y-6">
              <div className="space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h3 className="text-[14px] font-bold flex items-center gap-2">
                    <Users className="w-4 h-4 text-sky-500" />
                    <span>{labels.playerChartTitle}</span>
                  </h3>
                  <div className="flex flex-wrap items-center gap-1">
                    {RANGE_OPTIONS.map((r) => (
                      <button
                        key={r}
                        type="button"
                        onClick={() => void handleChangeRange(r)}
                        className={`px-2.5 py-1 rounded-lg text-[11.5px] font-mono-tabular font-semibold cursor-pointer ${
                          chartRange === r
                            ? 'bg-sky-500 text-white'
                            : 'bg-slate-100 dark:bg-white/[0.06] text-slate-600 dark:text-[#9cb0c9]'
                        }`}
                      >
                        {r.toUpperCase()}
                      </button>
                    ))}
                  </div>
                </div>

                {isLoadingRange ? (
                  <div className="h-44 flex items-center justify-center">
                    <SpinnerGap className="w-6 h-6 animate-spin text-sky-500" />
                  </div>
                ) : (
                  <PlayerHistoryChart
                    points={chartPoints}
                    locale={locale}
                    activeTheme={activeTheme}
                    noDataLabel={labels.noChartData}
                  />
                )}
              </div>

              <div className="space-y-3">
                <h3 className="text-[14px] font-bold flex items-center gap-2">
                  <ClockCounterClockwise className="w-4 h-4 text-emerald-500" />
                  <span>{labels.priceChartTitle}</span>
                </h3>
                {dossier?.discountShame?.flagged && (
                  <div className="rounded-xl border border-amber-500/35 bg-amber-500/10 p-3 flex items-center gap-2 text-[12px] text-amber-700 dark:text-amber-300">
                    <WarningCircle className="w-4 h-4 shrink-0" />
                    <span>{labels.discountShameWarning}</span>
                  </div>
                )}
                <PriceHistoryChart
                  points={dossier?.priceHistory || []}
                  selectedCurrency={selectedCurrency}
                  fxSnapshot={fxSnapshot}
                  locale={locale}
                  activeTheme={activeTheme}
                  noDataLabel={labels.noChartData}
                  freeLabel={labels.freeBadge}
                />
              </div>
            </div>
          )}

          {/* TAB 3: REVIEWS & SEPARATE CRITIC RATINGS */}
          {activeTab === 'reviews' && dossier && (
            <div className="space-y-6">
              {/* 4 Separate Rating Cards (NEVER merged!) */}
              <div className="space-y-2.5">
                <div>
                  <h3 className="text-[14px] font-bold">{labels.criticsSectionTitle}</h3>
                  <p className="text-[11.5px] text-slate-500 dark:text-[#8b9bb4]">
                    {labels.criticsSeparateNote}
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                  {/* Card 1: Steam User Rating */}
                  <div className="rounded-xl border border-slate-200 dark:border-white/[0.08] bg-slate-50/75 dark:bg-[#10161e] p-3.5 space-y-1.5">
                    <div className="text-[11.5px] font-semibold text-slate-500 dark:text-[#8b9bb4]">
                      {labels.steamRatingCardTitle}
                    </div>
                    <div dir="ltr" className="font-mono-tabular text-2xl font-bold text-sky-600 dark:text-[#38bdf8]">
                      {dossier.criticCards.steamUserRating.scorePercent !== null
                        ? `${dossier.criticCards.steamUserRating.scorePercent}%`
                        : '—'}
                    </div>
                    <div className="text-[11.5px] text-slate-600 dark:text-[#9cb0c9]">
                      {dossier.criticCards.steamUserRating.label || dossier.criticCards.steamUserRating.sourceName}
                    </div>
                    {dossier.criticCards.steamUserRating.reviewCount !== null && (
                      <div dir="ltr" className="text-[11px] font-mono-tabular text-slate-400">
                        {dossier.criticCards.steamUserRating.reviewCount.toLocaleString(locale)} reviews
                      </div>
                    )}
                  </div>

                  {/* Card 2: Metacritic Metascore */}
                  <div className="rounded-xl border border-slate-200 dark:border-white/[0.08] bg-slate-50/75 dark:bg-[#10161e] p-3.5 space-y-1.5">
                    <div className="text-[11.5px] font-semibold text-slate-500 dark:text-[#8b9bb4]">
                      {labels.metacriticScoreCardTitle}
                    </div>
                    <div dir="ltr" className="font-mono-tabular text-2xl font-bold text-emerald-600 dark:text-[#4ade80]">
                      {dossier.criticCards.metacriticMetascore.score !== null
                        ? `${dossier.criticCards.metacriticMetascore.score} / 100`
                        : '—'}
                    </div>
                    <div className="text-[11.5px] text-slate-600 dark:text-[#9cb0c9]">
                      {dossier.criticCards.metacriticMetascore.verdict ||
                        dossier.criticCards.metacriticMetascore.sourceName}
                    </div>
                    {dossier.criticCards.metacriticMetascore.requiresKey && onOpenApiKeysModal && (
                      <button
                        type="button"
                        onClick={onOpenApiKeysModal}
                        className="inline-flex items-center gap-1 text-[11px] font-semibold text-sky-500 hover:underline cursor-pointer"
                      >
                        <Key className="w-3 h-3" />
                        <span>{labels.configureKeyAction}</span>
                      </button>
                    )}
                  </div>

                  {/* Card 3: Metacritic User Score */}
                  <div className="rounded-xl border border-slate-200 dark:border-white/[0.08] bg-slate-50/75 dark:bg-[#10161e] p-3.5 space-y-1.5">
                    <div className="text-[11.5px] font-semibold text-slate-500 dark:text-[#8b9bb4]">
                      {labels.metacriticUserCardTitle}
                    </div>
                    <div dir="ltr" className="font-mono-tabular text-2xl font-bold text-amber-500">
                      {dossier.criticCards.metacriticUserScore.score !== null
                        ? `${dossier.criticCards.metacriticUserScore.score} / 10`
                        : '—'}
                    </div>
                    <div className="text-[11.5px] text-slate-600 dark:text-[#9cb0c9]">
                      {dossier.criticCards.metacriticUserScore.requiresKey && onOpenApiKeysModal
                        ? labels.keyRequiredBadge
                        : dossier.criticCards.metacriticUserScore.sourceName}
                    </div>
                    {dossier.criticCards.metacriticUserScore.requiresKey && onOpenApiKeysModal && (
                      <button
                        type="button"
                        onClick={onOpenApiKeysModal}
                        className="inline-flex items-center gap-1 text-[11px] font-semibold text-sky-500 hover:underline cursor-pointer"
                      >
                        <Key className="w-3 h-3" />
                        <span>{labels.configureKeyAction}</span>
                      </button>
                    )}
                  </div>

                  {/* Card 4: OpenCritic */}
                  <div className="rounded-xl border border-slate-200 dark:border-white/[0.08] bg-slate-50/75 dark:bg-[#10161e] p-3.5 space-y-1.5">
                    <div className="text-[11.5px] font-semibold text-slate-500 dark:text-[#8b9bb4]">
                      {labels.openCriticCardTitle}
                    </div>
                    <div dir="ltr" className="font-mono-tabular text-2xl font-bold text-purple-500 dark:text-purple-400">
                      {dossier.criticCards.openCriticScore.topCriticScore !== null
                        ? `${dossier.criticCards.openCriticScore.topCriticScore} / 100`
                        : '—'}
                    </div>
                    <div className="text-[11.5px] text-slate-600 dark:text-[#9cb0c9]">
                      {dossier.criticCards.openCriticScore.tier ||
                        (dossier.criticCards.openCriticScore.requiresKey && onOpenApiKeysModal
                          ? labels.keyRequiredBadge
                          : dossier.criticCards.openCriticScore.sourceName)}
                    </div>
                    {dossier.criticCards.openCriticScore.requiresKey && onOpenApiKeysModal && (
                      <button
                        type="button"
                        onClick={onOpenApiKeysModal}
                        className="inline-flex items-center gap-1 text-[11px] font-semibold text-sky-500 hover:underline cursor-pointer"
                      >
                        <Key className="w-3 h-3" />
                        <span>{labels.configureKeyAction}</span>
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* Steam Review Breakdown + Daily Trend */}
              {dossier.reviewSummary && (
                <div className="space-y-4">
                  <div className="rounded-xl border border-slate-200 dark:border-white/[0.08] bg-slate-50/75 dark:bg-[#10161e] p-4 space-y-3">
                    <div className="flex flex-wrap items-center justify-between gap-2 text-[12.5px]">
                      <span className="font-bold">
                        {labels.reviewsRecentTitle} ({dossier.reviewSummary.total.toLocaleString(locale)})
                      </span>
                      <span className="font-mono-tabular text-slate-500 dark:text-[#8b9bb4]">
                        {labels.reviewsPositiveLabel}:{' '}
                        <strong className="text-emerald-600 dark:text-[#4ade80]">
                          {dossier.reviewSummary.positive.toLocaleString(locale)}
                        </strong>{' '}
                        · {labels.reviewsNegativeLabel}:{' '}
                        <strong className="text-rose-500">
                          {dossier.reviewSummary.negative.toLocaleString(locale)}
                        </strong>
                      </span>
                    </div>

                    {dossier.reviewSummary.total > 0 && (
                      <div className="h-2.5 rounded-full bg-rose-500/35 overflow-hidden">
                        <div
                          className="h-full bg-emerald-500"
                          style={{
                            width: `${Math.max(
                              2,
                              Math.min(
                                100,
                                (dossier.reviewSummary.positive / dossier.reviewSummary.total) * 100
                              )
                            )}%`,
                          }}
                        />
                      </div>
                    )}

                    {dossier.reviewSummary.dailyTrend.length > 1 && (
                      <div className="pt-2 space-y-1.5">
                        <div className="text-[12px] font-semibold">{labels.reviewsDailyTrendTitle}</div>
                        <ReviewDailyTrendChart
                          trend={dossier.reviewSummary.dailyTrend}
                          locale={locale}
                        />
                        <div className="text-[11px] text-slate-500 dark:text-[#8b9bb4]">
                          {labels.reviewsSnapshotNote}
                        </div>
                      </div>
                    )}
                  </div>

                  {dossier.reviewSummary.steamReviewsNotice && (
                    <div className="rounded-xl border border-slate-200 dark:border-white/[0.08] bg-slate-50 dark:bg-[#10161e] p-3 flex items-start gap-2 text-[12px] text-slate-600 dark:text-[#9cb0c9]">
                      <Info className="w-4 h-4 text-sky-500 shrink-0 mt-0.5" />
                      <span>{dossier.reviewSummary.steamReviewsNotice}</span>
                    </div>
                  )}

                  {dossier.reviewSummary.reviews.length > 0 && (
                    <div className="space-y-2.5">
                      {dossier.reviewSummary.reviews.slice(0, 6).map((rev) => (
                        <div
                          key={rev.recommendationId}
                          className="rounded-xl border border-slate-200 dark:border-white/[0.08] p-3.5 space-y-2"
                        >
                          <div className="flex flex-wrap items-center justify-between gap-2 text-[12px]">
                            <span
                              className={`inline-flex items-center gap-1.5 font-bold ${
                                rev.votedUp
                                  ? 'text-emerald-600 dark:text-[#4ade80]'
                                  : 'text-rose-500'
                              }`}
                            >
                              {rev.votedUp ? (
                                <ThumbsUp weight="fill" className="w-4 h-4" />
                              ) : (
                                <ThumbsDown weight="fill" className="w-4 h-4" />
                              )}
                              <span>
                                {rev.votedUp
                                  ? labels.reviewsPositiveLabel
                                  : labels.reviewsNegativeLabel}
                              </span>
                            </span>
                            <div className="flex items-center gap-2 font-mono-tabular text-[11px] text-slate-500 dark:text-[#8b9bb4]">
                              <span>{rev.playtimeHours}h played</span>
                              <span>·</span>
                              <button
                                type="button"
                                onClick={() => onOpenExternal(rev.reviewUrl)}
                                className="text-sky-500 hover:underline inline-flex items-center gap-0.5 cursor-pointer"
                              >
                                <span>Steam</span>
                                <ArrowSquareOut className="w-3 h-3" />
                              </button>
                            </div>
                          </div>
                          <p className="text-[12.5px] leading-relaxed text-slate-700 dark:text-[#c7d7eb] line-clamp-4">
                            {rev.reviewText}
                          </p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* TAB 4: STATS, ACHIEVEMENTS & NEWS */}
          {activeTab === 'stats' && dossier && (
            <div className="space-y-6">
              {/* Achievements */}
              <div className="space-y-3">
                <h3 className="text-[14px] font-bold flex items-center gap-2">
                  <Trophy className="w-4 h-4 text-amber-500" />
                  <span>
                    {labels.achievementsTitle}
                    {dossier.achievementsTotal ? ` (${dossier.achievementsTotal})` : ''}
                  </span>
                </h3>
                {dossier.achievements.length === 0 ? (
                  <p className="text-[12.5px] text-slate-500 dark:text-[#8b9bb4]">
                    {labels.noChartData}
                  </p>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    {dossier.achievements.slice(0, 16).map((ach) => (
                      <div
                        key={ach.apiName}
                        className="rounded-xl border border-slate-200 dark:border-white/[0.08] bg-slate-50/70 dark:bg-[#10161e] p-3 space-y-1.5"
                      >
                        <div className="flex items-center justify-between gap-2 text-[12px]">
                          <span className="font-semibold truncate">{ach.displayName}</span>
                          <span dir="ltr" className="font-mono-tabular font-bold text-sky-600 dark:text-[#38bdf8] shrink-0">
                            {ach.globalPercent}%
                          </span>
                        </div>
                        <div className="h-1.5 rounded-full bg-slate-200 dark:bg-white/[0.08] overflow-hidden">
                          <div
                            className="h-full bg-sky-500"
                            style={{ width: `${Math.max(1, ach.globalPercent)}%` }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Patch Impact & News */}
              <div className="space-y-3">
                <h3 className="text-[14px] font-bold flex items-center gap-2">
                  <Newspaper className="w-4 h-4 text-sky-500" />
                  <span>{labels.newsUpdatesTitle}</span>
                </h3>

                {dossier.steamDataUpdates.length > 0 && (
                  <div className="space-y-2">
                    {dossier.steamDataUpdates.slice(0, 4).map((upd, idx) => (
                      <div
                        key={`${upd.gid || idx}`}
                        className="rounded-xl border border-slate-200 dark:border-white/[0.08] bg-slate-50/70 dark:bg-[#10161e] p-3 flex flex-wrap items-center justify-between gap-2 text-[12px]"
                      >
                        <div>
                          <div className="font-semibold">{upd.title}</div>
                          <div className="text-[11px] font-mono-tabular text-slate-500 dark:text-[#8b9bb4]">
                            {new Date(upd.timestamp).toLocaleDateString(locale)}
                          </div>
                        </div>
                        {typeof upd.changeFraction === 'number' && (
                          <div
                            dir="ltr"
                            className={`font-mono-tabular font-bold ${
                              upd.changeFraction >= 0
                                ? 'text-emerald-600 dark:text-[#4ade80]'
                                : 'text-rose-500'
                            }`}
                          >
                            {labels.updateImpactLabel}:{' '}
                            {upd.changeFraction >= 0 ? '+' : ''}
                            {(upd.changeFraction * 100).toFixed(1)}%
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}

                {dossier.news.length > 0 && (
                  <div className="space-y-2.5">
                    {dossier.news.slice(0, 6).map((item) => (
                      <div
                        key={item.gid}
                        className="rounded-xl border border-slate-200 dark:border-white/[0.08] p-3.5 space-y-1.5"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="font-semibold text-[13px]">{item.title}</div>
                          <button
                            type="button"
                            onClick={() => onOpenExternal(item.url)}
                            className="text-sky-500 hover:underline shrink-0 cursor-pointer"
                          >
                            <ArrowSquareOut className="w-4 h-4" />
                          </button>
                        </div>
                        <div className="text-[11px] font-mono-tabular text-slate-500 dark:text-[#8b9bb4]">
                          {item.feedLabel} · {new Date(item.dateTimestamp).toLocaleDateString(locale)}
                        </div>
                        {item.summary && (
                          <p className="text-[12px] text-slate-600 dark:text-[#9cb0c9] line-clamp-2">
                            {item.summary}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Source Attribution Strip */}
          {dossier && dossier.attributions.length > 0 && (
            <div className="pt-3 border-t border-slate-200 dark:border-white/[0.08] flex flex-wrap items-center gap-x-3 gap-y-1 text-[11.5px] text-slate-500 dark:text-[#8b9bb4]">
              <span className="font-semibold">{labels.sourcesLabel}:</span>
              {dossier.attributions.map((attr) => (
                <button
                  key={attr.label}
                  type="button"
                  onClick={() => onOpenExternal(attr.url)}
                  className="underline hover:text-slate-900 dark:hover:text-white cursor-pointer"
                >
                  {attr.label}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
