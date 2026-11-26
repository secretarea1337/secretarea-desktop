import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowUpRight,
  ArrowsClockwise,
  Bell,
  CaretDown,
  CaretLeft,
  CaretRight,
  Clock,
  Fire,
  Flame,
  Funnel,
  Gift,
  MagnifyingGlass,
  Percent,
  Scales,
  Sparkle,
  Storefront,
  Tag,
  Users,
  WarningCircle,
  WifiSlash,
  X,
} from '@phosphor-icons/react';
import {
  clearDealsMemoryCache,
  loadDealsOverview,
  loadFreeGamesCatalog,
  queryAllDeals,
} from '../../deals/dealsAggregator';
import {
  convertFilterAmountToUsd,
  loadUsdExchangeRates,
  resolveDisplayPrice,
} from '../../deals/currencyService';
import {
  loadLiveIntelligence,
  type DossierTargetInput,
} from '../../deals/intelligenceAggregator';
import {
  checkFollowedPriceAlerts,
  clearPriceAlertEvents,
  createRuleFromDealGame,
  createRuleFromLiveEntry,
  followPriceAlertRule,
  loadPriceAlertEvents,
  loadPriceAlertRules,
  markAllPriceAlertEventsRead,
  unfollowPriceAlertRule,
  updateAlertTargetPrice,
} from '../../deals/priceAlertsService';
import {
  REGION_DEFAULT_CURRENCY,
  type DealsCurrencyCode,
  type DealsHubSectionTab,
  type DealsOverviewSnapshot,
  type DealsPageResult,
  type DealsRegionCode,
  type DealsSortOption,
  type DealsStoreInfo,
  type ExchangeRateSnapshot,
  type FreeGamesSnapshot,
  type FreeOfferCategory,
  type FreeStoreFilter,
  type GameIntelligenceDossier,
  type LiveIntelligenceSnapshot,
  type NormalizedDealGame,
  type PriceAlertEvent,
  type PriceAlertRule,
  type SteamLiveRankEntry,
} from '../../deals/types';
import { getTranslations } from '../../i18n/translations';
import type { AppLanguage, AppThemeMode } from '../../services/launcherSettings';
import { CurrencySwitcher } from './CurrencySwitcher';
import { DealCard } from './DealCard';
import { DealGameDetailModal } from './DealGameDetailModal';
import { FreeOfferCard } from './FreeOfferCard';
import { GameCompareView, type CompareSelectionItem } from './GameCompareView';
import { LivePlayersView } from './LivePlayersView';
import { PriceAlertsView } from './PriceAlertsView';

interface GameDealsViewProps {
  language: AppLanguage;
  activeTheme: AppThemeMode;
  onOpenExternal: (url: string) => void;
  onNotify?: (message: string, type?: 'success' | 'info' | 'error') => void;
}

const DEALS_PAGE_SIZE = 24;
type HotMode = 'most-played' | 'biggest-gains' | 'new-releases' | 'best-discounts';

