import { useEffect, useMemo } from 'react';
import {
  ArrowsClockwise,
  Bell,
  CalendarBlank,
  CaretRight,
  Check,
  Fire,
  GameController,
  ShieldCheck,
  Sparkle,
  Wrench,
  X,
} from '@phosphor-icons/react';
import type { GameItem } from '../types';
import type { AppLanguage, AppThemeMode } from '../services/launcherSettings';
import {
  MAX_NOTIFICATION_FEED_ITEMS,
  type CatalogNotificationItem,
  type NotificationSourceTab,
} from '../services/notificationCenter';
import { getTranslations } from '../i18n/translations';

interface NotificationCenterDrawerProps {
  isOpen: boolean;
  activeTheme?: AppThemeMode;
  language?: AppLanguage;
  feed: CatalogNotificationItem[];
  readIds: Set<string>;
  isLiveDataReady?: boolean;
  isSyncing?: boolean;
  onSyncNow?: () => void;
  onClose: () => void;
  onMarkRead: (id: string) => void;
  onMarkAllRead: () => void;
  onOpenGame: (item: GameItem) => void;
  onOpenNewsSection: () => void;
}

function formatNotificationDate(
  dateLabel: string | undefined,
  timestamp: number,
  language: AppLanguage
): string {
  const parsed = dateLabel ? Date.parse(dateLabel) : timestamp;
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return dateLabel || '';
  }
  const locale =
    language === 'fr'
      ? 'fr-FR'
      : language === 'es'
      ? 'es-ES'
      : language === 'ar'
      ? 'ar-EG'
      : 'en-US';
  try {
    return new Intl.DateTimeFormat(locale, {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    }).format(new Date(parsed));
  } catch {
    return dateLabel ? dateLabel.slice(0, 10) : '';
  }
}

