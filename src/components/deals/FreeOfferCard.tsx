import { useState } from 'react';
import { ArrowSquareOut, Clock, Gift, GameController } from '@phosphor-icons/react';
import type { NormalizedFreeOffer } from '../../deals/types';
import { formatShortRelativeExpiry } from '../../deals/dealsAggregator';
import { isSafeExternalHttpUrl } from '../../deals/httpClient';
import type { AppThemeMode } from '../../services/launcherSettings';

interface FreeOfferCardProps {
  offer: NormalizedFreeOffer;
  locale: string;
  activeTheme: AppThemeMode;
  labels: {
    expiresPrefix: string;
    noExpiryLabel: string;
    originalWorthPrefix: string;
    claimFreeBtn: string;
    playFreeBtn: string;
    freeBadge: string;
  };
  onOpenExternal: (url: string) => void;
}

export function FreeOfferCard({
  offer,
  locale,
  activeTheme,
  labels,
  onOpenExternal,
}: FreeOfferCardProps) {
  const [imgFailed, setImgFailed] = useState(false);

  const isXbox = activeTheme === 'xbox';
  const isPs5 = activeTheme === 'ps5';
  const relativeExpiry = formatShortRelativeExpiry(offer.expiresTimestamp, locale);
  const exactExpiryDate = offer.expiresTimestamp
    ? new Date(offer.expiresTimestamp).toLocaleDateString(locale, {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      })
    : null;

  const isPermanent = offer.category === 'free_to_play';
  const ctaLabel = isPermanent ? labels.playFreeBtn : labels.claimFreeBtn;

  const handleOpenOffer = () => {
    if (isSafeExternalHttpUrl(offer.url)) {
      onOpenExternal(offer.url);
    }
  };

  return (
    <article
      className={`sa-ps5-subpanel group rounded-xl border overflow-hidden transition-all duration-150 hover:-translate-y-0.5 flex flex-col ${
        isXbox
          ? 'bg-[#0c2110]/85 border-[#52e042]/22 hover:border-[#6ee755]/70'
          : isPs5
          ? 'bg-[#081a3d]/75 border-white/[0.12] hover:border-[#7cc4ff]/70'
          : 'bg-white dark:bg-[#171f2a] border-slate-200 dark:border-white/[0.08] hover:border-emerald-500/60 dark:hover:border-[#4ade80]/60 shadow-sm dark:shadow-none'
      }`}
    >
      {/* Cover */}
      <div className="relative aspect-[16/9] bg-slate-200 dark:bg-[#0e141b] overflow-hidden shrink-0">
        {offer.coverUrl && !imgFailed ? (
          <img
            src={offer.coverUrl}
            alt={offer.title}
            loading="lazy"
            referrerPolicy="no-referrer"
            onError={() => setImgFailed(true)}
            className="w-full h-full object-cover group-hover:scale-[1.03] transition-transform duration-300"
          />
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center gap-1.5 px-3 text-center bg-gradient-to-br from-slate-200 via-slate-100 to-slate-200 dark:from-[#121923] dark:via-[#192330] dark:to-[#10161e]">
            {isPermanent ? (
              <GameController
                weight="duotone"
                className="w-7 h-7 text-slate-400 dark:text-[#6f829c]"
              />
            ) : (
              <Gift weight="duotone" className="w-7 h-7 text-emerald-500 dark:text-[#4ade80]" />
            )}
            <span className="text-[11px] font-medium text-slate-500 dark:text-[#7e91ab] line-clamp-1">
              {offer.title}
            </span>
          </div>
        )}

        <div
          aria-hidden="true"
          className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/15 to-transparent pointer-events-none"
        />

        <div
          className={`absolute top-2.5 end-2.5 px-2 py-0.5 rounded font-mono-tabular text-[11px] font-bold tracking-tight shadow-sm ${
            offer.category === 'limited_time_free'
              ? 'bg-emerald-600 text-white'
              : offer.category === 'giveaway'
              ? 'bg-amber-600 text-white'
              : 'bg-slate-800/90 text-white'
          }`}
        >
          {labels.freeBadge}
        </div>

        <div className="absolute inset-x-2.5 bottom-2 flex items-center justify-between gap-2 text-white">
          <span className="text-[11.5px] font-medium text-white/95 truncate whitespace-nowrap">
            {offer.storeName}
          </span>
          <span className="text-[11px] text-white/80 shrink-0 whitespace-nowrap">
            {offer.offerTypeLabel}
          </span>
        </div>
      </div>

      {/* Body */}
      <div className="p-3.5 flex-1 flex flex-col justify-between gap-2.5 min-w-0">
        <div className="space-y-1.5 min-w-0">
          <h3 className="font-display text-[13.5px] sm:text-[14px] font-bold text-slate-900 dark:text-white leading-snug line-clamp-1">
            {offer.title}
          </h3>

          {/* Clean unboxed metadata */}
          <div className="flex items-center gap-1.5 text-[11.5px] text-slate-500 dark:text-[#8b9bb4] min-w-0 whitespace-nowrap">
            <span className="truncate">{offer.providerLabel}</span>
            {offer.genre && (
              <>
                <span aria-hidden="true">·</span>
                <span className="truncate">{offer.genre}</span>
              </>
            )}
            {offer.originalPriceText && (
              <>
                <span aria-hidden="true">·</span>
                <span dir="ltr" className="font-mono-tabular line-through shrink-0">
                  {labels.originalWorthPrefix} {offer.originalPriceText}
                </span>
              </>
            )}
          </div>

          {offer.description && (
            <p className="text-[12px] text-slate-600 dark:text-[#9cb0c9] leading-relaxed line-clamp-2">
              {offer.description}
            </p>
          )}
        </div>

        <div className="pt-2 border-t border-slate-200/80 dark:border-white/[0.07] flex items-center justify-between gap-2 min-w-0">
          <div className="flex items-center gap-1.5 min-w-0 text-[11.5px]">
            <Clock
              className={`w-3.5 h-3.5 shrink-0 ${
                relativeExpiry
                  ? 'text-amber-600 dark:text-amber-300'
                  : 'text-slate-400 dark:text-[#7f91a8]'
              }`}
            />
            <span
              title={exactExpiryDate || undefined}
              className={`truncate whitespace-nowrap font-mono-tabular ${
                relativeExpiry
                  ? 'font-semibold text-amber-700 dark:text-amber-300'
                  : 'text-slate-500 dark:text-[#8b9bb4]'
              }`}
            >
              {relativeExpiry
                ? `${labels.expiresPrefix} ${relativeExpiry}`
                : exactExpiryDate || labels.noExpiryLabel}
            </span>
          </div>

          <button
            type="button"
            onClick={handleOpenOffer}
            className={`inline-flex items-center gap-1.5 h-8 px-3 rounded-lg text-[12px] font-semibold text-white border transition-all duration-150 whitespace-nowrap shrink-0 cursor-pointer active:scale-[0.97] ${
              isXbox
                ? 'bg-gradient-to-b from-[#169616] to-[#107C10] hover:from-[#1aad1a] hover:to-[#138c13] border-[#6ee755]/30 shadow-xs'
                : isPermanent
                ? 'bg-gradient-to-b from-[#0ea5e9] to-[#0284c7] hover:from-[#38bdf8] hover:to-[#0ea5e9] border-sky-300/25 shadow-xs'
                : 'bg-gradient-to-b from-emerald-500 to-emerald-600 hover:from-emerald-400 hover:to-emerald-500 border-emerald-300/25 shadow-xs'
            }`}
          >
            <span>{ctaLabel}</span>
            <ArrowSquareOut weight="bold" className="w-3.5 h-3.5 shrink-0" />
          </button>
        </div>
      </div>
    </article>
  );
}
