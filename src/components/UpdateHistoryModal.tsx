import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ArrowCircleUp,
  ArrowsClockwise,
  CheckCircle,
  ClockCounterClockwise,
  Code,
  GitBranch,
  Lightning,
  MagnifyingGlass,
  Sparkle,
  Wrench,
  X,
} from '@phosphor-icons/react';
import {
  buildMergedReleaseHistory,
  classifyReleaseStatus,
  compareReleaseVersions,
  fetchPublicReleaseHistory,
  getReleaseCategoryCounts,
  type ChangelogCategory,
  type ReleaseChangelogEntry,
} from '../data/releaseChangelog';
import { getTranslations } from '../i18n/translations';
import type { DesktopReleaseHistoryEntry, SecretAreaUpdaterBridge } from '../services/desktopUpdater';
import type { AppLanguage, AppThemeMode } from '../services/launcherSettings';

interface UpdateHistoryModalProps {
  isOpen: boolean;
  activeTheme?: AppThemeMode;
  language?: AppLanguage;
  currentVersion: string;
  isDevMode?: boolean;
  isJustUpdated?: boolean;
  justUpdatedFromVersion?: string | null;
  availableUpdateVersion?: string | null;
  updaterBridge?: SecretAreaUpdaterBridge | null;
  onClose: () => void;
  onCheckForUpdates?: () => void;
}

type CategoryFilter = 'all' | ChangelogCategory;

