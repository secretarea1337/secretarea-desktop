import { useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import {
  Archive,
  ArrowLeft,
  ArrowSquareOut,
  ArrowUpRight,
  Buildings,
  CalendarBlank,
  CaretLeft,
  CaretRight,
  Check,
  CloudArrowDown,
  Copy,
  CornersOut,
  Cpu,
  DownloadSimple,
  FileText,
  FilmStrip,
  FolderOpen,
  GameController,
  Globe,
  GraphicsCard,
  HardDrive,
  HardDrives,
  Hash,
  Key,
  Lightning,
  LinkSimple,
  ListChecks,
  Magnet,
  Memory,
  Monitor,
  Package,
  Pause,
  Play,
  Prohibit,
  PushPin,
  SealCheck,
  ShieldWarning,
  SlidersHorizontal,
  Sparkle,
  Stack,
  Tag,
  ThumbsDown,
  ThumbsUp,
  UserCheck,
  Warning,
  Wrench,
  X,
} from '@phosphor-icons/react';
import type { DownloadTask, GameItem, MirrorLink, SheetCatalogData } from '../types';
import { isTruthyFlag, resolveSheetRefItem, resolveStudiosForItem } from '../utils/parsers';
import { evaluateCanRunGame } from '../services/canRunIt';
import type { SystemHardwareSpecs } from '../services/systemSpecs';
import { CanRunItHeroBadge, CanRunItPanel } from './CanRunItPanel';
import { GameCover } from './GameCover';
import { HypervisorGuideModal } from './HypervisorGuideModal';
import { getSectionVisualMeta, SectionSourceBadge } from './SectionBadge';
import type { AppLanguage } from '../services/launcherSettings';
import { getTranslations } from '../i18n/translations';
import {
  formatBytes,
  formatDownloadSpeed,
  formatEta,
} from '../services/downloadManager';

interface GameDetailModalProps {
  game: GameItem | null;
  catalog?: SheetCatalogData;
  language?: AppLanguage;
  initialViewMode?: 'overview' | 'trailer' | 'downloads';
  favorites?: Set<string>;
  systemSpecs?: SystemHardwareSpecs;
  canRunItEnabled?: boolean;
  isRefreshingSpecs?: boolean;
  isDesktopApp?: boolean;
  downloadTasks?: DownloadTask[];
  onStartDownload?: (mirror: MirrorLink, game: GameItem) => void;
  onPauseDownload?: (id: string) => void;
  onResumeDownload?: (id: string) => void;
  onCancelDownload?: (id: string) => void;
  onOpenDownloadFolder?: (id?: string) => void;
  onOpenDownloadsTab?: () => void;
  onRefreshSpecs?: () => void;
  onSaveCustomSpecs?: (next: SystemHardwareSpecs) => void;
  onResetCustomSpecs?: () => void;
  onToggleFavorite: (id: string) => void;
  onJumpToItem?: (item: GameItem) => void;
  onSelectStudio?: (studio: GameItem) => void;
  celebrateWinKey?: number;
  onClose: () => void;
}

type MediaSlide =
  | { kind: 'image'; url: string }
  | { kind: 'video'; url: string }
  | { kind: 'trailer'; url: string };

const TOOL_TITLE_STOP_WORDS = new Set([
  'for',
  'the',
  'and',
  'with',
  'all',
  'pro',
  'plus',
  'edition',
  'version',
  'build',
  'update',
  'patch',
  'fix',
  'pack',
  'suite',
  'studio',
  'windows',
  'win',
  'mac',
  'x64',
  'x86',
  '64bit',
  '32bit',
  'multilingual',
  'multi',
  'crack',
  'repack',
  'full',
  'free',
  'portable',
  'enterprise',
]);

function extractToolTitleTokens(name: string): string[] {
  return name
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[™®©:'"`\-_/.,!?()[\]+]+/g, ' ')
    .split(/\s+/)
    .map((t) => t.trim())
    .filter(
      (t) =>
        t.length >= 2 &&
        !TOOL_TITLE_STOP_WORDS.has(t) &&
        !/^\d+$/.test(t) &&
        !/^v\d+$/i.test(t)
    );
}

export function GameDetailModal({
  game,
  catalog,
  language = 'en',
  initialViewMode = 'overview',
  favorites,
  systemSpecs,
  canRunItEnabled = true,
  isRefreshingSpecs = false,
  isDesktopApp = false,
  downloadTasks = [],
  onStartDownload,
  onPauseDownload,
  onResumeDownload,
  onCancelDownload,
  onOpenDownloadFolder,
  onOpenDownloadsTab,
  onRefreshSpecs,
  onSaveCustomSpecs,
  onResetCustomSpecs,
  onJumpToItem,
  onSelectStudio,
  celebrateWinKey = 0,
  onClose,
}: GameDetailModalProps) {
  const tr = getTranslations(language);
  const t = tr.detail;
  const [activeSlideIndex, setActiveSlideIndex] = useState(0);
  const [checkedSteps, setCheckedSteps] = useState<Set<number>>(() => new Set());
  const [isRecPaused, setIsRecPaused] = useState(false);
  const [isHvGuideOpen, setIsHvGuideOpen] = useState(false);
  const [copiedGameId, setCopiedGameId] = useState(false);
  const [copiedMirrorKey, setCopiedMirrorKey] = useState<string | null>(null);
  const [activeChannelFilter, setActiveChannelFilter] = useState<string>('all');
  const [lightboxImageUrl, setLightboxImageUrl] = useState<string | null>(null);
  const [showWinCelebration, setShowWinCelebration] = useState(false);

  useEffect(() => {
    if (!celebrateWinKey || !game) {
      setShowWinCelebration(false);
      return;
    }
    setShowWinCelebration(true);
    const timer = window.setTimeout(() => {
      setShowWinCelebration(false);
    }, 3400);
    return () => window.clearTimeout(timer);
  }, [celebrateWinKey, game?.id, game?.tab]);

  const pageScrollRef = useRef<HTMLDivElement | null>(null);
  const mediaSectionRef = useRef<HTMLElement | null>(null);
  const requirementsSectionRef = useRef<HTMLElement | null>(null);
  const downloadsSectionRef = useRef<HTMLElement | null>(null);
  const recommendedSliderRef = useRef<HTMLDivElement | null>(null);

  const canRunEvaluation = useMemo(
    () => (game && canRunItEnabled && systemSpecs ? evaluateCanRunGame(game, systemSpecs) : null),
    [game, canRunItEnabled, systemSpecs]
  );

  const itemStudios = useMemo(
    () => (game && catalog?.profil ? resolveStudiosForItem(game, catalog.profil) : []),
    [game, catalog?.profil]
  );

  const mediaSlides = useMemo<MediaSlide[]>(() => {
    if (!game) return [];
    const slides: MediaSlide[] = [];
    if (game.embedTrailerUrl && initialViewMode === 'trailer') {
      slides.push({ kind: 'trailer', url: game.embedTrailerUrl });
    }
    for (const vid of game.galleryVideos) {
      slides.push({ kind: 'video', url: vid });
    }
    for (const img of game.galleryImages) {
      slides.push({ kind: 'image', url: img });
    }
    if (game.embedTrailerUrl && initialViewMode !== 'trailer') {
      slides.push({ kind: 'trailer', url: game.embedTrailerUrl });
    }
    if (slides.length === 0 && game.coverImage) {
      slides.push({ kind: 'image', url: game.coverImage });
    }
    return slides;
  }, [game, initialViewMode]);

  const groupedMirrors = useMemo(() => {
    if (!game) return [];
    const order: MirrorLink['group'][] = [
      'Magnet Link',
      'Full Download',
      'MediaFire (Direct Link)',
      'Mega (Backup)',
      'FitGirl-Repacks',
      'DoDI-Repack',
      'Skidrow',
      'SteamRIP',
      'Direct Mirrors',
      'Anker',
      'Unlockers',
      'Resources',
    ];
    return order
      .map((groupName) => ({
        groupName,
        links: game.mirrors.filter((m) => m.group === groupName),
      }))
      .filter((entry) => entry.links.length > 0);
  }, [game]);

  const totalMirrorLinks = useMemo(
    () => groupedMirrors.reduce((acc, entry) => acc + entry.links.length, 0),
    [groupedMirrors]
  );

  const visibleMirrors = useMemo(
    () =>
      activeChannelFilter === 'all'
        ? groupedMirrors
        : groupedMirrors.filter((entry) => entry.groupName === activeChannelFilter),
    [groupedMirrors, activeChannelFilter]
  );

  const linkedCatalogItems = useMemo(() => {
    if (!game || !catalog) return [];
    const refsRaw = [
      game.rawFields['Game ID'],
      game.rawFields['Games ID'],
      game.rawFields['Hypervisor ID'],
      game.rawFields['SteamTools ID'],
      game.tab === 'onlinegames' ? game.rawFields.id : '',
    ]
      .filter(Boolean)
      .join(',');
    if (!refsRaw) return [];
    const seen = new Set<string>();
    const results: GameItem[] = [];
    for (const token of refsRaw.split(',')) {
      const resolved = resolveSheetRefItem(token, catalog);
      if (resolved && !seen.has(`${resolved.tab}:${resolved.id}`)) {
        seen.add(`${resolved.tab}:${resolved.id}`);
        results.push(resolved);
      }
    }
    return results;
  }, [game, catalog]);

  const recommendedGames = useMemo(() => {
    if (!game || !catalog || game.tab === 'steamtools') return [];

    if (game.tab === 'architect') {
      const toolsPool = (catalog.architect || []).filter((g) => g.id !== game.id);
      if (toolsPool.length === 0) return [];

      const targetTokens = extractToolTitleTokens(game.name);
      if (targetTokens.length === 0) return [];
      const targetLead = targetTokens[0];
      const targetTokenSet = new Set(targetTokens);

      const sameTitleMatches = toolsPool
        .map((candidate) => {
          const candTokens = extractToolTitleTokens(candidate.name);
          const shared = candTokens.filter((tok) => targetTokenSet.has(tok));
          if (shared.length === 0) {
            return { candidate, score: 0 };
          }
          let score = shared.length * 8;
          if (candTokens[0] === targetLead) {
            score += 12;
          } else if (candTokens.includes(targetLead)) {
            score += 6;
          }
          if (candidate.isPinned) score += 1;
          return { candidate, score };
        })
        .filter((entry) => entry.score > 0)
        .sort(
          (a, b) =>
            b.score - a.score ||
            Number(b.candidate.isPinned) - Number(a.candidate.isPinned) ||
            Number(b.candidate.isFree) - Number(a.candidate.isFree) ||
            b.candidate.dateTimestamp - a.candidate.dateTimestamp ||
            Number(b.candidate.id) - Number(a.candidate.id)
        )
        .map((entry) => entry.candidate);

      return sameTitleMatches.slice(0, 16);
    }

    const pool = game.tab === 'hypervisor' ? catalog.hypervisor || [] : catalog.game || [];
    if (pool.length === 0) return [];

    const targetGenres = new Set(game.genreList.map((g) => g.toLowerCase()));
    const candidates = pool.filter((g) => g.id !== game.id);
    const scored = candidates.map((candidate) => {
      let overlap = 0;
      for (const cg of candidate.genreList) {
        if (targetGenres.has(cg.toLowerCase())) overlap++;
      }
      return { candidate, overlap };
    });

    const genreMatches = scored
      .filter((entry) => entry.overlap > 0)
      .sort(
        (a, b) =>
          b.overlap - a.overlap ||
          (b.candidate.coverImage ? 1 : 0) - (a.candidate.coverImage ? 1 : 0) ||
          b.candidate.dateTimestamp - a.candidate.dateTimestamp ||
          Number(b.candidate.id) - Number(a.candidate.id)
      )
      .map((entry) => entry.candidate);

    if (genreMatches.length >= 16) {
      return genreMatches.slice(0, 16);
    }

    const pickedIds = new Set(genreMatches.map((g) => g.id));
    const fallback = candidates
      .filter((g) => !pickedIds.has(g.id))
      .sort(
        (a, b) =>
          b.dateTimestamp - a.dateTimestamp || Number(b.id) - Number(a.id)
      );

    return [...genreMatches, ...fallback].slice(0, 16);
  }, [game, catalog]);

  useEffect(() => {
    setActiveSlideIndex(0);
    setCheckedSteps(new Set());
    setIsHvGuideOpen(false);
    setCopiedGameId(false);
    setCopiedMirrorKey(null);
    setActiveChannelFilter('all');
    setLightboxImageUrl(null);
    recommendedSliderRef.current?.scrollTo({ left: 0 });
    if (initialViewMode === 'downloads') {
      const timer = window.setTimeout(() => {
        downloadsSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 90);
      return () => window.clearTimeout(timer);
    }
    pageScrollRef.current?.scrollTo({ top: 0 });
  }, [game?.id, game?.tab, initialViewMode]);

  useEffect(() => {
    if (!game || isHvGuideOpen) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (lightboxImageUrl) {
          setLightboxImageUrl(null);
          return;
        }
        onClose();
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [game, isHvGuideOpen, lightboxImageUrl, onClose]);

  useEffect(() => {
    if (!game || isRecPaused || recommendedGames.length <= 2) return;
    const timer = window.setInterval(() => {
      const el = recommendedSliderRef.current;
      if (!el) return;
      const maxScrollLeft = el.scrollWidth - el.clientWidth;
      if (maxScrollLeft <= 4) return;
      const step = Math.max(260, Math.round(el.clientWidth * 0.72));
      if (el.scrollLeft >= maxScrollLeft - 12) {
        el.scrollTo({ left: 0, behavior: 'smooth' });
      } else {
        el.scrollBy({ left: step, behavior: 'smooth' });
      }
    }, 4200);
    return () => window.clearInterval(timer);
  }, [game, isRecPaused, recommendedGames.length]);

  if (!game) return null;

  const activeSlide = mediaSlides[activeSlideIndex] || mediaSlides[0];
  const heroBackdrop = game.galleryImages[0] || game.coverImage;
  const trailerSlideIdx = mediaSlides.findIndex((s) => s.kind === 'trailer');

  const handleWatchTrailer = () => {
    if (trailerSlideIdx >= 0) {
      setActiveSlideIndex(trailerSlideIdx);
      mediaSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    } else if (game.trailerUrl && /^https?:\/\//i.test(game.trailerUrl.trim())) {
      window.open(game.trailerUrl.trim(), '_blank', 'noopener,noreferrer');
    }
  };

  const scrollRecommended = (direction: -1 | 1) => {
    const el = recommendedSliderRef.current;
    if (!el) return;
    const maxScrollLeft = el.scrollWidth - el.clientWidth;
    if (maxScrollLeft <= 4) return;
    const step = Math.max(260, Math.round(el.clientWidth * 0.78));

    if (direction === 1) {
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

  const toggleStepDone = (idx: number) => {
    setCheckedSteps((prev) => {
      const next = new Set(prev);
      if (next.has(idx)) {
        next.delete(idx);
      } else {
        next.add(idx);
      }
      return next;
    });
  };

  const { os, cpu, ram, gpu, raw } = game.parsedRequirements;
  const hasStructuredReqs = Boolean(os || cpu || ram || gpu);
  const rawToolsFallback = !game.parsedTools.length && game.rawFields.tools ? game.rawFields.tools : '';
  const hasSecondarySidebar = linkedCatalogItems.length > 0 && Boolean(onJumpToItem);

  const isSteamTools = game.tab === 'steamtools';
  const isTools = game.tab === 'architect';
  const steamGameId = (game.rawFields.gameId || '').trim();
  const ratingPositiveRaw = (game.rawFields.ratingPositive || '').trim();
  const ratingNegativeRaw = (game.rawFields.ratingNegative || '').trim();
  const ratingPositiveNum = Number(ratingPositiveRaw);
  const ratingNegativeNum = Number(ratingNegativeRaw);
  const hasDenuvo = isSteamTools && isTruthyFlag(game.rawFields.denuvo);
  const hasExternalLauncher = isSteamTools && isTruthyFlag(game.rawFields.launcher);

  const handleCopyGameId = async () => {
    if (!steamGameId) return;
    try {
      await navigator.clipboard.writeText(steamGameId);
      setCopiedGameId(true);
      setTimeout(() => setCopiedGameId(false), 2000);
    } catch {
      // Clipboard fallback ignored cleanly
    }
  };

  const handleCopyMirrorUrl = async (mirrorKey: string, url: string) => {
    if (!url) return;
    try {
      await navigator.clipboard.writeText(url);
      setCopiedMirrorKey(mirrorKey);
      window.setTimeout(() => {
        setCopiedMirrorKey((current) => (current === mirrorKey ? null : current));
      }, 2000);
    } catch {
      // Clipboard fallback ignored cleanly
    }
  };

  const completedRatio =
    game.parsedSteps.length > 0
      ? Math.round((checkedSteps.size / game.parsedSteps.length) * 100)
      : 0;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={game.name}
      className="sa-ps5-modal fixed inset-0 z-50 w-screen h-screen bg-[#f4f6f9] dark:bg-[#141921] flex flex-col overflow-hidden"
    >
      {/* Lightweight GPU Congratulations Effect when opened from Spin Wheel */}
      {showWinCelebration && (
        <div
          aria-live="polite"
          className="fixed inset-x-0 top-14 z-[60] pointer-events-none flex flex-col items-center overflow-hidden h-72"
        >
          <div className="relative w-full max-w-2xl h-full">
            {Array.from({ length: 20 }, (_, idx) => {
              const colors = ['#ef4444', '#fbbf0d', '#00c25c', '#0094df', '#a855f7'];
              const leftPct = 6 + ((idx * 4.7) % 88);
              const driftX = ((idx % 2 === 0 ? 1 : -1) * (20 + (idx % 5) * 18)) + 'px';
              const dropY = 190 + (idx % 4) * 32 + 'px';
              const rot = (idx % 2 === 0 ? 1 : -1) * (280 + idx * 24) + 'deg';
              const delay = ((idx % 6) * 0.05).toFixed(2) + 's';
              const dur = (2.1 + (idx % 4) * 0.25).toFixed(2) + 's';
              return (
                <span
                  key={idx}
                  aria-hidden="true"
                  style={{
                    left: `${leftPct}%`,
                    top: '4px',
                    backgroundColor: colors[idx % colors.length],
                    ['--sa-cx' as string]: driftX,
                    ['--sa-cy' as string]: dropY,
                    ['--sa-cr' as string]: rot,
                    ['--sa-delay' as string]: delay,
                    ['--sa-cd' as string]: dur,
                  }}
                  className="sa-confetti-piece absolute w-2.5 h-3.5 rounded-[2px] shadow-sm"
                />
              );
            })}
          </div>

          <div className="absolute top-3 px-4 py-2 rounded-2xl bg-slate-900/92 dark:bg-[#111927]/95 border border-amber-400/50 shadow-xl flex items-center gap-2.5 text-white">
            <Sparkle weight="fill" className="w-4.5 h-4.5 text-amber-400 shrink-0" />
            <span className="text-xs sm:text-sm font-bold text-amber-300">
              {tr.spinWheel.congratsTitle}
            </span>
            <span className="text-xs text-slate-200 truncate max-w-[240px] sm:max-w-xs">
              {game.name}
            </span>
          </div>
        </div>
      )}

      {/* Top Game Page Navigation Header */}
      <header className="sa-ps5-modal-header px-3.5 sm:px-6 lg:px-8 py-2.5 sm:py-3 bg-white/95 dark:bg-[#10151e]/95 backdrop-blur-xl border-b border-slate-200 dark:border-white/[0.08] shrink-0">
        <div className="max-w-[1600px] mx-auto flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <button
              type="button"
              onClick={onClose}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 border border-slate-300 text-[12px] font-semibold text-slate-800 hover:text-slate-950 dark:bg-white/[0.07] dark:hover:bg-white/[0.14] dark:border-white/[0.1] dark:text-[#e5e9f0] dark:hover:text-white transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              <ArrowLeft className="w-3.5 h-3.5 rtl:rotate-180" />
              <span>{t.back}</span>
            </button>

            <div className="hidden sm:flex items-center gap-2 text-[12px] text-slate-500 dark:text-[#8b9bb4] min-w-0">
              <button
                type="button"
                onClick={onClose}
                className="hover:text-slate-900 dark:hover:text-white transition-colors cursor-pointer shrink-0"
              >
                {t.home}
              </button>
              <span className="text-slate-300 dark:text-[#4b5b70]">/</span>
              <span className="text-slate-900 dark:text-white font-semibold truncate">{game.name}</span>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label={t.close}
            className="w-9 h-9 rounded-xl bg-slate-100 hover:bg-slate-200 border border-slate-200 text-slate-600 hover:text-slate-900 dark:bg-white/[0.06] dark:hover:bg-white/[0.14] dark:border-white/[0.08] dark:text-[#aeb9c7] dark:hover:text-white flex items-center justify-center transition-colors cursor-pointer shrink-0"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* Scrollable Full-Screen Game Page */}
      <div
        ref={pageScrollRef}
        className="sa-ps5-modal-scroll flex-1 overflow-y-auto bg-gradient-to-b from-slate-50 via-[#f4f6f9] to-slate-100 dark:from-[#18202c] dark:via-[#131922] dark:to-[#0f131a]"
      >
        {/* Game Page Hero Header */}
        {(() => {
          const sectionMeta = getSectionVisualMeta(game.tab);
          const formattedDateAdded = (() => {
            if (!game.dateAdded) return '';
            const parsed = new Date(game.dateAdded);
            if (Number.isNaN(parsed.getTime())) return game.dateAdded;
            return parsed.toLocaleDateString(tr.locale, {
              year: 'numeric',
              month: 'short',
              day: 'numeric',
            });
          })();
          const hasReqsTarget = Boolean(canRunEvaluation || hasStructuredReqs || raw);

          return (
            <section className="sa-ps5-modal-hero relative border-b border-slate-200/20 dark:border-white/[0.08] overflow-hidden bg-[#0a0f16]">
              {/* Animated Full-Bleed Backdrop */}
              {heroBackdrop && (
                <motion.img
                  key={`detail-bg-${game.tab}-${game.id}`}
                  src={heroBackdrop}
                  alt=""
                  aria-hidden="true"
                  referrerPolicy="no-referrer"
                  initial={{ opacity: 0.1, scale: 1.08 }}
                  animate={{ opacity: 0.34, scale: 1.01 }}
                  transition={{ duration: 1.15, ease: [0.16, 1, 0.3, 1] }}
                  className="absolute inset-0 w-full h-full object-cover object-center blur-[1.5px] pointer-events-none"
                />
              )}

              {/* Measured Contrast Scrims + Subtle Ambient Glow */}
              <div
                aria-hidden="true"
                className="sa-ps5-modal-scrim-y absolute inset-0 bg-gradient-to-t from-[#0d131c] via-[#0d131c]/80 to-[#0a0f16]/65 pointer-events-none"
              />
              <div
                aria-hidden="true"
                className="sa-modal-scrim-x sa-ps5-modal-scrim-x absolute inset-0 bg-gradient-to-r from-[#0a0f16]/95 via-[#0b1119]/82 to-[#0b1119]/40 pointer-events-none"
              />
              <motion.div
                aria-hidden="true"
                animate={{ opacity: [0.18, 0.34, 0.18] }}
                transition={{ duration: 7, repeat: Infinity, ease: 'easeInOut' }}
                className="absolute -top-24 end-1/4 w-[460px] h-[280px] rounded-full bg-[#1a9fff]/20 blur-[110px] pointer-events-none"
              />

              <div className="relative z-10 max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-9 lg:py-11">
                <div className="grid grid-cols-1 md:grid-cols-12 items-center gap-6 md:gap-8 lg:gap-10">
                  {/* Start Column (md+): Modern Animated Portrait Cover Showcase Card + Ratings */}
                  <div className="hidden md:flex md:col-span-4 lg:col-span-3 flex-col items-center md:items-start gap-3">
                    <motion.div
                      key={`detail-cover-${game.tab}-${game.id}`}
                      initial={{ opacity: 0, y: 18, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      transition={{ duration: 0.48, ease: [0.16, 1, 0.3, 1] }}
                      whileHover={{ y: -5, scale: 1.015 }}
                      className="w-[195px] lg:w-[225px] xl:w-[248px] shrink-0"
                    >
                      <div className="rounded-2xl overflow-hidden border border-white/[0.18] bg-[#0e141d]/85 backdrop-blur-xl shadow-[0_24px_60px_rgba(0,0,0,0.68),0_0_0_1px_rgba(255,255,255,0.06)]">
                        <div className="relative aspect-[2/3] w-full overflow-hidden bg-[#121822]">
                          <GameCover
                            src={game.coverImage}
                            alt={game.name}
                            priority
                            imgClassName="w-full h-full object-cover"
                          />
                          <div
                            aria-hidden="true"
                            className="absolute inset-0 bg-gradient-to-t from-[#090d14]/85 via-transparent to-white/[0.06] pointer-events-none"
                          />
                        </div>

                        {(game.repackSize || game.originalSize) && (
                          <div className="px-3.5 py-2.5 bg-[#0b1018]/92 border-t border-white/[0.08] flex items-center justify-between gap-2">
                            <span className="text-[10px] uppercase tracking-[0.09em] text-[#8ea0b8] truncate">
                              {isTools ? t.downloadSize : t.repackSize}
                            </span>
                            <div className="flex items-baseline gap-1.5 font-mono-tabular shrink-0">
                              <span className="text-[13.5px] font-bold text-[#66c0f4]">
                                {game.repackSize || '—'}
                              </span>
                              {game.originalSize && (
                                <span className="text-[11px] text-[#6d7b8e] line-through">
                                  {game.originalSize}
                                </span>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    </motion.div>

                    {isSteamTools && (ratingPositiveRaw || ratingNegativeRaw) && (
                      <div className="w-[195px] lg:w-[225px] xl:w-[248px] grid grid-cols-2 gap-2">
                        {ratingPositiveRaw && (
                          <div className="p-2.5 rounded-xl bg-white/[0.06] backdrop-blur-md border border-white/[0.12] text-center">
                            <div
                              className={`flex items-center justify-center gap-1 text-[13px] font-bold font-mono-tabular ${
                                !Number.isNaN(ratingPositiveNum) && ratingPositiveNum >= 70
                                  ? 'text-[#4ade80]'
                                  : !Number.isNaN(ratingPositiveNum) && ratingPositiveNum >= 50
                                  ? 'text-[#facc15]'
                                  : 'text-[#f87171]'
                              }`}
                            >
                              <ThumbsUp className="w-3.5 h-3.5 shrink-0" />
                              <span>
                                {ratingPositiveRaw.endsWith('%')
                                  ? ratingPositiveRaw
                                  : `${ratingPositiveRaw}%`}
                              </span>
                            </div>
                            <div className="mt-0.5 text-[10px] uppercase tracking-wider text-[#94a6bd]">
                              {t.positive}
                            </div>
                          </div>
                        )}

                        {ratingNegativeRaw && (
                          <div className="p-2.5 rounded-xl bg-white/[0.06] backdrop-blur-md border border-white/[0.12] text-center">
                            <div className="flex items-center justify-center gap-1 text-[13px] font-bold font-mono-tabular text-[#f87171]">
                              <ThumbsDown className="w-3.5 h-3.5 shrink-0" />
                              <span className="truncate">
                                {!Number.isNaN(ratingNegativeNum)
                                  ? ratingNegativeNum.toLocaleString()
                                  : ratingNegativeRaw}
                              </span>
                            </div>
                            <div className="mt-0.5 text-[10px] uppercase tracking-wider text-[#94a6bd]">
                              {t.negative}
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* End Column: Animated Title, Clean Kicker, Spec Cards & Action Buttons */}
                  <motion.div
                    key={`detail-info-${game.tab}-${game.id}`}
                    initial={{ opacity: 0, y: 16 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
                    className="md:col-span-8 lg:col-span-9 min-w-0 w-full space-y-4 sm:space-y-5"
                  >
                    {/* Mobile (<768px) Compact Inline Artwork + Kicker & Title */}
                    <div className="flex items-start gap-3.5 md:block">
                      <div className="md:hidden w-[88px] sm:w-[106px] aspect-[2/3] rounded-xl overflow-hidden border border-white/[0.2] bg-[#0e141d] shadow-[0_14px_34px_rgba(0,0,0,0.65)] shrink-0">
                        <GameCover
                          src={game.coverImage}
                          alt={game.name}
                          priority
                          imgClassName="w-full h-full object-cover"
                        />
                      </div>

                      <div className="min-w-0 flex-1 space-y-2">
                        {/* Unboxed Typographic Kicker */}
                        <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 text-[11px] sm:text-[12px] font-semibold uppercase tracking-[0.11em] text-[#38bdf8]">
                          <span>{isTools ? t.tools : sectionMeta.label}</span>
                          {game.category &&
                            game.category.toLowerCase() !== sectionMeta.label.toLowerCase() && (
                              <>
                                <span aria-hidden="true" className="text-white/35">
                                  ·
                                </span>
                                <span className="text-[#93c5fd]">{game.category}</span>
                              </>
                            )}
                          {game.isNew && (
                            <>
                              <span aria-hidden="true" className="text-white/35">
                                ·
                              </span>
                              <span className="text-emerald-400">NEW</span>
                            </>
                          )}
                          {isTools && game.isPinned && (
                            <>
                              <span aria-hidden="true" className="text-white/35">
                                ·
                              </span>
                              <span className="inline-flex items-center gap-1 text-amber-300">
                                <PushPin className="w-3 h-3" />
                                <span>{t.pinned}</span>
                              </span>
                            </>
                          )}
                          {isTools && game.isFree && (
                            <>
                              <span aria-hidden="true" className="text-white/35">
                                ·
                              </span>
                              <span className="inline-flex items-center gap-1 text-emerald-300">
                                <SealCheck className="w-3 h-3" />
                                <span>{t.free}</span>
                              </span>
                            </>
                          )}
                          {game.repackBy && (
                            <>
                              <span aria-hidden="true" className="text-white/35">
                                ·
                              </span>
                              <span className="text-[#cbd5e1]">{game.repackBy}</span>
                            </>
                          )}
                          {formattedDateAdded && (
                            <>
                              <span aria-hidden="true" className="text-white/35">
                                ·
                              </span>
                              <span className="text-white/70 font-mono-tabular">
                                {formattedDateAdded}
                              </span>
                            </>
                          )}
                          {itemStudios.length > 0 && (
                            <>
                              <span aria-hidden="true" className="text-white/35">
                                ·
                              </span>
                              <span className="inline-flex flex-wrap items-center gap-1.5">
                                {itemStudios.map((studio, sIdx) => (
                                  <span key={studio.id} className="inline-flex items-center gap-1.5">
                                    {sIdx > 0 && (
                                      <span aria-hidden="true" className="text-white/35">
                                        /
                                      </span>
                                    )}
                                    {onSelectStudio ? (
                                      <button
                                        type="button"
                                        onClick={() => onSelectStudio(studio)}
                                        className="inline-flex items-center gap-1 text-[#7dd3fc] hover:text-white underline decoration-[#38bdf8]/45 underline-offset-2 transition-colors cursor-pointer"
                                      >
                                        <Buildings weight="fill" className="w-3 h-3 shrink-0" />
                                        <span>{studio.name}</span>
                                      </button>
                                    ) : (
                                      <span className="inline-flex items-center gap-1 text-[#cbd5e1]">
                                        <Buildings weight="fill" className="w-3 h-3 shrink-0" />
                                        <span>{studio.name}</span>
                                      </span>
                                    )}
                                  </span>
                                ))}
                              </span>
                            </>
                          )}
                        </div>

                        {/* Hero Display Title */}
                        <h1
                          style={{
                            fontSize: 'clamp(1.42rem, 3vw, 2.85rem)',
                            textWrap: 'balance',
                          }}
                          className="font-display font-extrabold text-white tracking-[-0.025em] leading-[1.08] drop-shadow-[0_4px_22px_rgba(0,0,0,0.45)]"
                        >
                          {game.name}
                        </h1>

                        {/* Genres / Release Classification */}
                        <p className="text-[12.5px] sm:text-[13.5px] font-medium text-[#b5c4d6] tracking-wide line-clamp-2">
                          {game.genreList.length > 0
                            ? game.genreList.join(' · ')
                            : isTools
                            ? [
                                game.isFree ? 'Free Software' : 'Software Tool',
                                game.isPinned ? 'Pinned Release' : '',
                                game.version ? `v${game.version.replace(/^v/i, '')}` : '',
                              ]
                                .filter(Boolean)
                                .join(' · ')
                            : game.genresRaw || 'PC Release'}
                        </p>
                      </div>
                    </div>

                    {/* Concise Overview Preview */}
                    {game.description && (
                      <p className="text-[13px] sm:text-[14px] text-[#cfdbe8]/90 leading-relaxed line-clamp-2 max-w-3xl">
                        {game.description}
                      </p>
                    )}

                    {/* Mobile SteamTools Ratings Strip (<768px) */}
                    {isSteamTools && (ratingPositiveRaw || ratingNegativeRaw) && (
                      <div className="md:hidden grid grid-cols-2 gap-2.5">
                        {ratingPositiveRaw && (
                          <div className="p-2.5 rounded-xl bg-white/[0.06] backdrop-blur-md border border-white/[0.12] flex items-center justify-center gap-2">
                            <ThumbsUp className="w-3.5 h-3.5 text-[#4ade80] shrink-0" />
                            <span className="text-[12.5px] font-bold font-mono-tabular text-[#4ade80]">
                              {ratingPositiveRaw.endsWith('%')
                                ? ratingPositiveRaw
                                : `${ratingPositiveRaw}%`}
                            </span>
                            <span className="text-[10.5px] uppercase tracking-wider text-[#94a6bd]">
                              {t.positive}
                            </span>
                          </div>
                        )}
                        {ratingNegativeRaw && (
                          <div className="p-2.5 rounded-xl bg-white/[0.06] backdrop-blur-md border border-white/[0.12] flex items-center justify-center gap-2">
                            <ThumbsDown className="w-3.5 h-3.5 text-[#f87171] shrink-0" />
                            <span className="text-[12.5px] font-bold font-mono-tabular text-[#f87171]">
                              {!Number.isNaN(ratingNegativeNum)
                                ? ratingNegativeNum.toLocaleString()
                                : ratingNegativeRaw}
                            </span>
                            <span className="text-[10.5px] uppercase tracking-wider text-[#94a6bd]">
                              {t.negative}
                            </span>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Modern Glassmorphic Spec Cards Grid */}
                    <div
                      className={`grid grid-cols-2 sm:grid-cols-3 gap-2.5 sm:gap-3 ${
                        canRunEvaluation ? 'xl:grid-cols-5 max-w-4xl' : 'xl:grid-cols-4 max-w-3xl'
                      }`}
                    >
                      {isSteamTools ? (
                        <motion.div
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ duration: 0.35, delay: 0.06 }}
                          className="p-3 sm:p-3.5 rounded-xl bg-white/[0.06] hover:bg-white/[0.1] backdrop-blur-md border border-white/[0.12] hover:-translate-y-0.5 transition-all duration-200"
                        >
                          <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-[0.08em] text-[#94a6bd] font-semibold">
                            <Hash className="w-3 h-3 text-[#38bdf8] shrink-0" />
                            <span className="truncate">{t.gameId}</span>
                          </div>
                          {steamGameId ? (
                            <button
                              type="button"
                              onClick={handleCopyGameId}
                              title={t.gameId}
                              className="mt-1 inline-flex items-center gap-1.5 text-[13px] sm:text-[13.5px] font-bold font-mono-tabular text-[#66c0f4] hover:text-white transition-colors cursor-pointer max-w-full"
                            >
                              <span className="truncate">{steamGameId}</span>
                              {copiedGameId ? (
                                <Check className="w-3.5 h-3.5 text-[#34d399] shrink-0" />
                              ) : (
                                <Copy className="w-3.5 h-3.5 shrink-0 opacity-80" />
                              )}
                            </button>
                          ) : (
                            <div className="mt-1 text-[13px] sm:text-[13.5px] font-bold text-white">
                              —
                            </div>
                          )}
                        </motion.div>
                      ) : (
                        <motion.div
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ duration: 0.35, delay: 0.06 }}
                          className="p-3 sm:p-3.5 rounded-xl bg-white/[0.06] hover:bg-white/[0.1] backdrop-blur-md border border-white/[0.12] hover:-translate-y-0.5 transition-all duration-200"
                        >
                          <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-[0.08em] text-[#94a6bd] font-semibold">
                            <Tag className="w-3 h-3 text-[#38bdf8] shrink-0" />
                            <span className="truncate">{t.version}</span>
                          </div>
                          <div className="mt-1 text-[13px] sm:text-[13.5px] font-bold text-white truncate">
                            {game.version || 'Latest'}
                          </div>
                        </motion.div>
                      )}

                      <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.35, delay: 0.1 }}
                        className="p-3 sm:p-3.5 rounded-xl bg-white/[0.06] hover:bg-white/[0.1] backdrop-blur-md border border-white/[0.12] hover:-translate-y-0.5 transition-all duration-200"
                      >
                        <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-[0.08em] text-[#94a6bd] font-semibold">
                          <HardDrive className="w-3 h-3 text-[#94a6bd] shrink-0" />
                          <span className="truncate">{t.originalSize}</span>
                        </div>
                        <div className="mt-1 text-[13px] sm:text-[13.5px] font-bold text-[#e5e9f0] font-mono-tabular truncate">
                          {game.originalSize || '—'}
                        </div>
                      </motion.div>

                      <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.35, delay: 0.14 }}
                        className="p-3 sm:p-3.5 rounded-xl bg-[#1a9fff]/[0.1] hover:bg-[#1a9fff]/[0.16] backdrop-blur-md border border-[#38bdf8]/25 hover:-translate-y-0.5 transition-all duration-200"
                      >
                        <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-[0.08em] text-[#93c5fd] font-semibold">
                          <DownloadSimple className="w-3 h-3 text-[#38bdf8] shrink-0" />
                          <span className="truncate">
                            {isTools ? t.downloadSize : t.repackSize}
                          </span>
                        </div>
                        <div className="mt-1 text-[13px] sm:text-[14px] font-bold text-[#66c0f4] font-mono-tabular truncate">
                          {game.repackSize || '—'}
                        </div>
                      </motion.div>

                      <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.35, delay: 0.18 }}
                        className="p-3 sm:p-3.5 rounded-xl bg-white/[0.06] hover:bg-white/[0.1] backdrop-blur-md border border-white/[0.12] hover:-translate-y-0.5 transition-all duration-200"
                      >
                        <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-[0.08em] text-[#94a6bd] font-semibold">
                          <CloudArrowDown className="w-3 h-3 text-[#38bdf8] shrink-0" />
                          <span className="truncate">{t.downloadChannels}</span>
                        </div>
                        <div className="mt-1 text-[13px] sm:text-[13.5px] font-bold text-white font-mono-tabular truncate">
                          {groupedMirrors.length}{' '}
                          {groupedMirrors.length === 1 ? t.channelSingular : t.channelPlural}
                        </div>
                      </motion.div>

                      {canRunEvaluation && (
                        <motion.div
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ duration: 0.35, delay: 0.22 }}
                          className="col-span-2 sm:col-span-1 grid"
                        >
                          <CanRunItHeroBadge
                            evaluation={canRunEvaluation}
                            language={language}
                            onClick={() =>
                              requirementsSectionRef.current?.scrollIntoView({
                                behavior: 'smooth',
                                block: 'start',
                              })
                            }
                          />
                        </motion.div>
                      )}
                    </div>

                    {/* Modern Animated Hero Action Buttons */}
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.38, delay: 0.24 }}
                      className="pt-1 flex flex-wrap items-center gap-2.5 sm:gap-3"
                    >
                      <button
                        type="button"
                        onClick={() =>
                          downloadsSectionRef.current?.scrollIntoView({
                            behavior: 'smooth',
                            block: 'start',
                          })
                        }
                        className="group relative overflow-hidden inline-flex items-center gap-2 px-5 py-3 sm:px-6 sm:py-3.5 rounded-xl bg-[#0284c7] hover:bg-[#0ea5e9] dark:bg-[#1a9fff] dark:hover:bg-[#38adff] text-white text-[13px] sm:text-[14px] font-semibold shadow-[0_12px_30px_rgba(26,159,255,0.35)] hover:-translate-y-0.5 active:translate-y-0 transition-all duration-200 whitespace-nowrap cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#38bdf8]"
                      >
                        <span
                          aria-hidden="true"
                          className="absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-700 bg-gradient-to-r from-transparent via-white/25 to-transparent"
                        />
                        <DownloadSimple className="w-4 h-4 relative z-10 shrink-0" />
                        <span className="relative z-10">{t.downloadChannels}</span>
                      </button>

                      {(game.embedTrailerUrl || game.trailerUrl) && (
                        <button
                          type="button"
                          onClick={handleWatchTrailer}
                          className="inline-flex items-center gap-2 px-4 sm:px-5 py-3 sm:py-3.5 rounded-xl bg-white/[0.11] hover:bg-white/[0.2] backdrop-blur-md border border-white/[0.2] text-white text-[13px] sm:text-[14px] font-medium hover:-translate-y-0.5 transition-all duration-200 whitespace-nowrap cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70"
                        >
                          <Play weight="fill" className="w-4 h-4 text-[#66c0f4] fill-current shrink-0" />
                          <span>{t.watchTrailer}</span>
                        </button>
                      )}

                      {hasReqsTarget && (
                        <button
                          type="button"
                          onClick={() =>
                            requirementsSectionRef.current?.scrollIntoView({
                              behavior: 'smooth',
                              block: 'start',
                            })
                          }
                          className="inline-flex items-center gap-2 px-4 py-3 sm:py-3.5 rounded-xl bg-white/[0.06] hover:bg-white/[0.14] backdrop-blur-md border border-white/[0.14] text-[#dce8f5] hover:text-white text-[13px] sm:text-[14px] font-medium hover:-translate-y-0.5 transition-all duration-200 whitespace-nowrap cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/60"
                        >
                          <Cpu className="w-4 h-4 shrink-0" />
                          <span>{canRunEvaluation ? t.canRunItTitle : t.requirementsOnly}</span>
                        </button>
                      )}
                    </motion.div>
                  </motion.div>
                </div>
              </div>
            </section>
          );
        })()}

        {/* Main Body Content */}
        <div className="max-w-[1600px] mx-auto px-3 sm:px-6 lg:px-8 py-5 sm:py-7 lg:py-8 space-y-7 sm:space-y-8">
          {/* Telegram Community Banner (Tools / Architect pages only, above Release Details) */}
          {isTools && (
            <a
              href="https://t.me/secretarea1337"
              target="_blank"
              rel="noopener noreferrer"
              className="group flex items-center justify-between gap-4 px-4 sm:px-5 py-3.5 rounded-xl bg-sky-50 hover:bg-sky-100 border border-[#24a1de]/40 hover:border-[#24a1de]/75 dark:bg-[#0d1824] dark:hover:bg-[#112131] dark:border-[#24a1de]/30 dark:hover:border-[#24a1de]/65 transition-colors"
            >
              <div className="flex items-center gap-3.5 min-w-0">
                <span className="w-10 h-10 rounded-full bg-[#24a1de] text-white flex items-center justify-center shrink-0 shadow-md">
                  <svg
                    viewBox="0 0 24 24"
                    fill="currentColor"
                    aria-hidden="true"
                    className="w-5 h-5 -translate-x-[1px]"
                  >
                    <path d="M21.93 3.29a1.5 1.5 0 0 0-1.56-.21L2.74 10.1a1.45 1.45 0 0 0 .08 2.71l4.41 1.48 1.66 5.26a1.15 1.15 0 0 0 1.91.47l2.54-2.5 4.4 3.24a1.45 1.45 0 0 0 2.27-.87l3.01-14.92a1.5 1.5 0 0 0-.09-1.68ZM9.65 13.79l8.22-6.66-6.37 7.6-.47 3.1-1.38-4.04Z" />
                  </svg>
                </span>
                <div className="min-w-0">
                  <div className="text-[12px] font-medium text-slate-600 dark:text-[#8b9bb4] leading-tight">
                    Join our community
                  </div>
                  <div className="mt-0.5 text-[14.5px] sm:text-[15.5px] font-bold text-[#0284c7] group-hover:text-[#0369a1] dark:text-[#24a1de] dark:group-hover:text-[#4cc2ff] transition-colors truncate">
                    Get it on Telegram
                  </div>
                </div>
              </div>
              <ArrowSquareOut className="w-5 h-5 text-[#0284c7] group-hover:text-[#0369a1] dark:text-[#24a1de] dark:group-hover:text-[#4cc2ff] shrink-0 transition-colors" />
            </a>
          )}

          {/* Release Details Section (Seamless Unboxed Architectural Strip) */}
          <motion.section
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.36, delay: 0.08, ease: [0.16, 1, 0.3, 1] }}
            className="space-y-4 sm:space-y-5 pb-5 sm:pb-6 border-b border-slate-200/85 dark:border-white/[0.07]"
          >
            <div className="flex items-center gap-2.5 sm:gap-3">
              <Package className="w-4.5 h-4.5 text-[#0284c7] dark:text-[#38bdf8] shrink-0" />
              <h2 className="font-display text-[15px] sm:text-[16px] lg:text-[17px] font-bold tracking-tight text-slate-900 dark:text-white shrink-0">
                {t.releaseDetails}
              </h2>
              <div className="h-px flex-1 bg-slate-200 dark:bg-white/[0.08]" />
            </div>

            <dl className="grid grid-cols-1 min-[420px]:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-x-6 gap-y-5">
              {isSteamTools ? (
                <div className="flex items-start gap-3 min-w-0">
                  <Hash className="w-4 h-4 text-[#0284c7] dark:text-[#38bdf8] mt-0.5 shrink-0" />
                  <div className="min-w-0 flex-1 space-y-0.5">
                    <dt className="text-[11px] font-semibold uppercase tracking-[0.09em] text-slate-500 dark:text-[#8b9bb4]">
                      {t.gameId}
                    </dt>
                    <dd className="text-[13.5px] sm:text-[14px] font-semibold font-mono-tabular text-slate-900 dark:text-white">
                      {steamGameId ? (
                        <button
                          type="button"
                          onClick={handleCopyGameId}
                          title={t.gameId}
                          className="inline-flex items-center gap-1.5 text-[#0284c7] hover:text-slate-950 dark:text-[#38bdf8] dark:hover:text-white transition-colors cursor-pointer"
                        >
                          <span className="truncate">{steamGameId}</span>
                          {copiedGameId ? (
                            <Check className="w-3.5 h-3.5 text-emerald-600 dark:text-[#34d399] shrink-0" />
                          ) : (
                            <Copy className="w-3.5 h-3.5 opacity-75 shrink-0" />
                          )}
                        </button>
                      ) : (
                        '—'
                      )}
                    </dd>
                  </div>
                </div>
              ) : (
                <div className="flex items-start gap-3 min-w-0">
                  <Tag className="w-4 h-4 text-[#0284c7] dark:text-[#38bdf8] mt-0.5 shrink-0" />
                  <div className="min-w-0 flex-1 space-y-0.5">
                    <dt className="text-[11px] font-semibold uppercase tracking-[0.09em] text-slate-500 dark:text-[#8b9bb4]">
                      {t.version}
                    </dt>
                    <dd className="text-[13.5px] sm:text-[14px] font-semibold text-slate-900 dark:text-white break-words">
                      {game.version || '—'}
                    </dd>
                  </div>
                </div>
              )}

              <div className="flex items-start gap-3 min-w-0">
                <HardDrive className="w-4 h-4 text-slate-500 dark:text-[#94a6bd] mt-0.5 shrink-0" />
                <div className="min-w-0 flex-1 space-y-0.5">
                  <dt className="text-[11px] font-semibold uppercase tracking-[0.09em] text-slate-500 dark:text-[#8b9bb4]">
                    {t.originalSize}
                  </dt>
                  <dd className="text-[13.5px] sm:text-[14px] font-semibold font-mono-tabular text-slate-800 dark:text-[#e5e9f0]">
                    {game.originalSize || '—'}
                  </dd>
                </div>
              </div>

              <div className="flex items-start gap-3 min-w-0">
                <DownloadSimple className="w-4 h-4 text-[#0284c7] dark:text-[#38bdf8] mt-0.5 shrink-0" />
                <div className="min-w-0 flex-1 space-y-0.5">
                  <dt className="text-[11px] font-semibold uppercase tracking-[0.09em] text-slate-500 dark:text-[#8b9bb4]">
                    {isTools ? t.downloadSize : t.repackSize}
                  </dt>
                  <dd className="text-[13.5px] sm:text-[14px] font-bold font-mono-tabular text-[#0284c7] dark:text-[#66c0f4]">
                    {game.repackSize || '—'}
                  </dd>
                </div>
              </div>

              {isTools ? (
                <>
                  <div className="flex items-start gap-3 min-w-0">
                    <SealCheck
                      className={`w-4 h-4 mt-0.5 shrink-0 ${
                        game.isFree
                          ? 'text-emerald-600 dark:text-[#34d399]'
                          : 'text-[#0284c7] dark:text-[#38bdf8]'
                      }`}
                    />
                    <div className="min-w-0 flex-1 space-y-0.5">
                      <dt className="text-[11px] font-semibold uppercase tracking-[0.09em] text-slate-500 dark:text-[#8b9bb4]">
                        {t.license}
                      </dt>
                      <dd
                        className={`text-[13.5px] sm:text-[14px] font-semibold ${
                          game.isFree
                            ? 'text-emerald-700 dark:text-[#34d399]'
                            : 'text-slate-800 dark:text-[#e5e9f0]'
                        }`}
                      >
                        {game.isFree ? t.free : 'Full Package'}
                      </dd>
                    </div>
                  </div>

                  <div className="flex items-start gap-3 min-w-0">
                    <PushPin
                      className={`w-4 h-4 mt-0.5 shrink-0 ${
                        game.isPinned
                          ? 'text-amber-600 dark:text-amber-300'
                          : 'text-slate-400 dark:text-[#8b9bb4]'
                      }`}
                    />
                    <div className="min-w-0 flex-1 space-y-0.5">
                      <dt className="text-[11px] font-semibold uppercase tracking-[0.09em] text-slate-500 dark:text-[#8b9bb4]">
                        {t.pinned}
                      </dt>
                      <dd
                        className={`text-[13.5px] sm:text-[14px] font-semibold ${
                          game.isPinned
                            ? 'text-amber-700 dark:text-amber-300'
                            : 'text-slate-600 dark:text-[#9cb1c9]'
                        }`}
                      >
                        {game.isPinned ? t.pinned : t.standard}
                      </dd>
                    </div>
                  </div>

                  <div className="flex items-start gap-3 min-w-0">
                    <CalendarBlank className="w-4 h-4 text-[#0284c7] dark:text-[#38bdf8] mt-0.5 shrink-0" />
                    <div className="min-w-0 flex-1 space-y-0.5">
                      <dt className="text-[11px] font-semibold uppercase tracking-[0.09em] text-slate-500 dark:text-[#8b9bb4]">
                        {t.dateAdded}
                      </dt>
                      <dd className="text-[13.5px] sm:text-[14px] font-semibold font-mono-tabular text-slate-800 dark:text-[#e5e9f0]">
                        {(() => {
                          if (!game.dateAdded) return '—';
                          const parsed = new Date(game.dateAdded);
                          if (Number.isNaN(parsed.getTime())) return game.dateAdded;
                          return parsed.toLocaleDateString(tr.locale, {
                            year: 'numeric',
                            month: 'short',
                            day: 'numeric',
                          });
                        })()}
                      </dd>
                    </div>
                  </div>
                </>
              ) : (
                <>
                  <div className="flex items-start gap-3 min-w-0">
                    <UserCheck className="w-4 h-4 text-[#0284c7] dark:text-[#38bdf8] mt-0.5 shrink-0" />
                    <div className="min-w-0 flex-1 space-y-0.5">
                      <dt className="text-[11px] font-semibold uppercase tracking-[0.09em] text-slate-500 dark:text-[#8b9bb4]">
                        {t.repacker}
                      </dt>
                      <dd className="text-[13.5px] sm:text-[14px] font-semibold text-slate-800 dark:text-[#e5e9f0] break-words">
                        {game.repackBy || '—'}
                      </dd>
                    </div>
                  </div>

                  <div className="flex items-start gap-3 min-w-0">
                    <Globe className="w-4 h-4 text-[#0284c7] dark:text-[#38bdf8] mt-0.5 shrink-0" />
                    <div className="min-w-0 flex-1 space-y-0.5">
                      <dt className="text-[11px] font-semibold uppercase tracking-[0.09em] text-slate-500 dark:text-[#8b9bb4]">
                        {t.languages}
                      </dt>
                      <dd className="text-[13.5px] sm:text-[14px] font-semibold text-slate-800 dark:text-[#e5e9f0] break-words">
                        {game.languages || '—'}
                      </dd>
                    </div>
                  </div>

                  <div className="flex items-start gap-3 min-w-0">
                    <GameController className="w-4 h-4 text-[#0284c7] dark:text-[#38bdf8] mt-0.5 shrink-0" />
                    <div className="min-w-0 flex-1 space-y-0.5">
                      <dt className="text-[11px] font-semibold uppercase tracking-[0.09em] text-slate-500 dark:text-[#8b9bb4]">
                        {t.genres}
                      </dt>
                      <dd className="text-[13.5px] sm:text-[14px] font-semibold text-slate-800 dark:text-[#e5e9f0] break-words">
                        {game.genreList.join(' · ') || '—'}
                      </dd>
                    </div>
                  </div>
                </>
              )}
              <div className="flex items-start gap-3 min-w-0">
                <Buildings className="w-4 h-4 text-[#0284c7] dark:text-[#38bdf8] mt-0.5 shrink-0" />
                <div className="min-w-0 flex-1 space-y-0.5">
                  <dt className="text-[11px] font-semibold uppercase tracking-[0.09em] text-slate-500 dark:text-[#8b9bb4]">
                    {t.developerStudio}
                  </dt>
                  <dd className="text-[13.5px] sm:text-[14px] font-semibold text-slate-800 dark:text-[#e5e9f0] break-words">
                    {itemStudios.length > 0 ? (
                      <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1">
                        {itemStudios.map((studio) =>
                          onSelectStudio ? (
                            <button
                              key={studio.id}
                              type="button"
                              onClick={() => onSelectStudio(studio)}
                              className="inline-flex items-center gap-1 text-[#0284c7] hover:text-slate-950 dark:text-[#38bdf8] dark:hover:text-white underline decoration-[#0284c7]/35 dark:decoration-[#38bdf8]/40 underline-offset-2 transition-colors cursor-pointer text-start"
                            >
                              <span>{studio.name}</span>
                              <ArrowUpRight weight="bold" className="w-3.5 h-3.5 shrink-0 opacity-80" />
                            </button>
                          ) : (
                            <span key={studio.id}>{studio.name}</span>
                          )
                        )}
                      </div>
                    ) : (
                      '—'
                    )}
                  </dd>
                </div>
              </div>
            </dl>
          </motion.section>

          {/* Trailer & Gallery Media Showcase */}
          {(mediaSlides.length > 0 || game.trailerUrl) && (
            <motion.section
              ref={mediaSectionRef}
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.38, delay: 0.12, ease: [0.16, 1, 0.3, 1] }}
              className="space-y-4 pb-5 sm:pb-6 border-b border-slate-200/85 dark:border-white/[0.07]"
            >
              {/* Unboxed Header Row */}
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2.5 sm:gap-3 min-w-0 flex-1">
                  <FilmStrip className="w-4.5 h-4.5 text-[#0284c7] dark:text-[#38bdf8] shrink-0" />
                  <h2 className="font-display text-[15px] sm:text-[16px] lg:text-[17px] font-bold tracking-tight text-slate-900 dark:text-white shrink-0">
                    {t.trailerGallery}
                  </h2>
                  {mediaSlides.length > 1 && (
                    <span className="text-[12px] font-mono-tabular text-slate-500 dark:text-[#7f91a8] shrink-0">
                      {activeSlideIndex + 1} / {mediaSlides.length}
                    </span>
                  )}
                  <div className="h-px flex-1 bg-slate-200 dark:bg-white/[0.08] hidden sm:block" />
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  {trailerSlideIdx >= 0 && activeSlideIndex !== trailerSlideIdx && (
                    <button
                      type="button"
                      onClick={() => setActiveSlideIndex(trailerSlideIdx)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#0284c7]/10 hover:bg-[#0284c7]/20 dark:bg-[#38bdf8]/12 dark:hover:bg-[#38bdf8]/22 text-[12px] font-semibold text-[#0284c7] dark:text-[#38bdf8] transition-colors cursor-pointer whitespace-nowrap"
                    >
                      <Play weight="fill" className="w-3.5 h-3.5 fill-current shrink-0" />
                      <span>{t.switchToTrailer}</span>
                    </button>
                  )}
                  {game.trailerUrl && !game.embedTrailerUrl && (
                    <a
                      href={game.trailerUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#0284c7]/10 hover:bg-[#0284c7]/20 dark:bg-[#38bdf8]/12 dark:hover:bg-[#38bdf8]/22 text-[12px] font-semibold text-[#0284c7] dark:text-[#38bdf8] transition-colors whitespace-nowrap"
                    >
                      <Play weight="fill" className="w-3.5 h-3.5 fill-current shrink-0" />
                      <span>{t.openTrailer}</span>
                      <ArrowSquareOut className="w-3 h-3 shrink-0" />
                    </a>
                  )}
                  {mediaSlides.length > 1 && (
                    <div dir="ltr" className="hidden sm:inline-flex items-center gap-1.5">
                      <button
                        type="button"
                        aria-label="Previous media"
                        onClick={() =>
                          setActiveSlideIndex(
                            (prev) => (prev - 1 + mediaSlides.length) % mediaSlides.length
                          )
                        }
                        className="p-1.5 rounded-lg bg-slate-200 hover:bg-slate-300 border border-slate-300 text-slate-700 hover:text-slate-950 dark:bg-[#212a37] dark:hover:bg-[#2c3849] dark:border-white/[0.08] dark:text-[#c6d4df] dark:hover:text-white transition-colors cursor-pointer"
                      >
                        <CaretLeft weight="bold" className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        aria-label="Next media"
                        onClick={() =>
                          setActiveSlideIndex((prev) => (prev + 1) % mediaSlides.length)
                        }
                        className="p-1.5 rounded-lg bg-slate-200 hover:bg-slate-300 border border-slate-300 text-slate-700 hover:text-slate-950 dark:bg-[#212a37] dark:hover:bg-[#2c3849] dark:border-white/[0.08] dark:text-[#c6d4df] dark:hover:text-white transition-colors cursor-pointer"
                      >
                        <CaretRight weight="bold" className="w-4 h-4" />
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {mediaSlides.length > 0 && (
                <div
                  className={`grid grid-cols-1 gap-3.5 sm:gap-4 items-start ${
                    mediaSlides.length > 1 ? 'lg:grid-cols-12' : ''
                  }`}
                >
                  {/* Primary 16:9 Cinema Stage */}
                  <div
                    dir="ltr"
                    className={`${
                      mediaSlides.length > 1 ? 'lg:col-span-9' : ''
                    } relative aspect-video bg-[#080c12] rounded-2xl overflow-hidden border border-slate-300/80 dark:border-white/[0.1] shadow-lg dark:shadow-[0_20px_50px_rgba(0,0,0,0.45)] group`}
                  >
                    <AnimatePresence mode="wait">
                      <motion.div
                        key={`media-stage-${activeSlide?.kind}-${activeSlideIndex}`}
                        initial={{ opacity: 0.35, scale: 1.01 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0.3 }}
                        transition={{ duration: 0.24, ease: [0.16, 1, 0.3, 1] }}
                        className="w-full h-full"
                      >
                        {activeSlide?.kind === 'trailer' && (
                          <iframe
                            src={activeSlide.url}
                            title={`${game.name} Trailer`}
                            referrerPolicy="strict-origin-when-cross-origin"
                            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                            allowFullScreen
                            className="w-full h-full border-0"
                          />
                        )}
                        {activeSlide?.kind === 'video' && (
                          <video
                            src={activeSlide.url}
                            autoPlay
                            controls
                            muted
                            loop
                            playsInline
                            className="w-full h-full object-contain bg-black"
                          />
                        )}
                        {activeSlide?.kind === 'image' && (
                          <img
                            src={activeSlide.url}
                            alt={`${game.name} screenshot`}
                            referrerPolicy="no-referrer"
                            onClick={() => setLightboxImageUrl(activeSlide.url)}
                            className="w-full h-full object-cover cursor-zoom-in"
                          />
                        )}
                      </motion.div>
                    </AnimatePresence>

                    {activeSlide?.kind === 'image' && (
                      <button
                        type="button"
                        onClick={() => setLightboxImageUrl(activeSlide.url)}
                        aria-label="Expand screenshot"
                        className="absolute top-3 right-3 w-9 h-9 rounded-xl bg-black/55 hover:bg-black/80 backdrop-blur-md border border-white/[0.18] text-white flex items-center justify-center opacity-85 lg:opacity-0 lg:group-hover:opacity-100 transition-opacity duration-200 cursor-pointer"
                      >
                        <CornersOut className="w-4 h-4" />
                      </button>
                    )}

                    {mediaSlides.length > 1 && (
                      <>
                        <button
                          type="button"
                          aria-label="Previous media"
                          onClick={() =>
                            setActiveSlideIndex(
                              (prev) => (prev - 1 + mediaSlides.length) % mediaSlides.length
                            )
                          }
                          className="absolute left-3 top-1/2 -translate-y-1/2 w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-black/55 hover:bg-black/80 backdrop-blur-md text-white border border-white/[0.16] flex items-center justify-center opacity-90 lg:opacity-0 lg:group-hover:opacity-100 transition-opacity duration-200 cursor-pointer"
                        >
                          <CaretLeft weight="bold" className="w-4 h-4 sm:w-5 sm:h-5" />
                        </button>
                        <button
                          type="button"
                          aria-label="Next media"
                          onClick={() =>
                            setActiveSlideIndex((prev) => (prev + 1) % mediaSlides.length)
                          }
                          className="absolute right-3 top-1/2 -translate-y-1/2 w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-black/55 hover:bg-black/80 backdrop-blur-md text-white border border-white/[0.16] flex items-center justify-center opacity-90 lg:opacity-0 lg:group-hover:opacity-100 transition-opacity duration-200 cursor-pointer"
                        >
                          <CaretRight weight="bold" className="w-4 h-4 sm:w-5 sm:h-5" />
                        </button>
                      </>
                    )}
                  </div>

                  {/* Responsive Thumbnail Strip: Horizontal scroll on < lg, Vertical rail on lg+ */}
                  {mediaSlides.length > 1 && (
                    <div
                      dir="ltr"
                      className="lg:col-span-3 no-scrollbar flex lg:flex-col gap-2.5 overflow-x-auto lg:overflow-y-auto lg:max-h-[460px] xl:max-h-[540px] pb-1 lg:pb-0 lg:pe-1 snap-x snap-mandatory lg:snap-none"
                    >
                      {mediaSlides.map((slide, idx) => {
                        const active = idx === activeSlideIndex;
                        return (
                          <button
                            key={`${slide.kind}-${idx}`}
                            type="button"
                            onClick={() => setActiveSlideIndex(idx)}
                            aria-label={`View media ${idx + 1}`}
                            className={`group relative snap-start w-32 sm:w-40 lg:w-full aspect-video rounded-xl overflow-hidden shrink-0 border transition-all duration-200 cursor-pointer bg-slate-200 dark:bg-[#0f141c] ${
                              active
                                ? 'border-[#0284c7] dark:border-[#38bdf8] ring-2 ring-[#0284c7]/35 dark:ring-[#38bdf8]/40 opacity-100 shadow-md'
                                : 'border-slate-300/80 dark:border-white/[0.08] opacity-70 hover:opacity-100 hover:border-slate-400 dark:hover:border-white/[0.24]'
                            }`}
                          >
                            {slide.kind === 'image' ? (
                              <img
                                src={slide.url}
                                alt=""
                                referrerPolicy="no-referrer"
                                className="w-full h-full object-cover group-hover:scale-[1.04] transition-transform duration-300"
                              />
                            ) : (
                              <div className="relative w-full h-full flex flex-col items-center justify-center gap-1.5 bg-[#0d141f] text-white overflow-hidden">
                                {heroBackdrop && (
                                  <img
                                    src={heroBackdrop}
                                    alt=""
                                    aria-hidden="true"
                                    referrerPolicy="no-referrer"
                                    className="absolute inset-0 w-full h-full object-cover opacity-35 blur-[1px]"
                                  />
                                )}
                                <span className="relative z-10 w-8 h-8 rounded-full bg-[#0284c7]/90 dark:bg-[#1a9fff]/90 text-white flex items-center justify-center shadow-md group-hover:scale-105 transition-transform">
                                  <Play weight="fill" className="w-3.5 h-3.5 fill-current translate-x-[0.5px]" />
                                </span>
                                <span className="relative z-10 text-[10px] font-semibold uppercase tracking-wider text-white/95 drop-shadow">
                                  {slide.kind === 'trailer' ? 'Official Trailer' : 'Gameplay Clip'}
                                </span>
                              </div>
                            )}

                            <span
                              className={`absolute bottom-1.5 right-1.5 px-1.5 py-0.5 rounded-md text-[10px] font-mono-tabular font-semibold leading-none backdrop-blur-sm ${
                                active
                                  ? 'bg-[#0284c7] text-white'
                                  : 'bg-black/60 text-white/85'
                              }`}
                            >
                              {idx + 1}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}
            </motion.section>
          )}

          {/* Description, Download Channels, Requirements, Steps & Tools */}
          <div
            className={`grid grid-cols-1 gap-6 lg:gap-8 ${
              hasSecondarySidebar ? 'lg:grid-cols-3' : ''
            }`}
          >
            <div className={`${hasSecondarySidebar ? 'lg:col-span-2' : ''} space-y-6 sm:space-y-7`}>
              {/* Description (Seamless Editorial Section) */}
              <motion.section
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.36, delay: 0.14, ease: [0.16, 1, 0.3, 1] }}
                className="space-y-3.5 pb-5 sm:pb-6 border-b border-slate-200/85 dark:border-white/[0.07]"
              >
                <div className="flex items-center gap-2.5 sm:gap-3">
                  <FileText className="w-4.5 h-4.5 text-[#0284c7] dark:text-[#38bdf8] shrink-0" />
                  <h2 className="font-display text-[15px] sm:text-[16px] lg:text-[17px] font-bold tracking-tight text-slate-900 dark:text-white shrink-0">
                    {t.description}
                  </h2>
                  <div className="h-px flex-1 bg-slate-200 dark:bg-white/[0.08]" />
                </div>
                <p className="text-[14px] sm:text-[15px] leading-[1.7] text-slate-700 dark:text-[#d4dde7] whitespace-pre-line max-w-4xl">
                  {game.description || t.noDescription}
                </p>
              </motion.section>

              {/* System Requirements + Can Run It? Hardware Comparison */}
              <motion.section
                ref={requirementsSectionRef}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.36, delay: 0.16, ease: [0.16, 1, 0.3, 1] }}
                className="space-y-4 sm:space-y-5 pb-5 sm:pb-6 border-b border-slate-200/85 dark:border-white/[0.07]"
              >
                <div className="flex items-center gap-2.5 sm:gap-3">
                  <SlidersHorizontal className="w-4.5 h-4.5 text-[#0284c7] dark:text-[#38bdf8] shrink-0" />
                  <h2 className="font-display text-[15px] sm:text-[16px] lg:text-[17px] font-bold tracking-tight text-slate-900 dark:text-white shrink-0">
                    {canRunItEnabled ? t.requirementsAndCanRun : t.requirementsOnly}
                  </h2>
                  <div className="h-px flex-1 bg-slate-200 dark:bg-white/[0.08]" />
                </div>

                {canRunItEnabled && canRunEvaluation && systemSpecs && (
                  <CanRunItPanel
                    evaluation={canRunEvaluation}
                    specs={systemSpecs}
                    language={language}
                    isRefreshingSpecs={isRefreshingSpecs}
                    onRefreshAutoSpecs={onRefreshSpecs}
                    onSaveCustomSpecs={onSaveCustomSpecs}
                    onResetCustomSpecs={onResetCustomSpecs}
                  />
                )}

                {hasStructuredReqs ? (
                  <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-5 pt-1">
                    {os && (
                      <motion.div
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.28, delay: 0.04 }}
                        className="flex items-start gap-3.5 min-w-0"
                      >
                        <Monitor className="w-5 h-5 text-[#0284c7] dark:text-[#38bdf8] mt-0.5 shrink-0" />
                        <div className="min-w-0 flex-1 space-y-1">
                          <dt className="text-[11px] font-semibold uppercase tracking-[0.09em] text-slate-500 dark:text-[#8b9bb4]">
                            {t.osLabel}
                          </dt>
                          <dd className="text-[13.5px] sm:text-[14px] font-medium text-slate-800 dark:text-[#dce4ee] leading-relaxed break-words">
                            {os}
                          </dd>
                        </div>
                      </motion.div>
                    )}
                    {ram && (
                      <motion.div
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.28, delay: 0.08 }}
                        className="flex items-start gap-3.5 min-w-0"
                      >
                        <Memory className="w-5 h-5 text-[#0284c7] dark:text-[#38bdf8] mt-0.5 shrink-0" />
                        <div className="min-w-0 flex-1 space-y-1">
                          <dt className="text-[11px] font-semibold uppercase tracking-[0.09em] text-slate-500 dark:text-[#8b9bb4]">
                            {t.ramLabel}
                          </dt>
                          <dd className="text-[13.5px] sm:text-[14px] font-medium text-slate-800 dark:text-[#dce4ee] leading-relaxed break-words">
                            {ram}
                          </dd>
                        </div>
                      </motion.div>
                    )}
                    {cpu && (
                      <motion.div
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.28, delay: 0.12 }}
                        className="flex items-start gap-3.5 min-w-0"
                      >
                        <Cpu className="w-5 h-5 text-[#0284c7] dark:text-[#38bdf8] mt-0.5 shrink-0" />
                        <div className="min-w-0 flex-1 space-y-1">
                          <dt className="text-[11px] font-semibold uppercase tracking-[0.09em] text-slate-500 dark:text-[#8b9bb4]">
                            {t.cpuLabel}
                          </dt>
                          <dd className="text-[13.5px] sm:text-[14px] font-medium text-slate-800 dark:text-[#dce4ee] leading-relaxed break-words">
                            {cpu}
                          </dd>
                        </div>
                      </motion.div>
                    )}
                    {gpu && (
                      <motion.div
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.28, delay: 0.16 }}
                        className="flex items-start gap-3.5 min-w-0"
                      >
                        <GraphicsCard className="w-5 h-5 text-[#0284c7] dark:text-[#38bdf8] mt-0.5 shrink-0" />
                        <div className="min-w-0 flex-1 space-y-1">
                          <dt className="text-[11px] font-semibold uppercase tracking-[0.09em] text-slate-500 dark:text-[#8b9bb4]">
                            {t.gpuLabel}
                          </dt>
                          <dd className="text-[13.5px] sm:text-[14px] font-medium text-slate-800 dark:text-[#dce4ee] leading-relaxed break-words">
                            {gpu}
                          </dd>
                        </div>
                      </motion.div>
                    )}
                  </dl>
                ) : (
                  <div className="flex items-start gap-3.5 text-[13.5px] sm:text-[14px] text-slate-700 dark:text-[#c6d4df] leading-relaxed">
                    <HardDrive className="w-5 h-5 text-[#0284c7] dark:text-[#38bdf8] mt-0.5 shrink-0" />
                    <div className="min-w-0 flex-1 whitespace-pre-line">
                      {raw || t.noReqsListed}
                    </div>
                  </div>
                )}
              </motion.section>

              {/* Steps & Tools (Steps placed directly ABOVE Tools) */}
              {(game.parsedSteps.length > 0 ||
                game.parsedTools.length > 0 ||
                rawToolsFallback) && (
                <div className="space-y-6 sm:space-y-7">
                  {/* Interactive Installation Steps Timeline */}
                  {game.parsedSteps.length > 0 && (
                    <motion.section
                      initial={{ opacity: 0, y: 12 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.36, delay: 0.18, ease: [0.16, 1, 0.3, 1] }}
                      className="space-y-4 pb-5 sm:pb-6 border-b border-slate-200/85 dark:border-white/[0.07]"
                    >
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex items-center gap-2.5 sm:gap-3 min-w-0 flex-1">
                          <ListChecks className="w-4.5 h-4.5 text-[#0284c7] dark:text-[#38bdf8] shrink-0" />
                          <h2 className="font-display text-[15px] sm:text-[16px] lg:text-[17px] font-bold tracking-tight text-slate-900 dark:text-white shrink-0">
                            {t.steps}
                          </h2>
                          <div className="h-px flex-1 bg-slate-200 dark:bg-white/[0.08]" />
                        </div>
                        <span className="text-[12px] font-mono-tabular font-medium text-slate-500 dark:text-[#8b9bb4] shrink-0">
                          {checkedSteps.size}/{game.parsedSteps.length} {t.completed}
                        </span>
                      </div>

                      {/* Animated Progress Bar */}
                      <div className="h-1.5 w-full rounded-full bg-slate-200 dark:bg-white/[0.08] overflow-hidden">
                        <motion.div
                          className="h-full rounded-full bg-gradient-to-r from-[#0284c7] to-[#38bdf8]"
                          initial={{ width: 0 }}
                          animate={{ width: `${completedRatio}%` }}
                          transition={{ duration: 0.32, ease: [0.16, 1, 0.3, 1] }}
                        />
                      </div>

                      <ol className="relative space-y-1.5 pt-1">
                        {game.parsedSteps.map((step, i) => {
                          const isDone = checkedSteps.has(i);
                          const isLast = i === game.parsedSteps.length - 1;
                          return (
                            <motion.li
                              key={`${game.id}-step-${i}`}
                              role="checkbox"
                              aria-checked={isDone}
                              tabIndex={0}
                              initial={{ opacity: 0, x: -10 }}
                              animate={{ opacity: 1, x: 0 }}
                              transition={{
                                duration: 0.28,
                                delay: Math.min(i * 0.05, 0.35),
                                ease: [0.16, 1, 0.3, 1],
                              }}
                              whileHover={{ x: 3 }}
                              onClick={() => toggleStepDone(i)}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter' || e.key === ' ') {
                                  e.preventDefault();
                                  toggleStepDone(i);
                                }
                              }}
                              className={`group relative py-2.5 px-3 -mx-2 rounded-xl transition-colors cursor-pointer flex items-start gap-3.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0284c7] dark:focus-visible:ring-[#38bdf8] ${
                                isDone
                                  ? 'bg-sky-500/[0.07] dark:bg-[#38bdf8]/[0.08]'
                                  : 'hover:bg-slate-200/55 dark:hover:bg-white/[0.04]'
                              }`}
                            >
                              {!isLast && (
                                <span
                                  aria-hidden="true"
                                  className="absolute start-[24px] top-10 bottom-[-10px] w-px bg-slate-200 dark:bg-white/[0.1] pointer-events-none"
                                />
                              )}

                              <motion.span
                                animate={{ scale: isDone ? [1, 1.16, 1] : 1 }}
                                transition={{ duration: 0.25 }}
                                className={`w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-bold font-mono-tabular shrink-0 mt-0.5 transition-colors ${
                                  isDone
                                    ? 'bg-[#0284c7] dark:bg-[#1a9fff] text-white shadow-sm'
                                    : 'bg-slate-100 text-[#0284c7] border border-slate-300 group-hover:border-[#0284c7]/60 dark:bg-[#1f2937] dark:text-[#38bdf8] dark:border-white/[0.14] dark:group-hover:border-[#38bdf8]/60'
                                }`}
                              >
                                {isDone ? <Check className="w-3.5 h-3.5" /> : i + 1}
                              </motion.span>

                              <span
                                className={`text-[13.5px] sm:text-[14px] leading-relaxed transition-colors ${
                                  isDone
                                    ? 'text-slate-900 font-medium dark:text-white'
                                    : 'text-slate-700 dark:text-[#d4dde7]'
                                }`}
                              >
                                {step}
                              </span>
                            </motion.li>
                          );
                        })}
                      </ol>
                    </motion.section>
                  )}

                  {/* Required Tools & Utilities (Directly Below Steps) */}
                  {(game.parsedTools.length > 0 || rawToolsFallback) && (
                    <motion.section
                      initial={{ opacity: 0, y: 12 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.36, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
                      className="space-y-4 pb-5 sm:pb-6 border-b border-slate-200/85 dark:border-white/[0.07]"
                    >
                      <div className="flex items-center gap-2.5 sm:gap-3">
                        <Wrench className="w-4.5 h-4.5 text-[#0284c7] dark:text-[#38bdf8] shrink-0" />
                        <h2 className="font-display text-[15px] sm:text-[16px] lg:text-[17px] font-bold tracking-tight text-slate-900 dark:text-white shrink-0">
                          {t.tools}
                        </h2>
                        {game.parsedTools.length > 0 && (
                          <span className="text-[12px] font-mono-tabular text-slate-500 dark:text-[#7f91a8] shrink-0">
                            {game.parsedTools.length}
                          </span>
                        )}
                        <div className="h-px flex-1 bg-slate-200 dark:bg-white/[0.08]" />
                      </div>

                      {game.parsedTools.length > 0 ? (
                        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-2 sm:gap-3">
                          {game.parsedTools
                            .filter((tool) => /^https?:\/\//i.test((tool.url || '').trim()))
                            .map((tool, i) => (
                            <motion.a
                              key={`${tool.name}-${i}`}
                              href={tool.url.trim()}
                              target="_blank"
                              rel="noopener noreferrer"
                              initial={{ opacity: 0, y: 8 }}
                              animate={{ opacity: 1, y: 0 }}
                              transition={{ duration: 0.26, delay: Math.min(i * 0.04, 0.24) }}
                              className="group flex items-center justify-between gap-3 py-2.5 px-3 -mx-1 rounded-xl hover:bg-slate-200/65 dark:hover:bg-white/[0.05] text-[#0284c7] hover:text-slate-950 dark:text-[#66c0f4] dark:hover:text-white transition-all duration-200"
                            >
                              <span className="flex items-center gap-2.5 min-w-0">
                                <Wrench className="w-4 h-4 shrink-0 opacity-85 group-hover:rotate-[-12deg] transition-transform duration-200" />
                                <span className="text-[13.5px] font-semibold truncate">
                                  {tool.name}
                                </span>
                              </span>
                              <ArrowUpRight className="w-4 h-4 text-slate-400 group-hover:text-[#0284c7] dark:text-[#7f91a8] dark:group-hover:text-[#38bdf8] group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-all duration-200 shrink-0" />
                            </motion.a>
                          ))}
                        </div>
                      ) : (
                        <div className="flex items-start gap-3 text-[13.5px] sm:text-[14px] text-slate-700 dark:text-[#c6d4df] leading-relaxed">
                          <Wrench className="w-4.5 h-4.5 text-[#0284c7] dark:text-[#38bdf8] shrink-0 mt-0.5" />
                          <p className="whitespace-pre-line">{rawToolsFallback}</p>
                        </div>
                      )}
                    </motion.section>
                  )}
                </div>
              )}
            </div>

            {/* Optional Right Sidebar for Linked Items */}
            {hasSecondarySidebar && (
              <aside className="space-y-4">
                {linkedCatalogItems.length > 0 && onJumpToItem && (
                  <div className="p-4 rounded bg-white border border-slate-200 shadow-sm dark:shadow-none dark:bg-[#12171f] dark:border-white/[0.06] space-y-2.5">
                    <h2 className="text-[12px] font-bold tracking-[0.08em] uppercase text-[#0284c7] dark:text-[#66c0f4]">
                      {t.linkedEntries} ({linkedCatalogItems.length})
                    </h2>
                    <div className="space-y-1.5 max-h-60 overflow-y-auto">
                      {linkedCatalogItems.map((linked) => (
                        <button
                          key={`${linked.tab}-${linked.id}`}
                          type="button"
                          onClick={() => onJumpToItem(linked)}
                          className="w-full p-2 rounded bg-slate-50 hover:bg-slate-100 border border-slate-200 dark:bg-[#1a222d] dark:hover:bg-[#243040] dark:border-white/[0.06] flex items-center gap-2.5 text-start transition-colors cursor-pointer"
                        >
                          <div className="w-7 h-9 rounded-[2px] overflow-hidden bg-slate-200 dark:bg-[#0b0e14] shrink-0">
                            <GameCover src={linked.coverImage} alt={linked.name} compact />
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="text-[12px] font-semibold text-slate-900 dark:text-white truncate">
                              {linked.name}
                            </div>
                            <div className="text-[10.5px] text-[#0284c7] dark:text-[#66c0f4] font-mono-tabular uppercase">
                              {linked.tab} {linked.repackSize ? `· ${linked.repackSize}` : ''}
                            </div>
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </aside>
            )}
          </div>

          {/* What is a Hypervisor Bypass? Section (Hypervisor pages only, directly above Download Channels) */}
          {game.tab === 'hypervisor' && (
            <section className="p-5 rounded bg-rose-50 border border-rose-300 dark:bg-[#1d1418] dark:border-[#dc2626]/45 space-y-2.5">
              <div className="flex items-center gap-2">
                <ShieldWarning className="w-4 h-4 text-rose-600 dark:text-[#f87171] shrink-0" />
                <h2 className="text-[13px] font-bold tracking-[0.08em] uppercase text-rose-800 dark:text-[#fca5a5]">
                  {t.hvWarningTitle}
                </h2>
              </div>
              <p className="text-[13.5px] text-slate-800 dark:text-[#e5e9f0] leading-relaxed">
                {t.hvWarningBody}
              </p>
              <div>
                <button
                  type="button"
                  onClick={() => setIsHvGuideOpen(true)}
                  className="inline-flex items-center gap-2 text-[13.5px] font-semibold text-[#0284c7] hover:text-slate-900 dark:text-[#66c0f4] dark:hover:text-white underline underline-offset-4 break-all text-start cursor-pointer"
                >
                  <span>https://fitgirl-repacks.site/hypervisor-guide/</span>
                  <ArrowSquareOut className="w-3.5 h-3.5 shrink-0" />
                </button>
              </div>
            </section>
          )}

          {/* SteamTools Denuvo & Launcher Notices (Directly Above Download Channels) */}
          {isSteamTools && (hasDenuvo || hasExternalLauncher) && (
            <section className="space-y-3" aria-label="DRM and launcher compatibility warnings">
              {hasDenuvo && (
                <div className="p-4 sm:p-5 rounded bg-rose-50 border border-rose-300 dark:bg-[#2a161b] dark:border-[#ef4444]/60 flex items-start gap-3">
                  <Warning className="w-5 h-5 text-rose-600 dark:text-[#f87171] shrink-0 mt-0.5" />
                  <p className="text-[13px] sm:text-[13.5px] leading-relaxed text-slate-800 dark:text-[#e5e9f0]">
                    <strong className="text-rose-950 dark:text-white">Denuvo DRM Detected:</strong>{' '}
                    This game uses Denuvo Anti-Tampering DRM. There is currently no known public bypass for Denuvo, meaning you likely will NOT be able to play this game. However, there&apos;s a slight chance it might be available in the{' '}
                    <a
                      href="https://depotbox.lol/"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-700 hover:text-blue-900 dark:text-[#60a5fa] dark:hover:text-white underline underline-offset-2 font-semibold"
                    >
                      DepotBox Launcher
                    </a>{' '}
                    with a bypass. Download at your own risk.
                  </p>
                </div>
              )}

              {hasExternalLauncher && (
                <div className="p-4 sm:p-5 rounded bg-amber-50 border border-amber-300 dark:bg-[#262216] dark:border-[#eab308]/60 flex items-start gap-3">
                  <UserCheck className="w-5 h-5 text-amber-600 dark:text-[#facc15] shrink-0 mt-0.5" />
                  <p className="text-[13px] sm:text-[13.5px] leading-relaxed text-slate-800 dark:text-[#e5e9f0]">
                    <strong className="text-amber-950 dark:text-white">Third-Party Account/Launcher Required:</strong>{' '}
                    This game requires an external launcher or account verification.
                    {hasDenuvo
                      ? ' As this game also has Denuvo, it might be impossible to play in any case. Download at your own risk.'
                      : ' Please make sure you have the required third-party launcher or account setup before launching.'}
                  </p>
                </div>
              )}
            </section>
          )}

          {/* Download Channels Section (Distinct Interactive Boxed Hub Directly Above Recommended For You) */}
          <motion.section
            ref={downloadsSectionRef}
            id="download-channels"
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.38, delay: 0.22, ease: [0.16, 1, 0.3, 1] }}
            className="sa-ps5-panel relative rounded-2xl p-4 sm:p-6 lg:p-7 bg-white/95 dark:bg-[#0f1621]/95 border border-slate-200/90 dark:border-white/[0.1] shadow-[0_14px_42px_rgba(15,23,42,0.06)] dark:shadow-[0_24px_60px_rgba(0,0,0,0.45)] space-y-5 overflow-hidden"
          >
            {/* Subtle Top Accent Beam */}
            <div
              aria-hidden="true"
              className="pointer-events-none absolute inset-x-0 top-0 h-[2px] bg-gradient-to-r from-[#0284c7] via-[#38bdf8] to-transparent dark:from-[#1a9fff] dark:via-[#38bdf8] dark:to-transparent"
            />

            {/* Box Header + Channel Metrics */}
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-xl bg-sky-50 border border-sky-200/90 dark:bg-[#1a9fff]/12 dark:border-[#1a9fff]/30 flex items-center justify-center shrink-0">
                  <CloudArrowDown className="w-5 h-5 text-[#0284c7] dark:text-[#38bdf8]" />
                </div>
                <div className="min-w-0">
                  <h2 className="font-display text-[16px] sm:text-[18px] lg:text-[19px] font-bold tracking-tight text-slate-900 dark:text-white leading-tight">
                    {t.downloadChannels}
                  </h2>
                  <div className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[12px] text-slate-500 dark:text-[#8b9bb4] font-mono-tabular">
                    <span>
                      {groupedMirrors.length}{' '}
                      {groupedMirrors.length === 1 ? t.channelSingular : t.channelPlural}
                    </span>
                    <span aria-hidden="true" className="text-slate-300 dark:text-white/20">
                      ·
                    </span>
                    <span>
                      {totalMirrorLinks} {totalMirrorLinks === 1 ? 'link' : 'links'}
                    </span>
                  </div>
                </div>
              </div>

              {isTools && (game.isPinned || game.isFree) && (
                <div className="flex flex-wrap items-center gap-3 text-[11.5px] font-bold uppercase tracking-[0.07em]">
                  {game.isPinned && (
                    <span className="inline-flex items-center gap-1.5 text-amber-700 dark:text-amber-300">
                      <PushPin className="w-3.5 h-3.5" />
                      <span>{t.pinned}</span>
                    </span>
                  )}
                  {game.isFree && (
                    <span className="inline-flex items-center gap-1.5 text-emerald-700 dark:text-emerald-300">
                      <SealCheck className="w-3.5 h-3.5" />
                      <span>{t.free}</span>
                    </span>
                  )}
                </div>
              )}
            </div>

            {/* Interactive Channel Filter Tabs (visible when > 1 channel exists) */}
            {groupedMirrors.length > 1 && (
              <div
                role="tablist"
                aria-label={t.downloadChannels}
                className="no-scrollbar flex items-center gap-1.5 overflow-x-auto pb-1 -mx-1 px-1"
              >
                <button
                  type="button"
                  role="tab"
                  aria-selected={activeChannelFilter === 'all'}
                  onClick={() => setActiveChannelFilter('all')}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[12px] font-semibold whitespace-nowrap transition-all duration-200 cursor-pointer shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0284c7] dark:focus-visible:ring-[#38bdf8] ${
                    activeChannelFilter === 'all'
                      ? 'bg-[#0284c7] dark:bg-[#1a9fff] text-white shadow-[0_6px_16px_rgba(2,132,199,0.28)]'
                      : 'bg-slate-100 hover:bg-slate-200/85 text-slate-700 border border-slate-200/80 dark:bg-white/[0.05] dark:hover:bg-white/[0.1] dark:text-[#b8c6d8] dark:border-white/[0.07]'
                  }`}
                >
                  <Stack className="w-3.5 h-3.5 shrink-0" />
                  <span>{tr.studios?.all ?? 'All'}</span>
                  <span
                    className={`font-mono-tabular text-[11px] ${
                      activeChannelFilter === 'all'
                        ? 'text-white/85'
                        : 'text-slate-500 dark:text-[#7f91a8]'
                    }`}
                  >
                    {totalMirrorLinks}
                  </span>
                </button>

                {groupedMirrors.map(({ groupName, links }) => {
                  const isActive = activeChannelFilter === groupName;
                  const TabIcon =
                    groupName === 'Magnet Link'
                      ? Magnet
                      : groupName === 'MediaFire (Direct Link)'
                      ? Lightning
                      : groupName === 'Mega (Backup)'
                      ? Archive
                      : groupName === 'Full Download'
                      ? CloudArrowDown
                      : groupName === 'Unlockers' || groupName === 'Resources'
                      ? Key
                      : groupName === 'Direct Mirrors' || groupName === 'Anker'
                      ? LinkSimple
                      : HardDrives;
                  return (
                    <button
                      key={`tab-${groupName}`}
                      type="button"
                      role="tab"
                      aria-selected={isActive}
                      onClick={() => setActiveChannelFilter(groupName)}
                      className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[12px] font-semibold whitespace-nowrap transition-all duration-200 cursor-pointer shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0284c7] dark:focus-visible:ring-[#38bdf8] ${
                        isActive
                          ? 'bg-[#0284c7] dark:bg-[#1a9fff] text-white shadow-[0_6px_16px_rgba(2,132,199,0.28)]'
                          : 'bg-slate-100 hover:bg-slate-200/85 text-slate-700 border border-slate-200/80 dark:bg-white/[0.05] dark:hover:bg-white/[0.1] dark:text-[#b8c6d8] dark:border-white/[0.07]'
                      }`}
                    >
                      <TabIcon className="w-3.5 h-3.5 shrink-0" />
                      <span>{groupName}</span>
                      <span
                        className={`font-mono-tabular text-[11px] ${
                          isActive
                            ? 'text-white/85'
                            : 'text-slate-500 dark:text-[#7f91a8]'
                        }`}
                      >
                        {links.length}
                      </span>
                    </button>
                  );
                })}
              </div>
            )}

            {/* Inline Active / Recent Downloads for This Title */}
            {(() => {
              const mirrorUrlSet = new Set(game.mirrors.map((m) => m.url));
              const titleTasks = downloadTasks.filter(
                (task) => task.gameId === game.id || mirrorUrlSet.has(task.url)
              );
              if (titleTasks.length === 0) return null;
              const dlText = tr.downloads;

              return (
                <div className="rounded-xl p-3.5 sm:p-4 bg-sky-50/75 dark:bg-[#111c2b] border border-sky-200 dark:border-[#1a9fff]/30 space-y-2.5">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="text-[12.5px] font-bold text-slate-900 dark:text-white flex items-center gap-2">
                      <DownloadSimple className="w-4 h-4 text-[#0284c7] dark:text-[#38bdf8]" />
                      <span>{dlText.detailActiveTitle}</span>
                    </span>
                    {onOpenDownloadsTab && (
                      <button
                        type="button"
                        onClick={() => {
                          onClose();
                          onOpenDownloadsTab();
                        }}
                        className="text-[12px] font-semibold text-[#0284c7] dark:text-[#38bdf8] hover:underline cursor-pointer"
                      >
                        {dlText.detailManageBtn}
                      </button>
                    )}
                  </div>

                  <div className="space-y-2">
                    {titleTasks.slice(0, 4).map((task) => {
                      const pct = Math.max(0, Math.min(100, task.progress || 0));
                      const isActive =
                        task.status === 'downloading' ||
                        task.status === 'resolving' ||
                        task.status === 'queued';
                      const isPaused = task.status === 'paused';
                      const isCompleted = task.status === 'completed';

                      return (
                        <div
                          key={task.id}
                          className="p-2.5 sm:p-3 rounded-lg bg-white dark:bg-[#162130] border border-slate-200 dark:border-white/[0.08] space-y-2"
                        >
                          <div className="flex flex-wrap items-center justify-between gap-2 text-[12px]">
                            <span className="font-semibold text-slate-900 dark:text-white truncate max-w-[260px] sm:max-w-md">
                              {task.fileName || task.title}
                            </span>

                            <div className="flex flex-wrap items-center gap-2 font-mono-tabular text-[11.5px] text-slate-600 dark:text-[#9cb0c9]">
                              {task.totalBytes > 0 && (
                                <span dir="ltr">
                                  {formatBytes(task.downloadedBytes)} / {formatBytes(task.totalBytes)}
                                </span>
                              )}
                              {task.status === 'downloading' && (
                                <span dir="ltr" className="text-[#0284c7] dark:text-[#38bdf8] font-semibold">
                                  ↓ {formatDownloadSpeed(task.speedBytesPerSec)}
                                  {(task.source === 'qbittorrent' ||
                                    (task.uploadSpeedBytesPerSec || 0) > 0) && (
                                    <> · ↑ {formatDownloadSpeed(task.uploadSpeedBytesPerSec || 0)}</>
                                  )}{' '}
                                  · ETA {formatEta(task.etaSeconds)}
                                </span>
                              )}
                              <span className="font-bold text-slate-800 dark:text-white">
                                {pct.toFixed(pct > 0 && pct < 100 ? 1 : 0)}%
                              </span>
                            </div>
                          </div>

                          <div className="h-1.5 w-full rounded-full bg-slate-200 dark:bg-[#0d1219] overflow-hidden">
                            <div
                              className={`h-full rounded-full transition-all duration-300 ${
                                isCompleted
                                  ? 'bg-emerald-500'
                                  : isPaused
                                  ? 'bg-amber-500'
                                  : task.status === 'failed'
                                  ? 'bg-rose-500'
                                  : 'bg-[#0284c7] dark:bg-[#38bdf8]'
                              }`}
                              style={{ width: `${pct}%` }}
                            />
                          </div>

                          {isDesktopApp && (
                            <div className="flex flex-wrap items-center gap-2 pt-0.5">
                              {isActive && task.canPauseResume && onPauseDownload && (
                                <button
                                  type="button"
                                  onClick={() => onPauseDownload(task.id)}
                                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-amber-50 hover:bg-amber-100 dark:bg-amber-500/15 dark:hover:bg-amber-500/25 text-[11.5px] font-semibold text-amber-800 dark:text-amber-300 cursor-pointer"
                                >
                                  <Pause weight="fill" className="w-3 h-3" />
                                  <span>{dlText.actionPause}</span>
                                </button>
                              )}
                              {isPaused && task.canPauseResume && onResumeDownload && (
                                <button
                                  type="button"
                                  onClick={() => onResumeDownload(task.id)}
                                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-[#0284c7] hover:bg-[#0369a1] dark:bg-[#1a9fff] text-white text-[11.5px] font-semibold cursor-pointer"
                                >
                                  <Play weight="fill" className="w-3 h-3" />
                                  <span>{dlText.actionResume}</span>
                                </button>
                              )}
                              {(isActive || isPaused) && onCancelDownload && (
                                <button
                                  type="button"
                                  onClick={() => onCancelDownload(task.id)}
                                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-slate-100 hover:bg-rose-50 dark:bg-white/[0.06] dark:hover:bg-rose-500/20 text-[11.5px] font-semibold text-slate-700 dark:text-[#c7d4e5] cursor-pointer"
                                >
                                  <Prohibit className="w-3 h-3" />
                                  <span>{dlText.actionCancel}</span>
                                </button>
                              )}
                              {onOpenDownloadFolder && (
                                <button
                                  type="button"
                                  onClick={() => onOpenDownloadFolder(task.id)}
                                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-slate-100 hover:bg-slate-200 dark:bg-white/[0.06] dark:hover:bg-white/[0.11] text-[11.5px] font-semibold text-slate-700 dark:text-[#dce4ee] cursor-pointer"
                                >
                                  <FolderOpen className="w-3 h-3" />
                                  <span>{dlText.actionOpenFolder}</span>
                                </button>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })()}

            {groupedMirrors.length === 0 ? (
              <div className="p-4 sm:p-5 rounded-xl bg-slate-50 border border-slate-200 text-[13.5px] text-slate-600 dark:bg-[#141c28] dark:border-white/[0.08] dark:text-[#8b9bb4]">
                {t.noChannels}
              </div>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-3.5 sm:gap-4">
                <AnimatePresence mode="popLayout" initial={false}>
                  {visibleMirrors.map(({ groupName, links }, groupIndex) => {
                    const isMagnetChannel = groupName === 'Magnet Link';
                    const isFullDownloadChannel = groupName === 'Full Download';
                    const isMediaFireChannel = groupName === 'MediaFire (Direct Link)';
                    const isFeaturedDirect =
                      isMagnetChannel || isFullDownloadChannel || isMediaFireChannel;

                    const ChannelIcon = isMagnetChannel
                      ? Magnet
                      : isMediaFireChannel
                      ? Lightning
                      : isFullDownloadChannel
                      ? CloudArrowDown
                      : groupName === 'Mega (Backup)'
                      ? Archive
                      : groupName === 'Unlockers' || groupName === 'Resources'
                      ? Key
                      : groupName === 'Direct Mirrors' || groupName === 'Anker'
                      ? LinkSimple
                      : HardDrives;

                    const shouldSpanFull =
                      activeChannelFilter !== 'all' || isFeaturedDirect || visibleMirrors.length === 1;

                    return (
                      <motion.div
                        key={groupName}
                        layout
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.98 }}
                        transition={{
                          duration: 0.25,
                          delay: Math.min(groupIndex * 0.04, 0.2),
                          ease: [0.16, 1, 0.3, 1],
                        }}
                        className={`rounded-xl p-4 sm:p-5 border transition-colors space-y-3.5 ${
                          shouldSpanFull ? 'lg:col-span-2' : ''
                        } ${
                          isFeaturedDirect
                            ? 'bg-gradient-to-br from-sky-50/90 via-white to-sky-50/40 dark:from-[#132033] dark:via-[#111a28] dark:to-[#0f1724] border-sky-300/80 dark:border-[#1a9fff]/40'
                            : 'bg-slate-50/90 hover:bg-white dark:bg-[#141c28]/90 dark:hover:bg-[#172130] border-slate-200/90 hover:border-slate-300 dark:border-white/[0.08] dark:hover:border-white/[0.15]'
                        }`}
                      >
                        <div className="flex flex-wrap items-center justify-between gap-2.5">
                          <div className="flex flex-wrap items-center gap-2.5 min-w-0">
                            <span
                              className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                                isFeaturedDirect
                                  ? 'bg-[#0284c7]/12 text-[#0284c7] border border-[#0284c7]/25 dark:bg-[#1a9fff]/20 dark:text-[#38bdf8] dark:border-[#38bdf8]/30'
                                  : 'bg-slate-200/75 text-slate-700 border border-slate-300/70 dark:bg-white/[0.07] dark:text-[#9cb0c9] dark:border-white/[0.1]'
                              }`}
                            >
                              <ChannelIcon className="w-4 h-4" />
                            </span>

                            <div className="flex flex-wrap items-center gap-x-2.5 gap-y-0.5 min-w-0">
                              <span className="text-[13px] sm:text-[13.5px] font-bold tracking-tight text-slate-900 dark:text-white">
                                {groupName}
                              </span>
                              {isFeaturedDirect && (
                                <span className="inline-flex items-center gap-1 text-[10.5px] font-bold uppercase tracking-[0.07em] text-[#0284c7] dark:text-[#38bdf8]">
                                  <Sparkle className="w-3 h-3" />
                                  <span>{t.recommendedTag}</span>
                                </span>
                              )}
                              {isTools && isFullDownloadChannel && game.isFree && (
                                <span className="inline-flex items-center gap-1 text-[10.5px] font-bold uppercase tracking-[0.07em] text-emerald-700 dark:text-emerald-300">
                                  <SealCheck className="w-3 h-3" />
                                  <span>{t.free}</span>
                                </span>
                              )}
                            </div>
                          </div>

                          <span className="text-[11.5px] font-mono-tabular font-semibold text-slate-500 dark:text-[#7f91a8]">
                            {links.length} {links.length === 1 ? 'link' : 'links'}
                          </span>
                        </div>

                        <div className="flex flex-wrap gap-2.5">
                          {links.map((mirror, idx) => {
                            const mirrorKey = `${groupName}-${idx}`;
                            const isCopied = copiedMirrorKey === mirrorKey;

                            if (mirror.isMagnet) {
                              return (
                                <div
                                  key={mirrorKey}
                                  className="w-full sm:w-auto inline-flex items-stretch rounded-xl overflow-hidden shadow-[0_8px_22px_rgba(2,132,199,0.24)] hover:shadow-[0_12px_28px_rgba(26,159,255,0.36)] hover:-translate-y-0.5 transition-all duration-200"
                                >
                                  {isDesktopApp && onStartDownload ? (
                                    <button
                                      type="button"
                                      onClick={() => onStartDownload(mirror, game)}
                                      className="group relative overflow-hidden flex-1 sm:flex-initial inline-flex items-center justify-center gap-2.5 px-4 sm:px-5 py-2.5 bg-gradient-to-r from-[#0284c7] to-[#0ea5e9] hover:from-[#0369a1] hover:to-[#0284c7] dark:from-[#1a9fff] dark:to-[#0284c7] dark:hover:from-[#38adff] dark:hover:to-[#1a9fff] text-white text-[13px] font-semibold transition-colors cursor-pointer"
                                    >
                                      <span
                                        aria-hidden="true"
                                        className="pointer-events-none absolute inset-y-0 -left-full w-1/2 bg-gradient-to-r from-transparent via-white/25 to-transparent -skew-x-12 group-hover:translate-x-[360%] transition-transform duration-700 ease-out"
                                      />
                                      <Magnet className="w-4 h-4 shrink-0" />
                                      <span className="truncate">{mirror.label}</span>
                                      <DownloadSimple className="w-3.5 h-3.5 shrink-0 opacity-90 group-hover:translate-y-0.5 transition-transform" />
                                    </button>
                                  ) : (
                                    <a
                                      href={/^magnet:\?/i.test(mirror.url) ? mirror.url : /^https?:\/\//i.test(mirror.url) ? mirror.url : '#'}
                                      onClick={() => onStartDownload?.(mirror, game)}
                                      className="group relative overflow-hidden flex-1 sm:flex-initial inline-flex items-center justify-center gap-2.5 px-4 sm:px-5 py-2.5 bg-gradient-to-r from-[#0284c7] to-[#0ea5e9] hover:from-[#0369a1] hover:to-[#0284c7] dark:from-[#1a9fff] dark:to-[#0284c7] dark:hover:from-[#38adff] dark:hover:to-[#1a9fff] text-white text-[13px] font-semibold transition-colors"
                                    >
                                      <span
                                        aria-hidden="true"
                                        className="pointer-events-none absolute inset-y-0 -left-full w-1/2 bg-gradient-to-r from-transparent via-white/25 to-transparent -skew-x-12 group-hover:translate-x-[360%] transition-transform duration-700 ease-out"
                                      />
                                      <Magnet className="w-4 h-4 shrink-0" />
                                      <span className="truncate">{mirror.label}</span>
                                      <DownloadSimple className="w-3.5 h-3.5 shrink-0 opacity-90 group-hover:translate-y-0.5 transition-transform" />
                                    </a>
                                  )}

                                  <button
                                    type="button"
                                    onClick={() => handleCopyMirrorUrl(mirrorKey, mirror.url)}
                                    aria-label={`Copy ${mirror.label}`}
                                    title={isCopied ? 'Copied' : 'Copy Magnet Link'}
                                    className="px-3 bg-[#0369a1] hover:bg-[#075985] dark:bg-[#0e6eb8] dark:hover:bg-[#1482d6] text-white border-s border-white/20 flex items-center justify-center transition-colors cursor-pointer shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-white"
                                  >
                                    {isCopied ? (
                                      <Check className="w-4 h-4 text-emerald-300" />
                                    ) : (
                                      <Copy className="w-4 h-4" />
                                    )}
                                  </button>
                                </div>
                              );
                            }

                            return (
                              <div
                                key={mirrorKey}
                                className="group w-full sm:w-auto inline-flex items-stretch rounded-xl overflow-hidden bg-white hover:bg-sky-50/75 border border-slate-200 hover:border-[#0284c7]/55 dark:bg-[#192331] dark:hover:bg-[#1e2b3d] dark:border-white/[0.09] dark:hover:border-[#38bdf8]/55 shadow-xs hover:shadow-md hover:-translate-y-0.5 transition-all duration-200"
                              >
                                {isDesktopApp && onStartDownload ? (
                                  <button
                                    type="button"
                                    onClick={() => onStartDownload(mirror, game)}
                                    title={tr.downloads.detailStartInApp}
                                    className="flex-1 min-w-0 inline-flex items-center justify-between gap-2.5 px-3.5 py-2.5 text-[12.5px] sm:text-[13px] font-semibold text-slate-800 group-hover:text-[#0369a1] dark:text-[#e5e9f0] dark:group-hover:text-white transition-colors cursor-pointer text-start"
                                  >
                                    <span className="flex items-center gap-2 min-w-0">
                                      <DownloadSimple className="w-3.5 h-3.5 text-[#0284c7] dark:text-[#38bdf8] shrink-0 group-hover:translate-y-0.5 transition-transform duration-200" />
                                      <span className="truncate">{mirror.label}</span>
                                    </span>
                                    <ArrowUpRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-[#0284c7] dark:text-[#7f91a8] dark:group-hover:text-[#38bdf8] group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-all duration-200 shrink-0" />
                                  </button>
                                ) : (
                                  <a
                                    href={/^https?:\/\//i.test(mirror.url) ? mirror.url : '#'}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    onClick={() => onStartDownload?.(mirror, game)}
                                    className="flex-1 min-w-0 inline-flex items-center justify-between gap-2.5 px-3.5 py-2.5 text-[12.5px] sm:text-[13px] font-semibold text-slate-800 group-hover:text-[#0369a1] dark:text-[#e5e9f0] dark:group-hover:text-white transition-colors"
                                  >
                                    <span className="flex items-center gap-2 min-w-0">
                                      <DownloadSimple className="w-3.5 h-3.5 text-[#0284c7] dark:text-[#38bdf8] shrink-0 group-hover:translate-y-0.5 transition-transform duration-200" />
                                      <span className="truncate">{mirror.label}</span>
                                    </span>
                                    <ArrowUpRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-[#0284c7] dark:text-[#7f91a8] dark:group-hover:text-[#38bdf8] group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-all duration-200 shrink-0" />
                                  </a>
                                )}

                                {isDesktopApp && /^https?:\/\//i.test(mirror.url) && (
                                  <a
                                    href={mirror.url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    title={tr.downloads.detailOpenExternal}
                                    aria-label={`${tr.downloads.detailOpenExternal}: ${mirror.label}`}
                                    className="px-2.5 border-s border-slate-200/85 dark:border-white/[0.08] flex items-center justify-center text-slate-400 hover:text-[#0284c7] hover:bg-sky-100/70 dark:text-[#7f91a8] dark:hover:text-[#38bdf8] dark:hover:bg-white/[0.06] transition-colors shrink-0"
                                  >
                                    <ArrowSquareOut className="w-3.5 h-3.5" />
                                  </a>
                                )}

                                <button
                                  type="button"
                                  onClick={() => handleCopyMirrorUrl(mirrorKey, mirror.url)}
                                  aria-label={`Copy ${mirror.label}`}
                                  title={isCopied ? 'Copied' : 'Copy Link'}
                                  className="px-2.5 border-s border-slate-200/85 dark:border-white/[0.08] flex items-center justify-center text-slate-400 hover:text-[#0284c7] hover:bg-sky-100/70 dark:text-[#7f91a8] dark:hover:text-[#38bdf8] dark:hover:bg-white/[0.06] transition-colors cursor-pointer shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#0284c7]"
                                >
                                  {isCopied ? (
                                    <Check className="w-3.5 h-3.5 text-emerald-500 dark:text-emerald-400" />
                                  ) : (
                                    <Copy className="w-3.5 h-3.5" />
                                  )}
                                </button>
                              </div>
                            );
                          })}
                        </div>
                      </motion.div>
                    );
                  })}
                </AnimatePresence>
              </div>
            )}
          </motion.section>

          {/* Recommended For You: Same Genres Auto-Slide (No Scrollbar, Button + Auto Controls; omitted on SteamTools) */}
          {!isSteamTools && recommendedGames.length > 0 && (
            <section
              onMouseEnter={() => setIsRecPaused(true)}
              onMouseLeave={() => setIsRecPaused(false)}
              onFocus={() => setIsRecPaused(true)}
              onBlur={() => setIsRecPaused(false)}
              className="pt-4 border-t border-slate-200 dark:border-white/[0.08] space-y-4"
            >
              <div className="flex flex-wrap items-end justify-between gap-3">
                <div>
                  <h2 className="text-[15px] font-bold tracking-[0.06em] uppercase text-slate-900 dark:text-white">
                    {t.recommendedForYou}
                  </h2>
                  <p className="text-[12px] text-slate-500 dark:text-[#8b9bb4] mt-0.5">
                    {isTools
                      ? game.name
                      : game.genreList.length > 0
                      ? game.genreList.slice(0, 3).join(' · ')
                      : game.category || 'SecretArea'}
                  </p>
                </div>

                <div dir="ltr" className="flex items-center gap-1.5">
                  <button
                    type="button"
                    aria-label="Slide recommended games left"
                    onClick={() => scrollRecommended(-1)}
                    className="p-2 rounded bg-slate-200 hover:bg-slate-300 border border-slate-300 text-slate-700 hover:text-slate-900 dark:bg-[#212a37] dark:hover:bg-[#2c3849] dark:border-white/[0.08] dark:text-[#dce4ee] dark:hover:text-white transition-colors cursor-pointer"
                  >
                    <CaretLeft weight="bold" className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    aria-label="Slide recommended games right"
                    onClick={() => scrollRecommended(1)}
                    className="p-2 rounded bg-slate-200 hover:bg-slate-300 border border-slate-300 text-slate-700 hover:text-slate-900 dark:bg-[#212a37] dark:hover:bg-[#2c3849] dark:border-white/[0.08] dark:text-[#dce4ee] dark:hover:text-white transition-colors cursor-pointer"
                  >
                    <CaretRight weight="bold" className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <div
                ref={recommendedSliderRef}
                dir="ltr"
                className="no-scrollbar flex gap-3 sm:gap-3.5 overflow-x-auto pb-1 scroll-smooth snap-x snap-mandatory"
              >
                {recommendedGames.map((rec) => {
                  const recEval = canRunItEnabled && systemSpecs ? evaluateCanRunGame(rec, systemSpecs) : null;
                  const metaLine = [
                    rec.tab === 'architect'
                      ? [rec.isFree ? t.free : '', rec.isPinned ? t.pinned : '', rec.version]
                          .filter(Boolean)
                          .join(' · ') || t.tools
                      : rec.genreList.slice(0, 2).join(' · ') || rec.category,
                    rec.repackSize || (rec.tab !== 'architect' ? rec.version : ''),
                  ]
                    .filter(Boolean)
                    .join(' · ');

                  return (
                    <div
                      key={`${rec.tab}-${rec.id}`}
                      role="button"
                      tabIndex={0}
                      onClick={() => onJumpToItem?.(rec)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          onJumpToItem?.(rec);
                        }
                      }}
                      className="group w-[138px] sm:w-[168px] md:w-[184px] lg:w-[196px] 2xl:w-[210px] shrink-0 snap-start bg-white hover:bg-slate-50 border border-slate-200 shadow-sm dark:shadow-none dark:bg-[#18202b] dark:hover:bg-[#212b3a] dark:border-white/[0.06] hover:border-[#1a9fff]/60 rounded overflow-hidden transition-all duration-200 hover:-translate-y-0.5 cursor-pointer flex flex-col focus:outline-none focus-visible:ring-2 focus-visible:ring-[#1a9fff]"
                    >
                      <div className="relative aspect-[2/3] bg-slate-100 dark:bg-[#0f141b] overflow-hidden">
                        <GameCover
                          src={rec.coverImage}
                          alt={rec.name}
                          imgClassName="w-full h-full object-cover group-hover:scale-[1.03] transition-transform duration-300"
                        />

                        {rec.isNew && (
                          <div className="absolute inset-x-0 top-0 bg-[#1a9fff] text-white text-[9.5px] font-bold tracking-[0.07em] uppercase py-[3px] text-center">
                            NEW
                          </div>
                        )}

                        {(rec.tab === 'hypervisor' ||
                          rec.tab === 'architect' ||
                          rec.tab === 'ps5' ||
                          rec.tab === 'steamtools') && (
                          <SectionSourceBadge
                            tab={rec.tab}
                            hasTopRibbon={rec.isNew}
                            className="absolute start-1.5"
                          />
                        )}
                      </div>

                      <div className="p-2.5 flex-1 flex flex-col justify-between gap-1">
                        <h3 className="text-[12.5px] font-semibold text-slate-900 group-hover:text-[#0284c7] dark:text-[#e5e9f0] dark:group-hover:text-white line-clamp-1">
                          {rec.name}
                        </h3>
                        <div className="text-[11px] text-slate-500 dark:text-[#8b9bb4] truncate">{metaLine}</div>
                        {recEval && recEval.status !== 'unknown' && (
                          <div
                            className={`text-[10.5px] font-bold truncate ${
                              recEval.status === 'can-run'
                                ? 'text-emerald-700 dark:text-[#4ade80]'
                                : 'text-rose-700 dark:text-[#f87171]'
                            }`}
                          >
                            {recEval.status === 'can-run'
                              ? `✓ ${t.runsWell}`
                              : `✕ ${recEval.shortBadge}`}
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
      </div>

      <HypervisorGuideModal
        isOpen={isHvGuideOpen}
        onClose={() => setIsHvGuideOpen(false)}
      />

      {lightboxImageUrl && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={`${game.name} screenshot preview`}
          onClick={() => setLightboxImageUrl(null)}
          className="fixed inset-0 z-[80] bg-black/90 backdrop-blur-md flex items-center justify-center p-4 sm:p-8"
        >
          <button
            type="button"
            onClick={() => setLightboxImageUrl(null)}
            aria-label={t.close}
            className="absolute top-4 end-4 w-10 h-10 rounded-full bg-white/[0.12] hover:bg-white/[0.22] border border-white/[0.2] text-white flex items-center justify-center transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
          <img
            src={lightboxImageUrl}
            alt={`${game.name} screenshot`}
            referrerPolicy="no-referrer"
            onClick={(e) => e.stopPropagation()}
            className="max-w-full max-h-[88vh] rounded-2xl border border-white/[0.14] shadow-2xl object-contain"
          />
        </div>
      )}
    </div>
  );
}
