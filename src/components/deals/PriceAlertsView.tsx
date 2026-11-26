import {
  ArrowSquareOut,
  ArrowsClockwise,
  BellRinging,
  Check,
  Trash,
} from '@phosphor-icons/react';
import {
  convertFilterAmountToUsd,
  convertUsdAmountToCurrency,
  resolveDisplayPrice,
} from '../../deals/currencyService';
import { isSafeExternalHttpUrl } from '../../deals/httpClient';
import type {
  DealsCurrencyCode,
  ExchangeRateSnapshot,
  PriceAlertEvent,
  PriceAlertRule,
} from '../../deals/types';
import type { AppThemeMode } from '../../services/launcherSettings';

interface PriceAlertsViewProps {
  rules: PriceAlertRule[];
  events: PriceAlertEvent[];
  isChecking: boolean;
  locale: string;
  activeTheme: AppThemeMode;
  selectedCurrency: DealsCurrencyCode;
  fxSnapshot: ExchangeRateSnapshot | null;
  labels: {
    alertsTitle: string;
    alertsSubtitle: string;
    alertsCheckNowBtn: string;
    alertsCheckingBtn: string;
    alertsTargetPriceLabel: string;
    alertsAnyDropOption: string;
    alertsLastCheckedLabel: string;
    alertsTriggeredTitle: string;
    alertsFollowedTitle: string;
    alertsMarkAllReadBtn: string;
    alertsClearEventsBtn: string;
    alertsEmptyFollowed: string;
    alertsEmptyTriggered: string;
    viewDealBtn: string;
    freeBadge: string;
  };
  onCheckNow: () => void;
  onUpdateTargetUsd: (ruleId: string, targetUsd: number | null) => void;
  onUnfollow: (ruleId: string) => void;
  onMarkAllRead: () => void;
  onClearEvents: () => void;
  onOpenExternal: (url: string) => void;
}