export function NotificationCenterDrawer({
  isOpen,
  activeTheme = 'default',
  language = 'en',
  feed,
  readIds,
  isLiveDataReady = true,
  isSyncing = false,
  onSyncNow,
  onClose,
  onMarkRead,
  onMarkAllRead,
  onOpenGame,
  onOpenNewsSection,
}: NotificationCenterDrawerProps) {
  const tr = getTranslations(language);
  const t = tr.notificationCenter;

  const isPs5Theme = activeTheme === 'ps5';
  const isXboxTheme = activeTheme === 'xbox';

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

  const latestThreeItems = useMemo(
    () => (isLiveDataReady || !isSyncing ? feed.slice(0, MAX_NOTIFICATION_FEED_ITEMS) : []),
    [feed, isLiveDataReady, isSyncing]
  );

  const unreadCount = useMemo(
    () => latestThreeItems.reduce((acc, item) => acc + (readIds.has(item.id) ? 0 : 1), 0),
    [latestThreeItems, readIds]
  );

  if (!isOpen) return null;

  const getTabFallbackIcon = (tab: NotificationSourceTab) => {
    if (tab === 'upcoming' || tab === 'upcominglist') return CalendarBlank;
    if (tab === 'popularrepacks') return Fire;
    if (tab === 'hypervisor' || tab === 'steamtools') return ShieldCheck;
    if (tab === 'architect' || tab === 'extra') return Wrench;
    return GameController;
  };

  const getKindLabel = (item: CatalogNotificationItem): string => {
    if (item.isLiveDiff) {
      return item.kind === 'version_update' ? t.updatedBadge : t.liveBadge;
    }
    if (item.kind === 'new_addition') return t.newBadge;
    if (item.kind === 'version_update') return t.updatedBadge;
    if (item.kind === 'upcoming_announcement' || item.kind === 'upcoming_queue') {
      return t.upcomingBadge;
    }
    if (item.kind === 'popular_repack') return t.popularBadge;
    return '';
  };

  const handleSelectRow = (item: CatalogNotificationItem) => {
    onMarkRead(item.id);
    if (item.tab === 'upcoming' || item.tab === 'upcominglist' || !item.targetItem) {
      onOpenNewsSection();
      onClose();
      return;
    }
    onOpenGame(item.targetItem);
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-[97] bg-slate-950/60 dark:bg-black/75 flex justify-end"
      role="dialog"
      aria-modal="true"
      aria-label={t.title}
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <aside
        className={`w-full max-w-[430px] h-dvh flex flex-col border-s shadow-2xl overflow-hidden ${
          isPs5Theme
            ? 'bg-[#031333] border-white/[0.16] text-white'
            : isXboxTheme
            ? 'bg-[#081b0c] border-[#52e042]/30 text-[#ecfdf0]'
            : 'bg-white border-slate-200 text-slate-900 dark:bg-[#141a23] dark:border-white/[0.1] dark:text-[#e5e9f0]'
        }`}
      >
        {/* Header */}
        <header
          className={`px-4 sm:px-5 py-3.5 border-b shrink-0 ${
            isPs5Theme || isXboxTheme
              ? 'border-white/[0.08]'
              : 'bg-slate-50/90 border-slate-200 dark:bg-[#11161e] dark:border-white/[0.07]'
          }`}
        >
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5 min-w-0">
              <div
                className={`w-9 h-9 rounded-lg border flex items-center justify-center shrink-0 ${
                  isXboxTheme
                    ? 'bg-[#107C10]/20 border-[#52e042]/40 text-[#6ee755]'
                    : 'bg-sky-500/10 border-sky-500/25 text-[#0284c7] dark:bg-[#1a9fff]/15 dark:border-[#1a9fff]/30 dark:text-[#66c0f4]'
                }`}
              >
                <Bell className="w-4.5 h-4.5" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2 min-w-0">
                  <h2 className="text-[15px] font-bold tracking-tight truncate">{t.title}</h2>
                  {unreadCount > 0 && (
                    <span className="font-mono-tabular text-[11px] font-bold text-[#0284c7] dark:text-[#38bdf8]">
                      ({unreadCount})
                    </span>
                  )}
                </div>
                <p
                  className={`text-[11px] truncate ${
                    isPs5Theme || isXboxTheme
                      ? 'text-[#9fb0c7]'
                      : 'text-slate-500 dark:text-[#8b9bb4]'
                  }`}
                >
                  {isSyncing ? t.syncingBtn : t.subtitle}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1.5 shrink-0">
              {onSyncNow && (
                <button
                  type="button"
                  onClick={onSyncNow}
                  disabled={isSyncing}
                  title={isSyncing ? t.syncingBtn : t.syncNowBtn}
                  aria-label={isSyncing ? t.syncingBtn : t.syncNowBtn}
                  className={`p-1.5 rounded-lg border transition-colors cursor-pointer disabled:opacity-60 shrink-0 ${
                    isPs5Theme || isXboxTheme
                      ? 'bg-white/[0.06] hover:bg-white/[0.14] border-white/[0.12] text-white'
                      : 'bg-white hover:bg-slate-100 border-slate-300 text-slate-700 dark:bg-white/[0.05] dark:hover:bg-white/[0.11] dark:border-white/[0.1] dark:text-[#c7d5e8]'
                  }`}
                >
                  <ArrowsClockwise
                    className={`w-4 h-4 ${isSyncing ? 'animate-spin' : ''}`}
                  />
                </button>
              )}

              {unreadCount > 0 && (
                <button
                  type="button"
                  onClick={onMarkAllRead}
                  className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-semibold border whitespace-nowrap transition-colors cursor-pointer ${
                    isPs5Theme || isXboxTheme
                      ? 'bg-white/[0.06] hover:bg-white/[0.14] border-white/[0.12] text-white'
                      : 'bg-white hover:bg-slate-100 border-slate-300 text-slate-700 dark:bg-white/[0.05] dark:hover:bg-white/[0.11] dark:border-white/[0.1] dark:text-[#c7d5e8]'
                  }`}
                >
                  <Check className="w-3.5 h-3.5 shrink-0" />
                  <span>{t.markAllReadBtn}</span>
                </button>
              )}

              <button
                type="button"
                onClick={onClose}
                aria-label="Close notifications"
                className={`p-1.5 rounded-lg transition-colors cursor-pointer shrink-0 ${
                  isPs5Theme || isXboxTheme
                    ? 'text-[#9fb0c7] hover:text-white hover:bg-white/[0.08]'
                    : 'text-slate-500 hover:text-slate-900 hover:bg-slate-200 dark:text-[#8b9bb4] dark:hover:text-white dark:hover:bg-white/[0.08]'
                }`}
              >
                <X className="w-4.5 h-4.5" />
              </button>
            </div>
          </div>
        </header>

        {/* Latest 3 Items Body */}
        <div className="flex-1 overflow-y-auto divide-y divide-slate-200/80 dark:divide-white/[0.06]">
          {!isLiveDataReady && isSyncing ? (
            <div className="divide-y divide-slate-200/80 dark:divide-white/[0.06]">
              {[0, 1, 2].map((idx) => (
                <div
                  key={idx}
                  className="px-4 sm:px-5 py-4 flex items-start gap-3 animate-pulse"
                >
                  <div className="w-11 h-14 rounded-md bg-slate-200 dark:bg-white/[0.08] shrink-0" />
                  <div className="flex-1 space-y-2 py-0.5">
                    <div className="h-3 w-28 rounded bg-slate-200 dark:bg-white/[0.08]" />
                    <div className="h-4 w-4/5 rounded bg-slate-200 dark:bg-white/[0.1]" />
                    <div className="h-3 w-3/5 rounded bg-slate-200 dark:bg-white/[0.07]" />
                  </div>
                </div>
              ))}
            </div>
          ) : latestThreeItems.length === 0 ? (
            <div className="py-16 px-6 text-center space-y-2">
              <Sparkle className="w-8 h-8 mx-auto text-slate-400 dark:text-[#66778f]" />
              <h3 className="text-[14px] font-semibold text-slate-800 dark:text-white">
                {t.emptyTitle}
              </h3>
              <p className="text-[12px] text-slate-500 dark:text-[#8b9bb4] leading-relaxed">
                {t.emptyDesc}
              </p>
            </div>
          ) : (
            latestThreeItems.map((item) => {
              const isUnread = !readIds.has(item.id);
              const FallbackIcon = getTabFallbackIcon(item.tab);
              const kindLabel = getKindLabel(item);
              const tabDisplay = t.tabLabels[item.tab] || item.tab;
              const formattedDate = formatNotificationDate(
                item.dateLabel,
                item.timestamp,
                language
              );

              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => handleSelectRow(item)}
                  className={`w-full text-start px-4 sm:px-5 py-4 flex items-start gap-3 transition-colors cursor-pointer group ${
                    isUnread
                      ? isPs5Theme
                        ? 'bg-white/[0.05] hover:bg-white/[0.09]'
                        : isXboxTheme
                        ? 'bg-[#107C10]/12 hover:bg-[#107C10]/20'
                        : 'bg-sky-50/55 hover:bg-sky-100/55 dark:bg-[#1a9fff]/[0.06] dark:hover:bg-[#1a9fff]/[0.11]'
                      : isPs5Theme || isXboxTheme
                      ? 'hover:bg-white/[0.04]'
                      : 'hover:bg-slate-50 dark:hover:bg-white/[0.03]'
                  }`}
                >
                  <div
                    className={`w-11 h-14 rounded-md overflow-hidden border flex items-center justify-center shrink-0 ${
                      isPs5Theme || isXboxTheme
                        ? 'bg-black/35 border-white/[0.1]'
                        : 'bg-slate-100 border-slate-200 dark:bg-[#1a222f] dark:border-white/[0.08]'
                    }`}
                  >
                    {item.coverImage ? (
                      <img
                        src={item.coverImage}
                        alt={item.title}
                        decoding="async"
                        referrerPolicy="no-referrer"
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <FallbackIcon
                        className={`w-5 h-5 ${
                          item.importance === 'news'
                            ? 'text-amber-600 dark:text-amber-400'
                            : 'text-[#0284c7] dark:text-[#66c0f4]'
                        }`}
                      />
                    )}
                  </div>

                  <div className="min-w-0 flex-1 space-y-1">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-1.5 min-w-0 text-[11px] font-semibold">
                        {isUnread && (
                          <span
                            aria-hidden="true"
                            className={`w-2 h-2 rounded-full shrink-0 ${
                              isXboxTheme
                                ? 'bg-[#6ee755]'
                                : 'bg-[#0284c7] dark:bg-[#38bdf8]'
                            }`}
                          />
                        )}
                        <span
                          className={
                            isXboxTheme
                              ? 'text-[#6ee755]'
                              : 'text-[#0284c7] dark:text-[#38bdf8]'
                          }
                        >
                          {tabDisplay}
                        </span>
                        {kindLabel && (
                          <span
                            className={
                              item.isLiveDiff
                                ? 'text-emerald-700 dark:text-[#4ade80]'
                                : 'text-slate-500 dark:text-[#8b9bb4]'
                            }
                          >
                            · {kindLabel}
                          </span>
                        )}
                      </div>

                      {formattedDate && (
                        <span className="text-[10.5px] font-mono-tabular text-slate-400 dark:text-[#6f829c] shrink-0">
                          {formattedDate}
                        </span>
                      )}
                    </div>

                    <div
                      className={`text-[13.5px] leading-snug line-clamp-1 ${
                        isUnread
                          ? 'font-bold text-slate-900 dark:text-white'
                          : 'font-medium text-slate-700 dark:text-[#cbd5e1]'
                      }`}
                    >
                      {item.title}
                    </div>

                    {(item.versionLabel || item.subtitle) && (
                      <div
                        className={`text-[11.5px] truncate font-mono-tabular ${
                          isPs5Theme || isXboxTheme
                            ? 'text-[#9fb0c7]'
                            : 'text-slate-500 dark:text-[#8b9bb4]'
                        }`}
                      >
                        {[
                          item.versionLabel ? item.versionLabel : '',
                          item.subtitle || '',
                        ]
                          .filter(Boolean)
                          .join(' · ')}
                      </div>
                    )}
                  </div>

                  <CaretRight className="w-4 h-4 mt-1 shrink-0 text-slate-400 group-hover:text-slate-700 dark:text-[#66778f] dark:group-hover:text-white rtl:rotate-180 transition-colors" />
                </button>
              );
            })
          )}
        </div>
      </aside>
    </div>
  );
}
