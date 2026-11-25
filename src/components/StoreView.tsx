import { memo, useCallback, useEffect, useMemo, useRef, useState, type RefObject } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import {
  ArrowsDownUp,
  ArrowsClockwise,
  ArrowUpRight,
  CaretDown,
  CaretLeft,
  CaretRight,
  Check,
  Cpu,
  DownloadSimple,
  EyeSlash,
  GraphicsCard,
  HardDrive,
  Info,
  Laptop,
  Memory,
  Play,
  Stack,
  UsersThree,
  Warning,
} from '@phosphor-icons/react';
import type { GameItem, SheetCatalogData } from '../types';
import { getStudioTotalCount, sortStudiosByTop } from '../utils/parsers';
import { evaluateCanRunGame, type CanRunEvaluation } from '../services/canRunIt';
import type { SystemHardwareSpecs } from '../services/systemSpecs';
import { GameCover } from './GameCover';
import { resolveSheetRefItem } from './ExtrasView';
import { SectionSourceBadge } from './SectionBadge';
import { StudioEmblem } from './StudiosView';
import type { AppLanguage } from '../services/launcherSettings';
import { getTranslations } from '../i18n/translations';

interface StoreViewProps {
  catalog: SheetCatalogData;
  favorites: Set<string>;
  systemSpecs?: SystemHardwareSpecs;
  canRunItEnabled?: boolean;
  isRefreshingSpecs?: boolean;
  language?: AppLanguage;
  onRefreshSpecs?: () => void;
  onToggleFavorite: (id: string) => void;
  onSelectGame: (game: GameItem, initialTab?: 'overview' | 'trailer' | 'downloads') => void;
  onBrowseLatestInLibrary?: () => void;
  onOpenStudiosPage: () => void;
}

const POPULAR_PAGE_SIZE = 20;
type PopularFilterMode = 'all' | 'hide-hv' | 'hide-games';
type PopularSortMode = 'newest' | 'az';

interface HorizontalSlideProps {
  title: string;
  items: GameItem[];
  onSelectGame: (game: GameItem) => void;
  actionLabel?: string;
  onAction?: () => void;
  isUpcoming?: boolean;
  autoSlide?: boolean;
  autoSlideIntervalMs?: number;
}

