import { memo, useEffect, useMemo, useRef, useState, type CSSProperties } from 'react';
import {
  ArrowLeft,
  ArrowSquareOut,
  CalendarBlank,
  CaretLeft,
  CaretRight,
  FilmStrip,
  ListChecks,
  Medal,
  Play,
  Sparkle,
  Stack,
  Trophy,
  X,
} from '@phosphor-icons/react';
import type { GameItem, SheetCatalogData, SheetTabKey } from '../types';
import { resolveSheetRefItem, sanitizeUrl } from '../utils/parsers';
import { GameCover } from './GameCover';
import type { AppLanguage } from '../services/launcherSettings';
import { getTranslations } from '../i18n/translations';

interface ExtrasViewProps {
  catalog: SheetCatalogData;
  hasLiveUrl?: boolean;
  initialTab?: SheetTabKey;
  language?: AppLanguage;
  onSelectItem: (item: GameItem) => void;
}

const RANDOM_TEXT_COLORS = [
  '#60a5fa',
  '#34d399',
  '#fbbf24',
  '#f472b6',
  '#a78bfa',
  '#2dd4bf',
  '#fb923c',
  '#a3e635',
  '#38bdf8',
  '#fb7185',
  '#e879f9',
  '#fde047',
];

function getDeterministicColor(seedText: string, index: number): string {
  let hash = index * 2654435761;
  for (let i = 0; i < seedText.length; i++) {
    hash = (hash * 31 + seedText.charCodeAt(i)) | 0;
  }
  return RANDOM_TEXT_COLORS[Math.abs(hash) % RANDOM_TEXT_COLORS.length];
}

interface ParsedTrailerLink {
  label: string;
  watchUrl: string;
  embedUrl: string | null;
}

function parseTrailerLinks(raw?: string): ParsedTrailerLink[] {
  if (!raw) return [];
  const results: ParsedTrailerLink[] = [];
  const seen = new Set<string>();
  const pattern = /(?:([^:,\n|]+?)\s*:\s*)?(https?:\/\/[^\s,|]+)/gi;

  for (const match of raw.matchAll(pattern)) {
    const rawLabel = (match[1] || '').trim();
    const watchUrl = sanitizeUrl(match[2]);
    if (!watchUrl || seen.has(watchUrl)) continue;
    seen.add(watchUrl);

    let videoId = '';
    const embedMatch = watchUrl.match(/youtube\.com\/embed\/([A-Za-z0-9_-]{6,})/);
    const watchMatch = watchUrl.match(/[?&]v=([A-Za-z0-9_-]{6,})/);
    const shortMatch = watchUrl.match(/youtu\.be\/([A-Za-z0-9_-]{6,})/);
    const shortsMatch = watchUrl.match(/youtube\.com\/shorts\/([A-Za-z0-9_-]{6,})/);

    if (embedMatch) videoId = embedMatch[1];
    else if (watchMatch) videoId = watchMatch[1];
    else if (shortMatch) videoId = shortMatch[1];
    else if (shortsMatch) videoId = shortsMatch[1];

    results.push({
      label: rawLabel || `Trailer #${results.length + 1}`,
      watchUrl,
      embedUrl: videoId ? `https://www.youtube.com/embed/${videoId}?autoplay=1&rel=0` : null,
    });
  }

  return results;
}

function formatReleaseDate(raw?: string): string {
  if (!raw) return '';
  const trimmed = raw.trim();
  if (!trimmed) return '';
  if (/^\d{4}-\d{2}-\d{2}T/.test(trimmed)) {
    return trimmed.slice(0, 10);
  }
  return trimmed;
}

function SafeOverlayImg({
  src,
  alt,
  className,
}: {
  src?: string;
  alt: string;
  className: string;
}) {
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    setFailed(false);
  }, [src]);

  useEffect(() => {
    if (!failed) return;
    const handleOnline = () => setFailed(false);
    window.addEventListener('online', handleOnline);
    return () => window.removeEventListener('online', handleOnline);
  }, [failed]);

  if (!src || failed) return null;

  return (
    <img
      src={src}
      alt={alt}
      loading="lazy"
      decoding="async"
      referrerPolicy="no-referrer"
      onError={() => setFailed(true)}
      className={className}
    />
  );
}

const UPCOMING_COLUMNS: { key: string; label: string }[] = [
  { key: 'game', label: 'Games' },
  { key: 'hypervisor', label: 'Hypervisor' },
  { key: 'steamtools', label: 'SteamTools' },
  { key: 'ps5', label: 'PS5' },
  { key: 'tools', label: 'Tools' },
  { key: 'savegames', label: 'SaveGames' },
];

