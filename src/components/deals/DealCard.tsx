import { memo, useState } from 'react';
import {
  ArrowSquareOut,
  Bell,
  BellRinging,
  GameController,
  Scales,
  Star,
} from '@phosphor-icons/react';
import type {
  DealsCurrencyCode,
  ExchangeRateSnapshot,
  NormalizedDealGame,
} from '../../deals/types';
import { resolveDisplayPrice } from '../../deals/currencyService';
import { isSafeExternalHttpUrl } from '../../deals/httpClient';
import type { AppThemeMode } from '../../services/launcherSettings';

interface DealCardProps {
  game: NormalizedDealGame;
  locale: string;
  activeTheme: AppThemeMode;
  selectedCurrency: DealsCurrencyCode;
  fxSnapshot: ExchangeRateSnapshot | null;
  isCompared?: boolean;
  isFollowed?: boolean;
  labels: {
    viewDealBtn: string;
    compareOffersBtn: string;
    dealRatingLabel: string;
    freeBadge: string;
    sourcePriceHint: string;
    compareAddBtn?: string;
    alertsFollowBtn?: string;
  };
  onOpenDetail: (game: NormalizedDealGame) => void;
  onOpenExternal: (url: string) => void;
  onToggleCompare?: (game: NormalizedDealGame) => void;
  onToggleAlert?: (game: NormalizedDealGame) => void;
  compact?: boolean;
}