const HorizontalGameSlide = memo(function HorizontalGameSlide({
  title,
  items,
  onSelectGame,
  actionLabel,
  onAction,
  isUpcoming = false,
  autoSlide = false,
  autoSlideIntervalMs = 4500,
}: HorizontalSlideProps) {
  const sectionRef = useRef<HTMLElement | null>(null);
  const scrollerRef = useRef<HTMLDivElement | null>(null);
  const isPausedRef = useRef(false);
  const isInViewRef = useRef(true);

  useEffect(() => {
    const el = sectionRef.current;
    if (!el || typeof IntersectionObserver === 'undefined') return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        isInViewRef.current = Boolean(entry?.isIntersecting);
      },
      { threshold: 0.05 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const scrollByViewport = (dir: -1 | 1) => {
    const el = scrollerRef.current;
    if (!el) return;
    const maxScrollLeft = el.scrollWidth - el.clientWidth;
    if (maxScrollLeft <= 4) return;
    const step = Math.max(300, Math.floor(el.clientWidth * 0.78));

    if (dir === 1) {
      if (el.scrollLeft >= maxScrollLeft - 12) {
        el.scrollTo({ left: 0, behavior: 'smooth' });
      } else {
        el.scrollBy({ left: step, behavior: 'smooth' });
      }
    } else {
      if (el.scrollLeft <= 12) {
        el.scrollTo({ left: maxScrollLeft, behavior: 'smooth' });
      } else {
        el.scrollBy({ left: -step, behavior: 'smooth' });
      }
    }
  };

  useEffect(() => {
    if (!autoSlide || items.length <= 2) return;
    const timer = window.setInterval(() => {
      if (document.hidden || isPausedRef.current || !isInViewRef.current) return;
      const el = scrollerRef.current;
      if (!el) return;
      const maxScrollLeft = el.scrollWidth - el.clientWidth;
      if (maxScrollLeft <= 4) return;
      const step = Math.max(300, Math.floor(el.clientWidth * 0.72));
      if (el.scrollLeft >= maxScrollLeft - 12) {
        el.scrollTo({ left: 0, behavior: 'smooth' });
      } else {
        el.scrollBy({ left: step, behavior: 'smooth' });
      }
    }, autoSlideIntervalMs);
    return () => window.clearInterval(timer);
  }, [autoSlide, autoSlideIntervalMs, items.length]);

  if (items.length === 0) return null;

  return (
    <section
      ref={sectionRef}
      className="space-y-3.5"
      onMouseEnter={() => {
        isPausedRef.current = true;
      }}
      onMouseLeave={() => {
        isPausedRef.current = false;
      }}
      onFocus={() => {
        isPausedRef.current = true;
      }}
      onBlur={() => {
        isPausedRef.current = false;
      }}
    >
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3 min-w-0 flex-1">
          <h2 className="font-display text-[15px] lg:text-[17px] font-bold tracking-tight text-slate-900 dark:text-white shrink-0">
            {title}
          </h2>
          <div className="h-px flex-1 bg-slate-200 dark:bg-white/[0.07]" />
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {actionLabel && onAction && (
            <button
              type="button"
              onClick={onAction}
              className="text-[12px] font-medium text-[#0284c7] hover:text-slate-900 dark:text-[#66c0f4] dark:hover:text-white transition-colors me-1 whitespace-nowrap cursor-pointer"
            >
              {actionLabel}
            </button>
          )}
          <div dir="ltr" className="inline-flex items-center gap-2">
            <button
              type="button"
              aria-label={`Scroll ${title} left`}
              onClick={() => scrollByViewport(-1)}
              className="p-1.5 rounded bg-slate-200 hover:bg-slate-300 dark:bg-[#212a37] dark:hover:bg-[#2c3849] border border-slate-300 dark:border-white/[0.08] text-slate-700 hover:text-slate-950 dark:text-[#c6d4df] dark:hover:text-white transition-colors cursor-pointer"
            >
              <CaretLeft weight="bold" className="w-4 h-4" />
            </button>
            <button
              type="button"
              aria-label={`Scroll ${title} right`}
              onClick={() => scrollByViewport(1)}
              className="p-1.5 rounded bg-slate-200 hover:bg-slate-300 dark:bg-[#212a37] dark:hover:bg-[#2c3849] border border-slate-300 dark:border-white/[0.08] text-slate-700 hover:text-slate-950 dark:text-[#c6d4df] dark:hover:text-white transition-colors cursor-pointer"
            >
              <CaretRight weight="bold" className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      <div
        dir="ltr"
        ref={scrollerRef}
        className="no-scrollbar flex gap-3 sm:gap-3.5 overflow-x-auto scroll-smooth snap-x snap-mandatory pb-1"
      >
        {items.map((game) => {
          if (isUpcoming) {
            return (
              <div
                key={`${game.tab}-${game.id}`}
                className="snap-start shrink-0 w-[138px] sm:w-[162px] md:w-[172px] lg:w-[180px] xl:w-[190px] 2xl:w-[206px] bg-white dark:bg-[#18202b] border border-slate-200 dark:border-white/[0.06] rounded overflow-hidden select-none shadow-sm dark:shadow-none"
              >
                <div className="relative aspect-[2/3] bg-slate-200 dark:bg-[#0f141b] overflow-hidden pointer-events-none">
                  <GameCover
                    src={game.coverImage}
                    alt={game.name}
                    imgClassName="w-full h-full object-cover"
                  />
                </div>
              </div>
            );
          }

          const metaLine = game.repackSize || 'Repack';

          return (
            <div
              key={`${game.tab}-${game.id}`}
              onClick={() => onSelectGame(game)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  onSelectGame(game);
                }
              }}
              role="button"
              tabIndex={0}
              className="sa-contain-card snap-start shrink-0 w-[138px] sm:w-[162px] md:w-[172px] lg:w-[180px] xl:w-[190px] 2xl:w-[206px] group bg-white hover:bg-slate-50 dark:bg-[#18202b] dark:hover:bg-[#212b3a] border border-slate-200 dark:border-white/[0.06] hover:border-[#1a9fff]/60 rounded overflow-hidden transition-[transform,border-color,background-color] duration-200 hover:-translate-y-0.5 cursor-pointer flex flex-col shadow-sm dark:shadow-none focus:outline-none focus-visible:ring-2 focus-visible:ring-[#1a9fff]"
            >
              <div className="relative aspect-[2/3] bg-slate-200 dark:bg-[#0f141b] overflow-hidden">
                <GameCover
                  src={game.coverImage}
                  alt={game.name}
                  imgClassName="w-full h-full object-cover group-hover:scale-[1.03] transition-transform duration-300"
                />

                {game.isNew && (
                  <div className="absolute inset-x-0 top-0 bg-[#1a9fff] text-white text-[9.5px] font-bold tracking-[0.07em] uppercase py-[3px] text-center">
                    NEW
                  </div>
                )}
              </div>

              <div className="p-2.5 flex-1 flex flex-col justify-between gap-1">
                <h3 className="text-[12.5px] font-semibold text-slate-900 group-hover:text-black dark:text-[#e5e9f0] dark:group-hover:text-white line-clamp-1">
                  {game.name}
                </h3>
                <div className="flex items-center justify-between gap-2 text-[11px] text-slate-500 dark:text-[#8b9bb4] font-mono-tabular">
                  <span className="truncate">{metaLine}</span>
                  {game.originalSize && (
                    <span className="line-through text-slate-400 dark:text-[#59677b] shrink-0">
                      {game.originalSize}
                    </span>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
});

const HeroSpotlightSection = memo(function HeroSpotlightSection({
  featuredGames,
  fallbackGame,
  language,
  onSelectGame,
  belowHeroRef,
}: {
  featuredGames: GameItem[];
  fallbackGame: GameItem;
  language: AppLanguage;
  onSelectGame: (game: GameItem, initialTab?: 'overview' | 'trailer' | 'downloads') => void;
  belowHeroRef: RefObject<HTMLDivElement | null>;
}) {
  const tr = getTranslations(language);
  const t = tr.store;
  const heroSectionRef = useRef<HTMLElement | null>(null);
  const activeFeaturedIdRef = useRef<string | null>(null);
  const [slideIndex, setSlideIndex] = useState(0);
  const [heroPaused, setHeroPaused] = useState(false);
  const [isHeroInView, setIsHeroInView] = useState(true);
  const [isTabActive, setIsTabActive] = useState(() =>
    typeof document === 'undefined' ? true : !document.hidden
  );

  useEffect(() => {
    const handleVisibility = () => {
      setIsTabActive(!document.hidden);
    };
    document.addEventListener('visibilitychange', handleVisibility);
    return () => document.removeEventListener('visibilitychange', handleVisibility);
  }, []);

  useEffect(() => {
    const heroEl = heroSectionRef.current;
    if (!heroEl || typeof IntersectionObserver === 'undefined') return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        setIsHeroInView(Boolean(entry?.isIntersecting));
      },
      { threshold: 0.05 }
    );
    observer.observe(heroEl);
    return () => observer.disconnect();
  }, []);

  const isHeroActive = isHeroInView && isTabActive && !heroPaused;

  useEffect(() => {
    if (!isHeroActive || featuredGames.length <= 1) return;
    const timer = window.setInterval(() => {
      setSlideIndex((prev) => (prev + 1) % featuredGames.length);
    }, 6500);
    return () => window.clearInterval(timer);
  }, [isHeroActive, featuredGames.length]);

  useEffect(() => {
    const pinnedId = activeFeaturedIdRef.current;
    if (!pinnedId || featuredGames.length === 0) return;
    const matchedIdx = featuredGames.findIndex((g) => g.id === pinnedId);
    if (matchedIdx >= 0) {
      setSlideIndex((prev) => {
        const currentIdx = prev % featuredGames.length;
        return currentIdx === matchedIdx ? prev : matchedIdx;
      });
    }
  }, [featuredGames]);

  const activeFeatured =
    featuredGames[slideIndex % Math.max(1, featuredGames.length)] || fallbackGame;
  activeFeaturedIdRef.current = activeFeatured.id;
  const backdropSrc = activeFeatured.galleryImages[0] || activeFeatured.coverImage;
  const activeSlideIdx = slideIndex % Math.max(1, featuredGames.length);

  return (
    <section
      ref={heroSectionRef}
      onMouseEnter={() => setHeroPaused(true)}
      onMouseLeave={() => setHeroPaused(false)}
      className="sa-ps5-hero relative w-full min-h-[calc(100dvh-5.25rem)] sm:min-h-[calc(100dvh-5.75rem)] flex flex-col justify-between overflow-hidden bg-[#0a0f16] border-b border-slate-200/20 dark:border-white/[0.08]"
    >
      {/* Animated Full-Bleed Backdrop Layer */}
      <AnimatePresence mode="wait">
        <motion.div
          key={`hero-bg-${activeFeatured.id}`}
          initial={{ opacity: 0, scale: 1.08 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 1.05, ease: [0.16, 1, 0.3, 1] }}
          className="absolute inset-0 pointer-events-none"
        >
          {backdropSrc && (
            <motion.img
              src={backdropSrc}
              alt={activeFeatured.name}
              decoding="async"
              referrerPolicy="no-referrer"
              initial={{ scale: 1.04 }}
              animate={{ scale: 1 }}
              transition={{ duration: 6.5, ease: 'easeOut' }}
              className="sa-ps5-hero-img w-full h-full object-cover object-center opacity-55"
            />
          )}
        </motion.div>
      </AnimatePresence>

      {/* Measured Contrast Scrims + Subtle Compositor-Safe Radial Ambient Glow */}
      <div className="sa-hero-scrim-x sa-ps5-hero-scrim-x absolute inset-0 bg-gradient-to-r from-[#080c12] via-[#0a0f17]/88 to-[#0a0f17]/35 pointer-events-none" />
      <div className="sa-ps5-hero-scrim-y absolute inset-0 bg-gradient-to-t from-[#080c12] via-[#080c12]/35 to-[#080c12]/55 pointer-events-none" />
      <motion.div
        aria-hidden="true"
        animate={isHeroInView && isTabActive ? { opacity: [0.45, 0.85, 0.45] } : { opacity: 0.45 }}
        transition={
          isHeroInView && isTabActive
            ? { duration: 7, repeat: Infinity, ease: 'easeInOut' }
            : { duration: 0.2 }
        }
        style={{
          background:
            'radial-gradient(closest-side, rgba(26, 159, 255, 0.24) 0%, rgba(26, 159, 255, 0.09) 48%, transparent 100%)',
        }}
        className="absolute -top-36 start-[18%] w-[640px] h-[420px] rounded-full pointer-events-none"
      />

      {/* Main Hero Editorial & Modern Card Showcase Grid */}
      <div className="relative z-10 flex-1 w-full max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-10 xl:px-12 pt-5 sm:pt-7 lg:pt-10 pb-3 flex items-center">
        <div className="w-full grid grid-cols-1 md:grid-cols-12 items-center gap-5 md:gap-7 lg:gap-10 xl:gap-14">
          {/* Start Column: Animated Typography, Mobile Inline Card & Action Buttons */}
          <div className="md:col-span-7 min-w-0">
            <AnimatePresence mode="wait">
              <motion.div
                key={`hero-copy-${activeFeatured.id}`}
                initial={{ opacity: 0, y: 18 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
                className="space-y-3.5 sm:space-y-4 lg:space-y-5"
              >
                {/* Mobile (<768px) Compact Inline Card + Kicker & Title */}
                <div className="flex items-start gap-3.5 md:block">
                  <button
                    type="button"
                    onClick={() => onSelectGame(activeFeatured, 'overview')}
                    aria-label={`${activeFeatured.name} — ${t.viewDetails}`}
                    className="md:hidden group relative w-[86px] sm:w-[102px] aspect-[2/3] rounded-xl overflow-hidden border border-white/[0.2] bg-[#0e141d] shadow-[0_14px_34px_rgba(0,0,0,0.65)] shrink-0 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#38bdf8]"
                  >
                    <GameCover
                      src={activeFeatured.coverImage}
                      alt={activeFeatured.name}
                      priority
                      imgClassName="w-full h-full object-cover"
                    />
                  </button>

                  <div className="min-w-0 flex-1 space-y-2 sm:space-y-2.5">
                    {/* Clean Unboxed Kicker Line */}
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.38, delay: 0.05, ease: [0.16, 1, 0.3, 1] }}
                      className="flex flex-wrap items-center gap-1.5 sm:gap-2 text-[10.5px] sm:text-[12px] font-semibold tracking-[0.11em] uppercase text-[#38bdf8]"
                    >
                      <span>
                        {activeFeatured.isPinned ? t.featuredSpotlight : t.latestRelease}
                      </span>
                      {activeFeatured.repackBy && (
                        <>
                          <span aria-hidden="true" className="text-white/35">
                            ·
                          </span>
                          <span className="text-[#93c5fd]">{activeFeatured.repackBy}</span>
                        </>
                      )}
                      {activeFeatured.dateAdded && (
                        <>
                          <span aria-hidden="true" className="text-white/35">
                            ·
                          </span>
                          <span className="text-white/70 font-mono-tabular">
                            {new Date(activeFeatured.dateAdded).toLocaleDateString(tr.locale)}
                          </span>
                        </>
                      )}
                      {(activeFeatured.repackSize || activeFeatured.originalSize) && (
                        <>
                          <span aria-hidden="true" className="text-white/35">
                            ·
                          </span>
                          <span className="inline-flex items-baseline gap-1.5 font-mono-tabular normal-case tracking-normal">
                            {activeFeatured.repackSize && (
                              <span className="text-[#66c0f4] font-bold">
                                {activeFeatured.repackSize}
                              </span>
                            )}
                            {activeFeatured.originalSize && (
                              <span className="text-white/55 line-through font-medium">
                                {activeFeatured.originalSize}
                              </span>
                            )}
                          </span>
                        </>
                      )}
                    </motion.div>

                    {/* Hero Display Title */}
                    <motion.h1
                      initial={{ opacity: 0, y: 14 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.44, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
                      style={{
                        fontSize: 'clamp(1.38rem, 3.2vw, 3.4rem)',
                        textWrap: 'balance',
                      }}
                      className="font-display font-extrabold text-white tracking-[-0.025em] leading-[1.08] drop-shadow-[0_4px_24px_rgba(0,0,0,0.45)]"
                    >
                      {activeFeatured.name}
                    </motion.h1>
                  </div>
                </div>

                {/* Clean Metadata Strip */}
                {(activeFeatured.genreList.length > 0 || activeFeatured.version) && (
                  <motion.p
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.42, delay: 0.15, ease: [0.16, 1, 0.3, 1] }}
                    className="text-[12px] sm:text-[13px] lg:text-[13.5px] font-medium text-[#b5c4d6] tracking-wide line-clamp-1"
                  >
                    {[...activeFeatured.genreList.slice(0, 4), activeFeatured.version]
                      .filter(Boolean)
                      .join(' · ')}
                  </motion.p>
                )}

                {/* Narrative Description */}
                <motion.p
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.44, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
                  className="text-[13px] sm:text-[14.5px] lg:text-[15.5px] text-[#d6e1ed] leading-relaxed line-clamp-2 sm:line-clamp-3 max-w-2xl"
                >
                  {activeFeatured.description}
                </motion.p>

                {/* Action Buttons */}
                <motion.div
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.45, delay: 0.25, ease: [0.16, 1, 0.3, 1] }}
                  className="pt-1 flex flex-wrap items-center gap-2.5 sm:gap-3"
                >
                  <button
                    type="button"
                    onClick={() => onSelectGame(activeFeatured, 'downloads')}
                    className="group relative overflow-hidden inline-flex items-center gap-2 px-4 py-2.5 sm:px-6 sm:py-3.5 rounded-xl bg-[#0284c7] hover:bg-[#0ea5e9] dark:bg-[#1a9fff] dark:hover:bg-[#38adff] text-white text-[13px] sm:text-[14px] font-semibold shadow-[0_12px_32px_rgba(26,159,255,0.38)] hover:-translate-y-0.5 active:translate-y-0 transition-all duration-200 whitespace-nowrap cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#38bdf8]"
                  >
                    <span
                      aria-hidden="true"
                      className="absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-700 bg-gradient-to-r from-transparent via-white/25 to-transparent"
                    />
                    <DownloadSimple className="w-4 h-4 relative z-10 shrink-0" />
                    <span className="relative z-10">{t.download}</span>
                  </button>

                  {activeFeatured.embedTrailerUrl && (
                    <button
                      type="button"
                      onClick={() => onSelectGame(activeFeatured, 'trailer')}
                      className="inline-flex items-center gap-2 px-3.5 py-2.5 sm:px-5 sm:py-3.5 rounded-xl bg-white/[0.11] hover:bg-white/[0.2] backdrop-blur-md border border-white/[0.2] text-white text-[13px] sm:text-[14px] font-medium hover:-translate-y-0.5 transition-all duration-200 whitespace-nowrap cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70"
                    >
                      <Play weight="fill" className="w-4 h-4 fill-current shrink-0" />
                      <span>{t.watchTrailer}</span>
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={() => onSelectGame(activeFeatured, 'overview')}
                    className="inline-flex items-center gap-2 px-3.5 py-2.5 sm:px-4.5 sm:py-3.5 rounded-xl bg-white/[0.06] hover:bg-white/[0.14] backdrop-blur-md border border-white/[0.14] text-[#dce8f5] hover:text-white text-[13px] sm:text-[14px] font-medium hover:-translate-y-0.5 transition-all duration-200 whitespace-nowrap cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/60"
                  >
                    <Info className="w-4 h-4 shrink-0" />
                    <span>{t.viewDetails}</span>
                  </button>
                </motion.div>
              </motion.div>
            </AnimatePresence>
          </div>

          {/* End Column (Tablet & Desktop md+): Featured Cover Image Card */}
          <div className="hidden md:flex md:col-span-5 justify-end">
            <AnimatePresence mode="wait">
              <motion.div
                key={`hero-card-${activeFeatured.id}`}
                initial={{ opacity: 0, y: 18 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
                className="md:w-[190px] lg:w-[235px] xl:w-[285px] 2xl:w-[320px] shrink-0"
              >
                <div
                  role="button"
                  tabIndex={0}
                  onClick={() => onSelectGame(activeFeatured, 'overview')}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      onSelectGame(activeFeatured, 'overview');
                    }
                  }}
                  aria-label={`${activeFeatured.name} — ${t.viewDetails}`}
                  className="group relative rounded-2xl overflow-hidden border border-white/[0.18] bg-[#0e141d]/85 backdrop-blur-xl shadow-[0_28px_70px_rgba(0,0,0,0.68),0_0_0_1px_rgba(255,255,255,0.06)] cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#38bdf8]"
                >
                  <div className="relative aspect-[2/3] w-full overflow-hidden bg-[#121822]">
                    <GameCover
                      src={activeFeatured.coverImage}
                      alt={activeFeatured.name}
                      priority
                      imgClassName="w-full h-full object-cover"
                    />
                  </div>
                </div>
              </motion.div>
            </AnimatePresence>
          </div>
        </div>
      </div>

      {/* Hero Bottom Interactive Dock: Featured Thumbnails + Controls + Scroll Cue */}
      <div className="relative z-10 w-full max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-10 xl:px-12 pb-3.5 sm:pb-5 pt-1.5">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5 sm:gap-4 pt-2.5 border-t border-white/[0.1]">
          {/* Clickable Featured Game Thumbnail Rail */}
          {featuredGames.length > 1 && (
            <div className="no-scrollbar flex items-center gap-2 overflow-x-auto pb-0.5 sm:pb-0 flex-1 min-w-0">
              {featuredGames.map((item, idx) => {
                const isActive = idx === activeSlideIdx;
                return (
                  <button
                    key={`hero-thumb-${item.id}`}
                    type="button"
                    onClick={() => setSlideIndex(idx)}
                    aria-label={`Spotlight ${item.name}`}
                    className={`group relative flex items-center gap-2 px-2 py-1 sm:px-2.5 sm:py-1.5 rounded-xl border text-start transition-all duration-200 cursor-pointer shrink-0 overflow-hidden ${
                      isActive
                        ? 'bg-white/[0.14] border-white/[0.3] text-white shadow-lg min-w-[145px] sm:min-w-[180px]'
                        : 'bg-black/35 hover:bg-white/[0.08] border-white/[0.08] text-white/70 hover:text-white max-w-[135px] sm:max-w-[170px]'
                    }`}
                  >
                    <div className="w-6 h-8 sm:w-7 sm:h-9 rounded overflow-hidden bg-[#141a23] shrink-0 border border-white/[0.1]">
                      <GameCover
                        src={item.coverImage}
                        alt={item.name}
                        imgClassName="w-full h-full object-cover"
                      />
                    </div>
                    <span className="text-[11px] sm:text-[11.5px] font-medium truncate">
                      {item.name}
                    </span>
                    {isActive && (
                      <motion.span
                        key={`progress-${item.id}-${isHeroActive ? 'play' : 'paused'}`}
                        initial={{ scaleX: 0 }}
                        animate={{ scaleX: isHeroActive ? 1 : 0 }}
                        transition={{
                          duration: isHeroActive ? 6.5 : 0.15,
                          ease: 'linear',
                        }}
                        style={{
                          transformOrigin: language === 'ar' ? '100% 50%' : '0% 50%',
                        }}
                        className="absolute inset-x-0 bottom-0 h-[2px] bg-[#38bdf8]"
                      />
                    )}
                  </button>
                );
              })}
            </div>
          )}

          {/* Carousel Controls + Explore Below Cue */}
          <div className="flex items-center justify-between sm:justify-end gap-2 shrink-0">
            {featuredGames.length > 1 && (
              <div dir="ltr" className="inline-flex items-center gap-1.5">
                <button
                  type="button"
                  aria-label="Previous featured game"
                  onClick={() =>
                    setSlideIndex(
                      (prev) => (prev - 1 + featuredGames.length) % featuredGames.length
                    )
                  }
                  className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-white/[0.08] hover:bg-white/[0.18] border border-white/[0.14] text-white flex items-center justify-center transition-colors cursor-pointer"
                >
                  <CaretLeft weight="bold" className="w-4 h-4" />
                </button>
                <span className="px-1.5 sm:px-2 text-[11px] sm:text-[11.5px] font-mono-tabular text-white/75 select-none">
                  {activeSlideIdx + 1} / {featuredGames.length}
                </span>
                <button
                  type="button"
                  aria-label="Next featured game"
                  onClick={() =>
                    setSlideIndex((prev) => (prev + 1) % featuredGames.length)
                  }
                  className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-white/[0.08] hover:bg-white/[0.18] border border-white/[0.14] text-white flex items-center justify-center transition-colors cursor-pointer"
                >
                  <CaretRight weight="bold" className="w-4 h-4" />
                </button>
              </div>
            )}

            <button
              type="button"
              onClick={() =>
                belowHeroRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
              }
              aria-label={t.exploreCatalog}
              className="inline-flex items-center gap-1.5 px-3 sm:px-3.5 h-8 sm:h-9 rounded-xl bg-white/[0.08] hover:bg-white/[0.16] border border-white/[0.14] text-white/90 hover:text-white text-[11.5px] sm:text-[12px] font-medium transition-colors whitespace-nowrap cursor-pointer"
            >
              <span>{t.exploreCatalog}</span>
              <motion.span
                animate={isHeroInView && isTabActive ? { y: [0, 3, 0] } : { y: 0 }}
                transition={
                  isHeroInView && isTabActive
                    ? { duration: 1.8, repeat: Infinity, ease: 'easeInOut' }
                    : { duration: 0.15 }
                }
                className="inline-flex"
              >
                <CaretDown weight="bold" className="w-3.5 h-3.5" />
              </motion.span>
            </button>
          </div>
        </div>
      </div>
    </section>
  );
});

export const StoreView = memo(function StoreView({
  catalog,
  systemSpecs,
  canRunItEnabled = true,
  isRefreshingSpecs = false,
  language = 'en',
  onRefreshSpecs,
  onSelectGame,
  onOpenStudiosPage,
}: StoreViewProps) {
  const tr = getTranslations(language);
  const t = tr.store;
  const games = catalog.game;
  const [popularPage, setPopularPage] = useState(0);
  const [popularFilter, setPopularFilter] = useState<PopularFilterMode>('all');
  const [popularSort, setPopularSort] = useState<PopularSortMode>('newest');
  const [pcCompatTab, setPcCompatTab] = useState<'can-run' | 'cannot-run'>('can-run');
  const [pcCompatScope, setPcCompatScope] = useState<
    'all' | 'game' | 'hypervisor' | 'steamtools' | 'ps5' | 'architect'
  >('all');
  const popularSectionRef = useRef<HTMLElement | null>(null);
  const pcCompatScrollerRef = useRef<HTMLDivElement | null>(null);
  const belowHeroRef = useRef<HTMLDivElement | null>(null);
  const twoPlayersSectionRef = useRef<HTMLElement | null>(null);
  const isTwoPlayersInViewRef = useRef(true);

  const handleSelectGameOverview = useCallback(
    (game: GameItem) => {
      onSelectGame(game, 'overview');
    },
    [onSelectGame]
  );

  // Featured Hero Slides: prioritize latest releases with rich landscape screenshots
  const featuredGames = useMemo(() => {
    const pinned = games.filter((g) => g.isPinned);
    const byRecent = [...games].sort(
      (a, b) => b.dateTimestamp - a.dateTimestamp || Number(b.id) - Number(a.id)
    );
    const pool = [...pinned];
    for (const g of byRecent) {
      if (pool.length >= 6) break;
      if (!pool.some((p) => p.id === g.id) && g.galleryImages.length > 0 && g.coverImage) {
        pool.push(g);
      }
    }
    return pool.length > 0 ? pool.slice(0, 6) : games.slice(0, 6);
  }, [games]);

  useEffect(() => {
    const twoEl = twoPlayersSectionRef.current;
    if (!twoEl || typeof IntersectionObserver === 'undefined') return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        isTwoPlayersInViewRef.current = Boolean(entry?.isIntersecting);
      },
      { threshold: 0.05 }
    );
    observer.observe(twoEl);
    return () => observer.disconnect();
  }, [games.length]);

  // Upcoming Games from Google Sheet `upcoming` tab — newest first
  const upcomingGames = useMemo(
    () =>
      [...(catalog.upcoming || [])].sort(
        (a, b) => b.dateTimestamp - a.dateTimestamp
      ),
    [catalog.upcoming]
  );

  // Recent Games: newest first (`isNew` / `dateTimestamp` desc / `id` desc)
  const recentGames = useMemo(
    () =>
      [...games]
        .sort(
          (a, b) =>
            Number(b.isNew) - Number(a.isNew) ||
            b.dateTimestamp - a.dateTimestamp ||
            Number(b.id) - Number(a.id)
        )
        .slice(0, 24),
    [games]
  );

  // Can Run It — evaluate all catalog sections with hardware requirements against real PC specs
  const pcCompatibilityData = useMemo(() => {
    const emptyCounts = {
      all: 0,
      game: 0,
      hypervisor: 0,
      steamtools: 0,
      ps5: 0,
      architect: 0,
    };

    if (!systemSpecs) {
      return {
        canRun: [] as { item: GameItem; evalRes: CanRunEvaluation }[],
        cannotRun: [] as { item: GameItem; evalRes: CanRunEvaluation }[],
        scopeCounts: emptyCounts,
      };
    }

    const combinedPool = [
      ...(catalog.game || []),
      ...(catalog.hypervisor || []),
      ...(catalog.steamtools || []),
      ...(catalog.ps5 || []),
      ...(catalog.architect || []),
    ];

    const scopeCounts = { ...emptyCounts };
    const canRun: { item: GameItem; evalRes: CanRunEvaluation }[] = [];
    const cannotRun: { item: GameItem; evalRes: CanRunEvaluation }[] = [];

    for (const item of combinedPool) {
      const evalRes = evaluateCanRunGame(item, systemSpecs);
      if (!evalRes.hasRequirements || evalRes.status === 'unknown') continue;

      scopeCounts.all += 1;
      if (item.tab in scopeCounts) {
        scopeCounts[item.tab as keyof typeof scopeCounts] += 1;
      }

      if (pcCompatScope !== 'all' && item.tab !== pcCompatScope) continue;

      if (evalRes.status === 'can-run') {
        canRun.push({ item, evalRes });
      } else if (evalRes.status === 'cannot-run') {
        cannotRun.push({ item, evalRes });
      }
    }

    const sortNewestFirst = (
      a: { item: GameItem; evalRes: CanRunEvaluation },
      b: { item: GameItem; evalRes: CanRunEvaluation }
    ) =>
      Number(b.item.isNew) - Number(a.item.isNew) ||
      Number(b.item.isPinned) - Number(a.item.isPinned) ||
      b.item.dateTimestamp - a.item.dateTimestamp ||
      Number(b.item.id) - Number(a.item.id);

    canRun.sort(sortNewestFirst);
    cannotRun.sort(sortNewestFirst);

    return { canRun, cannotRun, scopeCounts };
  }, [catalog, pcCompatScope, systemSpecs]);

  const activePcCompatList =
    pcCompatTab === 'can-run'
      ? pcCompatibilityData.canRun.slice(0, 30)
      : pcCompatibilityData.cannotRun.slice(0, 30);

  useEffect(() => {
    pcCompatScrollerRef.current?.scrollTo({ left: 0 });
  }, [pcCompatScope, pcCompatTab]);

  const scrollPcCompat = (dir: -1 | 1) => {
    const el = pcCompatScrollerRef.current;
    if (!el) return;
    const maxScrollLeft = el.scrollWidth - el.clientWidth;
    if (maxScrollLeft <= 4) return;
    const step = Math.max(280, Math.floor(el.clientWidth * 0.78));
    if (dir === 1) {
      if (el.scrollLeft >= maxScrollLeft - 12) {
        el.scrollTo({ left: 0, behavior: 'smooth' });
      } else {
        el.scrollBy({ left: step, behavior: 'smooth' });
      }
    } else {
      if (el.scrollLeft <= 12) {
        el.scrollTo({ left: maxScrollLeft, behavior: 'smooth' });
      } else {
        el.scrollBy({ left: -step, behavior: 'smooth' });
      }
    }
  };

  // Most Popular Games resolved from ALL tokens inside Google Sheet `PopularRepacks`
  // Deduplicated by `tab:id` so `g#` (Games) and `h#` (Hypervisor) remain distinct entries (e.g. 174 + 29 = 203)
  const popularEntries = useMemo(() => {
    const rows = catalog.popularrepacks || [];
    const byKey = new Map<string, { item: GameItem; isHypervisor: boolean; sheetOrder: number }>();

    rows.forEach((row, rowIdx) => {
      const tokens = (row.rawFields['Game ID'] || '')
        .split(/[,\s|]+/)
        .map((t) => t.trim())
        .filter(Boolean);

      for (const tok of tokens) {
        const target = resolveSheetRefItem(tok, catalog);
        if (!target) continue;

        const key = `${target.tab}:${target.id}`;
        const existing = byKey.get(key);
        if (!existing) {
          byKey.set(key, {
            item: target,
            isHypervisor: target.tab === 'hypervisor',
            sheetOrder: rowIdx,
          });
        } else {
          existing.sheetOrder = Math.max(existing.sheetOrder, rowIdx);
        }
      }
    });

    return Array.from(byKey.values());
  }, [catalog]);

  const popularFilterCounts = useMemo(() => {
    let all = popularEntries.length;
    let gamesOnly = 0;
    let hvOnly = 0;
    for (const entry of popularEntries) {
      if (entry.isHypervisor) hvOnly++;
      else gamesOnly++;
    }
    return { all, gamesOnly, hvOnly };
  }, [popularEntries]);

  const popularGames = useMemo(() => {
    const filtered = popularEntries.filter((entry) => {
      if (popularFilter === 'hide-hv') return !entry.isHypervisor;
      if (popularFilter === 'hide-games') return entry.isHypervisor;
      return true;
    });

    return [...filtered]
      .map((entry) => ({
        item: entry.item,
        hasHypervisor: entry.isHypervisor,
        sheetOrder: entry.sheetOrder,
      }))
      .sort((a, b) => {
        if (popularSort === 'az') {
          return (
            a.item.name.localeCompare(b.item.name) ||
            Number(a.hasHypervisor) - Number(b.hasHypervisor)
          );
        }
        return (
          Number(b.item.isNew) - Number(a.item.isNew) ||
          b.item.dateTimestamp - a.item.dateTimestamp ||
          b.sheetOrder - a.sheetOrder ||
          Number(b.item.id) - Number(a.item.id)
        );
      });
  }, [popularEntries, popularFilter, popularSort]);

  const totalPopularPages = Math.max(1, Math.ceil(popularGames.length / POPULAR_PAGE_SIZE));
  const safePopularPage = Math.min(popularPage, totalPopularPages - 1);
  const visiblePopularGames = useMemo(() => {
    const start = safePopularPage * POPULAR_PAGE_SIZE;
    return popularGames.slice(start, start + POPULAR_PAGE_SIZE);
  }, [popularGames, safePopularPage]);
  const nextPopularPageCount = Math.min(
    POPULAR_PAGE_SIZE,
    Math.max(0, popularGames.length - (safePopularPage + 1) * POPULAR_PAGE_SIZE)
  );

  // Top 10 Studios from Google Sheet `profil` tab
  const topStudios = useMemo(
    () => sortStudiosByTop(catalog.profil || []).slice(0, 10),
    [catalog.profil]
  );

  // Best games For Two Players from Google Sheet `onlinegames` tab (supports multi-ID CSV like "g123,g74,g12")
  const twoPlayerGames = useMemo(() => {
    const seen = new Set<string>();
    const results: GameItem[] = [];
    for (const row of catalog.onlinegames || []) {
      const refRaw = row.rawFields.id || '';
      for (const token of refRaw.split(',')) {
        const cleanToken = token.trim();
        if (!cleanToken) continue;
        const resolved = resolveSheetRefItem(cleanToken, catalog);
        if (resolved) {
          const key = `${resolved.tab}:${resolved.id}`;
          if (!seen.has(key)) {
            seen.add(key);
            results.push(resolved);
          }
        }
      }
    }
    return results;
  }, [catalog]);

  const twoPlayersScrollerRef = useRef<HTMLDivElement | null>(null);
  const twoPlayersPausedRef = useRef(false);

  const scrollTwoPlayers = (dir: -1 | 1) => {
    const el = twoPlayersScrollerRef.current;
    if (!el) return;
    const maxScrollLeft = el.scrollWidth - el.clientWidth;
    if (maxScrollLeft <= 4) return;
    const step = Math.max(260, Math.floor(el.clientWidth * 0.78));
    if (dir === 1) {
      if (el.scrollLeft >= maxScrollLeft - 12) {
        el.scrollTo({ left: 0, behavior: 'smooth' });
      } else {
        el.scrollBy({ left: step, behavior: 'smooth' });
      }
    } else {
      if (el.scrollLeft <= 12) {
        el.scrollTo({ left: maxScrollLeft, behavior: 'smooth' });
      } else {
        el.scrollBy({ left: -step, behavior: 'smooth' });
      }
    }
  };

  useEffect(() => {
    if (twoPlayerGames.length <= 2) return;
    const timer = window.setInterval(() => {
      if (document.hidden || twoPlayersPausedRef.current || !isTwoPlayersInViewRef.current) return;
      const el = twoPlayersScrollerRef.current;
      if (!el) return;
      const maxScrollLeft = el.scrollWidth - el.clientWidth;
      if (maxScrollLeft <= 4) return;
      const step = Math.max(260, Math.floor(el.clientWidth * 0.72));
      if (el.scrollLeft >= maxScrollLeft - 12) {
        el.scrollTo({ left: 0, behavior: 'smooth' });
      } else {
        el.scrollBy({ left: step, behavior: 'smooth' });
      }
    }, 4600);
    return () => window.clearInterval(timer);
  }, [twoPlayerGames.length]);

  const fallbackFeatured = featuredGames[0] || games[0];

  if (!fallbackFeatured) {
    return (
      <div className="flex-1 flex items-center justify-center bg-[#f4f6f9] text-slate-600 dark:bg-[#1b222c] dark:text-[#8b9bb4]">
        {t.noCatalogLoaded}
      </div>
    );
  }

  const goToPopularPage = (nextPage: number) => {
    const bounded = Math.max(0, Math.min(nextPage, totalPopularPages - 1));
    setPopularPage(bounded);
    popularSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  return (
    <div className="flex-1 min-w-0 h-full overflow-y-auto bg-gradient-to-b from-slate-50 via-[#f4f6f9] to-slate-100 dark:from-[#1a2330] dark:via-[#151b24] dark:to-[#10141b]">
      {/* 1. Full-Width, Full-Height Modern Animated Hero Section (isolated memo boundary) */}
      <HeroSpotlightSection
        featuredGames={featuredGames}
        fallbackGame={fallbackFeatured}
        language={language}
        onSelectGame={onSelectGame}
        belowHeroRef={belowHeroRef}
      />

      <div
        ref={belowHeroRef}
        className="max-w-[1600px] mx-auto px-3 sm:px-6 lg:px-8 py-6 sm:py-8 lg:py-10 space-y-8 sm:space-y-10"
      >

        {/* 2. Upcoming Games Slide (Google Sheet: upcoming) */}
        <HorizontalGameSlide
          title={t.upcomingGames}
          items={upcomingGames}
          onSelectGame={handleSelectGameOverview}
          isUpcoming
          autoSlide
          autoSlideIntervalMs={4500}
        />

        {/* 3. Recent Games Slide (Newest first in catalog) */}
        <HorizontalGameSlide
          title={t.recentGames}
          items={recentGames}
          onSelectGame={handleSelectGameOverview}
          autoSlide
          autoSlideIntervalMs={5200}
        />

        {/* 3.5 Can Run It? — Real PC Compatibility Scanner (All Catalog Sections) */}
        {canRunItEnabled && systemSpecs && (
          <section className="sa-ps5-panel rounded-xl bg-gradient-to-br from-white via-slate-50 to-slate-100/80 dark:from-[#131b26] dark:via-[#10161f] dark:to-[#0d1118] border border-slate-200 dark:border-white/[0.08] p-4 sm:p-5 space-y-4 shadow-sm dark:shadow-xl">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2.5 min-w-0">
                <span className="w-8 h-8 rounded-lg bg-[#1a9fff]/15 border border-[#1a9fff]/35 text-[#0284c7] dark:text-[#66c0f4] flex items-center justify-center shrink-0">
                  <Laptop className="w-4 h-4" />
                </span>
                <div className="min-w-0">
                  <h2 className="font-display text-[15px] lg:text-[17px] font-bold tracking-tight text-slate-900 dark:text-white">
                    {t.canRunTitle}
                  </h2>
                  <p className="text-[11.5px] text-slate-600 dark:text-[#8b9bb4]">{t.canRunSubtitle}</p>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                {/* Scope Filter: All / Games / Hypervisor / SteamTools / PS5 / Tools */}
                <div className="sa-ps5-pill-group inline-flex flex-wrap items-center p-0.5 rounded bg-slate-200/85 dark:bg-[#141a23] border border-slate-300/80 dark:border-white/[0.08]">
                  {(
                    [
                      { key: 'all', label: t.scopeAll },
                      { key: 'game', label: t.scopeGames },
                      { key: 'hypervisor', label: t.scopeHypervisor },
                      { key: 'steamtools', label: t.scopeSteamTools },
                      { key: 'ps5', label: t.scopePs5 },
                      { key: 'architect', label: t.scopeTools },
                    ] as const
                  ).map((opt) => {
                    const count = pcCompatibilityData.scopeCounts[opt.key];
                    return (
                      <button
                        key={opt.key}
                        type="button"
                        onClick={() => setPcCompatScope(opt.key)}
                        className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-[3px] text-[11.5px] font-semibold transition-colors cursor-pointer ${
                          pcCompatScope === opt.key
                            ? 'bg-[#1a9fff] text-white'
                            : 'text-slate-600 hover:text-slate-900 dark:text-[#9fb0c7] dark:hover:text-white'
                        }`}
                      >
                        <span>{opt.label}</span>
                        {count > 0 && (
                          <span className="text-[10.5px] font-mono-tabular opacity-80">
                            ({count})
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>

                {/* Can Run (Green) vs Can't Run (Red) Toggle */}
                <div className="sa-ps5-pill-group inline-flex items-center p-0.5 rounded bg-slate-200/85 dark:bg-[#141a23] border border-slate-300/80 dark:border-white/[0.08]">
                  <button
                    type="button"
                    data-active={pcCompatTab === 'can-run' ? 'true' : 'false'}
                    onClick={() => setPcCompatTab('can-run')}
                    className={`sa-ps5-toggle-pass inline-flex items-center gap-1.5 px-2.5 py-1 rounded-[3px] text-[11.5px] font-bold transition-colors cursor-pointer ${
                      pcCompatTab === 'can-run'
                        ? 'bg-emerald-600 dark:bg-emerald-600/85 text-white shadow-sm'
                        : 'text-emerald-700 hover:bg-emerald-500/10 dark:text-[#4ade80]'
                    }`}
                  >
                    <Check className="w-3.5 h-3.5" />
                    <span>{t.canRunBtn}</span>
                    <span className="font-mono-tabular opacity-90">
                      ({pcCompatibilityData.canRun.length})
                    </span>
                  </button>
                  <button
                    type="button"
                    data-active={pcCompatTab === 'cannot-run' ? 'true' : 'false'}
                    onClick={() => setPcCompatTab('cannot-run')}
                    className={`sa-ps5-toggle-fail inline-flex items-center gap-1.5 px-2.5 py-1 rounded-[3px] text-[11.5px] font-bold transition-colors cursor-pointer ${
                      pcCompatTab === 'cannot-run'
                        ? 'bg-rose-600 dark:bg-rose-600/85 text-white shadow-sm'
                        : 'text-rose-700 hover:bg-rose-500/10 dark:text-[#f87171]'
                    }`}
                  >
                    <Warning className="w-3.5 h-3.5" />
                    <span>{t.cannotRunBtn}</span>
                    <span className="font-mono-tabular opacity-90">
                      ({pcCompatibilityData.cannotRun.length})
                    </span>
                  </button>
                </div>

                <div dir="ltr" className="flex items-center gap-1.5">
                  <button
                    type="button"
                    aria-label="Scroll compatibility list left"
                    onClick={() => scrollPcCompat(-1)}
                    className="p-1.5 rounded bg-slate-200 hover:bg-slate-300 border border-slate-300 text-slate-700 hover:text-slate-900 dark:bg-[#212a37] dark:hover:bg-[#2c3849] dark:border-white/[0.08] dark:text-[#c6d4df] dark:hover:text-white transition-colors cursor-pointer"
                  >
                    <CaretLeft weight="bold" className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    aria-label="Scroll compatibility list right"
                    onClick={() => scrollPcCompat(1)}
                    className="p-1.5 rounded bg-slate-200 hover:bg-slate-300 border border-slate-300 text-slate-700 hover:text-slate-900 dark:bg-[#212a37] dark:hover:bg-[#2c3849] dark:border-white/[0.08] dark:text-[#c6d4df] dark:hover:text-white transition-colors cursor-pointer"
                  >
                    <CaretRight weight="bold" className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>

            {/* Detected PC Specs Ribbon */}
            <div className="sa-ps5-subpanel flex flex-wrap items-center justify-between gap-2.5 px-3 py-2 rounded-lg bg-white dark:bg-[#0d1219] border border-slate-200 dark:border-white/[0.06] text-[11.5px]">
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-slate-700 dark:text-[#cbd5e1]">
                <span className="inline-flex items-center gap-1.5">
                  <GraphicsCard className="w-3.5 h-3.5 text-[#0284c7] dark:text-[#66c0f4] shrink-0" />
                  <span className="text-slate-500 dark:text-[#8b9bb4]">{t.gpuLabel}:</span>
                  <strong className="text-slate-900 dark:text-white font-semibold">{systemSpecs.gpuName}</strong>
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <Cpu className="w-3.5 h-3.5 text-[#0284c7] dark:text-[#66c0f4] shrink-0" />
                  <span className="text-slate-500 dark:text-[#8b9bb4]">{t.cpuLabel}:</span>
                  <strong className="text-slate-900 dark:text-white font-semibold">{systemSpecs.cpuName}</strong>
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <Memory className="w-3.5 h-3.5 text-[#0284c7] dark:text-[#66c0f4] shrink-0" />
                  <span className="text-slate-500 dark:text-[#8b9bb4]">{t.ramLabel}:</span>
                  <strong className="text-slate-900 dark:text-white font-semibold font-mono-tabular">
                    {systemSpecs.ramGB !== null && systemSpecs.ramGB > 0
                      ? systemSpecs.ramIsApprox
                        ? `${systemSpecs.ramGB} GB+`
                        : `${systemSpecs.ramGB} GB`
                      : 'N/A'}
                  </strong>
                </span>
                {systemSpecs.freeSpaceGB !== null && (
                  <span className="inline-flex items-center gap-1.5">
                    <HardDrive className="w-3.5 h-3.5 text-[#0284c7] dark:text-[#66c0f4] shrink-0" />
                    <span className="text-slate-500 dark:text-[#8b9bb4]">
                      {t.freeDriveLabel}{systemSpecs.spaceDrive ? ` (${systemSpecs.spaceDrive})` : ''}:
                    </span>
                    <strong className="text-slate-900 dark:text-white font-semibold font-mono-tabular">
                      {systemSpecs.freeSpaceGB.toFixed(1)} GB
                    </strong>
                  </span>
                )}
              </div>

              {onRefreshSpecs && (
                <button
                  type="button"
                  onClick={onRefreshSpecs}
                  disabled={isRefreshingSpecs}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded bg-slate-100 hover:bg-slate-200 border border-slate-300 text-[11px] font-semibold text-[#0284c7] hover:text-slate-900 dark:bg-[#1a222d] dark:hover:bg-[#243040] dark:border-white/[0.08] dark:text-[#66c0f4] dark:hover:text-white transition-colors cursor-pointer disabled:opacity-50"
                >
                  <ArrowsClockwise className={`w-3 h-3 ${isRefreshingSpecs ? 'animate-spin' : ''}`} />
                  <span>{t.scanPc}</span>
                </button>
              )}
            </div>

            {/* Matching Cards Row */}
            {activePcCompatList.length === 0 ? (
              <div className="sa-ps5-subpanel py-8 text-center rounded bg-slate-50 dark:bg-[#0e131b] border border-slate-200 dark:border-white/[0.05] text-[13px] text-slate-600 dark:text-[#8b9bb4]">
                {pcCompatTab === 'cannot-run' ? t.canRunEmptyFail : t.canRunEmptyPass}
              </div>
            ) : (
              <div
                dir="ltr"
                ref={pcCompatScrollerRef}
                className="no-scrollbar flex gap-3 sm:gap-3.5 overflow-x-auto scroll-smooth snap-x snap-mandatory pb-1"
              >
                {activePcCompatList.map(({ item, evalRes }) => {
                  const isPass = evalRes.status === 'can-run';
                  return (
                    <div
                      key={`compat-${item.tab}-${item.id}`}
                      role="button"
                      tabIndex={0}
                      onClick={() => onSelectGame(item, 'overview')}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          onSelectGame(item, 'overview');
                        }
                      }}
                      className={`sa-contain-card snap-start shrink-0 w-[142px] sm:w-[164px] md:w-[176px] lg:w-[186px] group bg-white hover:bg-slate-50 shadow-sm dark:shadow-none dark:bg-[#18202b] dark:hover:bg-[#212b3a] border rounded overflow-hidden transition-[transform,border-color,background-color] duration-200 hover:-translate-y-0.5 cursor-pointer flex flex-col focus:outline-none focus-visible:ring-2 focus-visible:ring-[#1a9fff] ${
                        isPass
                          ? 'sa-ps5-card-pass border-emerald-500/40 hover:border-emerald-500 dark:border-emerald-500/25 dark:hover:border-emerald-400/60'
                          : 'sa-ps5-card-fail border-rose-500/40 hover:border-rose-500 dark:border-rose-500/35 dark:hover:border-rose-400/75'
                      }`}
                    >
                      <div className="relative aspect-[2/3] bg-slate-100 dark:bg-[#0f141b] overflow-hidden">
                        <GameCover
                          src={item.coverImage}
                          alt={item.name}
                          imgClassName="w-full h-full object-cover group-hover:scale-[1.03] transition-transform duration-300"
                        />

                        {(item.tab === 'hypervisor' ||
                          item.tab === 'architect' ||
                          item.tab === 'steamtools' ||
                          item.tab === 'ps5') && (
                          <SectionSourceBadge tab={item.tab} className="absolute left-1.5" />
                        )}
                      </div>

                      <div className="p-2.5 flex-1 flex flex-col justify-between gap-1.5">
                        <h3 className="text-[12.5px] font-semibold text-slate-900 group-hover:text-[#0284c7] dark:text-[#e5e9f0] dark:group-hover:text-white line-clamp-1">
                          {item.name}
                        </h3>
                        <div className="flex items-center justify-between gap-1.5">
                          <span
                            className={`inline-flex items-center gap-1 text-[11px] font-bold truncate ${
                              isPass ? 'text-emerald-700 dark:text-[#4ade80]' : 'text-rose-700 dark:text-[#f87171]'
                            }`}
                          >
                            {isPass ? (
                              <>
                                <Check className="w-3 h-3 shrink-0" />
                                <span>{t.canRunCardPass}</span>
                              </>
                            ) : (
                              <>
                                <Warning className="w-3 h-3 shrink-0" />
                                <span className="truncate">{evalRes.shortBadge}</span>
                              </>
                            )}
                          </span>
                          <span className="text-[10.5px] text-slate-500 dark:text-[#8b9bb4] font-mono-tabular shrink-0">
                            {item.repackSize || item.tab}
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </section>
        )}

        {/* 4. Most Popular Games (Google Sheet: PopularRepacks — all games, dynamic counter, HV/Game filter & pagination) */}
        {popularEntries.length > 0 && (
          <section ref={popularSectionRef} className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2.5 min-w-0 flex-1">
                <h2 className="font-display text-[15px] lg:text-[17px] font-bold tracking-tight text-slate-900 dark:text-white shrink-0">
                  {t.mostPopularGames}
                </h2>
                <span className="px-2 py-0.5 rounded bg-white border border-slate-200 text-[12px] font-mono-tabular font-semibold text-[#0284c7] dark:bg-[#18202b] dark:border-white/[0.08] dark:text-[#66c0f4] shrink-0">
                  {popularGames.length}
                </span>
                <div className="h-px flex-1 bg-slate-200 dark:bg-white/[0.07] hidden sm:block" />
              </div>

              <div className="flex flex-wrap items-center gap-2">
                {/* Visibility Filter: Show All / Hide HV / Hide Games */}
                <div
                  role="group"
                  aria-label={t.mostPopularGames}
                  className="sa-ps5-pill-group inline-flex items-center p-0.5 rounded bg-slate-200/85 dark:bg-[#141a23] border border-slate-300/80 dark:border-white/[0.08]"
                >
                  <button
                    type="button"
                    aria-pressed={popularFilter === 'all'}
                    onClick={() => {
                      setPopularFilter('all');
                      setPopularPage(0);
                    }}
                    className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-[3px] text-[11.5px] font-semibold transition-colors cursor-pointer ${
                      popularFilter === 'all'
                        ? 'bg-[#1a9fff] text-white shadow-sm'
                        : 'text-slate-600 hover:text-slate-900 dark:text-[#9fb0c7] dark:hover:text-white'
                    }`}
                  >
                    <Stack className="w-3 h-3 shrink-0" />
                    <span>{t.showAll}</span>
                    <span className="font-mono-tabular opacity-80">({popularFilterCounts.all})</span>
                  </button>
                  <button
                    type="button"
                    aria-pressed={popularFilter === 'hide-hv'}
                    onClick={() => {
                      setPopularFilter('hide-hv');
                      setPopularPage(0);
                    }}
                    className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-[3px] text-[11.5px] font-semibold transition-colors cursor-pointer ${
                      popularFilter === 'hide-hv'
                        ? 'bg-[#1a9fff] text-white shadow-sm'
                        : 'text-slate-600 hover:text-slate-900 dark:text-[#9fb0c7] dark:hover:text-white'
                    }`}
                  >
                    <EyeSlash className="w-3 h-3 shrink-0" />
                    <span>{t.hideHv}</span>
                    <span className="font-mono-tabular opacity-80">({popularFilterCounts.gamesOnly})</span>
                  </button>
                  <button
                    type="button"
                    aria-pressed={popularFilter === 'hide-games'}
                    data-active={popularFilter === 'hide-games' ? 'true' : 'false'}
                    onClick={() => {
                      setPopularFilter('hide-games');
                      setPopularPage(0);
                    }}
                    className={`sa-ps5-toggle-fail inline-flex items-center gap-1.5 px-2.5 py-1 rounded-[3px] text-[11.5px] font-semibold transition-colors cursor-pointer ${
                      popularFilter === 'hide-games'
                        ? 'bg-[#dc2626] text-white shadow-sm'
                        : 'text-slate-600 hover:text-slate-900 dark:text-[#9fb0c7] dark:hover:text-white'
                    }`}
                  >
                    <EyeSlash className="w-3 h-3 shrink-0" />
                    <span>{t.hideGames}</span>
                    <span className="font-mono-tabular opacity-80">({popularFilterCounts.hvOnly})</span>
                  </button>
                </div>

                {/* Organization / Sort Selector */}
                <div className="sa-ps5-pill-group inline-flex items-center gap-1.5 px-2.5 py-1 rounded bg-slate-200/85 dark:bg-[#141a23] border border-slate-300/80 dark:border-white/[0.08] text-[11.5px] text-slate-700 dark:text-[#c6d4df]">
                  <ArrowsDownUp className="w-3 h-3 text-[#0284c7] dark:text-[#66c0f4] shrink-0" />
                  <select
                    aria-label={t.mostPopularGames}
                    value={popularSort}
                    onChange={(e) => {
                      setPopularSort(e.target.value as PopularSortMode);
                      setPopularPage(0);
                    }}
                    className="bg-transparent text-slate-800 dark:text-[#e5e9f0] font-medium focus:outline-none cursor-pointer"
                  >
                    <option value="newest" className="bg-white text-slate-900 dark:bg-[#141a23] dark:text-white">
                      {t.newestFirst}
                    </option>
                    <option value="az" className="bg-white text-slate-900 dark:bg-[#141a23] dark:text-white">
                      {t.nameAz}
                    </option>
                  </select>
                </div>

                <div className="text-[12px] text-slate-500 dark:text-[#8b9bb4] font-mono-tabular whitespace-nowrap ps-1">
                  {t.pageOf} {safePopularPage + 1} / {totalPopularPages}
                </div>
              </div>
            </div>

            {/* Responsive 20-game grid: 2 cols mobile, 4 cols small laptop, 5 cols standard/big laptop */}
            <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-5 2xl:grid-cols-5 gap-3.5 lg:gap-4">
              {visiblePopularGames.map(({ item: game, hasHypervisor }) => (
                <div
                  key={`${game.tab}-${game.id}`}
                  onClick={() => onSelectGame(game, 'overview')}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      onSelectGame(game, 'overview');
                    }
                  }}
                  role="button"
                  tabIndex={0}
                  className="sa-contain-card group bg-white hover:bg-slate-50 border border-slate-200 shadow-sm dark:shadow-none dark:bg-[#18202b] dark:hover:bg-[#212b3a] dark:border-white/[0.06] hover:border-[#1a9fff]/60 rounded overflow-hidden transition-[transform,border-color,background-color] duration-200 hover:-translate-y-0.5 cursor-pointer flex flex-col focus:outline-none focus-visible:ring-2 focus-visible:ring-[#1a9fff]"
                >
                  <div className="relative aspect-[2/3] bg-slate-100 dark:bg-[#0f141b] overflow-hidden">
                    <GameCover
                      src={game.coverImage}
                      alt={game.name}
                      imgClassName="w-full h-full object-cover group-hover:scale-[1.03] transition-transform duration-300"
                    />
                    {game.isNew && (
                      <div className="absolute inset-x-0 top-0 bg-[#1a9fff] text-white text-[9.5px] font-bold tracking-[0.07em] uppercase py-[3px] text-center">
                        NEW
                      </div>
                    )}
                    {hasHypervisor && (
                      <SectionSourceBadge
                        tab="hypervisor"
                        hasTopRibbon={game.isNew}
                        className="absolute start-1.5"
                      />
                    )}
                  </div>

                  <div className="p-2.5 flex-1 flex flex-col justify-between gap-1.5">
                    <h3 className="text-[12.5px] font-semibold text-slate-900 group-hover:text-[#0284c7] dark:text-[#e5e9f0] dark:group-hover:text-white line-clamp-1">
                      {game.name}
                    </h3>
                    <div className="flex items-center justify-between gap-2 text-[11px] text-slate-500 dark:text-[#8b9bb4] font-mono-tabular">
                      <span className="truncate">{game.repackSize || game.tab}</span>
                      {game.originalSize && (
                        <span className="line-through text-slate-400 dark:text-[#59677b] shrink-0">
                          {game.originalSize}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Pagination & See More Controls */}
            {totalPopularPages > 1 && (
              <div className="pt-2 flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 dark:border-white/[0.06]">
                <div className="flex flex-wrap items-center gap-1.5">
                  <button
                    type="button"
                    disabled={safePopularPage === 0}
                    onClick={() => goToPopularPage(safePopularPage - 1)}
                    className="inline-flex items-center gap-1 px-3 py-2 rounded bg-slate-200 hover:bg-slate-300 disabled:opacity-40 disabled:pointer-events-none border border-slate-300 text-[12px] font-medium text-slate-800 dark:bg-[#212a37] dark:hover:bg-[#2c3849] dark:border-white/[0.08] dark:text-[#dce4ee] cursor-pointer"
                  >
                    <CaretLeft weight="bold" className="w-3.5 h-3.5 rtl:rotate-180" />
                    <span>{t.previous}</span>
                  </button>

                  {Array.from({ length: totalPopularPages }, (_, pageIdx) => (
                    <button
                      key={pageIdx}
                      type="button"
                      onClick={() => goToPopularPage(pageIdx)}
                      className={`min-w-[34px] h-[34px] px-2 rounded text-[12px] font-mono-tabular font-semibold transition-colors cursor-pointer ${
                        pageIdx === safePopularPage
                          ? 'bg-[#1a9fff] text-white'
                          : 'bg-white text-slate-600 hover:bg-slate-100 hover:text-slate-900 border border-slate-200 dark:bg-[#18202b] dark:text-[#9ca8b8] dark:hover:bg-[#232f3e] dark:hover:text-white dark:border-white/[0.06]'
                      }`}
                    >
                      {pageIdx + 1}
                    </button>
                  ))}

                  <button
                    type="button"
                    disabled={safePopularPage >= totalPopularPages - 1}
                    onClick={() => goToPopularPage(safePopularPage + 1)}
                    className="inline-flex items-center gap-1 px-3 py-2 rounded bg-slate-200 hover:bg-slate-300 disabled:opacity-40 disabled:pointer-events-none border border-slate-300 text-[12px] font-medium text-slate-800 dark:bg-[#212a37] dark:hover:bg-[#2c3849] dark:border-white/[0.08] dark:text-[#dce4ee] cursor-pointer"
                  >
                    <span>{t.next}</span>
                    <CaretRight weight="bold" className="w-3.5 h-3.5 rtl:rotate-180" />
                  </button>
                </div>

                {safePopularPage < totalPopularPages - 1 ? (
                  <button
                    type="button"
                    onClick={() => goToPopularPage(safePopularPage + 1)}
                    className="inline-flex items-center gap-2 px-4 py-2 rounded bg-[#1a9fff] hover:bg-[#38adff] text-white text-[12.5px] font-semibold transition-colors whitespace-nowrap cursor-pointer"
                  >
                    <span>
                      {t.seeMoreNext} {nextPopularPageCount}{' '}
                      {nextPopularPageCount === 1 ? t.gameSingular : t.gamePlural}
                    </span>
                    <CaretRight weight="bold" className="w-4 h-4 rtl:rotate-180" />
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => goToPopularPage(0)}
                    className="inline-flex items-center gap-2 px-4 py-2 rounded bg-slate-200 hover:bg-slate-300 border border-slate-300 text-slate-800 dark:bg-[#212a37] dark:hover:bg-[#2c3849] dark:border-white/[0.08] dark:text-[#dce4ee] text-[12.5px] font-semibold transition-colors whitespace-nowrap cursor-pointer"
                  >
                    <span>{t.backToPage1}</span>
                  </button>
                )}
              </div>
            )}
          </section>
        )}

        {/* 5. Top Studios (Google Sheet: profil — top 10, logo + total games count) */}
        {topStudios.length > 0 && (
          <section className="space-y-4">
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-3 min-w-0 flex-1">
                <h2 className="font-display text-[15px] lg:text-[17px] font-bold tracking-tight text-slate-900 dark:text-white shrink-0">
                  {t.topStudios}
                </h2>
                <div className="h-px flex-1 bg-slate-200 dark:bg-white/[0.07]" />
              </div>

              <button
                type="button"
                onClick={onOpenStudiosPage}
                className="text-[12px] font-medium text-[#0284c7] hover:text-slate-900 dark:text-[#66c0f4] dark:hover:text-white transition-colors whitespace-nowrap shrink-0 cursor-pointer"
              >
                {t.viewAllStudios}
              </button>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 lg:grid-cols-5 xl:grid-cols-5 gap-3.5">
              {topStudios.map((studio) => {
                const totalGames = getStudioTotalCount(studio);

                return (
                  <button
                    key={`studio-${studio.id}`}
                    type="button"
                    title={studio.name}
                    aria-label={`${studio.name} (${totalGames} ${t.gamePlural})`}
                    onClick={() => onSelectGame(studio, 'overview')}
                    className="sa-contain-card group p-3 rounded bg-white hover:bg-slate-50 border border-slate-200 shadow-sm dark:shadow-none dark:bg-[#18202b] dark:hover:bg-[#212b3a] dark:border-white/[0.06] hover:border-[#1a9fff]/55 transition-[transform,border-color,background-color] duration-200 hover:-translate-y-0.5 flex flex-col items-center gap-2.5 cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-[#1a9fff]"
                  >
                    <StudioEmblem studio={studio} />
                    <span className="text-[12px] font-semibold font-mono-tabular text-slate-700 group-hover:text-slate-900 dark:text-[#c6d4df] dark:group-hover:text-white">
                      {totalGames} {totalGames === 1 ? t.gameSingular : t.gamePlural}
                    </span>
                  </button>
                );
              })}
            </div>
          </section>
        )}

        {/* 6. Best games For Two Players (Google Sheet: onlinegames — seamless desktop canvas carousel) */}
        {twoPlayerGames.length > 0 && (
          <section
            ref={twoPlayersSectionRef}
            onMouseEnter={() => {
              twoPlayersPausedRef.current = true;
            }}
            onMouseLeave={() => {
              twoPlayersPausedRef.current = false;
            }}
            onFocus={() => {
              twoPlayersPausedRef.current = true;
            }}
            onBlur={() => {
              twoPlayersPausedRef.current = false;
            }}
            className="space-y-4"
          >
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-2.5 sm:gap-3 min-w-0 flex-1">
                <UsersThree className="w-4 h-4 text-[#0284c7] dark:text-[#38bdf8] shrink-0" />
                <h2 className="font-display text-[15px] sm:text-[16px] lg:text-[17px] font-bold tracking-tight text-slate-900 dark:text-white truncate">
                  {t.bestTwoPlayers}
                </h2>
                <span className="text-[12px] font-mono-tabular text-slate-500 dark:text-[#7f91a8] shrink-0">
                  {twoPlayerGames.length}
                </span>
                <div className="h-px flex-1 bg-slate-200 dark:bg-white/[0.07]" />
              </div>

              <div dir="ltr" className="inline-flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  aria-label="Scroll Best games For Two Players left"
                  onClick={() => scrollTwoPlayers(-1)}
                  className="p-1.5 rounded bg-slate-200 hover:bg-slate-300 border border-slate-300 text-slate-700 hover:text-slate-950 dark:bg-[#212a37] dark:hover:bg-[#2c3849] dark:border-white/[0.08] dark:text-[#c6d4df] dark:hover:text-white transition-colors cursor-pointer"
                >
                  <CaretLeft weight="bold" className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  aria-label="Scroll Best games For Two Players right"
                  onClick={() => scrollTwoPlayers(1)}
                  className="p-1.5 rounded bg-slate-200 hover:bg-slate-300 border border-slate-300 text-slate-700 hover:text-slate-950 dark:bg-[#212a37] dark:hover:bg-[#2c3849] dark:border-white/[0.08] dark:text-[#c6d4df] dark:hover:text-white transition-colors cursor-pointer"
                >
                  <CaretRight weight="bold" className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div
              dir="ltr"
              ref={twoPlayersScrollerRef}
              className="no-scrollbar flex gap-3.5 sm:gap-4 overflow-x-auto scroll-smooth snap-x snap-mandatory pb-1.5"
            >
              {twoPlayerGames.map((game) => {
                const metaText = [game.repackSize, game.genreList[0]]
                  .filter(Boolean)
                  .join(' · ');

                return (
                  <div
                    key={`two-player-${game.tab}-${game.id}`}
                    role="button"
                    tabIndex={0}
                    onClick={() => onSelectGame(game, 'overview')}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        onSelectGame(game, 'overview');
                      }
                    }}
                    aria-label={game.name}
                    className="sa-contain-card group relative snap-start shrink-0 w-[148px] sm:w-[168px] md:w-[180px] lg:w-[192px] xl:w-[208px] 2xl:w-[222px] rounded-xl overflow-hidden border border-slate-200 dark:border-white/[0.08] bg-white dark:bg-[#141b25] hover:border-[#0284c7]/60 dark:hover:border-[#38bdf8]/60 shadow-sm hover:shadow-lg dark:shadow-none hover:-translate-y-1 transition-[transform,border-color,box-shadow] duration-200 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1a9fff]"
                  >
                    <div className="relative aspect-[2/3] w-full overflow-hidden bg-slate-200 dark:bg-[#0f141b]">
                      <GameCover
                        src={game.coverImage}
                        alt={game.name}
                        imgClassName="w-full h-full object-cover group-hover:scale-[1.045] transition-transform duration-300 ease-out"
                      />
                      <div
                        aria-hidden="true"
                        className="absolute inset-0 bg-gradient-to-t from-black/92 via-black/40 to-transparent pointer-events-none"
                      />
                      <span
                        aria-hidden="true"
                        className="absolute top-2.5 end-2.5 w-7 h-7 rounded-lg bg-black/55 backdrop-blur-sm border border-white/[0.16] text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200"
                      >
                        <ArrowUpRight className="w-3.5 h-3.5" />
                      </span>
                      <div className="absolute inset-x-0 bottom-0 p-3 sm:p-3.5">
                        <h3 className="text-[13px] sm:text-[13.5px] font-semibold text-white leading-snug line-clamp-2">
                          {game.name}
                        </h3>
                        {metaText && (
                          <p className="mt-1 text-[11px] text-[#cbd5e1] font-mono-tabular truncate">
                            {metaText}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        )}
      </div>
    </div>
  );
});