export function PriceAlertsView({
  rules,
  events,
  isChecking,
  locale,
  activeTheme,
  selectedCurrency,
  fxSnapshot,
  labels,
  onCheckNow,
  onUpdateTargetUsd,
  onUnfollow,
  onMarkAllRead,
  onClearEvents,
  onOpenExternal,
}: PriceAlertsViewProps) {
  const isXbox = activeTheme === 'xbox';
  const isPs5 = activeTheme === 'ps5';
  const panelClass = isXbox
    ? 'bg-[#081a0b]/85 border-[#52e042]/24'
    : isPs5
    ? 'bg-[#061533]/80 border-white/[0.14]'
    : 'bg-white dark:bg-[#151c25] border-slate-200 dark:border-white/[0.08] shadow-sm dark:shadow-none';

  const formatUsd = (amount: number | null) => {
    if (amount === null || !Number.isFinite(amount)) return '—';
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
      {/* Header */}
      <div className={`sa-ps5-panel rounded-2xl border p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${panelClass}`}>
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <BellRinging className="w-5 h-5 text-amber-500 shrink-0" />
            <h2 className="font-display text-lg font-bold text-slate-900 dark:text-white">
              {labels.alertsTitle}
            </h2>
          </div>
          <p className="text-[12.5px] text-slate-500 dark:text-[#8b9bb4]">
            {labels.alertsSubtitle}
          </p>
        </div>

        <button
          type="button"
          disabled={isChecking || rules.length === 0}
          onClick={onCheckNow}
          className={`inline-flex items-center justify-center gap-2 min-h-[38px] px-4 py-1.5 rounded-xl text-[12.5px] font-semibold text-white whitespace-nowrap cursor-pointer disabled:opacity-50 ${
            isXbox
              ? 'bg-[#107C10] hover:bg-[#159315]'
              : 'bg-[#0284c7] hover:bg-[#0369a1] dark:bg-[#1a9fff] dark:hover:bg-[#38adff]'
          }`}
        >
          <ArrowsClockwise className={`w-4 h-4 ${isChecking ? 'animate-spin' : ''}`} />
          <span>{isChecking ? labels.alertsCheckingBtn : labels.alertsCheckNowBtn}</span>
        </button>
      </div>

      {/* Triggered Drops */}
      <section className={`sa-ps5-panel rounded-2xl border p-4 sm:p-5 space-y-3 ${panelClass}`}>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 className="font-display text-base font-bold text-slate-900 dark:text-white">
            {labels.alertsTriggeredTitle} ({events.length})
          </h3>
          {events.length > 0 && (
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onMarkAllRead}
                className="inline-flex items-center gap-1 text-[12px] font-semibold text-sky-600 dark:text-sky-400 hover:underline cursor-pointer"
              >
                <Check className="w-3.5 h-3.5" />
                <span>{labels.alertsMarkAllReadBtn}</span>
              </button>
              <button
                type="button"
                onClick={onClearEvents}
                className="inline-flex items-center gap-1 text-[12px] font-semibold text-rose-500 hover:underline cursor-pointer"
              >
                <Trash className="w-3.5 h-3.5" />
                <span>{labels.alertsClearEventsBtn}</span>
              </button>
            </div>
          )}
        </div>

        {events.length === 0 ? (
          <p className="text-[12.5px] text-slate-500 dark:text-[#8b9bb4] py-3">
            {labels.alertsEmptyTriggered}
          </p>
        ) : (
          <div className="divide-y divide-slate-200/80 dark:divide-white/[0.06]">
            {events.map((ev) => (
              <div
                key={ev.id}
                className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5"
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    {!ev.read && <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />}
                    <span className="font-semibold text-[13.5px] text-slate-900 dark:text-white truncate">
                      {ev.title}
                    </span>
                  </div>
                  <div dir="ltr" className="text-[12px] font-mono-tabular text-slate-500 dark:text-[#8b9bb4]">
                    {ev.oldPriceUsd !== null ? (
                      <span className="line-through me-1.5">{formatUsd(ev.oldPriceUsd)}</span>
                    ) : null}
                    <span className="font-bold text-emerald-600 dark:text-[#4ade80]">
                      {formatUsd(ev.newPriceUsd)}
                    </span>
                    {ev.savingsPercent > 0 ? ` (-${ev.savingsPercent}%)` : ''} · {ev.storeName} ·{' '}
                    {new Date(ev.triggeredAt).toLocaleString(locale)}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    if (isSafeExternalHttpUrl(ev.dealUrl)) {
                      onOpenExternal(ev.dealUrl);
                    }
                  }}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-[12px] font-semibold cursor-pointer self-start sm:self-auto"
                >
                  <span>{labels.viewDealBtn}</span>
                  <ArrowSquareOut className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Followed Rules */}
      <section className={`sa-ps5-panel rounded-2xl border p-4 sm:p-5 space-y-3 ${panelClass}`}>
        <h3 className="font-display text-base font-bold text-slate-900 dark:text-white">
          {labels.alertsFollowedTitle} ({rules.length})
        </h3>

        {rules.length === 0 ? (
          <p className="text-[12.5px] text-slate-500 dark:text-[#8b9bb4] py-3">
            {labels.alertsEmptyFollowed}
          </p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {rules.map((rule) => {
              const targetDisplay =
                rule.targetPriceUsd !== null
                  ? convertUsdAmountToCurrency(rule.targetPriceUsd, selectedCurrency, fxSnapshot)
                  : null;

              return (
                <div
                  key={rule.id}
                  className="rounded-xl border border-slate-200 dark:border-white/[0.08] bg-slate-50/70 dark:bg-[#10161e] p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    {rule.thumbUrl && (
                      <img
                        src={rule.thumbUrl}
                        alt={rule.title}
                        referrerPolicy="no-referrer"
                        className="w-16 h-9 rounded object-cover shrink-0"
                      />
                    )}
                    <div className="min-w-0 space-y-0.5">
                      <div className="font-semibold text-[13px] text-slate-900 dark:text-white truncate">
                        {rule.title}
                      </div>
                      <div dir="ltr" className="text-[11.5px] font-mono-tabular text-slate-500 dark:text-[#8b9bb4]">
                        Last: {formatUsd(rule.lastKnownPriceUsd)}
                        {rule.lastCheckedAt
                          ? ` · ${new Date(rule.lastCheckedAt).toLocaleTimeString(locale)}`
                          : ''}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-end sm:items-center justify-between sm:justify-end gap-2 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-200/70 dark:border-white/[0.06]">
                    <div className="flex flex-col items-start sm:items-end gap-0.5 flex-1 sm:flex-initial">
                      <label className="text-[10px] text-slate-400">
                        {labels.alertsTargetPriceLabel} ({selectedCurrency})
                      </label>
                      <input
                        type="number"
                        min="0"
                        step="1"
                        defaultValue={
                          targetDisplay !== null ? Math.round(targetDisplay * 100) / 100 : ''
                        }
                        placeholder={labels.alertsAnyDropOption}
                        onBlur={(e) => {
                          const raw = e.target.value.trim();
                          if (!raw) {
                            onUpdateTargetUsd(rule.id, null);
                            return;
                          }
                          const usd = convertFilterAmountToUsd(raw, selectedCurrency, fxSnapshot);
                          onUpdateTargetUsd(rule.id, usd ?? null);
                        }}
                        className="w-full sm:w-28 min-h-[34px] px-2.5 rounded-lg border border-slate-200 dark:border-white/[0.1] bg-white dark:bg-[#161e29] text-[12px] font-mono-tabular sm:text-end"
                      />
                    </div>
                    <button
                      type="button"
                      onClick={() => onUnfollow(rule.id)}
                      className="p-2 rounded-lg hover:bg-rose-500/15 text-slate-400 hover:text-rose-500 cursor-pointer shrink-0"
                    >
                      <Trash className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