export const DealCard = memo(function DealCard({
  game,
  locale,
  activeTheme,
  selectedCurrency,
  fxSnapshot,
  isCompared = false,
  isFollowed = false,
  labels,
  onOpenDetail,
  onOpenExternal,
  onToggleCompare,
  onToggleAlert,
  compact = false,
}: DealCardProps) {
  const [imgFailed, setImgFailed] = useState(false);
  const [logoFailed, setLogoFailed] = useState(false);

  const offer = game.bestOffer;
  const isXbox = activeTheme === 'xbox';
  const isPs5 = activeTheme === 'ps5';

  const saleResolved = resolveDisplayPrice({
    amount: offer.isFreeNow ? 0 : offer.salePrice,
    sourceCurrency: offer.currency,
    targetCurrency: selectedCurrency,
    fxSnapshot,
    locale,
    freeLabel: labels.freeBadge,
  });

  const normalResolved =
    offer.normalPrice > offer.salePrice
      ? resolveDisplayPrice({
          amount: offer.normalPrice,
          sourceCurrency: offer.currency,
          targetCurrency: selectedCurrency,
          fxSnapshot,
          locale,
          freeLabel: labels.freeBadge,
        })
      : null;

  const handleViewDeal = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isSafeExternalHttpUrl(offer.dealUrl)) {
      onOpenExternal(offer.dealUrl);
    }
  };

  return (
    <article
      onClick={() => onOpenDetail(game)}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onOpenDetail(game);
        }
      }}
      role="button"
      tabIndex={0}
      className={`sa-contain-card sa-ps5-subpanel group rounded-xl border overflow-hidden transition-[transform,border-color,background-color] duration-150 hover:-translate-y-0.5 cursor-pointer flex flex-col focus:outline-none focus-visible:ring-2 ${
        isXbox
          ? 'bg-[#0c2110]/85 border-[#52e042]/20 hover:border-[#6ee755]/70 focus-visible:ring-[#6ee755]'
          : isPs5
          ? 'bg-[#081a3d]/75 border-white/[0.12] hover:border-[#7cc4ff]/70 focus-visible:ring-[#7cc4ff]'
          : 'bg-white hover:bg-slate-50/90 dark:bg-[#171f2a] dark:hover:bg-[#1d2736] border-slate-200 dark:border-white/[0.08] hover:border-[#0284c7]/60 dark:hover:border-[#38bdf8]/60 shadow-sm dark:shadow-none focus-visible:ring-[#0284c7] dark:focus-visible:ring-[#38bdf8]'
      }`}
    >
      {/* Cover Image with Measured Scrim & Clean Discount Corner */}
      <div className="relative aspect-[16/9] bg-slate-200 dark:bg-[#0e141b] overflow-hidden shrink-0">
        {game.thumbUrl && !imgFailed ? (
          <img
            src={game.thumbUrl}
            alt={game.title}
            loading="lazy"
            decoding="async"
            referrerPolicy="no-referrer"
            onError={() => setImgFailed(true)}
            className="w-full h-full object-cover group-hover:scale-[1.03] transition-transform duration-300"
          />
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center gap-1.5 px-3 text-center bg-gradient-to-br from-slate-200 via-slate-100 to-slate-200 dark:from-[#121923] dark:via-[#192330] dark:to-[#10161e]">
            <GameController
              weight="duotone"
              className="w-7 h-7 text-slate-400 dark:text-[#6f829c]"
            />
            <span className="text-[11px] font-medium text-slate-500 dark:text-[#7e91ab] line-clamp-1">
              {game.title}
            </span>
          </div>
        )}

        <div
          aria-hidden="true"
          className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/15 to-transparent pointer-events-none"
        />

        {/* Discount Corner Indicator */}
        {offer.savingsPercent > 0 && (
          <div
            dir="ltr"
            className={`absolute top-2.5 end-2.5 px-2 py-0.5 rounded font-mono-tabular text-[11.5px] font-bold tracking-tight shadow-sm ${
              offer.isFreeNow || offer.savingsPercent >= 75
                ? 'bg-emerald-600 text-white'
                : isXbox
                ? 'bg-[#107C10] text-white'
                : 'bg-[#0284c7] dark:bg-[#1a9fff] text-white'
            }`}
          >
            -{offer.savingsPercent}%
          </div>
        )}

        {/* Store Logo & Name Over Bottom Scrim */}
        <div className="absolute inset-x-2.5 bottom-2 flex items-center justify-between gap-2 text-white">
          <span className="inline-flex items-center gap-1.5 min-w-0">
            {offer.storeIconUrl && !logoFailed ? (
              <img
                src={offer.storeIconUrl}
                alt={offer.storeName}
                loading="lazy"
                decoding="async"
                referrerPolicy="no-referrer"
                onError={() => setLogoFailed(true)}
                className="w-4 h-4 rounded-sm object-contain shrink-0 bg-black/40"
              />
            ) : null}
            <span className="text-[11.5px] font-medium text-white/95 truncate whitespace-nowrap">
              {offer.storeName}
            </span>
          </span>

          {offer.dealRating !== null && offer.dealRating > 0 && (
            <span
              dir="ltr"
              className="inline-flex items-center gap-1 text-[11px] font-mono-tabular font-semibold text-amber-300 shrink-0 whitespace-nowrap"
            >
              <Star weight="fill" className="w-3 h-3" />
              <span>{offer.dealRating.toFixed(1)}</span>
            </span>
          )}
        </div>
      </div>

      {/* Card Body */}
      <div className={`${compact ? 'p-3' : 'p-3.5'} flex-1 flex flex-col justify-between gap-2.5 min-w-0`}>
        <div className="space-y-1 min-w-0">
          <h3 className="font-display text-[13.5px] sm:text-[14px] font-bold text-slate-900 dark:text-white leading-snug line-clamp-1">
            {game.title}
          </h3>

          {/* Zero-pill inline metadata */}
          <div className="flex items-center gap-1.5 text-[11.5px] text-slate-500 dark:text-[#8b9bb4] min-w-0 whitespace-nowrap overflow-hidden">
            <span className="font-mono-tabular shrink-0">{saleResolved.displayCurrency}</span>
            {saleResolved.isConverted && (
              <>
                <span aria-hidden="true">·</span>
                <span
                  dir="ltr"
                  title={`${labels.sourcePriceHint}: ${saleResolved.sourceFormatted} ${saleResolved.sourceCurrency}`}
                  className="font-mono-tabular shrink-0 text-slate-400 dark:text-[#788ca8]"
                >
                  ≈ {saleResolved.sourceFormatted} {saleResolved.sourceCurrency}
                </span>
              </>
            )}
            {offer.steamRatingPercent !== null && (
              <>
                <span aria-hidden="true">·</span>
                <span className="truncate font-mono-tabular">
                  {offer.steamRatingPercent}% {offer.steamRatingText || ''}
                </span>
              </>
            )}
            {offer.metacriticScore !== null && !saleResolved.isConverted && (
              <>
                <span aria-hidden="true">·</span>
                <span className="font-mono-tabular shrink-0">MC {offer.metacriticScore}</span>
              </>
            )}
          </div>
        </div>

        {/* Price Row + Quick Actions */}
        <div className="pt-2 border-t border-slate-200/80 dark:border-white/[0.07] flex flex-wrap items-center justify-between gap-2 min-w-0">
          <div dir="ltr" className="flex items-baseline gap-1.5 min-w-0">
            <span
              className={`font-mono-tabular text-[14.5px] sm:text-[15px] font-bold whitespace-nowrap ${
                offer.isFreeNow
                  ? 'text-emerald-600 dark:text-[#4ade80]'
                  : isXbox
                  ? 'text-[#6ee755]'
                  : 'text-slate-900 dark:text-white'
              }`}
            >
              {saleResolved.formatted}
            </span>
            {normalResolved && (
              <span className="font-mono-tabular text-[11px] text-slate-400 dark:text-[#6f829c] line-through whitespace-nowrap">
                {normalResolved.formatted}
              </span>
            )}
          </div>

          <div className="flex items-center gap-1.5 shrink-0 ms-auto">
            {onToggleAlert && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onToggleAlert(game);
                }}
                title={labels.alertsFollowBtn || 'Follow Price'}
                aria-label={labels.alertsFollowBtn || 'Follow Price'}
                className={`h-8 w-8 inline-flex items-center justify-center rounded-lg border transition-all duration-150 cursor-pointer active:scale-[0.96] ${
                  isFollowed
                    ? 'bg-amber-500 text-white border-amber-400/60 shadow-xs'
                    : 'bg-slate-100 hover:bg-slate-200 dark:bg-white/[0.05] dark:hover:bg-white/[0.12] border-slate-200/90 dark:border-white/[0.09] text-slate-700 dark:text-[#cbd6e4]'
                }`}
              >
                {isFollowed ? (
                  <BellRinging weight="fill" className="w-3.5 h-3.5" />
                ) : (
                  <Bell className="w-3.5 h-3.5" />
                )}
              </button>
            )}

            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                if (onToggleCompare) {
                  onToggleCompare(game);
                } else {
                  onOpenDetail(game);
                }
              }}
              title={onToggleCompare ? labels.compareAddBtn || labels.compareOffersBtn : labels.compareOffersBtn}
              aria-label={onToggleCompare ? labels.compareAddBtn || labels.compareOffersBtn : labels.compareOffersBtn}
              className={`h-8 w-8 inline-flex items-center justify-center rounded-lg border transition-all duration-150 cursor-pointer active:scale-[0.96] ${
                isCompared
                  ? 'bg-sky-500 text-white border-sky-400/60 shadow-xs'
                  : 'bg-slate-100 hover:bg-slate-200 dark:bg-white/[0.05] dark:hover:bg-white/[0.12] border-slate-200/90 dark:border-white/[0.09] text-slate-700 dark:text-[#cbd6e4]'
              }`}
            >
              <Scales className="w-3.5 h-3.5" />
            </button>

            <button
              type="button"
              onClick={handleViewDeal}
              className={`inline-flex items-center gap-1.5 h-8 px-3 rounded-lg text-[12px] font-semibold text-white border transition-all duration-150 whitespace-nowrap shrink-0 cursor-pointer active:scale-[0.97] ${
                isXbox
                  ? 'bg-gradient-to-b from-[#169616] to-[#107C10] hover:from-[#1aad1a] hover:to-[#138c13] border-[#6ee755]/30 shadow-xs'
                  : isPs5
                  ? 'bg-gradient-to-b from-[#1486e8] to-[#0070d1] hover:from-[#2696f5] hover:to-[#0d7ee0] border-[#7cc4ff]/30 shadow-xs'
                  : 'bg-gradient-to-b from-[#0ea5e9] to-[#0284c7] hover:from-[#38bdf8] hover:to-[#0ea5e9] border-sky-300/25 shadow-xs'
              }`}
            >
              <span>{labels.viewDealBtn}</span>
              <ArrowSquareOut weight="bold" className="w-3.5 h-3.5 shrink-0" />
            </button>
          </div>
        </div>
      </div>
    </article>
  );
});