export function UpdateHistoryModal({
  isOpen,
  activeTheme = 'default',
  language = 'en',
  currentVersion,
  isDevMode,
  isJustUpdated = false,
  justUpdatedFromVersion = null,
  availableUpdateVersion = null,
  updaterBridge = null,
  onClose,
  onCheckForUpdates,
}: UpdateHistoryModalProps) {
  const [remoteReleases, setRemoteReleases] = useState<DesktopReleaseHistoryEntry[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<CategoryFilter>('all');

  const fullTranslations = getTranslations(language);
  const t = fullTranslations.updateHistory;
  const updaterT = fullTranslations.updater;
  const isPs5Theme = activeTheme === 'ps5';
  const isXboxTheme = activeTheme === 'xbox';
  const isConsoleTheme = isPs5Theme || isXboxTheme;

  const cleanCurrentVersion = currentVersion.replace(/^v/i, '').trim();
  const cleanAvailableUpdateVersion = availableUpdateVersion
    ? availableUpdateVersion.replace(/^v/i, '').trim()
    : null;
  const effectiveIsDevMode = isDevMode ?? import.meta.env.DEV;

  const loadHistory = useCallback(
    async (forceRefresh = false) => {
      setIsLoading(true);
      try {
        let entries: DesktopReleaseHistoryEntry[] = [];
        if (updaterBridge?.getReleaseHistory) {
          entries = await updaterBridge.getReleaseHistory(forceRefresh);
        }
        if (!entries || entries.length === 0) {
          entries = await fetchPublicReleaseHistory();
        }
        if (Array.isArray(entries) && entries.length > 0) {
          setRemoteReleases(entries);
        }
      } catch {
        // Keep local release archive fallback
      } finally {
        setIsLoading(false);
      }
    },
    [updaterBridge]
  );

  useEffect(() => {
    if (!isOpen) return;
    void loadHistory(true);
    const intervalId = window.setInterval(() => {
      void loadHistory(true);
    }, 60_000);
    return () => window.clearInterval(intervalId);
  }, [isOpen, loadHistory]);

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  const allReleases = useMemo<ReleaseChangelogEntry[]>(() => {
    return buildMergedReleaseHistory({
      language,
      remoteReleases,
      currentVersion: cleanCurrentVersion,
    });
  }, [language, remoteReleases, cleanCurrentVersion]);

  const latestPublishedVersion = useMemo<string | null>(() => {
    const githubLatest = allReleases.find((r) => r.source === 'github')?.version || null;
    if (githubLatest) return githubLatest;
    if (cleanAvailableUpdateVersion) return cleanAvailableUpdateVersion;
    return (
      allReleases.find((r) => compareReleaseVersions(r.version, cleanCurrentVersion) <= 0)
        ?.version || null
    );
  }, [allReleases, cleanAvailableUpdateVersion, cleanCurrentVersion]);

  const summaryHighlights = useMemo(() => {
    let updateEntry: ReleaseChangelogEntry | null = null;
    let devEntry: ReleaseChangelogEntry | null = null;
    for (const rel of allReleases) {
      const status = classifyReleaseStatus({
        release: rel,
        currentVersion: cleanCurrentVersion,
        latestPublishedVersion,
        isDevMode: effectiveIsDevMode,
      });
      if (!updateEntry && status.isUpdateAvailable) {
        updateEntry = rel;
      }
      if (!devEntry && status.isInDevelopment && !status.isInstalled) {
        devEntry = rel;
      }
    }
    return { updateEntry, devEntry };
  }, [allReleases, cleanCurrentVersion, latestPublishedVersion, effectiveIsDevMode]);

  const filteredReleases = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return allReleases
      .map((release) => {
        const releaseMatchesQuery =
          !q ||
          release.version.toLowerCase().includes(q) ||
          release.releaseTitle.toLowerCase().includes(q) ||
          release.summary.toLowerCase().includes(q);

        const matchingItems = release.items.filter((item) => {
          const matchesCategory = categoryFilter === 'all' || item.category === categoryFilter;
          if (!matchesCategory) return false;
          if (!q || releaseMatchesQuery) return true;
          return (
            item.title.toLowerCase().includes(q) ||
            item.description.toLowerCase().includes(q)
          );
        });

        if (categoryFilter !== 'all' && matchingItems.length === 0) {
          return null;
        }
        if (q && !releaseMatchesQuery && matchingItems.length === 0) {
          return null;
        }

        return {
          ...release,
          items: matchingItems,
        };
      })
      .filter((entry): entry is ReleaseChangelogEntry => entry !== null);
  }, [allReleases, searchQuery, categoryFilter]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-[98] bg-slate-950/65 dark:bg-black/80 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-label={t.title}
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className={`w-full max-w-2xl max-h-[88dvh] flex flex-col rounded-xl border shadow-2xl overflow-hidden ${
          isPs5Theme
            ? 'bg-[#031333]/96 border-white/[0.18] text-white'
            : isXboxTheme
            ? 'bg-[#081b0c]/96 border-[#52e042]/35 text-[#ecfdf0]'
            : 'bg-white border-slate-200 text-slate-800 dark:bg-[#151b24] dark:border-white/[0.1] dark:text-[#e5e9f0]'
        }`}
      >
        {/* Header */}
        <div
          className={`px-5 py-4 border-b flex items-center justify-between gap-3 shrink-0 ${
            isConsoleTheme
              ? 'border-white/[0.08]'
              : 'bg-slate-50 border-slate-200 dark:bg-transparent dark:border-white/[0.08]'
          }`}
        >
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-md bg-[#1a9fff]/15 border border-[#1a9fff]/30 flex items-center justify-center text-[#0284c7] dark:text-[#66c0f4] shrink-0">
              <ClockCounterClockwise className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <h2
                className={`text-[15px] font-bold leading-tight truncate ${
                  isConsoleTheme ? 'text-white' : 'text-slate-900 dark:text-white'
                }`}
              >
                {t.title}
              </h2>
              <p
                className={`text-[11.5px] truncate ${
                  isConsoleTheme ? 'text-[#8b9bb4]' : 'text-slate-500 dark:text-[#8b9bb4]'
                }`}
              >
                {t.subtitle}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {isLoading && (
              <span
                className={`inline-flex items-center gap-1.5 text-[11px] font-medium whitespace-nowrap ${
                  isConsoleTheme ? 'text-[#9fb0c7]' : 'text-slate-500 dark:text-[#8b9bb4]'
                }`}
              >
                <ArrowsClockwise className="w-3.5 h-3.5 animate-spin text-[#0284c7] dark:text-[#38bdf8]" />
                <span className="hidden sm:inline">{t.syncingAutoLabel}</span>
              </span>
            )}

            {onCheckForUpdates && (
              <button
                type="button"
                onClick={onCheckForUpdates}
                className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-md bg-[#1a9fff] hover:bg-[#38adff] text-white text-[11.5px] font-semibold transition-colors cursor-pointer whitespace-nowrap shrink-0"
              >
                <span>{t.checkUpdatesBtn}</span>
              </button>
            )}

            <button
              type="button"
              onClick={onClose}
              aria-label={t.closeBtn}
              className={`p-1.5 rounded-md transition-colors cursor-pointer ${
                isConsoleTheme
                  ? 'text-[#8b9bb4] hover:text-white hover:bg-white/[0.08]'
                  : 'text-slate-500 hover:text-slate-900 hover:bg-slate-200 dark:text-[#8b9bb4] dark:hover:text-white dark:hover:bg-white/[0.08]'
              }`}
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Smart Environment & Release Detection Bar */}
        <div
          className={`px-5 py-2 border-b flex flex-wrap items-center justify-between gap-x-4 gap-y-1 text-[11.5px] shrink-0 ${
            isConsoleTheme
              ? 'border-white/[0.08] bg-black/30 text-[#b8c7dc]'
              : 'border-slate-200 bg-slate-50/90 text-slate-600 dark:border-white/[0.08] dark:bg-black/30 dark:text-[#9cb0c9]'
          }`}
        >
          <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1 min-w-0">
            <span className="inline-flex items-center gap-1.5 font-semibold text-slate-800 dark:text-white">
              {effectiveIsDevMode ? (
                <Code className="w-3.5 h-3.5 text-amber-600 dark:text-amber-300 shrink-0" />
              ) : (
                <CheckCircle
                  weight="fill"
                  className="w-3.5 h-3.5 text-emerald-600 dark:text-[#34d399] shrink-0"
                />
              )}
              <span dir="ltr" className="font-mono-tabular">
                v{cleanCurrentVersion}
              </span>
              <span className="text-slate-400 dark:text-white/25">·</span>
              <span
                className={
                  effectiveIsDevMode
                    ? 'text-amber-700 dark:text-amber-300'
                    : 'text-emerald-700 dark:text-[#34d399]'
                }
              >
                {effectiveIsDevMode ? t.devModeEnvLabel : t.prodEnvLabel}
              </span>
            </span>
          </div>

          {summaryHighlights.updateEntry ? (
            <span className="inline-flex items-center gap-1.5 font-semibold text-[#0284c7] dark:text-[#38bdf8]">
              <ArrowCircleUp weight="fill" className="w-3.5 h-3.5 shrink-0" />
              <span>{t.updateAvailableBadge}:</span>
              <span dir="ltr" className="font-mono-tabular">
                v{summaryHighlights.updateEntry.version}
              </span>
            </span>
          ) : summaryHighlights.devEntry ? (
            <span className="inline-flex items-center gap-1.5 font-medium text-violet-700 dark:text-violet-300">
              <GitBranch className="w-3.5 h-3.5 shrink-0" />
              <span>{t.devBadge}:</span>
              <span dir="ltr" className="font-mono-tabular font-semibold">
                v{summaryHighlights.devEntry.version}
              </span>
              <span className="text-slate-400 dark:text-white/25">·</span>
              <span className="opacity-85">{t.unpublishedNote}</span>
            </span>
          ) : null}
        </div>

        {/* Automatic Post-Update Highlight Banner */}
        {isJustUpdated && (
          <div
            className={`px-5 py-3 border-b flex flex-wrap items-center justify-between gap-2.5 shrink-0 ${
              isXboxTheme
                ? 'bg-[#107C10]/20 border-[#52e042]/35 text-[#ecfdf0]'
                : isPs5Theme
                ? 'bg-[#0070d1]/25 border-[#60b2ff]/35 text-white'
                : 'bg-emerald-500/10 border-emerald-500/25 text-emerald-900 dark:bg-emerald-500/12 dark:border-emerald-400/25 dark:text-emerald-100'
            }`}
          >
            <div className="flex items-center gap-2.5 min-w-0">
              <Sparkle
                weight="duotone"
                className={`w-4.5 h-4.5 shrink-0 ${
                  isXboxTheme
                    ? 'text-[#6ee755]'
                    : isPs5Theme
                    ? 'text-[#7cc4ff]'
                    : 'text-emerald-600 dark:text-[#34d399]'
                }`}
              />
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-[12.5px] font-bold">{t.justUpdatedTitle}</span>
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-emerald-500/20 text-emerald-700 dark:bg-[#10b981]/25 dark:text-[#34d399]">
                    {t.newlyInstalledBadge}
                  </span>
                </div>
                {justUpdatedFromVersion && (
                  <p className="text-[11px] opacity-85 font-mono-tabular" dir="ltr">
                    {t.justUpdatedFromPrefix} v{justUpdatedFromVersion.replace(/^v/i, '')} → v
                    {cleanCurrentVersion}
                  </p>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Search & Filters */}
        <div
          className={`px-5 py-3 border-b flex flex-col sm:flex-row sm:items-center gap-2.5 shrink-0 ${
            isConsoleTheme
              ? 'border-white/[0.08] bg-black/20'
              : 'border-slate-200 bg-slate-50/60 dark:border-white/[0.08] dark:bg-black/20'
          }`}
        >
          <div className="relative flex-1 min-w-0">
            <MagnifyingGlass className="w-3.5 h-3.5 text-slate-400 dark:text-[#8b9bb4] absolute start-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={t.searchPlaceholder}
              className={`w-full ps-8 pe-3 py-1.5 rounded-md border text-[12px] outline-none transition-colors ${
                isConsoleTheme
                  ? 'bg-black/30 border-white/[0.12] text-white placeholder:text-[#7f8ea3] focus:border-[#38bdf8]'
                  : 'bg-white border-slate-300 text-slate-900 placeholder:text-slate-400 focus:border-[#1a9fff] dark:bg-black/30 dark:border-white/[0.1] dark:text-white dark:placeholder:text-[#7f8ea3]'
              }`}
            />
          </div>

          <div className="flex flex-wrap items-center gap-1.5">
            {(
              [
                { id: 'all', label: t.filterAll },
                { id: 'feature', label: t.filterFeature },
                { id: 'improvement', label: t.filterImprovement },
                { id: 'fix', label: t.filterFix },
              ] as const
            ).map((filter) => {
              const active = categoryFilter === filter.id;
              return (
                <button
                  key={filter.id}
                  type="button"
                  onClick={() => setCategoryFilter(filter.id)}
                  className={`px-2.5 py-1 rounded-md text-[11px] font-semibold transition-colors cursor-pointer whitespace-nowrap ${
                    active
                      ? 'bg-[#1a9fff] text-white'
                      : isConsoleTheme
                      ? 'bg-white/[0.06] text-[#b8c7dc] hover:bg-white/[0.12]'
                      : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-100 dark:border-transparent dark:bg-white/[0.06] dark:text-[#b8c7dc] dark:hover:bg-white/[0.12]'
                  }`}
                >
                  {filter.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Release Timeline */}
        <div className="p-5 overflow-y-auto space-y-4">
          {filteredReleases.length === 0 ? (
            <div
              className={`rounded-lg border p-8 text-center text-[13px] ${
                isConsoleTheme
                  ? 'bg-black/25 border-white/[0.08] text-[#9fb0c7]'
                  : 'bg-slate-50 border-slate-200 text-slate-500 dark:bg-black/25 dark:border-white/[0.08] dark:text-[#9fb0c7]'
              }`}
            >
              {t.emptyState}
            </div>
          ) : (
            filteredReleases.map((release) => {
              const status = classifyReleaseStatus({
                release,
                currentVersion: cleanCurrentVersion,
                latestPublishedVersion,
                isDevMode: effectiveIsDevMode,
              });
              const counts = getReleaseCategoryCounts(release.items);
              const formattedDate = release.publishedAt
                ? new Date(release.publishedAt).toLocaleDateString(undefined, {
                    year: 'numeric',
                    month: 'short',
                    day: 'numeric',
                  })
                : null;

              const isHighlighted = status.isInstalled || status.isInDevelopment || status.isUpdateAvailable;

              return (
                <section
                  key={release.version}
                  className={`rounded-lg border p-4 space-y-3 transition-colors ${
                    status.isInDevelopment && !status.isInstalled
                      ? isConsoleTheme
                        ? 'bg-violet-950/25 border-violet-400/35'
                        : 'bg-violet-50/40 border-violet-300/70 dark:bg-violet-950/20 dark:border-violet-400/30'
                      : status.isInstalled
                      ? isConsoleTheme
                        ? 'bg-emerald-950/20 border-emerald-400/35'
                        : 'bg-emerald-50/40 border-emerald-300/70 dark:bg-emerald-950/15 dark:border-emerald-400/30'
                      : isHighlighted
                      ? isConsoleTheme
                        ? 'bg-sky-950/20 border-sky-400/35'
                        : 'bg-sky-50/40 border-sky-300/70 dark:bg-sky-950/15 dark:border-sky-400/30'
                      : isConsoleTheme
                      ? 'bg-black/25 border-white/[0.08]'
                      : 'bg-slate-50/70 border-slate-200 dark:bg-black/25 dark:border-white/[0.08]'
                  }`}
                >
                  <div className="flex flex-wrap items-start justify-between gap-2 pb-2.5 border-b border-slate-200/80 dark:border-white/[0.07]">
                    <div className="min-w-0 space-y-1 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span
                          dir="ltr"
                          className="text-[14px] font-bold font-mono-tabular text-[#0284c7] dark:text-[#38bdf8]"
                        >
                          v{release.version}
                        </span>
                        {status.isInstalled && (
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-emerald-500/15 text-emerald-700 dark:bg-[#10b981]/20 dark:text-[#34d399]">
                            {effectiveIsDevMode && release.source !== 'github'
                              ? t.installedDevBadge
                              : t.currentBadge}
                          </span>
                        )}
                        {status.isInDevelopment && !status.isInstalled && (
                          <>
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-violet-500/15 text-violet-700 dark:bg-violet-400/20 dark:text-violet-300">
                              {t.devBadge}
                            </span>
                            <span
                              className={`text-[11px] font-medium ${
                                isConsoleTheme
                                  ? 'text-violet-200/80'
                                  : 'text-violet-700/80 dark:text-violet-300/80'
                              }`}
                            >
                              {t.unpublishedNote}
                            </span>
                          </>
                        )}
                        {status.isUpdateAvailable && (
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-[#1a9fff]/20 text-[#0284c7] dark:bg-[#1a9fff]/25 dark:text-[#66c0f4]">
                            {t.updateAvailableBadge}
                          </span>
                        )}
                        {status.isLatestPublished && (
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-[#1a9fff]/15 text-[#0284c7] dark:bg-[#1a9fff]/20 dark:text-[#66c0f4]">
                            {t.latestBadge}
                          </span>
                        )}
                      </div>
                      <h3
                        className={`text-[13.5px] font-bold ${
                          isConsoleTheme ? 'text-white' : 'text-slate-900 dark:text-white'
                        }`}
                      >
                        {release.releaseTitle}
                      </h3>
                      {release.summary && (
                        <p
                          className={`text-[12px] leading-relaxed ${
                            isConsoleTheme
                              ? 'text-[#b8c7dc]'
                              : 'text-slate-600 dark:text-[#9cb0c9]'
                          }`}
                        >
                          {release.summary}
                        </p>
                      )}
                      {release.items.length > 0 && (
                        <div
                          className={`pt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[11px] font-mono-tabular ${
                            isConsoleTheme ? 'text-[#9fb0c7]' : 'text-slate-500 dark:text-[#8b9bb4]'
                          }`}
                        >
                          {counts.feature > 0 && (
                            <span className="font-semibold text-[#0284c7] dark:text-[#38bdf8]">
                              {counts.feature} {t.newCountLabel}
                            </span>
                          )}
                          {counts.feature > 0 && (counts.improvement > 0 || counts.fix > 0) && (
                            <span className="opacity-40">·</span>
                          )}
                          {counts.improvement > 0 && (
                            <span className="font-semibold text-emerald-700 dark:text-[#4ade80]">
                              {counts.improvement} {t.changedCountLabel}
                            </span>
                          )}
                          {counts.improvement > 0 && counts.fix > 0 && (
                            <span className="opacity-40">·</span>
                          )}
                          {counts.fix > 0 && (
                            <span className="font-semibold text-amber-700 dark:text-amber-300">
                              {counts.fix} {t.fixedCountLabel}
                            </span>
                          )}
                        </div>
                      )}
                    </div>

                    <div
                      className={`text-[11px] font-mono-tabular shrink-0 text-end ${
                        isConsoleTheme ? 'text-[#8b9bb4]' : 'text-slate-500 dark:text-[#8b9bb4]'
                      }`}
                    >
                      {formattedDate && <div>{formattedDate}</div>}
                      <div>
                        {release.items.length} {t.changesSuffix}
                      </div>
                    </div>
                  </div>

                  {release.items.length > 0 && (
                    <ul className="space-y-2">
                      {release.items.map((item, idx) => {
                        const CategoryIcon =
                          item.category === 'fix'
                            ? Wrench
                            : item.category === 'improvement'
                            ? Lightning
                            : Sparkle;
                        const categoryLabel =
                          item.category === 'fix'
                            ? updaterT.categoryFix
                            : item.category === 'improvement'
                            ? updaterT.categoryImprovement
                            : updaterT.categoryFeature;
                        const categoryColor =
                          item.category === 'fix'
                            ? 'text-amber-700 dark:text-amber-300'
                            : item.category === 'improvement'
                            ? 'text-emerald-700 dark:text-[#4ade80]'
                            : 'text-[#0284c7] dark:text-[#38bdf8]';

                        return (
                          <li
                            key={`${release.version}-${item.title}-${idx}`}
                            className="flex items-start gap-2 pb-2 last:pb-0 border-b last:border-b-0 border-slate-200/70 dark:border-white/[0.06]"
                          >
                            <CategoryIcon
                              weight="duotone"
                              className={`w-3.5 h-3.5 mt-0.5 shrink-0 ${categoryColor}`}
                            />
                            <div className="min-w-0 space-y-0.5">
                              <div className="flex flex-wrap items-baseline gap-x-1.5">
                                <span
                                  className={`text-[10px] font-bold uppercase tracking-wider ${categoryColor}`}
                                >
                                  {categoryLabel}
                                </span>
                                <span
                                  className={`text-[12px] font-semibold ${
                                    isConsoleTheme
                                      ? 'text-white'
                                      : 'text-slate-900 dark:text-white'
                                  }`}
                                >
                                  {item.title}
                                </span>
                              </div>
                              {item.description && item.description !== item.title && (
                                <p
                                  className={`text-[11.5px] leading-relaxed ${
                                    isConsoleTheme
                                      ? 'text-[#b8c7dc]'
                                      : 'text-slate-600 dark:text-[#9cb0c9]'
                                  }`}
                                >
                                  {item.description}
                                </p>
                              )}
                            </div>
                          </li>
                        );
                      })}
                    </ul>
                  )}
                </section>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