function DealSkeletonGrid({
  count = 8,
  activeTheme,
}: {
  count?: number;
  activeTheme: AppThemeMode;
}) {
  const isXbox = activeTheme === 'xbox';
  const isPs5 = activeTheme === 'ps5';

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
      {Array.from({ length: count }).map((_, idx) => (
        <div
          key={idx}
          className={`sa-ps5-subpanel rounded-xl border overflow-hidden animate-pulse ${
            isXbox
              ? 'bg-[#0c2110]/70 border-[#52e042]/18'
              : isPs5
              ? 'bg-[#081a3d]/65 border-white/[0.1]'
              : 'bg-white dark:bg-[#171f2a] border-slate-200 dark:border-white/[0.08]'
          }`}
        >
          <div className="aspect-[16/9] bg-slate-200 dark:bg-white/[0.06]" />
          <div className="p-3.5 space-y-2.5">
            <div className="h-4 w-3/4 rounded bg-slate-200 dark:bg-white/[0.08]" />
            <div className="h-3 w-1/2 rounded bg-slate-200 dark:bg-white/[0.06]" />
            <div className="pt-2 border-t border-slate-200/70 dark:border-white/[0.06] flex items-center justify-between">
              <div className="h-4 w-16 rounded bg-slate-200 dark:bg-white/[0.08]" />
              <div className="h-7 w-24 rounded-lg bg-slate-200 dark:bg-white/[0.08]" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

export function GameDealsView({
  language,
  activeTheme,
  onOpenExternal,
  onNotify,
}: GameDealsViewProps) {
  const t = useMemo(() => getTranslations(language), [language]);
  const td = t.deals;
  const isXbox = activeTheme === 'xbox';
  const isPs5 = activeTheme === 'ps5';

  const [activeTab, setActiveTab] = useState<DealsHubSectionTab>('overview');
  const [region, setRegion] = useState<DealsRegionCode>('US');
  const [selectedCurrency, setSelectedCurrency] = useState<DealsCurrencyCode>('USD');

  // Exchange rates
  const [fxSnapshot, setFxSnapshot] = useState<ExchangeRateSnapshot | null>(null);
  const [isLoadingFx, setIsLoadingFx] = useState<boolean>(true);

  // Overview & Live Intelligence
  const [overview, setOverview] = useState<DealsOverviewSnapshot | null>(null);
  const [isLoadingOverview, setIsLoadingOverview] = useState(true);
  const [overviewError, setOverviewError] = useState<string | null>(null);

  const [liveSnapshot, setLiveSnapshot] = useState<LiveIntelligenceSnapshot | null>(null);
  const [isLoadingLive, setIsLoadingLive] = useState(false);
  const [hotMode, setHotMode] = useState<HotMode>('most-played');

  // All Deals filter & pagination
  const [searchInput, setSearchInput] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [selectedStoreId, setSelectedStoreId] = useState<string>('all');
  const [minPrice, setMinPrice] = useState('');
  const [maxPrice, setMaxPrice] = useState('');
  const [minDiscount, setMinDiscount] = useState<number>(0);
  const [sortBy, setSortBy] = useState<DealsSortOption>('deal-rating');
  const [pageNumber, setPageNumber] = useState(0);

  const [dealsPage, setDealsPage] = useState<DealsPageResult | null>(null);
  const [isLoadingDeals, setIsLoadingDeals] = useState(false);
  const [dealsError, setDealsError] = useState<string | null>(null);

  // Free Games
  const [freeSnapshot, setFreeSnapshot] = useState<FreeGamesSnapshot | null>(null);
  const [isLoadingFree, setIsLoadingFree] = useState(false);
  const [freeError, setFreeError] = useState<string | null>(null);
  const [freeCategory, setFreeCategory] = useState<FreeOfferCategory>('limited_time_free');
  const [freeStoreFilter, setFreeStoreFilter] = useState<FreeStoreFilter>('all');

  // Side-by-Side Comparison
  const [compareItems, setCompareItems] = useState<CompareSelectionItem[]>([]);

  // Price Drop Alerts
  const [alertRules, setAlertRules] = useState<PriceAlertRule[]>(() => loadPriceAlertRules());
  const [alertEvents, setAlertEvents] = useState<PriceAlertEvent[]>(() => loadPriceAlertEvents());
  const [isCheckingAlerts, setIsCheckingAlerts] = useState(false);

  // Shared Modals
  const [selectedDossierTarget, setSelectedDossierTarget] = useState<DossierTargetInput | null>(
    null
  );
  const [isRefreshingManual, setIsRefreshingManual] = useState(false);
  const [lastUpdatedAt, setLastUpdatedAt] = useState<number | null>(null);

  const allStores: DealsStoreInfo[] = useMemo(() => {
    if (overview?.stores && overview.stores.length > 0) return overview.stores;
    if (dealsPage?.stores && dealsPage.stores.length > 0) return dealsPage.stores;
    return [];
  }, [overview?.stores, dealsPage?.stores]);

  const comparedKeys = useMemo(() => new Set(compareItems.map((c) => c.key)), [compareItems]);
  const followedKeys = useMemo(() => {
    const set = new Set<string>();
    for (const r of alertRules) {
      set.add(r.canonicalKey);
      if (r.steamAppId) {
        set.add(`steam:${r.steamAppId}:base`);
      }
    }
    return set;
  }, [alertRules]);

  const unreadAlertsCount = useMemo(
    () => alertEvents.filter((e) => !e.read).length,
    [alertEvents]
  );

  const fetchExchangeRates = useCallback(async (forceRefresh = false) => {
    setIsLoadingFx(true);
    try {
      const snap = await loadUsdExchangeRates(forceRefresh);
      if (snap) setFxSnapshot(snap);
    } finally {
      setIsLoadingFx(false);
    }
  }, []);

  useEffect(() => {
    void fetchExchangeRates(false);
  }, [fetchExchangeRates]);

  const handleSelectRegion = useCallback((nextRegion: DealsRegionCode) => {
    setRegion(nextRegion);
    setSelectedCurrency(REGION_DEFAULT_CURRENCY[nextRegion]);
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setDebouncedSearch(searchInput.trim());
      setPageNumber(0);
    }, 380);
    return () => window.clearTimeout(timer);
  }, [searchInput]);

  const fetchOverviewData = useCallback(
    async (forceRefresh = false) => {
      setIsLoadingOverview(true);
      setOverviewError(null);
      try {
        const snap = await loadDealsOverview(region, forceRefresh);
        setOverview(snap);
        setLastUpdatedAt(snap.fetchedAt);
      } catch (err) {
        const msg = err instanceof Error ? err.message : td.errorTitle;
        setOverviewError(msg);
      } finally {
        setIsLoadingOverview(false);
      }
    },
    [region, td.errorTitle]
  );

  const fetchLiveIntelligenceData = useCallback(async (forceRefresh = false) => {
    setIsLoadingLive(true);
    try {
      const snap = await loadLiveIntelligence(forceRefresh);
      setLiveSnapshot(snap);
      setLastUpdatedAt(snap.fetchedAt);
    } finally {
      setIsLoadingLive(false);
    }
  }, []);

  const runAlertPriceChecks = useCallback(
    async (forceRefresh = false) => {
      if (loadPriceAlertRules().length === 0) return;
      setIsCheckingAlerts(true);
      try {
        const res = await checkFollowedPriceAlerts(forceRefresh);
        setAlertRules(res.rules);
        setAlertEvents(res.events);
        if (res.newEvents.length > 0 && onNotify) {
          const top = res.newEvents[0];
          const formatted = resolveDisplayPrice({
            amount: top.newPriceUsd,
            sourceCurrency: 'USD',
            targetCurrency: selectedCurrency,
            fxSnapshot,
            locale: t.locale,
            freeLabel: td.freeBadge,
          }).formatted;
          onNotify(
            `${td.alertsDropDetectedToast} ${top.title} (${formatted})`,
            'success'
          );
        }
      } finally {
        setIsCheckingAlerts(false);
      }
    },
    [fxSnapshot, onNotify, selectedCurrency, t.locale, td.alertsDropDetectedToast, td.freeBadge]
  );

  const fetchAllDealsData = useCallback(
    async (forceRefresh = false) => {
      setIsLoadingDeals(true);
      setDealsError(null);
      try {
        const usdLower = convertFilterAmountToUsd(minPrice, selectedCurrency, fxSnapshot);
        const usdUpper = convertFilterAmountToUsd(maxPrice, selectedCurrency, fxSnapshot);

        const res = await queryAllDeals({
          pageNumber,
          pageSize: DEALS_PAGE_SIZE,
          storeIds: selectedStoreId !== 'all' ? [selectedStoreId] : undefined,
          lowerPrice: usdLower,
          upperPrice: usdUpper,
          minSavings: minDiscount > 0 ? minDiscount : undefined,
          title: debouncedSearch || undefined,
          sortBy,
          onSaleOnly: true,
          forceRefresh,
        });
        setDealsPage(res);
        setLastUpdatedAt(res.fetchedAt);
      } catch (err) {
        const msg = err instanceof Error ? err.message : td.errorTitle;
        setDealsError(msg);
      } finally {
        setIsLoadingDeals(false);
      }
    },
    [
      debouncedSearch,
      fxSnapshot,
      maxPrice,
      minDiscount,
      minPrice,
      pageNumber,
      selectedCurrency,
      selectedStoreId,
      sortBy,
      td.errorTitle,
    ]
  );

  const fetchFreeGamesData = useCallback(
    async (forceRefresh = false) => {
      setIsLoadingFree(true);
      setFreeError(null);
      try {
        const snap = await loadFreeGamesCatalog(region, forceRefresh);
        setFreeSnapshot(snap);
        setLastUpdatedAt(snap.fetchedAt);
      } catch (err) {
        const msg = err instanceof Error ? err.message : td.errorTitle;
        setFreeError(msg);
      } finally {
        setIsLoadingFree(false);
      }
    },
    [region, td.errorTitle]
  );

  // Load Overview + What's Hot Live Intelligence initially
  useEffect(() => {
    void fetchOverviewData(false);
    void fetchLiveIntelligenceData(false);
    void runAlertPriceChecks(false);
  }, [fetchLiveIntelligenceData, fetchOverviewData, runAlertPriceChecks]);

  // Lazy load All Deals tab
  const hasLoadedDealsRef = useRef(false);
  useEffect(() => {
    if (activeTab === 'all-deals' || hasLoadedDealsRef.current) {
      hasLoadedDealsRef.current = true;
      void fetchAllDealsData(false);
    }
  }, [activeTab, fetchAllDealsData]);

  // Lazy load Free Games tab
  const hasLoadedFreeRef = useRef(false);
  useEffect(() => {
    if (activeTab === 'free-games' || hasLoadedFreeRef.current) {
      hasLoadedFreeRef.current = true;
      void fetchFreeGamesData(false);
    }
  }, [activeTab, fetchFreeGamesData]);

  const handleManualRefresh = async () => {
    if (isRefreshingManual) return;
    setIsRefreshingManual(true);
    clearDealsMemoryCache();
    try {
      const fxPromise = fetchExchangeRates(true);
      const alertPromise = runAlertPriceChecks(true);
      if (activeTab === 'overview' || activeTab === 'stores') {
        await Promise.all([
          fetchOverviewData(true),
          fetchLiveIntelligenceData(true),
          fxPromise,
          alertPromise,
        ]);
      } else if (activeTab === 'live-players') {
        await Promise.all([fetchLiveIntelligenceData(true), fxPromise, alertPromise]);
      } else if (activeTab === 'all-deals') {
        await Promise.all([fetchAllDealsData(true), fxPromise, alertPromise]);
      } else if (activeTab === 'free-games') {
        await Promise.all([fetchFreeGamesData(true), fxPromise, alertPromise]);
      } else {
        await Promise.all([fxPromise, alertPromise]);
      }
    } finally {
      setIsRefreshingManual(false);
    }
  };

  // Compare selection handlers
  const toggleCompareItem = (item: CompareSelectionItem) => {
    setCompareItems((prev) => {
      if (prev.some((p) => p.key === item.key)) {
        return prev.filter((p) => p.key !== item.key);
      }
      if (prev.length >= 4) {
        onNotify?.(td.compareMaxNotice, 'info');
        return prev;
      }
      return [...prev, item];
    });
  };

  const handleToggleCompareDeal = (game: NormalizedDealGame) => {
    const key = game.steamAppId ? `steam:${game.steamAppId}` : game.canonicalKey;
    toggleCompareItem({
      key,
      title: game.title,
      steamAppId: game.steamAppId,
      cheapsharkGameId: game.cheapsharkGameId,
      thumbUrl: game.thumbUrl,
      dealGame: game,
    });
  };

  const handleToggleCompareLive = (entry: SteamLiveRankEntry) => {
    toggleCompareItem({
      key: `steam:${entry.appId}`,
      title: entry.title,
      steamAppId: entry.appId,
      thumbUrl: entry.headerImage,
      liveEntry: entry,
    });
  };

  const handleToggleCompareDossier = (dossier: GameIntelligenceDossier) => {
    const key = dossier.steamAppId
      ? `steam:${dossier.steamAppId}`
      : dossier.dealSummary?.canonicalKey || dossier.title;
    toggleCompareItem({
      key,
      title: dossier.title,
      steamAppId: dossier.steamAppId,
      cheapsharkGameId: dossier.cheapsharkGameId,
      thumbUrl: dossier.headerImage,
      dealGame: dossier.dealSummary,
    });
  };

  // Alert handlers
  const handleToggleAlertDeal = (game: NormalizedDealGame) => {
    if (followedKeys.has(game.canonicalKey)) {
      setAlertRules(unfollowPriceAlertRule(game.canonicalKey));
    } else {
      setAlertRules(followPriceAlertRule(createRuleFromDealGame(game, null)));
      onNotify?.(`${td.alertsFollowingBadge}: ${game.title}`, 'success');
    }
  };

  const handleToggleAlertLive = (entry: SteamLiveRankEntry) => {
    const key = `steam:${entry.appId}:base`;
    if (followedKeys.has(key)) {
      setAlertRules(unfollowPriceAlertRule(key));
    } else {
      setAlertRules(followPriceAlertRule(createRuleFromLiveEntry(entry, null)));
      onNotify?.(`${td.alertsFollowingBadge}: ${entry.title}`, 'success');
    }
  };

  const handleToggleAlertDossier = (dossier: GameIntelligenceDossier) => {
    if (dossier.dealSummary) {
      handleToggleAlertDeal(dossier.dealSummary);
      return;
    }
    if (!dossier.steamAppId) return;
    const key = `steam:${dossier.steamAppId}:base`;
    if (followedKeys.has(key)) {
      setAlertRules(unfollowPriceAlertRule(key));
    } else {
      setAlertRules(
        followPriceAlertRule({
          id: `rule:${key}`,
          canonicalKey: key,
          title: dossier.title,
          steamAppId: dossier.steamAppId,
          cheapsharkGameId: dossier.cheapsharkGameId,
          thumbUrl: dossier.headerImage,
          targetPriceUsd: null,
          lastKnownPriceUsd: null,
          lastCheckedAt: Date.now(),
          createdAt: Date.now(),
        })
      );
      onNotify?.(`${td.alertsFollowingBadge}: ${dossier.title}`, 'success');
    }
  };

  const handleBrowseStore = (storeId: string) => {
    setSelectedStoreId(storeId);
    setPageNumber(0);
    setActiveTab('all-deals');
  };

  const handleResetFilters = () => {
    setSearchInput('');
    setDebouncedSearch('');
    setSelectedStoreId('all');
    setMinPrice('');
    setMaxPrice('');
    setMinDiscount(0);
    setSortBy('deal-rating');
    setPageNumber(0);
  };

  const isOffline = typeof navigator !== 'undefined' && !navigator.onLine;
  const formattedLastUpdated = lastUpdatedAt
    ? new Date(lastUpdatedAt).toLocaleTimeString(t.locale, {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      })
    : null;

  const dealCardLabels = {
    viewDealBtn: td.viewDealBtn,
    compareOffersBtn: td.compareOffersBtn,
    dealRatingLabel: td.dealRatingLabel,
    freeBadge: td.freeBadge,
    sourcePriceHint: td.sourcePriceHint,
    compareAddBtn: td.compareAddBtn,
    alertsFollowBtn: td.alertsFollowBtn,
  };

  const freeCardLabels = {
    expiresPrefix: td.expiresPrefix,
    noExpiryLabel: td.noExpiryLabel,
    originalWorthPrefix: td.originalWorthPrefix,
    claimFreeBtn: td.claimFreeBtn,
    playFreeBtn: td.playFreeBtn,
    freeBadge: td.freeBadge,
  };

  const navTabs: Array<{
    id: DealsHubSectionTab;
    label: string;
    icon: typeof Flame;
    badge?: number;
  }> = [
    { id: 'overview', label: td.tabOverview, icon: Flame },
    { id: 'all-deals', label: td.tabAllDeals, icon: Tag },
    { id: 'live-players', label: td.tabLivePlayers, icon: Users },
    { id: 'free-games', label: td.tabFreeGames, icon: Gift },
    {
      id: 'compare',
      label: td.tabCompare,
      icon: Scales,
      badge: compareItems.length > 0 ? compareItems.length : undefined,
    },
    {
      id: 'alerts',
      label: td.tabAlerts,
      icon: Bell,
      badge: unreadAlertsCount > 0 ? unreadAlertsCount : undefined,
    },
    { id: 'stores', label: td.tabStores, icon: Storefront },
  ];

  // Filter Free Games cleanly by category & store filter pill
  const activeFreeList = useMemo(() => {
    const raw =
      freeCategory === 'limited_time_free'
        ? freeSnapshot?.limitedTimeFree || []
        : freeCategory === 'giveaway'
        ? freeSnapshot?.giveaways || []
        : freeSnapshot?.freeToPlay || [];

    if (freeStoreFilter === 'all') return raw;
    if (freeStoreFilter === 'epic') return raw.filter((f) => f.storeKey === 'epic');
    if (freeStoreFilter === 'steam') return raw.filter((f) => f.storeKey === 'steam');
    if (freeStoreFilter === 'gog') return raw.filter((f) => f.storeKey === 'gog');
    if (freeStoreFilter === 'pc_dlc') {
      return raw.filter((f) => f.isDlcOrReward || f.category === 'giveaway');
    }
    return raw;
  }, [freeCategory, freeSnapshot, freeStoreFilter]);

  const topConcurrentSum = useMemo(() => {
    if (!liveSnapshot?.topPlayers?.length) return null;
    return liveSnapshot.topPlayers.reduce((sum, item) => sum + item.currentPlayers, 0);
  }, [liveSnapshot?.topPlayers]);

  const hotSteamList: SteamLiveRankEntry[] = useMemo(() => {
    if (!liveSnapshot) return [];
    if (hotMode === 'most-played') return liveSnapshot.topPlayers.slice(0, 8);
    if (hotMode === 'biggest-gains') return liveSnapshot.biggestGains.slice(0, 8);
    if (hotMode === 'new-releases') return liveSnapshot.popularNewReleases.slice(0, 8);
    return [];
  }, [hotMode, liveSnapshot]);

  const accentTextClass = isXbox
    ? 'text-[#6ee755]'
    : isPs5
    ? 'text-[#7cc4ff]'
    : 'text-[#0284c7] dark:text-[#38bdf8] sa-custom-accent-text';

  const panelSurfaceClass = isXbox
    ? 'bg-[#081a0b]/85 border-[#52e042]/24'
    : isPs5
    ? 'bg-[#061533]/80 border-white/[0.14]'
    : 'bg-white dark:bg-[#151c25] border-slate-200 dark:border-white/[0.08] shadow-sm dark:shadow-none';

  return (
    <div className="flex-1 min-h-0 overflow-y-auto">
      <div className="w-full max-w-[1600px] mx-auto px-3 sm:px-5 lg:px-8 py-4 sm:py-6 space-y-5 sm:space-y-6">
        {/* Top Hub Header */}
        <header className={`sa-ps5-panel rounded-2xl border p-3.5 sm:p-6 space-y-3.5 sm:space-y-4 ${panelSurfaceClass}`}>
          <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-3.5 sm:gap-4">
            <div className="space-y-1 min-w-0">
              <div className="flex items-center gap-2.5 min-w-0">
                <span
                  className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                    isXbox
                      ? 'bg-[#107C10]/25 text-[#6ee755]'
                      : isPs5
                      ? 'bg-[#0070d1]/25 text-[#7cc4ff]'
                      : 'bg-sky-500/12 text-[#0284c7] dark:text-[#38bdf8] sa-custom-accent-text'
                  }`}
                >
                  <Percent weight="bold" className="w-5 h-5" />
                </span>
                <h1 className="font-display text-lg sm:text-2xl font-bold tracking-tight text-slate-900 dark:text-white [text-wrap:balance] leading-tight">
                  {td.pageTitle}
                </h1>
              </div>
              <p className="text-[12.5px] sm:text-[13px] text-slate-600 dark:text-[#9cb0c9]">
                {td.pageSubtitle}
              </p>
            </div>

            {/* Right Controls */}
            <div className="flex flex-col sm:flex-row sm:flex-wrap items-stretch sm:items-center gap-2 w-full xl:w-auto shrink-0">
              <CurrencySwitcher
                selectedCurrency={selectedCurrency}
                region={region}
                fxSnapshot={fxSnapshot}
                isLoadingFx={isLoadingFx}
                activeTheme={activeTheme}
                labels={{
                  currencyLabel: td.currencyLabel,
                  regionLabel: td.regionLabel,
                  allCurrenciesLabel: td.allCurrenciesLabel,
                  liveFxRateLabel: td.liveFxRateLabel,
                  fxLoadingLabel: td.fxLoadingLabel,
                  fxUnavailableLabel: td.fxUnavailableLabel,
                  currencyNames: td.currencyNames,
                }}
                onSelectCurrency={setSelectedCurrency}
                onSelectRegion={handleSelectRegion}
              />

              <button
                type="button"
                disabled={isRefreshingManual}
                onClick={() => void handleManualRefresh()}
                className={`w-full sm:w-auto inline-flex items-center justify-center gap-1.5 h-9 px-4 rounded-xl text-[12.5px] font-semibold text-white border transition-all duration-150 whitespace-nowrap shrink-0 cursor-pointer disabled:opacity-55 active:scale-[0.98] ${
                  isXbox
                    ? 'bg-gradient-to-b from-[#169616] to-[#107C10] hover:from-[#1aad1a] hover:to-[#138c13] border-[#6ee755]/35 shadow-sm shadow-[#107C10]/25'
                    : isPs5
                    ? 'bg-gradient-to-b from-[#1486e8] to-[#0070d1] hover:from-[#2696f5] hover:to-[#0d7ee0] border-[#7cc4ff]/35 shadow-sm shadow-[#0070d1]/30'
                    : 'bg-gradient-to-b from-[#0ea5e9] to-[#0284c7] hover:from-[#38bdf8] hover:to-[#0ea5e9] border-sky-300/30 shadow-sm shadow-sky-500/20'
                }`}
              >
                <ArrowsClockwise
                  weight="bold"
                  className={`w-3.5 h-3.5 shrink-0 ${isRefreshingManual ? 'animate-spin' : ''}`}
                />
                <span>{isRefreshingManual ? td.refreshingBtn : td.refreshBtn}</span>
              </button>
            </div>
          </div>

          {/* Sub-Navigation Tab Rail + Quiet Last-Updated Time */}
          <div className="pt-3 border-t border-slate-200 dark:border-white/[0.08] flex flex-col lg:flex-row lg:items-center justify-between gap-2.5">
            <nav
              aria-label={td.pageTitle}
              className="flex flex-wrap items-center gap-1 min-w-0 flex-1"
            >
              {navTabs.map((tab) => {
                const Icon = tab.icon;
                const active = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    aria-pressed={active}
                    onClick={() => setActiveTab(tab.id)}
                    className={`inline-flex items-center gap-1.5 h-9 px-3 rounded-xl text-[12.5px] font-semibold border transition-all duration-150 whitespace-nowrap shrink-0 cursor-pointer active:scale-[0.98] ${
                      active
                        ? isXbox
                          ? 'bg-[#107C10]/25 text-[#7cf25c] border-[#52e042]/45 shadow-xs'
                          : isPs5
                          ? 'bg-[#0070d1]/30 text-white border-[#7cc4ff]/45 shadow-xs'
                          : 'bg-sky-500/12 dark:bg-[#1a9fff]/15 text-[#0284c7] dark:text-[#5cc8ff] border-sky-500/35 dark:border-[#38bdf8]/40 shadow-xs'
                        : isXbox
                        ? 'border-transparent text-[#9ec49b] hover:text-white hover:bg-[#14351b]/65'
                        : isPs5
                        ? 'border-transparent text-[#9eb8dc] hover:text-white hover:bg-white/[0.07]'
                        : 'border-transparent text-slate-600 dark:text-[#8fa3bd] hover:text-slate-900 dark:hover:text-white hover:bg-slate-100/80 dark:hover:bg-white/[0.05]'
                    }`}
                  >
                    <Icon
                      weight={active ? 'fill' : 'regular'}
                      className="w-4 h-4 shrink-0"
                    />
                    <span>{tab.label}</span>
                    {tab.badge !== undefined && (
                      <span
                        dir="ltr"
                        className={`px-1.5 py-0.5 rounded-md text-[10.5px] font-mono-tabular font-bold leading-none ${
                          active
                            ? isXbox
                              ? 'bg-[#52e042]/25 text-[#9eff8a]'
                              : 'bg-sky-500/20 text-[#0284c7] dark:text-[#7dd3fc]'
                            : 'bg-slate-200 dark:bg-white/[0.1] text-slate-700 dark:text-[#cbd6e4]'
                        }`}
                      >
                        {tab.badge}
                      </span>
                    )}
                  </button>
                );
              })}
            </nav>

            {formattedLastUpdated && (
              <span className="inline-flex items-center gap-1.5 text-[11.5px] font-mono-tabular text-slate-500 dark:text-[#8b9bb4] whitespace-nowrap shrink-0">
                <Clock className="w-3.5 h-3.5 shrink-0" />
                <span>
                  {td.lastUpdatedPrefix} {formattedLastUpdated}
                </span>
              </span>
            )}
          </div>
        </header>

        {/* ===================== TAB 1: OVERVIEW & WHAT'S HOT TODAY ===================== */}
        {activeTab === 'overview' && (
          <div className="space-y-6 sm:space-y-8">
            {/* Intelligence KPI Summary Strip */}
            <div className="grid grid-cols-1 xs:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
              <button
                type="button"
                onClick={() => setActiveTab('live-players')}
                className={`sa-ps5-subpanel text-start rounded-2xl border p-4 transition-colors cursor-pointer ${panelSurfaceClass}`}
              >
                <div className="text-[11.5px] text-slate-500 dark:text-[#8b9bb4] truncate">
                  {td.kpiTopPlayers}
                </div>
                <div dir="ltr" className="font-mono-tabular text-xl sm:text-2xl font-bold mt-1 text-slate-900 dark:text-white">
                  {topConcurrentSum !== null ? topConcurrentSum.toLocaleString(t.locale) : '—'}
                </div>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('all-deals')}
                className={`sa-ps5-subpanel text-start rounded-2xl border p-4 transition-colors cursor-pointer ${panelSurfaceClass}`}
              >
                <div className="text-[11.5px] text-slate-500 dark:text-[#8b9bb4] truncate">
                  {td.kpiActiveDeals}
                </div>
                <div dir="ltr" className={`font-mono-tabular text-xl sm:text-2xl font-bold mt-1 ${accentTextClass}`}>
                  {overview
                    ? (
                        overview.featuredDeals.length +
                        overview.bestDiscounts.length +
                        overview.recentlyUpdatedDeals.length
                      ).toLocaleString(t.locale)
                    : '—'}
                </div>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('free-games')}
                className={`sa-ps5-subpanel text-start rounded-2xl border p-4 transition-colors cursor-pointer ${panelSurfaceClass}`}
              >
                <div className="text-[11.5px] text-slate-500 dark:text-[#8b9bb4] truncate">
                  {td.kpiFreeNow}
                </div>
                <div dir="ltr" className="font-mono-tabular text-xl sm:text-2xl font-bold mt-1 text-emerald-600 dark:text-[#4ade80]">
                  {overview ? overview.freeSpotlights.length : '—'}
                </div>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('alerts')}
                className={`sa-ps5-subpanel text-start rounded-2xl border p-4 transition-colors cursor-pointer ${panelSurfaceClass}`}
              >
                <div className="text-[11.5px] text-slate-500 dark:text-[#8b9bb4] truncate">
                  {td.kpiFollowedAlerts}
                </div>
                <div dir="ltr" className="font-mono-tabular text-xl sm:text-2xl font-bold mt-1 text-amber-500">
                  {alertRules.length}
                </div>
              </button>
            </div>

            {/* WHAT'S HOT TODAY */}
            {(liveSnapshot || overview) && (
              <section className={`sa-ps5-panel rounded-2xl border p-4 sm:p-5 space-y-4 ${panelSurfaceClass}`}>
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2">
                      <Fire weight="duotone" className="w-5 h-5 text-amber-500 shrink-0" />
                      <h2 className="font-display text-base sm:text-lg font-bold text-slate-900 dark:text-white">
                        {td.whatsHotTodayTitle}
                      </h2>
                    </div>
                    <p className="text-[12px] text-slate-500 dark:text-[#8b9bb4]">
                      {td.whatsHotSubtitle}
                    </p>
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
                        { id: 'most-played', label: td.hotMostPlayed },
                        { id: 'biggest-gains', label: td.hotBiggestGains },
                        { id: 'new-releases', label: td.hotNewReleases },
                        { id: 'best-discounts', label: td.hotBestDiscounts },
                      ] as const
                    ).map((m) => (
                      <button
                        key={m.id}
                        type="button"
                        aria-pressed={hotMode === m.id}
                        onClick={() => setHotMode(m.id)}
                        className={`px-3 py-1.5 rounded-lg text-[12px] font-semibold cursor-pointer transition-all duration-150 whitespace-nowrap active:scale-[0.98] ${
                          hotMode === m.id
                            ? isXbox
                              ? 'bg-[#107C10] text-white shadow-xs'
                              : isPs5
                              ? 'bg-[#0070d1] text-white shadow-xs'
                              : 'bg-white dark:bg-[#1b2533] text-slate-900 dark:text-white shadow-xs ring-1 ring-slate-200/80 dark:ring-white/[0.1]'
                            : 'text-slate-600 dark:text-[#8fa3bd] hover:text-slate-900 dark:hover:text-white hover:bg-white/60 dark:hover:bg-white/[0.05]'
                        }`}
                      >
                        {m.label}
                      </button>
                    ))}
                  </div>
                </div>

                {hotMode === 'best-discounts' && overview?.bestDiscounts ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
                    {overview.bestDiscounts.slice(0, 4).map((game) => (
                      <DealCard
                        key={game.canonicalKey}
                        game={game}
                        locale={t.locale}
                        activeTheme={activeTheme}
                        selectedCurrency={selectedCurrency}
                        fxSnapshot={fxSnapshot}
                        isCompared={comparedKeys.has(
                          game.steamAppId ? `steam:${game.steamAppId}` : game.canonicalKey
                        )}
                        isFollowed={followedKeys.has(game.canonicalKey)}
                        labels={dealCardLabels}
                        onOpenDetail={(g) =>
                          setSelectedDossierTarget({
                            title: g.title,
                            steamAppId: g.steamAppId,
                            cheapsharkGameId: g.cheapsharkGameId,
                            thumbUrl: g.thumbUrl,
                            dealGame: g,
                          })
                        }
                        onOpenExternal={onOpenExternal}
                        onToggleCompare={handleToggleCompareDeal}
                        onToggleAlert={handleToggleAlertDeal}
                        compact
                      />
                    ))}
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
                    {hotSteamList.slice(0, 8).map((entry) => {
                      const pct =
                        typeof entry.dayChangeFraction === 'number'
                          ? entry.dayChangeFraction * 100
                          : null;
                      return (
                        <button
                          key={entry.appId}
                          type="button"
                          onClick={() =>
                            setSelectedDossierTarget({
                              steamAppId: entry.appId,
                              title: entry.title,
                              thumbUrl: entry.headerImage,
                              liveEntry: entry,
                            })
                          }
                          className="text-start rounded-xl border border-slate-200 dark:border-white/[0.08] bg-slate-50/75 dark:bg-[#10161e] hover:border-sky-500/50 overflow-hidden transition-all cursor-pointer flex flex-col"
                        >
                          <div className="relative aspect-[16/9] bg-slate-200 dark:bg-[#0e141b]">
                            {entry.headerImage && (
                              <img
                                src={entry.headerImage}
                                alt={entry.title}
                                loading="lazy"
                                referrerPolicy="no-referrer"
                                className="w-full h-full object-cover"
                              />
                            )}
                            <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-transparent to-transparent" />
                            <div dir="ltr" className="absolute bottom-2 inset-x-2.5 flex items-center justify-between text-white text-[11.5px] font-mono-tabular font-bold">
                              <span>{entry.currentPlayers.toLocaleString(t.locale)} playing</span>
                              {pct !== null && (
                                <span
                                  className={`inline-flex items-center gap-0.5 ${
                                    pct >= 0 ? 'text-emerald-300' : 'text-rose-300'
                                  }`}
                                >
                                  <ArrowUpRight className="w-3 h-3" />
                                  {pct >= 0 ? '+' : ''}
                                  {pct.toFixed(1)}%
                                </span>
                              )}
                            </div>
                          </div>
                          <div className="p-3 min-w-0">
                            <div className="font-display text-[13.5px] font-bold text-slate-900 dark:text-white truncate">
                              {entry.title}
                            </div>
                            <div className="text-[11px] font-mono-tabular text-slate-500 dark:text-[#8b9bb4]">
                              {entry.rank > 0 ? `#${entry.rank} Steam · ` : ''}
                              {entry.onSalePercent ? `-${entry.onSalePercent}% on Steam` : `App #${entry.appId}`}
                            </div>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )}
              </section>
            )}

            {isLoadingOverview && !overview ? (
              <DealSkeletonGrid count={8} activeTheme={activeTheme} />
            ) : overviewError && !overview ? (
              <div className={`sa-ps5-panel rounded-2xl border p-8 text-center space-y-3 ${panelSurfaceClass}`}>
                {isOffline ? (
                  <WifiSlash className="w-9 h-9 text-rose-500 mx-auto" />
                ) : (
                  <WarningCircle className="w-9 h-9 text-rose-500 mx-auto" />
                )}
                <h2 className="font-display text-lg font-bold text-slate-900 dark:text-white">
                  {td.errorTitle}
                </h2>
                <p className="text-[13px] text-slate-600 dark:text-[#9cb0c9] max-w-md mx-auto">
                  {isOffline ? td.offlineDesc : overviewError}
                </p>
                <button
                  type="button"
                  onClick={() => void fetchOverviewData(true)}
                  className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg text-white text-[13px] font-semibold cursor-pointer ${
                    isXbox
                      ? 'bg-[#107C10] hover:bg-[#159315]'
                      : 'bg-[#0284c7] hover:bg-[#0369a1] dark:bg-[#1a9fff] dark:hover:bg-[#38adff]'
                  }`}
                >
                  <ArrowsClockwise className="w-4 h-4" />
                  <span>{td.retryBtn}</span>
                </button>
              </div>
            ) : overview ? (
              <>
                {/* Featured Deals */}
                {overview.featuredDeals.length > 0 && (
                  <section className="space-y-3.5">
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2.5 min-w-0 flex-1">
                        <Sparkle weight="duotone" className={`w-5 h-5 shrink-0 ${accentTextClass}`} />
                        <h2 className="font-display text-base sm:text-lg font-bold text-slate-900 dark:text-white truncate">
                          {td.featuredDealsTitle}
                        </h2>
                        <div className="h-px flex-1 bg-slate-200 dark:bg-white/[0.08]" />
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          setSortBy('deal-rating');
                          setActiveTab('all-deals');
                        }}
                        className={`text-[12.5px] font-semibold hover:underline whitespace-nowrap shrink-0 cursor-pointer ${accentTextClass}`}
                      >
                        {td.viewAllBtn}
                      </button>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-4">
                      {overview.featuredDeals.slice(0, 10).map((game) => (
                        <DealCard
                          key={game.canonicalKey}
                          game={game}
                          locale={t.locale}
                          activeTheme={activeTheme}
                          selectedCurrency={selectedCurrency}
                          fxSnapshot={fxSnapshot}
                          isCompared={comparedKeys.has(
                            game.steamAppId ? `steam:${game.steamAppId}` : game.canonicalKey
                          )}
                          isFollowed={followedKeys.has(game.canonicalKey)}
                          labels={dealCardLabels}
                          onOpenDetail={(g) =>
                            setSelectedDossierTarget({
                              title: g.title,
                              steamAppId: g.steamAppId,
                              cheapsharkGameId: g.cheapsharkGameId,
                              thumbUrl: g.thumbUrl,
                              dealGame: g,
                            })
                          }
                          onOpenExternal={onOpenExternal}
                          onToggleCompare={handleToggleCompareDeal}
                          onToggleAlert={handleToggleAlertDeal}
                        />
                      ))}
                    </div>
                  </section>
                )}

                {/* Free Games Spotlight */}
                {overview.freeSpotlights.length > 0 && (
                  <section className="space-y-3.5">
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2.5 min-w-0 flex-1">
                        <Gift
                          weight="duotone"
                          className="w-5 h-5 text-emerald-600 dark:text-[#4ade80] shrink-0"
                        />
                        <h2 className="font-display text-base sm:text-lg font-bold text-slate-900 dark:text-white truncate">
                          {td.freeGamesSpotlightTitle}
                        </h2>
                        <div className="h-px flex-1 bg-slate-200 dark:bg-white/[0.08]" />
                      </div>
                      <button
                        type="button"
                        onClick={() => setActiveTab('free-games')}
                        className="text-[12.5px] font-semibold text-emerald-600 dark:text-[#4ade80] hover:underline whitespace-nowrap shrink-0 cursor-pointer"
                      >
                        {td.viewAllBtn}
                      </button>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                      {overview.freeSpotlights.slice(0, 8).map((offer) => (
                        <FreeOfferCard
                          key={offer.id}
                          offer={offer}
                          locale={t.locale}
                          activeTheme={activeTheme}
                          labels={freeCardLabels}
                          onOpenExternal={onOpenExternal}
                        />
                      ))}
                    </div>
                  </section>
                )}

                {/* Best Discounts */}
                {overview.bestDiscounts.length > 0 && (
                  <section className="space-y-3.5">
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2.5 min-w-0 flex-1">
                        <Percent
                          weight="bold"
                          className="w-5 h-5 text-emerald-600 dark:text-[#4ade80] shrink-0"
                        />
                        <h2 className="font-display text-base sm:text-lg font-bold text-slate-900 dark:text-white truncate">
                          {td.bestDiscountsTitle}
                        </h2>
                        <div className="h-px flex-1 bg-slate-200 dark:bg-white/[0.08]" />
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          setSortBy('savings');
                          setActiveTab('all-deals');
                        }}
                        className={`text-[12.5px] font-semibold hover:underline whitespace-nowrap shrink-0 cursor-pointer ${accentTextClass}`}
                      >
                        {td.viewAllBtn}
                      </button>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                      {overview.bestDiscounts.slice(0, 8).map((game) => (
                        <DealCard
                          key={game.canonicalKey}
                          game={game}
                          locale={t.locale}
                          activeTheme={activeTheme}
                          selectedCurrency={selectedCurrency}
                          fxSnapshot={fxSnapshot}
                          isCompared={comparedKeys.has(
                            game.steamAppId ? `steam:${game.steamAppId}` : game.canonicalKey
                          )}
                          isFollowed={followedKeys.has(game.canonicalKey)}
                          labels={dealCardLabels}
                          onOpenDetail={(g) =>
                            setSelectedDossierTarget({
                              title: g.title,
                              steamAppId: g.steamAppId,
                              cheapsharkGameId: g.cheapsharkGameId,
                              thumbUrl: g.thumbUrl,
                              dealGame: g,
                            })
                          }
                          onOpenExternal={onOpenExternal}
                          onToggleCompare={handleToggleCompareDeal}
                          onToggleAlert={handleToggleAlertDeal}
                          compact
                        />
                      ))}
                    </div>
                  </section>
                )}

                {/* Trending Deals */}
                {overview.trendingDeals.length > 0 && (
                  <section className="space-y-3.5">
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2.5 min-w-0 flex-1">
                        <Flame weight="duotone" className="w-5 h-5 text-amber-500 shrink-0" />
                        <h2 className="font-display text-base sm:text-lg font-bold text-slate-900 dark:text-white truncate">
                          {td.trendingDealsTitle}
                        </h2>
                        <div className="h-px flex-1 bg-slate-200 dark:bg-white/[0.08]" />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                      {overview.trendingDeals.slice(0, 8).map((game) => (
                        <DealCard
                          key={game.canonicalKey}
                          game={game}
                          locale={t.locale}
                          activeTheme={activeTheme}
                          selectedCurrency={selectedCurrency}
                          fxSnapshot={fxSnapshot}
                          isCompared={comparedKeys.has(
                            game.steamAppId ? `steam:${game.steamAppId}` : game.canonicalKey
                          )}
                          isFollowed={followedKeys.has(game.canonicalKey)}
                          labels={dealCardLabels}
                          onOpenDetail={(g) =>
                            setSelectedDossierTarget({
                              title: g.title,
                              steamAppId: g.steamAppId,
                              cheapsharkGameId: g.cheapsharkGameId,
                              thumbUrl: g.thumbUrl,
                              dealGame: g,
                            })
                          }
                          onOpenExternal={onOpenExternal}
                          onToggleCompare={handleToggleCompareDeal}
                          onToggleAlert={handleToggleAlertDeal}
                          compact
                        />
                      ))}
                    </div>
                  </section>
                )}
              </>
            ) : null}
          </div>
        )}

        {/* ===================== TAB 2: ALL DEALS ===================== */}
        {activeTab === 'all-deals' && (
          <div className="space-y-5">
            <div className={`sa-ps5-panel rounded-2xl border p-3.5 sm:p-4 space-y-3 ${panelSurfaceClass}`}>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-2.5">
                <div className="sm:col-span-2 lg:col-span-1 xl:col-span-2 relative flex items-center min-w-0">
                  <MagnifyingGlass className="w-4 h-4 text-slate-400 absolute start-3 pointer-events-none" />
                  <input
                    type="text"
                    value={searchInput}
                    onChange={(e) => setSearchInput(e.target.value)}
                    placeholder={td.searchPlaceholder}
                    className="w-full min-w-0 min-h-[38px] ps-9 pe-8 rounded-lg border border-slate-200 dark:border-white/[0.1] bg-slate-50 dark:bg-[#10161e] text-[13px] text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#0284c7] dark:focus:ring-[#38bdf8]"
                  />
                  {searchInput && (
                    <button
                      type="button"
                      onClick={() => setSearchInput('')}
                      aria-label={td.resetFiltersBtn}
                      className="absolute end-2.5 text-slate-400 hover:text-slate-600 dark:hover:text-white cursor-pointer"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                <div className="relative min-w-0">
                  <select
                    value={selectedStoreId}
                    onChange={(e) => {
                      setSelectedStoreId(e.target.value);
                      setPageNumber(0);
                    }}
                    aria-label={td.storeFilterAll}
                    className="appearance-none w-full min-w-0 h-[38px] ps-3 pe-8 rounded-xl border border-slate-200 dark:border-white/[0.1] bg-slate-50 hover:bg-white dark:bg-[#10161e] dark:hover:bg-[#151e29] text-[12.5px] font-medium text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#0284c7] cursor-pointer transition-colors"
                  >
                    <option value="all">{td.storeFilterAll}</option>
                    {allStores.map((store) => (
                      <option key={store.storeId} value={store.storeId}>
                        {store.storeName}
                      </option>
                    ))}
                  </select>
                  <CaretDown
                    weight="bold"
                    className="w-3.5 h-3.5 text-slate-400 absolute end-2.5 top-1/2 -translate-y-1/2 pointer-events-none"
                  />
                </div>

                <div className="flex items-center gap-2 min-w-0">
                  <input
                    type="number"
                    min="0"
                    step="1"
                    value={minPrice}
                    onChange={(e) => {
                      setMinPrice(e.target.value);
                      setPageNumber(0);
                    }}
                    placeholder={`${td.minPriceLabel} (${selectedCurrency})`}
                    aria-label={`${td.minPriceLabel} (${selectedCurrency})`}
                    className="w-1/2 min-w-0 h-[38px] px-2.5 rounded-xl border border-slate-200 dark:border-white/[0.1] bg-slate-50 dark:bg-[#10161e] text-[12.5px] font-mono-tabular text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#0284c7]"
                  />
                  <input
                    type="number"
                    min="0"
                    step="1"
                    value={maxPrice}
                    onChange={(e) => {
                      setMaxPrice(e.target.value);
                      setPageNumber(0);
                    }}
                    placeholder={`${td.maxPriceLabel} (${selectedCurrency})`}
                    aria-label={`${td.maxPriceLabel} (${selectedCurrency})`}
                    className="w-1/2 min-w-0 h-[38px] px-2.5 rounded-xl border border-slate-200 dark:border-white/[0.1] bg-slate-50 dark:bg-[#10161e] text-[12.5px] font-mono-tabular text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#0284c7]"
                  />
                </div>

                <div className="relative min-w-0">
                  <select
                    value={minDiscount}
                    onChange={(e) => {
                      setMinDiscount(Number(e.target.value));
                      setPageNumber(0);
                    }}
                    aria-label={td.minDiscountLabel}
                    className="appearance-none w-full min-w-0 h-[38px] ps-3 pe-8 rounded-xl border border-slate-200 dark:border-white/[0.1] bg-slate-50 hover:bg-white dark:bg-[#10161e] dark:hover:bg-[#151e29] text-[12.5px] font-medium text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#0284c7] cursor-pointer transition-colors"
                  >
                    <option value={0}>
                      {td.minDiscountLabel}: {td.discountAny}
                    </option>
                    <option value={25}>25%+</option>
                    <option value={50}>50%+</option>
                    <option value={75}>75%+</option>
                    <option value={90}>90%+</option>
                  </select>
                  <CaretDown
                    weight="bold"
                    className="w-3.5 h-3.5 text-slate-400 absolute end-2.5 top-1/2 -translate-y-1/2 pointer-events-none"
                  />
                </div>

                <div className="relative min-w-0">
                  <select
                    value={sortBy}
                    onChange={(e) => {
                      setSortBy(e.target.value as DealsSortOption);
                      setPageNumber(0);
                    }}
                    aria-label={td.sortLabel}
                    className="appearance-none w-full min-w-0 h-[38px] ps-3 pe-8 rounded-xl border border-slate-200 dark:border-white/[0.1] bg-slate-50 hover:bg-white dark:bg-[#10161e] dark:hover:bg-[#151e29] text-[12.5px] font-medium text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#0284c7] cursor-pointer transition-colors"
                  >
                    <option value="deal-rating">{td.sortDealRating}</option>
                    <option value="savings">{td.sortSavings}</option>
                    <option value="price-asc">{td.sortPriceAsc}</option>
                    <option value="price-desc">{td.sortPriceDesc}</option>
                    <option value="recent">{td.sortRecent}</option>
                    <option value="metacritic">{td.sortMetacritic}</option>
                    <option value="title">{td.sortTitle}</option>
                  </select>
                  <CaretDown
                    weight="bold"
                    className="w-3.5 h-3.5 text-slate-400 absolute end-2.5 top-1/2 -translate-y-1/2 pointer-events-none"
                  />
                </div>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-2 text-[12px] text-slate-500 dark:text-[#8b9bb4]">
                <div className="flex items-center gap-2 font-mono-tabular">
                  <Funnel className="w-3.5 h-3.5" />
                  <span>
                    {dealsPage ? `${dealsPage.items.length} ${td.resultsCountSuffix}` : '—'}
                  </span>
                </div>

                <button
                  type="button"
                  onClick={handleResetFilters}
                  className={`text-[12px] font-semibold hover:underline cursor-pointer ${accentTextClass}`}
                >
                  {td.resetFiltersBtn}
                </button>
              </div>
            </div>

            {isLoadingDeals ? (
              <DealSkeletonGrid count={12} activeTheme={activeTheme} />
            ) : dealsError ? (
              <div className={`sa-ps5-panel rounded-2xl border p-8 text-center space-y-3 ${panelSurfaceClass}`}>
                <WarningCircle className="w-8 h-8 text-rose-500 mx-auto" />
                <h2 className="font-display text-lg font-bold text-slate-900 dark:text-white">
                  {td.errorTitle}
                </h2>
                <p className="text-[13px] text-slate-600 dark:text-[#9cb0c9]">{dealsError}</p>
                <button
                  type="button"
                  onClick={() => void fetchAllDealsData(true)}
                  className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg text-white text-[13px] font-semibold cursor-pointer ${
                    isXbox
                      ? 'bg-[#107C10] hover:bg-[#159315]'
                      : 'bg-[#0284c7] hover:bg-[#0369a1] dark:bg-[#1a9fff] dark:hover:bg-[#38adff]'
                  }`}
                >
                  <ArrowsClockwise className="w-4 h-4" />
                  <span>{td.retryBtn}</span>
                </button>
              </div>
            ) : dealsPage && dealsPage.items.length === 0 ? (
              <div className={`sa-ps5-panel rounded-2xl border p-10 text-center space-y-2.5 ${panelSurfaceClass}`}>
                <MagnifyingGlass className="w-8 h-8 text-slate-400 mx-auto" />
                <h2 className="font-display text-base font-bold text-slate-900 dark:text-white">
                  {td.emptyDealsTitle}
                </h2>
                <p className="text-[13px] text-slate-500 dark:text-[#8b9bb4]">
                  {td.emptyDealsDesc}
                </p>
              </div>
            ) : dealsPage ? (
              <>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                  {dealsPage.items.map((game) => (
                    <DealCard
                      key={game.canonicalKey}
                      game={game}
                      locale={t.locale}
                      activeTheme={activeTheme}
                      selectedCurrency={selectedCurrency}
                      fxSnapshot={fxSnapshot}
                      isCompared={comparedKeys.has(
                        game.steamAppId ? `steam:${game.steamAppId}` : game.canonicalKey
                      )}
                      isFollowed={followedKeys.has(game.canonicalKey)}
                      labels={dealCardLabels}
                      onOpenDetail={(g) =>
                        setSelectedDossierTarget({
                          title: g.title,
                          steamAppId: g.steamAppId,
                          cheapsharkGameId: g.cheapsharkGameId,
                          thumbUrl: g.thumbUrl,
                          dealGame: g,
                        })
                      }
                      onOpenExternal={onOpenExternal}
                      onToggleCompare={handleToggleCompareDeal}
                      onToggleAlert={handleToggleAlertDeal}
                    />
                  ))}
                </div>

                {/* Pagination */}
                <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
                  <button
                    type="button"
                    disabled={pageNumber <= 0}
                    onClick={() => setPageNumber((p) => Math.max(0, p - 1))}
                    className={`sa-ps5-subpanel inline-flex items-center gap-1.5 h-9 px-3.5 rounded-xl border disabled:opacity-40 text-[12.5px] font-semibold cursor-pointer transition-all hover:border-slate-300 dark:hover:border-white/[0.2] active:scale-[0.98] ${panelSurfaceClass}`}
                  >
                    <CaretLeft weight="bold" className="w-3.5 h-3.5 rtl:rotate-180" />
                    <span>{td.prevPageBtn}</span>
                  </button>

                  <span className="font-mono-tabular text-[12.5px] font-semibold text-slate-600 dark:text-[#9cb0c9]">
                    {td.pageLabel} {pageNumber + 1} {td.ofLabel} {dealsPage.totalPages}
                  </span>

                  <button
                    type="button"
                    disabled={!dealsPage.hasNextPage}
                    onClick={() => setPageNumber((p) => p + 1)}
                    className={`sa-ps5-subpanel inline-flex items-center gap-1.5 h-9 px-3.5 rounded-xl border disabled:opacity-40 text-[12.5px] font-semibold cursor-pointer transition-all hover:border-slate-300 dark:hover:border-white/[0.2] active:scale-[0.98] ${panelSurfaceClass}`}
                  >
                    <span>{td.nextPageBtn}</span>
                    <CaretRight weight="bold" className="w-3.5 h-3.5 rtl:rotate-180" />
                  </button>
                </div>
              </>
            ) : null}
          </div>
        )}

        {/* ===================== TAB 3: LIVE PLAYERS & TRENDS ===================== */}
        {activeTab === 'live-players' && (
          <LivePlayersView
            snapshot={liveSnapshot}
            isLoading={isLoadingLive}
            locale={t.locale}
            activeTheme={activeTheme}
            selectedCurrency={selectedCurrency}
            fxSnapshot={fxSnapshot}
            comparedKeys={comparedKeys}
            followedKeys={followedKeys}
            labels={{
              livePlayersTitle: td.livePlayersTitle,
              livePlayersSubtitle: td.livePlayersSubtitle,
              liveTabTop100: td.liveTabTop100,
              liveTabGainers: td.liveTabGainers,
              liveTabDecliners: td.liveTabDecliners,
              liveTabReviewMovers: td.liveTabReviewMovers,
              liveSearchPlaceholder: td.liveSearchPlaceholder,
              liveColRank: td.liveColRank,
              liveColGame: td.liveColGame,
              liveColPlayers: td.liveColPlayers,
              liveColPeak24h: td.liveColPeak24h,
              liveColChange24h: td.liveColChange24h,
              liveColTrend7d: td.liveColTrend7d,
              liveColPrice: td.liveColPrice,
              liveColActions: td.liveColActions,
              healthLegendTitle: td.healthLegendTitle,
              healthLegendDesc: td.healthLegendDesc,
              healthTiers: td.healthTiers,
              compareAddBtn: td.compareAddBtn,
              compareAddedBadge: td.compareAddedBadge,
              alertsFollowBtn: td.alertsFollowBtn,
              alertsFollowingBadge: td.alertsFollowingBadge,
              freeBadge: td.freeBadge,
              noChartData: td.noChartData,
            }}
            onOpenGameByLiveEntry={(entry) =>
              setSelectedDossierTarget({
                steamAppId: entry.appId,
                title: entry.title,
                thumbUrl: entry.headerImage,
                liveEntry: entry,
              })
            }
            onOpenGameByAppId={(appId, title) =>
              setSelectedDossierTarget({
                steamAppId: appId,
                title,
              })
            }
            onToggleCompareLive={handleToggleCompareLive}
            onToggleAlertLive={handleToggleAlertLive}
            onOpenExternal={onOpenExternal}
          />
        )}

        {/* ===================== TAB 4: FREE GAMES & GIVEAWAYS ===================== */}
        {activeTab === 'free-games' && (
          <div className="space-y-5">
            <div className="flex flex-col gap-3">
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
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
                      {
                        id: 'limited_time_free' as const,
                        label: td.freeCatLimited,
                        count: freeSnapshot?.limitedTimeFree.length ?? 0,
                      },
                      {
                        id: 'giveaway' as const,
                        label: td.freeCatGiveaways,
                        count: freeSnapshot?.giveaways.length ?? 0,
                      },
                      {
                        id: 'free_to_play' as const,
                        label: td.freeCatFreeToPlay,
                        count: freeSnapshot?.freeToPlay.length ?? 0,
                      },
                    ] as const
                  ).map((cat) => {
                    const active = freeCategory === cat.id;
                    return (
                      <button
                        key={cat.id}
                        type="button"
                        aria-pressed={active}
                        onClick={() => setFreeCategory(cat.id)}
                        className={`inline-flex items-center gap-2 h-8 px-3 rounded-lg text-[12.5px] font-semibold transition-all duration-150 whitespace-nowrap cursor-pointer active:scale-[0.98] ${
                          active
                            ? 'bg-emerald-600 text-white shadow-xs'
                            : 'text-slate-600 dark:text-[#8fa3bd] hover:text-slate-900 dark:hover:text-white hover:bg-white/60 dark:hover:bg-white/[0.05]'
                        }`}
                      >
                        <span>{cat.label}</span>
                        <span className="font-mono-tabular text-[11px] opacity-80">
                          {cat.count}
                        </span>
                      </button>
                    );
                  })}
                </div>

                {/* Store & DLC Segmented Filter */}
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
                      { id: 'all', label: td.freeFilterAll },
                      { id: 'epic', label: td.freeFilterEpic },
                      { id: 'steam', label: td.freeFilterSteam },
                      { id: 'gog', label: td.freeFilterGog },
                      { id: 'pc_dlc', label: td.freeFilterPcDlc },
                    ] as const
                  ).map((sf) => (
                    <button
                      key={sf.id}
                      type="button"
                      aria-pressed={freeStoreFilter === sf.id}
                      onClick={() => setFreeStoreFilter(sf.id)}
                      className={`h-8 px-2.5 rounded-lg text-[12px] font-semibold cursor-pointer transition-all duration-150 whitespace-nowrap active:scale-[0.98] ${
                        freeStoreFilter === sf.id
                          ? isXbox
                            ? 'bg-[#107C10] text-white shadow-xs'
                            : isPs5
                            ? 'bg-[#0070d1] text-white shadow-xs'
                            : 'bg-white dark:bg-[#1b2533] text-slate-900 dark:text-white shadow-xs ring-1 ring-slate-200/80 dark:ring-white/[0.1]'
                          : 'text-slate-600 dark:text-[#8fa3bd] hover:text-slate-900 dark:hover:text-white hover:bg-white/60 dark:hover:bg-white/[0.05]'
                      }`}
                    >
                      {sf.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {isLoadingFree && !freeSnapshot ? (
              <DealSkeletonGrid count={8} activeTheme={activeTheme} />
            ) : freeError && !freeSnapshot ? (
              <div className={`sa-ps5-panel rounded-2xl border p-8 text-center space-y-3 ${panelSurfaceClass}`}>
                <WarningCircle className="w-8 h-8 text-rose-500 mx-auto" />
                <h2 className="font-display text-lg font-bold text-slate-900 dark:text-white">
                  {td.errorTitle}
                </h2>
                <p className="text-[13px] text-slate-600 dark:text-[#9cb0c9]">{freeError}</p>
                <button
                  type="button"
                  onClick={() => void fetchFreeGamesData(true)}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-[#0284c7] text-white text-[13px] font-semibold cursor-pointer"
                >
                  <ArrowsClockwise className="w-4 h-4" />
                  <span>{td.retryBtn}</span>
                </button>
              </div>
            ) : activeFreeList.length === 0 ? (
              <div className={`sa-ps5-panel rounded-2xl border p-10 text-center space-y-2.5 ${panelSurfaceClass}`}>
                <Gift className="w-8 h-8 text-slate-400 mx-auto" />
                <h2 className="font-display text-base font-bold text-slate-900 dark:text-white">
                  {td.emptyFreeTitle}
                </h2>
                <p className="text-[13px] text-slate-500 dark:text-[#8b9bb4]">
                  {td.emptyFreeDesc}
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {activeFreeList.map((offer) => (
                  <FreeOfferCard
                    key={offer.id}
                    offer={offer}
                    locale={t.locale}
                    activeTheme={activeTheme}
                    labels={freeCardLabels}
                    onOpenExternal={onOpenExternal}
                  />
                ))}
              </div>
            )}
          </div>
        )}

        {/* ===================== TAB 5: COMPARE GAMES ===================== */}
        {activeTab === 'compare' && (
          <GameCompareView
            selectedItems={compareItems}
            stores={allStores}
            locale={t.locale}
            activeTheme={activeTheme}
            selectedCurrency={selectedCurrency}
            fxSnapshot={fxSnapshot}
            labels={{
              compareTitle: td.compareTitle,
              compareSubtitle: td.compareSubtitle,
              compareSearchPlaceholder: td.compareSearchPlaceholder,
              compareAddBtn: td.compareAddBtn,
              compareRemoveBtn: td.compareRemoveBtn,
              compareClearBtn: td.compareClearBtn,
              compareEmptyTitle: td.compareEmptyTitle,
              compareEmptyDesc: td.compareEmptyDesc,
              compareMaxNotice: td.compareMaxNotice,
              compareMetricCol: td.compareMetricCol,
              healthTiers: td.healthTiers,
              liveColPlayers: td.liveColPlayers,
              liveColPeak24h: td.liveColPeak24h,
              liveColChange24h: td.liveColChange24h,
              healthStatusLabel: td.healthStatusLabel,
              steamRatingCardTitle: td.steamRatingCardTitle,
              metacriticScoreCardTitle: td.metacriticScoreCardTitle,
              metacriticUserCardTitle: td.metacriticUserCardTitle,
              openCriticCardTitle: td.openCriticCardTitle,
              detailBestPriceLabel: td.detailBestPriceLabel,
              detailHistoricalLowLabel: td.detailHistoricalLowLabel,
              releaseDateLabel: td.releaseDateLabel,
              developerLabel: td.developerLabel,
              freeBadge: td.freeBadge,
            }}
            onAddSelection={toggleCompareItem}
            onRemoveSelection={(k) =>
              setCompareItems((prev) => prev.filter((p) => p.key !== k))
            }
            onClearAll={() => setCompareItems([])}
          />
        )}

        {/* ===================== TAB 6: PRICE ALERTS ===================== */}
        {activeTab === 'alerts' && (
          <PriceAlertsView
            rules={alertRules}
            events={alertEvents}
            isChecking={isCheckingAlerts}
            locale={t.locale}
            activeTheme={activeTheme}
            selectedCurrency={selectedCurrency}
            fxSnapshot={fxSnapshot}
            labels={{
              alertsTitle: td.alertsTitle,
              alertsSubtitle: td.alertsSubtitle,
              alertsCheckNowBtn: td.alertsCheckNowBtn,
              alertsCheckingBtn: td.alertsCheckingBtn,
              alertsTargetPriceLabel: td.alertsTargetPriceLabel,
              alertsAnyDropOption: td.alertsAnyDropOption,
              alertsLastCheckedLabel: td.alertsLastCheckedLabel,
              alertsTriggeredTitle: td.alertsTriggeredTitle,
              alertsFollowedTitle: td.alertsFollowedTitle,
              alertsMarkAllReadBtn: td.alertsMarkAllReadBtn,
              alertsClearEventsBtn: td.alertsClearEventsBtn,
              alertsEmptyFollowed: td.alertsEmptyFollowed,
              alertsEmptyTriggered: td.alertsEmptyTriggered,
              viewDealBtn: td.viewDealBtn,
              freeBadge: td.freeBadge,
            }}
            onCheckNow={() => void runAlertPriceChecks(true)}
            onUpdateTargetUsd={(ruleId, targetUsd) =>
              setAlertRules(updateAlertTargetPrice(ruleId, targetUsd))
            }
            onUnfollow={(ruleId) => setAlertRules(unfollowPriceAlertRule(ruleId))}
            onMarkAllRead={() => setAlertEvents(markAllPriceAlertEventsRead())}
            onClearEvents={() => setAlertEvents(clearPriceAlertEvents())}
            onOpenExternal={onOpenExternal}
          />
        )}

        {/* ===================== TAB 7: STORE EXPLORER ===================== */}
        {activeTab === 'stores' && (
          <div className="space-y-4 pb-2">
            <div className="space-y-1">
              <h2 className="font-display text-lg font-bold text-slate-900 dark:text-white">
                {td.storesTitle}
              </h2>
              <p className="text-[13px] text-slate-500 dark:text-[#8b9bb4]">
                {td.storesSubtitle}
              </p>
            </div>

            {isLoadingOverview && allStores.length === 0 ? (
              <DealSkeletonGrid count={8} activeTheme={activeTheme} />
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {allStores.map((store) => (
                  <button
                    key={store.storeId}
                    type="button"
                    onClick={() => handleBrowseStore(store.storeId)}
                    className={`sa-ps5-subpanel text-start rounded-xl border p-4 transition-all duration-150 hover:-translate-y-0.5 cursor-pointer flex flex-col justify-between gap-3 ${panelSurfaceClass}`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-11 h-11 rounded-lg bg-slate-900/90 border border-white/[0.1] flex items-center justify-center p-2 shrink-0">
                        {store.logoUrl || store.iconUrl ? (
                          <img
                            src={store.logoUrl || store.iconUrl || ''}
                            alt={store.storeName}
                            loading="lazy"
                            referrerPolicy="no-referrer"
                            className="w-full h-full object-contain"
                          />
                        ) : (
                          <Storefront className="w-5 h-5 text-white" />
                        )}
                      </div>
                      <div className="min-w-0">
                        <div className="font-display text-[15px] font-bold text-slate-900 dark:text-white truncate">
                          {store.storeName}
                        </div>
                        <div className="text-[11.5px] font-mono-tabular text-slate-500 dark:text-[#8b9bb4]">
                          {typeof store.activeDealCount === 'number' && store.activeDealCount > 0
                            ? `${store.activeDealCount} ${td.storeActiveDealsSuffix}`
                            : td.browseStoreBtn}
                          {typeof store.topSavingsPercent === 'number' &&
                          store.topSavingsPercent > 0
                            ? ` · ${td.storeTopDiscountPrefix} -${store.topSavingsPercent}%`
                            : ''}
                        </div>
                      </div>
                    </div>

                    <div
                      className={`pt-2 border-t border-slate-200/80 dark:border-white/[0.07] flex items-center justify-between text-[12px] font-semibold ${accentTextClass}`}
                    >
                      <span>{td.browseStoreBtn}</span>
                      <CaretRight weight="bold" className="w-3.5 h-3.5 rtl:rotate-180" />
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Full Game Intelligence Dossier Modal */}
      <DealGameDetailModal
        target={selectedDossierTarget}
        stores={allStores}
        locale={t.locale}
        activeTheme={activeTheme}
        selectedCurrency={selectedCurrency}
        fxSnapshot={fxSnapshot}
        isCompared={
          selectedDossierTarget
            ? comparedKeys.has(
                selectedDossierTarget.steamAppId
                  ? `steam:${selectedDossierTarget.steamAppId}`
                  : selectedDossierTarget.dealGame?.canonicalKey || ''
              )
            : false
        }
        isFollowed={
          selectedDossierTarget
            ? followedKeys.has(
                selectedDossierTarget.dealGame?.canonicalKey ||
                  (selectedDossierTarget.steamAppId
                    ? `steam:${selectedDossierTarget.steamAppId}:base`
                    : '')
              )
            : false
        }
        labels={{
          detailOffersTitle: td.detailOffersTitle,
          detailHistoricalLowLabel: td.detailHistoricalLowLabel,
          detailHistoricalDatePrefix: td.detailHistoricalDatePrefix,
          detailBestPriceLabel: td.detailBestPriceLabel,
          detailLoadingOffers: td.detailLoadingOffers,
          detailCurrencyNotice: td.detailCurrencyNotice,
          detailStoreCol: td.detailStoreCol,
          detailOriginalCol: td.detailOriginalCol,
          detailCurrentCol: td.detailCurrentCol,
          detailDiscountCol: td.detailDiscountCol,
          detailActionCol: td.detailActionCol,
          detailCloseBtn: td.detailCloseBtn,
          viewDealBtn: td.viewDealBtn,
          freeBadge: td.freeBadge,
          modalTabOverview: td.modalTabOverview,
          modalTabCharts: td.modalTabCharts,
          modalTabReviewsCritics: td.modalTabReviewsCritics,
          modalTabStatsNews: td.modalTabStatsNews,
          playerChartTitle: td.playerChartTitle,
          priceChartTitle: td.priceChartTitle,
          noChartData: td.noChartData,
          discountShameWarning: td.discountShameWarning,
          criticsSectionTitle: td.criticsSectionTitle,
          criticsSeparateNote: td.criticsSeparateNote,
          steamRatingCardTitle: td.steamRatingCardTitle,
          metacriticScoreCardTitle: td.metacriticScoreCardTitle,
          metacriticUserCardTitle: td.metacriticUserCardTitle,
          openCriticCardTitle: td.openCriticCardTitle,
          keyRequiredBadge: td.keyRequiredBadge,
          configureKeyAction: td.configureKeyAction,
          reviewsPositiveLabel: td.reviewsPositiveLabel,
          reviewsNegativeLabel: td.reviewsNegativeLabel,
          reviewsDailyTrendTitle: td.reviewsDailyTrendTitle,
          reviewsRecentTitle: td.reviewsRecentTitle,
          reviewsSnapshotNote: td.reviewsSnapshotNote,
          achievementsTitle: td.achievementsTitle,
          newsUpdatesTitle: td.newsUpdatesTitle,
          updateImpactLabel: td.updateImpactLabel,
          developerLabel: td.developerLabel,
          publisherLabel: td.publisherLabel,
          releaseDateLabel: td.releaseDateLabel,
          platformsLabel: td.platformsLabel,
          healthStatusLabel: td.healthStatusLabel,
          sourcesLabel: td.sourcesLabel,
          liveColPlayers: td.liveColPlayers,
          healthTiers: td.healthTiers,
          compareAddBtn: td.compareAddBtn,
          compareAddedBadge: td.compareAddedBadge,
          alertsFollowBtn: td.alertsFollowBtn,
          alertsFollowingBadge: td.alertsFollowingBadge,
        }}
        onClose={() => setSelectedDossierTarget(null)}
        onOpenExternal={onOpenExternal}
        onToggleCompare={handleToggleCompareDossier}
        onToggleAlert={handleToggleAlertDossier}
      />
    </div>
  );
}
