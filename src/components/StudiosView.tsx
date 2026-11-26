import { memo, useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowLeft,
  CaretLeft,
  CaretRight,
  MagnifyingGlass,
} from '@phosphor-icons/react';
import type { GameItem } from '../types';
import { getStudioTotalCount, sortStudiosByTop } from '../utils/parsers';
import type { AppLanguage } from '../services/launcherSettings';
import { getTranslations } from '../i18n/translations';
import { StudioEmblem } from './StudioEmblem';

interface StudiosViewProps {
  studios: GameItem[];
  language?: AppLanguage;
  onSelectStudio: (studio: GameItem) => void;
  onBackHome: () => void;
}

const STUDIOS_PER_PAGE = 30;

export const StudiosView = memo(function StudiosView({ studios, language = 'en', onSelectStudio, onBackHome }: StudiosViewProps) {
  const t = getTranslations(language).studios;
  const [query, setQuery] = useState('');
  const [page, setPage] = useState(0);
  const topRef = useRef<HTMLDivElement | null>(null);

  const sortedStudios = useMemo(() => {
    const ordered = sortStudiosByTop(studios);
    const q = query.trim().toLowerCase();
    if (!q) return ordered;
    return ordered.filter((s) => s.name.toLowerCase().includes(q));
  }, [studios, query]);

  const totalPages = Math.max(1, Math.ceil(sortedStudios.length / STUDIOS_PER_PAGE));
  const safePage = Math.min(page, totalPages - 1);

  useEffect(() => {
    setPage(0);
  }, [query]);

  const pageItems = useMemo(() => {
    const start = safePage * STUDIOS_PER_PAGE;
    return sortedStudios.slice(start, start + STUDIOS_PER_PAGE);
  }, [sortedStudios, safePage]);

  const goToPage = (nextPage: number) => {
    const bounded = Math.max(0, Math.min(nextPage, totalPages - 1));
    setPage(bounded);
    topRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  return (
    <div className="flex-1 min-w-0 h-full overflow-y-auto bg-gradient-to-b from-slate-50 via-[#f4f6f9] to-slate-100 dark:from-[#1a2330] dark:via-[#151b24] dark:to-[#10141b]">
      <div
        ref={topRef}
        className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-5 lg:py-7 space-y-6"
      >
        {/* Header Bar with Back to Home & Search */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3.5 border-b border-slate-200 dark:border-white/[0.08] pb-4">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onBackHome}
              className="inline-flex items-center gap-2 px-3 py-2 rounded bg-slate-200 hover:bg-slate-300 border border-slate-300 text-[12px] sm:text-[12.5px] font-semibold text-slate-800 hover:text-slate-950 dark:bg-[#212a37] dark:hover:bg-[#2c3849] dark:border-white/[0.08] dark:text-[#e5e9f0] dark:hover:text-white transition-colors whitespace-nowrap cursor-pointer shrink-0"
            >
              <ArrowLeft className="w-4 h-4 rtl:rotate-180" />
              <span>{t.backToHome}</span>
            </button>

            <h1 className="font-display text-lg lg:text-xl font-bold text-slate-900 dark:text-white tracking-tight truncate">
              {t.topStudios}
            </h1>
          </div>

          <div className="flex items-center justify-between sm:justify-end gap-3 w-full sm:w-auto">
            <div className="relative flex-1 sm:flex-initial">
              <MagnifyingGlass className="w-3.5 h-3.5 text-slate-400 dark:text-[#677487] absolute start-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={t.searchPlaceholder}
                className="w-full sm:w-64 ps-8 pe-3 py-2 rounded bg-white dark:bg-[#10151c] border border-slate-300 dark:border-white/[0.1] text-[12.5px] text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-[#566376] focus:outline-none focus:border-[#1a9fff]"
              />
            </div>

            <span className="text-[12px] text-slate-500 dark:text-[#8b9bb4] font-mono-tabular whitespace-nowrap shrink-0">
              {t.pageOf} {safePage + 1} / {totalPages}
            </span>
          </div>
        </div>

        {/* Studios Grid: Logo + Total Games */}
        {pageItems.length === 0 ? (
          <div className="py-16 text-center rounded bg-white dark:bg-[#141921] border border-slate-200 dark:border-white/[0.06] text-[13px] text-slate-600 dark:text-[#8b9bb4]">
            {t.noMatch}
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-6 gap-3 sm:gap-3.5 lg:gap-4">
            {pageItems.map((studio) => {
              const totalGames = getStudioTotalCount(studio);
              return (
                <button
                  key={`studio-page-${studio.id}`}
                  type="button"
                  title={studio.name}
                  aria-label={`${studio.name} (${totalGames} ${t.gamePlural})`}
                  onClick={() => onSelectStudio(studio)}
                  className="sa-contain-card group p-3 rounded bg-white hover:bg-slate-50 border border-slate-200 shadow-sm dark:shadow-none dark:bg-[#18202b] dark:hover:bg-[#212b3a] dark:border-white/[0.06] hover:border-[#1a9fff]/60 transition-[transform,border-color,background-color] duration-200 hover:-translate-y-0.5 flex flex-col items-center gap-2.5 cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-[#1a9fff]"
                >
                  <StudioEmblem studio={studio} />
                  <span className="text-[12px] font-semibold font-mono-tabular text-slate-700 group-hover:text-slate-900 dark:text-[#c6d4df] dark:group-hover:text-white">
                    {totalGames} {totalGames === 1 ? t.gameSingular : t.gamePlural}
                  </span>
                </button>
              );
            })}
          </div>
        )}

        {/* Pagination Controls */}
        {totalPages > 1 && (
          <div className="pt-3 flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 dark:border-white/[0.07]">
            <div className="flex flex-wrap items-center gap-1.5">
              <button
                type="button"
                disabled={safePage === 0}
                onClick={() => goToPage(safePage - 1)}
                className="inline-flex items-center gap-1 px-3 py-2 rounded bg-slate-200 hover:bg-slate-300 disabled:opacity-40 disabled:pointer-events-none border border-slate-300 text-[12px] font-medium text-slate-800 dark:bg-[#212a37] dark:hover:bg-[#2c3849] dark:border-white/[0.08] dark:text-[#dce4ee] cursor-pointer"
              >
                <CaretLeft weight="bold" className="w-3.5 h-3.5 rtl:rotate-180" />
                <span>{t.previous}</span>
              </button>

              {Array.from({ length: totalPages }, (_, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => goToPage(idx)}
                  className={`min-w-[34px] h-[34px] px-2 rounded text-[12px] font-mono-tabular font-semibold transition-colors cursor-pointer ${
                    idx === safePage
                      ? 'bg-[#1a9fff] text-white'
                      : 'bg-white text-slate-600 hover:bg-slate-100 hover:text-slate-900 border border-slate-200 dark:bg-[#18202b] dark:text-[#9ca8b8] dark:hover:bg-[#232f3e] dark:hover:text-white dark:border-white/[0.06]'
                  }`}
                >
                  {idx + 1}
                </button>
              ))}

              <button
                type="button"
                disabled={safePage >= totalPages - 1}
                onClick={() => goToPage(safePage + 1)}
                className="inline-flex items-center gap-1 px-3 py-2 rounded bg-slate-200 hover:bg-slate-300 disabled:opacity-40 disabled:pointer-events-none border border-slate-300 text-[12px] font-medium text-slate-800 dark:bg-[#212a37] dark:hover:bg-[#2c3849] dark:border-white/[0.08] dark:text-[#dce4ee] cursor-pointer"
              >
                <span>{t.next}</span>
                <CaretRight weight="bold" className="w-3.5 h-3.5 rtl:rotate-180" />
              </button>
            </div>

            <button
              type="button"
              onClick={onBackHome}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded bg-slate-200 hover:bg-slate-300 border border-slate-300 text-[12px] font-semibold text-slate-800 dark:bg-[#212a37] dark:hover:bg-[#2c3849] dark:border-white/[0.08] dark:text-[#e5e9f0] cursor-pointer"
            >
              <ArrowLeft className="w-3.5 h-3.5 rtl:rotate-180" />
              <span>{t.backToHome}</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
});