export const ExtrasView = memo(function ExtrasView({ catalog, language = 'en' }: ExtrasViewProps) {
  const t = getTranslations(language).extras;
  const trailersScrollerRef = useRef<HTMLDivElement | null>(null);
  const seriesScrollerRef = useRef<HTMLDivElement | null>(null);
  const topGamesScrollerRef = useRef<HTMLDivElement | null>(null);

  const [activeTrailerPopup, setActiveTrailerPopup] = useState<{
    item: GameItem;
    links: ParsedTrailerLink[];
    activeLinkIndex: number;
  } | null>(null);

  const [activeSeriesPopup, setActiveSeriesPopup] = useState<GameItem | null>(null);

  const upcomingGroups = useMemo(() => {
    const rows = catalog.upcominglist || [];
    return UPCOMING_COLUMNS.map((col) => {
      const entries: { text: string; color: string }[] = [];
      rows.forEach((row, idx) => {
        const val = (row.rawFields[col.key] || '').trim();
        if (val) {
          entries.push({
            text: val,
            color: getDeterministicColor(`${col.key}:${val}`, idx),
          });
        }
      });
      return {
        key: col.key,
        label: col.label,
        entries,
      };
    }).filter((g) => g.entries.length > 0);
  }, [catalog.upcominglist]);

  const trailerEntries = useMemo(() => {
    return (catalog.upcomingtrailers || []).map((item) => ({
      item,
      links: parseTrailerLinks(item.rawFields.trailerUrls || item.trailerUrl),
      releaseLabel: formatReleaseDate(item.rawFields.releaseDate),
      developer: (item.rawFields.developer || '').trim(),
      genre: (item.rawFields.genre || '').trim(),
      platforms: (item.rawFields.platforms || '').trim(),
    }));
  }, [catalog.upcomingtrailers]);

  const bestSeriesEntries = useMemo(() => {
    return (catalog.bestgameseries || []).map((item) => {
      const titles = (item.rawFields.gamelist || '')
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean);
      const thumbs = (item.rawFields.images || '')
        .split(/\s*,\s*(?=https?:\/\/)/i)
        .map((u) => sanitizeUrl(u))
        .filter((u) => /^https?:\/\//i.test(u));
      const backdrop = sanitizeUrl(item.rawFields.background) || thumbs[0] || item.coverImage;
      return {
        item,
        titles,
        thumbs,
        backdrop,
        categoryLabel: (item.rawFields.categories || item.category || '').trim(),
      };
    });
  }, [catalog.bestgameseries]);

  const topGamesEntries = useMemo(() => {
    return [...(catalog.topgames || [])].sort(
      (a, b) =>
        (Number(a.rawFields.rank) || Number.MAX_SAFE_INTEGER) -
        (Number(b.rawFields.rank) || Number.MAX_SAFE_INTEGER)
    );
  }, [catalog.topgames]);

  useEffect(() => {
    if (!activeTrailerPopup && !activeSeriesPopup) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (activeTrailerPopup) setActiveTrailerPopup(null);
        else if (activeSeriesPopup) setActiveSeriesPopup(null);
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [activeTrailerPopup, activeSeriesPopup]);

  const scrollRow = (ref: React.RefObject<HTMLDivElement | null>, dir: -1 | 1) => {
    const el = ref.current;
    if (!el) return;
    const maxScrollLeft = el.scrollWidth - el.clientWidth;
    if (maxScrollLeft <= 4) return;
    const step = Math.max(280, Math.round(el.clientWidth * 0.78));
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

  return (
    <div className="flex-1 overflow-y-auto bg-gradient-to-b from-slate-50 via-[#f4f6f9] to-slate-100 dark:from-[#1b2838] dark:via-[#151e29] dark:to-[#10151c] px-3 sm:px-5 lg:px-8 py-4 sm:py-6 lg:py-7">
      <div className="max-w-[1600px] mx-auto space-y-7 sm:space-y-9 lg:space-y-11">
        {/* 1. Upcoming List (Text List with Random Colors / Google Sheet: UpcomingList) */}
        {upcomingGroups.length > 0 && (
          <section className="space-y-3 sm:space-y-3.5">
            <div className="flex items-center gap-2.5 sm:gap-3">
              <ListChecks className="w-4 h-4 text-[#0284c7] dark:text-[#66c0f4] shrink-0" />
              <h2 className="font-display text-[15px] sm:text-[16px] lg:text-[17px] font-bold tracking-tight text-slate-900 dark:text-white shrink-0">
                {t.upcomingList}
              </h2>
              <div className="h-px flex-1 bg-slate-200 dark:bg-white/[0.08]" />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3 sm:gap-3.5">
              {upcomingGroups.map((group) => (
                <div
                  key={group.key}
                  className={`sa-ps5-panel rounded-lg bg-white dark:bg-[#121923] border border-slate-200 dark:border-white/[0.07] shadow-sm dark:shadow-none p-3.5 sm:p-4 flex flex-col gap-3 ${
                    group.key === 'game' ? 'sm:col-span-2 xl:col-span-2' : ''
                  }`}
                >
                  <div className="flex items-center justify-between gap-2 pb-2 border-b border-slate-200 dark:border-white/[0.06]">
                    <span className="text-[11.5px] sm:text-[12px] font-bold uppercase tracking-[0.08em] text-[#0284c7] dark:text-[#66c0f4]">
                      {group.label}
                    </span>
                    <span className="text-[11px] font-mono-tabular text-slate-500 dark:text-[#8b9bb4]">
                      {group.entries.length}
                    </span>
                  </div>

                  <ul
                    className={`max-h-64 sm:max-h-72 overflow-y-auto pr-1 ${
                      group.key === 'game'
                        ? 'grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1.5'
                        : 'space-y-1.5'
                    }`}
                  >
                    {group.entries.map((entry, idx) => (
                      <li
                        key={`${group.key}-${idx}`}
                        className="flex items-start gap-2 text-[12px] sm:text-[13px] leading-snug"
                      >
                        <span
                          aria-hidden="true"
                          style={{ backgroundColor: entry.color }}
                          className="w-2 h-2 rounded-full mt-1.5 shrink-0 ring-1 ring-black/10 dark:ring-0"
                        />
                        <span
                          style={{ '--entry-color': entry.color } as CSSProperties}
                          className="font-medium break-words text-slate-800 dark:text-[color:var(--entry-color)]"
                        >
                          {entry.text}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* 2. Trailers Slide with Video Popup (Google Sheet: UpcomingTrailers) */}
        {trailerEntries.length > 0 && (
          <section className="space-y-3 sm:space-y-3.5">
            <div className="flex items-center justify-between gap-3 sm:gap-4">
              <div className="flex items-center gap-2.5 sm:gap-3 min-w-0 flex-1">
                <FilmStrip className="w-4 h-4 text-[#0284c7] dark:text-[#66c0f4] shrink-0" />
                <h2 className="font-display text-[15px] sm:text-[16px] lg:text-[17px] font-bold tracking-tight text-slate-900 dark:text-white shrink-0">
                  {t.trailers}
                </h2>
                <div className="h-px flex-1 bg-slate-200 dark:bg-white/[0.08]" />
              </div>

              <div dir="ltr" className="flex items-center gap-1.5 sm:gap-2 shrink-0">
                <button
                  type="button"
                  aria-label="Scroll Trailers left"
                  onClick={() => scrollRow(trailersScrollerRef, -1)}
                  className="p-1.5 rounded bg-slate-200 hover:bg-slate-300 border border-slate-300 text-slate-700 hover:text-slate-900 dark:bg-[#212a37] dark:hover:bg-[#2c3849] dark:border-white/[0.08] dark:text-[#c6d4df] dark:hover:text-white transition-colors cursor-pointer"
                >
                  <CaretLeft weight="bold" className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  aria-label="Scroll Trailers right"
                  onClick={() => scrollRow(trailersScrollerRef, 1)}
                  className="p-1.5 rounded bg-slate-200 hover:bg-slate-300 border border-slate-300 text-slate-700 hover:text-slate-900 dark:bg-[#212a37] dark:hover:bg-[#2c3849] dark:border-white/[0.08] dark:text-[#c6d4df] dark:hover:text-white transition-colors cursor-pointer"
                >
                  <CaretRight weight="bold" className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div
              dir="ltr"
              ref={trailersScrollerRef}
              className="sa-ps5-panel no-scrollbar flex gap-0 overflow-x-auto scroll-smooth snap-x snap-mandatory rounded-lg border border-slate-200 dark:border-white/[0.08] bg-white dark:bg-[#141c27] shadow-sm dark:shadow-none"
            >
              {trailerEntries.map(({ item, links, releaseLabel, developer, genre }) => (
                <button
                  key={`${item.tab}-${item.id}`}
                  type="button"
                  onClick={() =>
                    setActiveTrailerPopup({
                      item,
                      links,
                      activeLinkIndex: 0,
                    })
                  }
                  className="group snap-start shrink-0 w-[82vw] sm:w-[290px] md:w-[310px] lg:w-[330px] text-left bg-white hover:bg-slate-50 dark:bg-[#141c27] dark:hover:bg-[#1a2534] border-r border-slate-200 dark:border-white/[0.06] last:border-r-0 hover:ring-1 hover:ring-inset hover:ring-[#1a9fff]/65 overflow-hidden transition-colors duration-200 cursor-pointer flex flex-col"
                >
                  <div className="relative aspect-video w-full bg-[#0b1016] overflow-hidden">
                    <GameCover
                      src={item.coverImage}
                      alt={item.name}
                      imgClassName="w-full h-full object-cover group-hover:scale-[1.04] transition-transform duration-300"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-[#0b1016] via-black/20 to-transparent" />

                    <div className="absolute inset-0 flex items-center justify-center">
                      <span className="w-11 h-11 rounded-full bg-[#1a9fff]/90 group-hover:bg-[#38adff] text-white flex items-center justify-center shadow-xl group-hover:scale-110 transition-transform">
                        <Play weight="fill" className="w-5 h-5 fill-current translate-x-[1px]" />
                      </span>
                    </div>

                    {links.length > 1 && (
                      <span className="absolute top-2 right-2 px-2 py-0.5 rounded bg-black/75 border border-white/15 text-[10.5px] font-semibold text-[#66c0f4] font-mono-tabular">
                        {links.length} Videos
                      </span>
                    )}

                    {releaseLabel && (
                      <span className="absolute bottom-2 left-2.5 inline-flex items-center gap-1 px-2 py-0.5 rounded bg-black/75 border border-white/10 text-[10.5px] font-mono-tabular text-[#e5e9f0]">
                        <CalendarBlank className="w-3 h-3 text-[#66c0f4]" />
                        <span>{releaseLabel}</span>
                      </span>
                    )}
                  </div>

                  <div className="p-3 sm:p-3.5 space-y-1 flex-1 flex flex-col justify-between">
                    <h3 className="text-[13.5px] sm:text-[14px] font-semibold text-slate-900 group-hover:text-[#0284c7] dark:text-white dark:group-hover:text-[#66c0f4] transition-colors line-clamp-1">
                      {item.name}
                    </h3>
                    <div className="text-[11.5px] text-slate-500 dark:text-[#8b9bb4] truncate">
                      {[developer, genre].filter(Boolean).join(' · ') || 'Upcoming Release'}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </section>
        )}

        {/* 3. Best Series Slide (Google Sheet: BestGameSeries) */}
        {bestSeriesEntries.length > 0 && (
          <section className="space-y-3 sm:space-y-3.5">
            <div className="flex items-center justify-between gap-3 sm:gap-4">
              <div className="flex items-center gap-2.5 sm:gap-3 min-w-0 flex-1">
                <Stack className="w-4 h-4 text-[#0284c7] dark:text-[#66c0f4] shrink-0" />
                <h2 className="font-display text-[15px] sm:text-[16px] lg:text-[17px] font-bold tracking-tight text-slate-900 dark:text-white shrink-0">
                  {t.bestSeries}
                </h2>
                <div className="h-px flex-1 bg-slate-200 dark:bg-white/[0.08]" />
              </div>

              <div dir="ltr" className="flex items-center gap-1.5 sm:gap-2 shrink-0">
                <button
                  type="button"
                  aria-label="Scroll Best Series left"
                  onClick={() => scrollRow(seriesScrollerRef, -1)}
                  className="p-1.5 rounded bg-slate-200 hover:bg-slate-300 border border-slate-300 text-slate-700 hover:text-slate-900 dark:bg-[#212a37] dark:hover:bg-[#2c3849] dark:border-white/[0.08] dark:text-[#c6d4df] dark:hover:text-white transition-colors cursor-pointer"
                >
                  <CaretLeft weight="bold" className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  aria-label="Scroll Best Series right"
                  onClick={() => scrollRow(seriesScrollerRef, 1)}
                  className="p-1.5 rounded bg-slate-200 hover:bg-slate-300 border border-slate-300 text-slate-700 hover:text-slate-900 dark:bg-[#212a37] dark:hover:bg-[#2c3849] dark:border-white/[0.08] dark:text-[#c6d4df] dark:hover:text-white transition-colors cursor-pointer"
                >
                  <CaretRight weight="bold" className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div
              dir="ltr"
              ref={seriesScrollerRef}
              className="sa-ps5-panel no-scrollbar flex gap-0 overflow-x-auto scroll-smooth snap-x snap-mandatory rounded-lg border border-slate-200 dark:border-white/[0.08] bg-white dark:bg-[#141c27] shadow-sm dark:shadow-none"
            >
              {bestSeriesEntries.map(({ item, titles, backdrop, categoryLabel }) => (
                <button
                  key={`${item.tab}-${item.id}`}
                  type="button"
                  onClick={() => setActiveSeriesPopup(item)}
                  className="group snap-start shrink-0 w-[78vw] sm:w-[275px] md:w-[295px] lg:w-[315px] text-left bg-white hover:bg-slate-50 dark:bg-[#141c27] dark:hover:bg-[#1a2534] border-r border-slate-200 dark:border-white/[0.06] last:border-r-0 hover:ring-1 hover:ring-inset hover:ring-[#1a9fff]/65 overflow-hidden transition-colors duration-200 cursor-pointer flex flex-col"
                >
                  <div className="relative aspect-[16/9] w-full bg-[#0b1016] overflow-hidden">
                    <GameCover
                      src={backdrop}
                      alt={item.name}
                      imgClassName="w-full h-full object-cover group-hover:scale-[1.04] transition-transform duration-300"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-[#0b1016] via-[#0b1016]/35 to-transparent" />

                    {categoryLabel && (
                      <span className="absolute top-2 left-2.5 px-2 py-0.5 rounded bg-[#0e1520]/85 border border-white/15 text-[10.5px] font-semibold text-[#66c0f4]">
                        {categoryLabel}
                      </span>
                    )}

                    <span className="absolute bottom-2 right-2.5 px-2 py-0.5 rounded bg-black/75 border border-white/10 text-[10.5px] font-mono-tabular text-[#e5e9f0]">
                      {titles.length} {titles.length === 1 ? 'Title' : 'Titles'}
                    </span>
                  </div>

                  <div className="p-3 sm:p-3.5 space-y-1 flex-1 flex flex-col justify-between">
                    <h3 className="text-[13.5px] sm:text-[14px] font-semibold text-slate-900 group-hover:text-[#0284c7] dark:text-white dark:group-hover:text-[#66c0f4] transition-colors line-clamp-1">
                      {item.name}
                    </h3>
                    <p className="text-[11.5px] text-slate-500 dark:text-[#8b9bb4] line-clamp-1">
                      {titles[0] || categoryLabel || 'Game Series'}
                    </p>
                  </div>
                </button>
              ))}
            </div>
          </section>
        )}

        {/* 4. Top Open World Games Slide (Google Sheet: topgames — auto-updated count & rank numbers) */}
        {topGamesEntries.length > 0 && (
          <section className="space-y-3 sm:space-y-3.5">
            <div className="flex items-center justify-between gap-3 sm:gap-4">
              <div className="flex items-center gap-2.5 sm:gap-3 min-w-0 flex-1">
                <Trophy className="w-4 h-4 text-amber-500 dark:text-[#fbbf24] shrink-0" />
                <h2 className="font-display text-[15px] sm:text-[16px] lg:text-[17px] font-bold tracking-tight text-slate-900 dark:text-white truncate">
                  {t.topOpenWorld}{' '}
                  <span className="text-[#0284c7] dark:text-[#66c0f4] font-mono-tabular font-semibold">
                    ({topGamesEntries.length})
                  </span>
                </h2>
                <div className="h-px flex-1 bg-slate-200 dark:bg-white/[0.08] hidden sm:block" />
              </div>

              <div dir="ltr" className="flex items-center gap-1.5 sm:gap-2 shrink-0">
                <button
                  type="button"
                  aria-label="Scroll Top Open World Games left"
                  onClick={() => scrollRow(topGamesScrollerRef, -1)}
                  className="p-1.5 rounded bg-slate-200 hover:bg-slate-300 border border-slate-300 text-slate-700 hover:text-slate-900 dark:bg-[#212a37] dark:hover:bg-[#2c3849] dark:border-white/[0.08] dark:text-[#c6d4df] dark:hover:text-white transition-colors cursor-pointer"
                >
                  <CaretLeft weight="bold" className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  aria-label="Scroll Top Open World Games right"
                  onClick={() => scrollRow(topGamesScrollerRef, 1)}
                  className="p-1.5 rounded bg-slate-200 hover:bg-slate-300 border border-slate-300 text-slate-700 hover:text-slate-900 dark:bg-[#212a37] dark:hover:bg-[#2c3849] dark:border-white/[0.08] dark:text-[#c6d4df] dark:hover:text-white transition-colors cursor-pointer"
                >
                  <CaretRight weight="bold" className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div
              dir="ltr"
              ref={topGamesScrollerRef}
              className="sa-ps5-panel no-scrollbar flex gap-0 overflow-x-auto scroll-smooth snap-x snap-mandatory rounded-lg border border-slate-200 dark:border-white/[0.08] bg-white dark:bg-[#141c27] shadow-sm dark:shadow-none"
            >
              {topGamesEntries.map((item, idx) => {
                const rank = Number(item.rawFields.rank) || idx + 1;
                const bannerUrl = sanitizeUrl(item.rawFields.banner) || item.coverImage;
                const logoUrl = sanitizeUrl(item.rawFields.logo);

                const rankBadgeClass =
                  rank === 1
                    ? 'bg-[#f59e0b] text-[#0b0e14] border-[#fde68a]'
                    : rank === 2
                    ? 'bg-[#cbd5e1] text-[#0b0e14] border-white'
                    : rank === 3
                    ? 'bg-[#d97706] text-white border-[#fcd34d]/60'
                    : 'bg-[#0e1520]/90 text-[#66c0f4] border-white/15';

                return (
                  <div
                    key={`${item.tab}-${item.id}-${idx}`}
                    className="snap-start shrink-0 w-[78vw] sm:w-[275px] md:w-[300px] lg:w-[325px] bg-slate-100 dark:bg-[#141c27] border-r border-slate-200 dark:border-white/[0.06] last:border-r-0 overflow-hidden select-none pointer-events-none"
                  >
                    <div className="relative aspect-[16/9] w-full bg-[#0b1016] overflow-hidden">
                      <GameCover
                        src={bannerUrl}
                        alt={item.name}
                        imgClassName="w-full h-full object-cover"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-[#0b1016]/55 via-transparent to-black/20" />

                      <span
                        className={`absolute top-2 left-2.5 px-2 py-0.5 rounded border text-[11px] font-extrabold font-mono-tabular shadow-md ${rankBadgeClass}`}
                      >
                        #{rank}
                      </span>

                      {logoUrl && (
                        <div className="absolute inset-x-6 bottom-3 top-6 flex items-center justify-center">
                          <SafeOverlayImg
                            src={logoUrl}
                            alt=""
                            className="max-h-full max-w-full object-contain drop-shadow-[0_3px_10px_rgba(0,0,0,0.85)]"
                          />
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        )}
      </div>

      {/* Trailers Video Popup Modal */}
      {activeTrailerPopup && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={activeTrailerPopup.item.name}
          onClick={() => setActiveTrailerPopup(null)}
          className="fixed inset-0 z-[70] bg-black/75 dark:bg-black/85 backdrop-blur-sm flex items-center justify-center p-3 sm:p-6"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="sa-ps5-panel w-full max-w-4xl rounded-xl bg-white dark:bg-[#121923] border border-slate-200 dark:border-white/[0.12] shadow-2xl overflow-hidden flex flex-col max-h-[92vh]"
          >
            <div className="sa-ps5-modal-header px-4 sm:px-5 py-3.5 bg-slate-50 dark:bg-[#171d27] border-b border-slate-200 dark:border-white/[0.08] flex items-center justify-between gap-3">
              <div className="min-w-0">
                <h3 className="text-[15px] sm:text-[17px] font-bold text-slate-900 dark:text-white truncate">
                  {activeTrailerPopup.item.name}
                </h3>
                <div className="text-[11.5px] text-slate-500 dark:text-[#8b9bb4] truncate">
                  {[
                    activeTrailerPopup.item.rawFields.developer,
                    activeTrailerPopup.item.rawFields.genre,
                    formatReleaseDate(activeTrailerPopup.item.rawFields.releaseDate),
                  ]
                    .filter(Boolean)
                    .join(' · ')}
                </div>
              </div>
              <button
                type="button"
                aria-label="Close trailer popup"
                onClick={() => setActiveTrailerPopup(null)}
                className="p-2 rounded bg-slate-200 hover:bg-slate-300 text-slate-700 hover:text-slate-900 dark:bg-[#232b36] dark:hover:bg-[#303c4d] dark:text-[#c6d4df] dark:hover:text-white transition-colors cursor-pointer shrink-0"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="overflow-y-auto">
              {(() => {
                const currentLink =
                  activeTrailerPopup.links[activeTrailerPopup.activeLinkIndex] ||
                  activeTrailerPopup.links[0];
                return (
                  <div className="aspect-video w-full bg-black">
                    {currentLink?.embedUrl ? (
                      <iframe
                        key={currentLink.embedUrl}
                        src={currentLink.embedUrl}
                        title={`${activeTrailerPopup.item.name} — ${currentLink.label}`}
                        referrerPolicy="strict-origin-when-cross-origin"
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                        allowFullScreen
                        className="w-full h-full border-0"
                      />
                    ) : currentLink?.watchUrl && /^https?:\/\//i.test(currentLink.watchUrl) ? (
                      <div className="w-full h-full flex flex-col items-center justify-center gap-3 p-6 text-center">
                        <FilmStrip className="w-10 h-10 text-[#66c0f4]" />
                        <a
                          href={currentLink.watchUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-2 px-4 py-2 rounded bg-[#1a9fff] hover:bg-[#38adff] text-white text-[13px] font-semibold"
                        >
                          <span>Watch Trailer</span>
                          <ArrowSquareOut className="w-4 h-4" />
                        </a>
                      </div>
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-[#8b9bb4] text-[13px]">
                        No trailer video URL available.
                      </div>
                    )}
                  </div>
                );
              })()}

              <div className="sa-ps5-subpanel p-4 sm:p-5 space-y-3 bg-white dark:bg-[#121923]">
                {activeTrailerPopup.links.length > 1 && (
                  <div className="flex flex-wrap items-center gap-2">
                    {activeTrailerPopup.links.map((link, idx) => {
                      const active = idx === activeTrailerPopup.activeLinkIndex;
                      return (
                        <button
                          key={link.watchUrl}
                          type="button"
                          onClick={() =>
                            setActiveTrailerPopup((prev) =>
                              prev ? { ...prev, activeLinkIndex: idx } : null
                            )
                          }
                          className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded text-[12px] font-semibold transition-colors cursor-pointer ${
                            active
                              ? 'bg-[#1a9fff] text-white'
                              : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 dark:bg-[#1d2633] dark:hover:bg-[#273344] dark:text-[#c6d4df] dark:border-white/[0.08]'
                          }`}
                        >
                          <Play weight="fill" className="w-3 h-3 fill-current" />
                          <span>{link.label}</span>
                        </button>
                      );
                    })}
                  </div>
                )}

                {activeTrailerPopup.item.rawFields.platforms && (
                  <div className="text-[12.5px] text-slate-700 dark:text-[#aeb9c7]">
                    <span className="text-[#0284c7] dark:text-[#66c0f4] font-semibold">Platforms: </span>
                    <span>{activeTrailerPopup.item.rawFields.platforms}</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Best Series Full-Screen Popup */}
      {activeSeriesPopup && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={activeSeriesPopup.name}
          className="sa-ps5-modal fixed inset-0 z-[70] w-screen h-screen bg-[#f4f6f9] dark:bg-[#0f141b] flex flex-col overflow-hidden"
        >
          {/* Top Full-Screen Header Bar */}
          <header className="sa-ps5-modal-header px-3.5 sm:px-6 lg:px-8 py-3 bg-white dark:bg-[#171a21] border-b border-slate-200 dark:border-white/[0.08] shrink-0">
            <div className="max-w-[1400px] mx-auto flex items-center justify-between gap-3">
              <div className="flex items-center gap-3 min-w-0">
                <button
                  type="button"
                  onClick={() => setActiveSeriesPopup(null)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded bg-slate-100 hover:bg-slate-200 border border-slate-300 text-[12px] font-semibold text-slate-800 hover:text-slate-950 dark:bg-[#232b36] dark:hover:bg-[#2d3847] dark:border-white/[0.08] dark:text-[#e5e9f0] dark:hover:text-white transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                >
                  <ArrowLeft className="w-3.5 h-3.5 rtl:rotate-180" />
                  <span>{t.back}</span>
                </button>

                <div className="flex items-center gap-2 text-[12px] text-slate-500 dark:text-[#8b9bb4] min-w-0">
                  <span className="hidden sm:inline shrink-0">{t.bestSeries}</span>
                  <span className="hidden sm:inline text-slate-300 dark:text-[#4b5b70]">/</span>
                  <span className="text-slate-900 dark:text-white font-semibold truncate">
                    {activeSeriesPopup.name}
                  </span>
                </div>
              </div>

              <button
                type="button"
                aria-label="Close series popup"
                onClick={() => setActiveSeriesPopup(null)}
                className="p-2 rounded bg-slate-100 hover:bg-slate-200 text-slate-600 hover:text-slate-900 dark:bg-[#252f3d] dark:hover:bg-[#313e50] dark:text-[#aeb9c7] dark:hover:text-white transition-colors cursor-pointer shrink-0"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </header>

          {/* Full-Screen Scrollable Body */}
          <div className="sa-ps5-modal-scroll flex-1 overflow-y-auto bg-gradient-to-b from-slate-50 via-[#f4f6f9] to-slate-100 dark:from-[#161f2b] dark:via-[#111720] dark:to-[#0c1016]">
            {/* Hero Banner */}
            <div className="sa-ps5-modal-hero relative h-48 sm:h-64 lg:h-80 bg-[#0b1016] border-b border-white/[0.07] overflow-hidden">
              <GameCover
                src={
                  sanitizeUrl(activeSeriesPopup.rawFields.background) ||
                  activeSeriesPopup.coverImage
                }
                alt={activeSeriesPopup.name}
                imgClassName="w-full h-full object-cover"
              />
              <div className="sa-ps5-modal-scrim-y absolute inset-0 bg-gradient-to-t from-[#111720] via-[#111720]/65 to-black/30" />
              <div className="sa-modal-scrim-x sa-ps5-modal-scrim-x absolute inset-0 bg-gradient-to-r from-[#0f141b]/85 via-transparent to-transparent" />

              <div className="relative h-full max-w-[1400px] mx-auto px-3.5 sm:px-6 lg:px-8 pb-5 sm:pb-7 flex flex-col justify-end">
                <div className="flex flex-wrap items-center gap-2 mb-2">
                  {(activeSeriesPopup.rawFields.categories || activeSeriesPopup.category) && (
                    <span className="inline-block px-2.5 py-0.5 rounded bg-[#1a9fff]/20 border border-[#1a9fff]/45 text-[#66c0f4] text-[11px] font-bold uppercase tracking-[0.06em]">
                      {activeSeriesPopup.rawFields.categories || activeSeriesPopup.category}
                    </span>
                  )}
                  <span className="px-2 py-0.5 rounded bg-black/55 border border-white/10 text-[11px] font-mono-tabular text-[#d4dde7]">
                    {(() => {
                      const count = (activeSeriesPopup.rawFields.gamelist || '')
                        .split(',')
                        .map((s) => s.trim())
                        .filter(Boolean).length;
                      return `${count} ${count === 1 ? t.titleSingular : t.titlePlural}`;
                    })()}
                  </span>
                </div>
                <h2 className="font-display text-2xl sm:text-3xl lg:text-4xl font-bold text-white tracking-tight">
                  {activeSeriesPopup.name}
                </h2>
              </div>
            </div>

            {/* Cover Gallery & Games List */}
            <div className="max-w-[1400px] mx-auto px-3.5 sm:px-6 lg:px-8 py-5 sm:py-7 space-y-7">
              {(() => {
                const thumbs = (activeSeriesPopup.rawFields.images || '')
                  .split(/\s*,\s*(?=https?:\/\/)/i)
                  .map((u) => sanitizeUrl(u))
                  .filter((u) => /^https?:\/\//i.test(u));
                if (thumbs.length === 0) return null;
                return (
                  <section className="space-y-3">
                    <h3 className="text-[12px] font-bold uppercase tracking-[0.08em] text-slate-600 dark:text-[#8b9bb4]">
                      {t.seriesPosters}
                    </h3>
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2.5 sm:gap-3.5">
                      {thumbs.map((url, i) => (
                        <div
                          key={i}
                          className="aspect-[2/3] rounded overflow-hidden bg-slate-100 dark:bg-[#0b1016] border border-slate-200 dark:border-white/[0.08]"
                        >
                          <GameCover
                            src={url}
                            alt={`${activeSeriesPopup.name} #${i + 1}`}
                            imgClassName="w-full h-full object-cover"
                          />
                        </div>
                      ))}
                    </div>
                  </section>
                );
              })()}

              <section className="space-y-3">
                <div className="flex items-center gap-2 text-[12.5px] font-bold uppercase tracking-[0.08em] text-[#0284c7] dark:text-[#66c0f4]">
                  <Sparkle className="w-4 h-4" />
                  <span>{t.gamesInSeries}</span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5 sm:gap-3">
                  {(activeSeriesPopup.rawFields.gamelist || '')
                    .split(',')
                    .map((s) => s.trim())
                    .filter(Boolean)
                    .map((entry, idx) => {
                      const isBest = /\[best\]/i.test(entry);
                      const cleanLabel = entry.replace(/\[best\]/gi, '').trim();

                      return (
                        <div
                          key={idx}
                          className={`sa-ps5-subpanel px-3.5 py-2.5 rounded border flex items-center gap-2.5 ${
                            isBest
                              ? 'bg-amber-50 border-amber-300 dark:bg-[#1a2433] dark:border-[#fbbf24]/50'
                              : 'bg-white border-slate-200 dark:bg-[#141c27] dark:border-white/[0.07]'
                          }`}
                        >
                          <span className="text-[11.5px] font-mono-tabular text-slate-500 dark:text-[#8b9bb4] w-6 shrink-0">
                            {idx + 1}.
                          </span>
                          <span className="text-[13px] sm:text-[13.5px] font-medium text-slate-900 dark:text-white truncate flex-1">
                            {cleanLabel}
                          </span>
                          {isBest && (
                            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-[2px] bg-amber-100 border border-amber-300 text-amber-800 dark:bg-[#fbbf24]/20 dark:border-[#fbbf24]/50 dark:text-[#fbbf24] text-[10px] font-bold uppercase shrink-0">
                              <Medal className="w-3 h-3" />
                              <span>{t.bestBadge}</span>
                            </span>
                          )}
                        </div>
                      );
                    })}
                </div>
              </section>
            </div>
          </div>
        </div>
      )}
    </div>
  );
});
