import { memo, useCallback, useMemo, useState, type FormEvent } from 'react';
import {
  Archive,
  ArrowClockwise,
  ArrowSquareOut,
  CheckCircle,
  CloudArrowDown,
  Desktop,
  DownloadSimple,
  FileArrowDown,
  FilePlus,
  FolderOpen,
  Gear,
  Globe,
  HardDrive,
  Lightning,
  LinkSimple,
  Magnet,
  MagnifyingGlass,
  Pause,
  Play,
  Plus,
  Prohibit,
  Trash,
  WarningCircle,
  X,
} from '@phosphor-icons/react';
import type {
  DownloadManagerSnapshot,
  DownloadSourceType,
  DownloadStatus,
  DownloadTask,
} from '../types';
import {
  formatBytes,
  formatDownloadSpeed,
  formatEta,
  isValidDownloadInputUrl,
  type StartDownloadPayload,
} from '../services/downloadManager';
import type { AppLanguage } from '../services/launcherSettings';
import { getTranslations } from '../i18n/translations';
import { GameCover } from './GameCover';
import { TorrentSpeedGraph } from './TorrentSpeedGraph';

type DownloadFilterTab = 'all' | 'active' | 'paused' | 'completed' | 'failed';

interface DownloadsViewProps {
  snapshot: DownloadManagerSnapshot;
  isDesktopApp: boolean;
  freeSpaceGB?: number | null;
  language?: AppLanguage;
  reduceVisualEffects?: boolean;
  onStartDownload: (payload: StartDownloadPayload) => Promise<void> | void;
  onAddTorrentFile?: () => Promise<void> | void;
  onPauseDownload: (id: string) => void;
  onResumeDownload: (id: string) => void;
  onCancelDownload: (id: string) => void;
  onRetryDownload: (id: string) => void;
  onRemoveDownload: (id: string, deleteFiles?: boolean) => void;
  onClearCompleted: () => void;
  onChooseFolder: () => void;
  onOpenFolder: (id?: string) => void;
  onOpenFile: (id: string) => void;
  onOpenExternal: (url: string) => void;
  onOpenTorrentSettings: () => void;
  onOpenQbitSetupWizard?: () => void;
}

function getSourceIcon(source: DownloadSourceType) {
  switch (source) {
    case 'qbittorrent':
      return Magnet;
    case 'mediafire':
      return Lightning;
    case 'mega':
      return Archive;
    case 'browser':
      return Globe;
    default:
      return CloudArrowDown;
  }
}

function resolveSourceLabel(source: DownloadSourceType, t: ReturnType<typeof getTranslations>['downloads']): string {
  switch (source) {
    case 'qbittorrent':
      return t.sourceQbittorrent;
    case 'mediafire':
      return t.sourceMediafire;
    case 'mega':
      return t.sourceMega;
    case 'browser':
      return t.sourceBrowser;
    default:
      return t.sourceDirect;
  }
}

function resolveStatusMeta(status: DownloadStatus, t: ReturnType<typeof getTranslations>['downloads']) {
  switch (status) {
    case 'downloading':
      return {
        label: t.statusDownloading,
        textClass: 'text-[#0284c7] dark:text-[#38bdf8]',
        barClass: 'bg-gradient-to-r from-[#0284c7] to-[#38bdf8]',
      };
    case 'resolving':
      return {
        label: t.statusResolving,
        textClass: 'text-sky-600 dark:text-sky-400',
        barClass: 'bg-sky-500',
      };
    case 'queued':
      return {
        label: t.statusQueued,
        textClass: 'text-slate-600 dark:text-[#9cb0c9]',
        barClass: 'bg-slate-400 dark:bg-slate-500',
      };
    case 'paused':
      return {
        label: t.statusPaused,
        textClass: 'text-amber-700 dark:text-amber-400',
        barClass: 'bg-amber-500',
      };
    case 'completed':
      return {
        label: t.statusCompleted,
        textClass: 'text-emerald-700 dark:text-[#4ade80]',
        barClass: 'bg-emerald-500',
      };
    case 'cancelled':
      return {
        label: t.statusCancelled,
        textClass: 'text-slate-500 dark:text-[#8b9bb4]',
        barClass: 'bg-slate-400 dark:bg-slate-600',
      };
    case 'failed':
      return {
        label: t.statusFailed,
        textClass: 'text-rose-600 dark:text-rose-400',
        barClass: 'bg-rose-500',
      };
  }
}

interface DownloadTaskCardProps {
  task: DownloadTask;
  isDesktopApp: boolean;
  language: AppLanguage;
  onPauseDownload: (id: string) => void;
  onResumeDownload: (id: string) => void;
  onCancelDownload: (id: string) => void;
  onRetryDownload: (id: string) => void;
  onRemoveDownload: (id: string, deleteFiles?: boolean) => void;
  onOpenFolder: (id?: string) => void;
  onOpenFile: (id: string) => void;
  onOpenExternal: (url: string) => void;
}

const DownloadTaskCard = memo(function DownloadTaskCard({
  task,
  isDesktopApp,
  language,
  onPauseDownload,
  onResumeDownload,
  onCancelDownload,
  onRetryDownload,
  onRemoveDownload,
  onOpenFolder,
  onOpenFile,
  onOpenExternal,
}: DownloadTaskCardProps) {
  const t = getTranslations(language).downloads;
  const SourceIcon = getSourceIcon(task.source);
  const statusMeta = resolveStatusMeta(task.status, t);
  const isActive =
    task.status === 'downloading' ||
    task.status === 'resolving' ||
    task.status === 'queued';
  const isPaused = task.status === 'paused';
  const isCompleted = task.status === 'completed';
  const isFailedOrCancelled = task.status === 'failed' || task.status === 'cancelled';

  const isTorrentTask = task.source === 'qbittorrent';
  const pct = Math.max(0, Math.min(100, task.progress || 0));
  const formattedPct = `${pct.toFixed(pct >= 100 ? 0 : isTorrentTask || pct > 0 ? 1 : 0)}%`;
  const sizeSummary =
    task.totalBytes > 0
      ? `${formatBytes(task.downloadedBytes)} / ${formatBytes(task.totalBytes)}`
      : task.downloadedBytes > 0
      ? `${formatBytes(task.downloadedBytes)} / ${t.unknownSize}`
      : isCompleted
      ? t.statusCompleted
      : t.unknownSize;

  const torrentSizeCell =
    task.totalBytes > 0
      ? task.downloadedBytes > 0 && task.downloadedBytes < task.totalBytes
        ? `${formatBytes(task.downloadedBytes)} / ${formatBytes(task.totalBytes)}`
        : formatBytes(task.totalBytes)
      : task.downloadedBytes > 0
      ? formatBytes(task.downloadedBytes)
      : t.unknownSize;

  const seedsDisplay =
    typeof task.torrentSeeds === 'number'
      ? task.torrentSeedsTotal && task.torrentSeedsTotal > 0
        ? `${task.torrentSeeds} (${task.torrentSeedsTotal})`
        : `${task.torrentSeeds}`
      : '0';

  const peersDisplay =
    typeof task.torrentPeers === 'number'
      ? task.torrentPeersTotal && task.torrentPeersTotal > 0
        ? `${task.torrentPeers} (${task.torrentPeersTotal})`
        : `${task.torrentPeers}`
      : '0';

  const etaDisplay = isCompleted
    ? '0s'
    : isPaused || isFailedOrCancelled
    ? '—'
    : task.etaSeconds !== null && task.etaSeconds !== undefined
    ? formatEta(task.etaSeconds)
    : task.status === 'downloading'
    ? '∞'
    : t.etaCalculating;

  const ratioDisplay =
    typeof task.torrentRatio === 'number' && Number.isFinite(task.torrentRatio)
      ? task.torrentRatio.toFixed(2)
      : '0.00';

  return (
    <article className="sa-ps5-panel rounded-xl bg-white dark:bg-[#171d25] border border-slate-200 dark:border-white/[0.08] p-4 sm:p-4.5 shadow-xs dark:shadow-md transition-colors space-y-3">
      <div className="flex flex-col lg:flex-row lg:items-center gap-4">
        <div className="flex items-start gap-3.5 flex-1 min-w-0">
          <div className="w-12 h-16 sm:w-14 sm:h-[72px] rounded-lg overflow-hidden bg-slate-100 dark:bg-[#10151c] border border-slate-200 dark:border-white/[0.08] shrink-0 flex items-center justify-center">
            {task.coverImage ? (
              <GameCover
                src={task.coverImage}
                alt={task.title}
                className="w-full h-full object-cover"
              />
            ) : (
              <SourceIcon className="w-6 h-6 text-[#0284c7] dark:text-[#66c0f4]" />
            )}
          </div>

          <div className="flex-1 min-w-0 space-y-2">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div className="min-w-0 space-y-0.5">
                <h3 className="text-[14px] sm:text-[14.5px] font-bold text-slate-900 dark:text-white truncate">
                  {task.title}
                </h3>
                <p className="text-[12px] text-slate-500 dark:text-[#8b9bb4] flex flex-wrap items-center gap-x-1.5 gap-y-0.5">
                  <span className="inline-flex items-center gap-1 font-medium text-slate-700 dark:text-[#c7d4e5]">
                    <SourceIcon className="w-3.5 h-3.5 text-[#0284c7] dark:text-[#66c0f4]" />
                    <span>{resolveSourceLabel(task.source, t)}</span>
                  </span>
                  {task.channelGroup && (
                    <>
                      <span aria-hidden="true">·</span>
                      <span>{task.channelGroup}</span>
                    </>
                  )}
                  {task.fileName && task.fileName !== task.title && (
                    <>
                      <span aria-hidden="true">·</span>
                      <span dir="ltr" className="font-mono-tabular truncate max-w-[260px]">
                        {task.fileName}
                      </span>
                    </>
                  )}
                </p>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <span className={`inline-flex items-center gap-1.5 text-[12px] font-semibold ${statusMeta.textClass}`}>
                  {isCompleted ? (
                    <CheckCircle weight="fill" className="w-4 h-4 shrink-0" />
                  ) : isFailedOrCancelled ? (
                    <WarningCircle weight="fill" className="w-4 h-4 shrink-0" />
                  ) : isPaused ? (
                    <Pause weight="fill" className="w-3.5 h-3.5 shrink-0" />
                  ) : (
                    <DownloadSimple className="w-3.5 h-3.5 shrink-0" />
                  )}
                  <span>{statusMeta.label}</span>
                </span>
                <span className="text-[12.5px] font-bold font-mono-tabular text-slate-800 dark:text-white">
                  {formattedPct}
                </span>
              </div>
            </div>

            <div className="h-2 w-full rounded-full bg-slate-200 dark:bg-[#0e131a] overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-300 ${statusMeta.barClass}`}
                style={{ width: `${pct}%` }}
              />
            </div>

            {!isTorrentTask ? (
              <div className="flex flex-wrap items-center justify-between gap-2 text-[12px] text-slate-600 dark:text-[#9cb0c9]">
                <div dir="ltr" className="flex flex-wrap items-center gap-x-2 gap-y-0.5 font-mono-tabular">
                  <span>{sizeSummary}</span>
                  {task.status === 'downloading' && (
                    <>
                      <span aria-hidden="true">·</span>
                      <span className="font-semibold text-[#0284c7] dark:text-[#38bdf8]">
                        ↓ {formatDownloadSpeed(task.speedBytesPerSec)}
                      </span>
                      {(task.uploadSpeedBytesPerSec || 0) > 0 && (
                        <>
                          <span aria-hidden="true">·</span>
                          <span className="font-semibold text-emerald-700 dark:text-[#4ade80]">
                            ↑ {formatDownloadSpeed(task.uploadSpeedBytesPerSec || 0)}
                          </span>
                        </>
                      )}
                      <span aria-hidden="true">·</span>
                      <span>
                        ETA{' '}
                        {task.etaSeconds !== null && task.etaSeconds !== undefined
                          ? formatEta(task.etaSeconds)
                          : t.etaCalculating}
                      </span>
                    </>
                  )}
                </div>

                {task.error && (
                  <span className="text-[11.5px] text-amber-700 dark:text-amber-300 truncate max-w-full sm:max-w-lg">
                    {task.error}
                  </span>
                )}
              </div>
            ) : task.error ? (
              <p className="text-[11.5px] text-amber-700 dark:text-amber-300 truncate">
                {task.error}
              </p>
            ) : null}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 lg:justify-end shrink-0">
          {isDesktopApp && isActive && task.canPauseResume && (
            <button
              type="button"
              onClick={() => onPauseDownload(task.id)}
              className="inline-flex items-center gap-1.5 min-h-[40px] px-3 py-2 rounded-lg bg-amber-50 hover:bg-amber-100 dark:bg-amber-500/15 dark:hover:bg-amber-500/25 border border-amber-300/70 dark:border-amber-500/35 text-[12px] font-semibold text-amber-800 dark:text-amber-300 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              <Pause weight="fill" className="w-3.5 h-3.5" />
              <span>{t.actionPause}</span>
            </button>
          )}

          {isDesktopApp && isPaused && task.canPauseResume && (
            <button
              type="button"
              onClick={() => onResumeDownload(task.id)}
              className="inline-flex items-center gap-1.5 min-h-[40px] px-3 py-2 rounded-lg bg-[#0284c7] hover:bg-[#0369a1] dark:bg-[#1a9fff] dark:hover:bg-[#38adff] text-white text-[12px] font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              <Play weight="fill" className="w-3.5 h-3.5" />
              <span>{t.actionResume}</span>
            </button>
          )}

          {isDesktopApp && (isActive || isPaused) && (
            <button
              type="button"
              onClick={() => onCancelDownload(task.id)}
              className="inline-flex items-center gap-1.5 min-h-[40px] px-3 py-2 rounded-lg bg-slate-100 hover:bg-rose-50 dark:bg-white/[0.06] dark:hover:bg-rose-500/20 border border-slate-200 hover:border-rose-300 dark:border-white/[0.1] dark:hover:border-rose-500/40 text-[12px] font-semibold text-slate-700 hover:text-rose-700 dark:text-[#c7d4e5] dark:hover:text-rose-300 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              <Prohibit className="w-3.5 h-3.5" />
              <span>{t.actionCancel}</span>
            </button>
          )}

          {isDesktopApp && isFailedOrCancelled && (
            <button
              type="button"
              onClick={() => onRetryDownload(task.id)}
              className="inline-flex items-center gap-1.5 min-h-[40px] px-3 py-2 rounded-lg bg-[#0284c7] hover:bg-[#0369a1] dark:bg-[#1a9fff] dark:hover:bg-[#38adff] text-white text-[12px] font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              <ArrowClockwise className="w-3.5 h-3.5" />
              <span>{t.actionRetry}</span>
            </button>
          )}

          {isDesktopApp && isCompleted && task.savePath && (
            <button
              type="button"
              onClick={() => onOpenFile(task.id)}
              className="inline-flex items-center gap-1.5 min-h-[40px] px-3 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-[12px] font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              <FileArrowDown className="w-3.5 h-3.5" />
              <span>{t.actionOpenFile}</span>
            </button>
          )}

          {isDesktopApp && (
            <button
              type="button"
              onClick={() => onOpenFolder(task.id)}
              title={t.actionOpenFolder}
              className="inline-flex items-center gap-1.5 min-h-[40px] px-3 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-white/[0.06] dark:hover:bg-white/[0.11] border border-slate-200 dark:border-white/[0.1] text-[12px] font-semibold text-slate-700 dark:text-[#dce4ee] transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              <FolderOpen className="w-3.5 h-3.5" />
              <span>{t.actionOpenFolder}</span>
            </button>
          )}

          <button
            type="button"
            onClick={() => onOpenExternal(task.url)}
            title={t.actionOpenExternal}
            className="inline-flex items-center justify-center min-h-[40px] w-10 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-white/[0.06] dark:hover:bg-white/[0.11] border border-slate-200 dark:border-white/[0.1] text-slate-600 dark:text-[#9cb0c9] hover:text-slate-900 dark:hover:text-white transition-colors shrink-0 cursor-pointer"
          >
            <ArrowSquareOut className="w-4 h-4" />
          </button>

          {!isActive && (
            <button
              type="button"
              onClick={() => onRemoveDownload(task.id, false)}
              title={task.source === 'qbittorrent' ? t.actionDelete : t.actionRemove}
              aria-label={task.source === 'qbittorrent' ? t.actionDelete : t.actionRemove}
              className="inline-flex items-center justify-center min-h-[40px] w-10 rounded-lg bg-slate-100 hover:bg-rose-50 dark:bg-white/[0.06] dark:hover:bg-rose-500/20 border border-slate-200 hover:border-rose-300 dark:border-white/[0.1] dark:hover:border-rose-500/40 text-slate-500 hover:text-rose-700 dark:text-[#9cb0c9] dark:hover:text-rose-300 transition-colors shrink-0 cursor-pointer"
            >
              <Trash className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {isTorrentTask && (
        <dl className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 xl:grid-cols-9 gap-x-3 gap-y-2.5 pt-3 border-t border-slate-200/80 dark:border-white/[0.07]">
          <div className="min-w-0">
            <dt className="text-[11px] font-medium text-slate-500 dark:text-[#7f91a8] truncate">{t.sizeLabel}</dt>
            <dd className="mt-0.5 text-[12.5px] font-semibold font-mono-tabular text-slate-800 dark:text-[#e5e9f0] truncate">
              <span dir="ltr">{torrentSizeCell}</span>
            </dd>
          </div>
          <div className="min-w-0">
            <dt className="text-[11px] font-medium text-slate-500 dark:text-[#7f91a8] truncate">{t.progressLabel}</dt>
            <dd className="mt-0.5 text-[12.5px] font-semibold font-mono-tabular text-slate-900 dark:text-white truncate">
              <span dir="ltr">{formattedPct}</span>
            </dd>
          </div>
          <div className="min-w-0">
            <dt className="text-[11px] font-medium text-slate-500 dark:text-[#7f91a8] truncate">{t.statusLabel}</dt>
            <dd className={`mt-0.5 text-[12.5px] font-semibold truncate ${statusMeta.textClass}`}>
              {statusMeta.label}
              {task.torrentStateRaw ? (
                <span dir="ltr" className="ms-1 text-[11px] font-normal font-mono-tabular text-slate-500 dark:text-[#7f91a8]">
                  ({task.torrentStateRaw})
                </span>
              ) : null}
            </dd>
          </div>
          <div className="min-w-0">
            <dt className="text-[11px] font-medium text-slate-500 dark:text-[#7f91a8] truncate">{t.seedsLabel}</dt>
            <dd className="mt-0.5 text-[12.5px] font-semibold font-mono-tabular text-slate-800 dark:text-[#e5e9f0] truncate">
              <span dir="ltr">{seedsDisplay}</span>
            </dd>
          </div>
          <div className="min-w-0">
            <dt className="text-[11px] font-medium text-slate-500 dark:text-[#7f91a8] truncate">{t.peersLabel}</dt>
            <dd className="mt-0.5 text-[12.5px] font-semibold font-mono-tabular text-slate-800 dark:text-[#e5e9f0] truncate">
              <span dir="ltr">{peersDisplay}</span>
            </dd>
          </div>
          <div className="min-w-0">
            <dt className="text-[11px] font-medium text-slate-500 dark:text-[#7f91a8] truncate">{t.downSpeedLabel}</dt>
            <dd className={`mt-0.5 text-[12.5px] font-semibold font-mono-tabular truncate ${(task.speedBytesPerSec || 0) > 0 ? 'text-emerald-700 dark:text-[#7dd934]' : 'text-slate-600 dark:text-[#9cb0c9]'}`}>
              <span dir="ltr">↓ {formatDownloadSpeed(task.speedBytesPerSec || 0)}</span>
            </dd>
          </div>
          <div className="min-w-0">
            <dt className="text-[11px] font-medium text-slate-500 dark:text-[#7f91a8] truncate">{t.upSpeedLabel}</dt>
            <dd className={`mt-0.5 text-[12.5px] font-semibold font-mono-tabular truncate ${(task.uploadSpeedBytesPerSec || 0) > 0 ? 'text-[#0284c7] dark:text-[#38bdf8]' : 'text-slate-600 dark:text-[#9cb0c9]'}`}>
              <span dir="ltr">↑ {formatDownloadSpeed(task.uploadSpeedBytesPerSec || 0)}</span>
            </dd>
          </div>
          <div className="min-w-0">
            <dt className="text-[11px] font-medium text-slate-500 dark:text-[#7f91a8] truncate">{t.etaLabel}</dt>
            <dd className="mt-0.5 text-[12.5px] font-semibold font-mono-tabular text-slate-800 dark:text-[#e5e9f0] truncate">
              <span dir="ltr">{etaDisplay}</span>
            </dd>
          </div>
          <div className="min-w-0">
            <dt className="text-[11px] font-medium text-slate-500 dark:text-[#7f91a8] truncate">{t.ratioLabel}</dt>
            <dd className="mt-0.5 text-[12.5px] font-semibold font-mono-tabular text-slate-800 dark:text-[#e5e9f0] truncate">
              <span dir="ltr">{ratioDisplay}</span>
            </dd>
          </div>
        </dl>
      )}
    </article>
  );
});

export function DownloadsView({
  snapshot,
  isDesktopApp,
  freeSpaceGB = null,
  language = 'en',
  reduceVisualEffects = false,
  onStartDownload,
  onAddTorrentFile,
  onPauseDownload,
  onResumeDownload,
  onCancelDownload,
  onRetryDownload,
  onRemoveDownload,
  onClearCompleted,
  onChooseFolder,
  onOpenFolder,
  onOpenFile,
  onOpenExternal,
  onOpenTorrentSettings,
  onOpenQbitSetupWizard,
}: DownloadsViewProps) {
  const tr = getTranslations(language);
  const t = tr.downloads;

  const [quickUrl, setQuickUrl] = useState('');
  const [urlError, setUrlError] = useState<string | null>(null);
  const [isAdding, setIsAdding] = useState(false);
  const [isAddingTorrentFile, setIsAddingTorrentFile] = useState(false);
  const [activeTab, setActiveTab] = useState<DownloadFilterTab>('all');
  const [searchQuery, setSearchQuery] = useState('');

  const counts = useMemo(() => {
    let active = 0;
    let paused = 0;
    let completed = 0;
    let failed = 0;
    let totalSpeed = 0;
    let totalUploadSpeed = 0;

    for (const task of snapshot.tasks) {
      if (
        task.status === 'downloading' ||
        task.status === 'resolving' ||
        task.status === 'queued'
      ) {
        active += 1;
        if (task.status === 'downloading' || task.status === 'resolving') {
          totalSpeed += task.speedBytesPerSec || 0;
          totalUploadSpeed += task.uploadSpeedBytesPerSec || 0;
        }
      } else if (task.status === 'paused') {
        paused += 1;
      } else if (task.status === 'completed') {
        completed += 1;
        if (task.source === 'qbittorrent') {
          totalUploadSpeed += task.uploadSpeedBytesPerSec || 0;
        }
      } else if (task.status === 'failed' || task.status === 'cancelled') {
        failed += 1;
      }
    }

    return {
      all: snapshot.tasks.length,
      active,
      paused,
      completed,
      failed,
      totalSpeed,
      totalUploadSpeed,
    };
  }, [snapshot.tasks]);

  const filteredTasks = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return snapshot.tasks.filter((task) => {
      if (activeTab === 'active') {
        if (
          task.status !== 'downloading' &&
          task.status !== 'resolving' &&
          task.status !== 'queued'
        ) {
          return false;
        }
      } else if (activeTab === 'paused') {
        if (task.status !== 'paused') return false;
      } else if (activeTab === 'completed') {
        if (task.status !== 'completed') return false;
      } else if (activeTab === 'failed') {
        if (task.status !== 'failed' && task.status !== 'cancelled') return false;
      }

      if (!q) return true;
      return (
        task.title.toLowerCase().includes(q) ||
        task.fileName.toLowerCase().includes(q) ||
        task.channelGroup.toLowerCase().includes(q) ||
        task.source.toLowerCase().includes(q)
      );
    });
  }, [snapshot.tasks, activeTab, searchQuery]);

  const handleQuickAdd = async (e: FormEvent) => {
    e.preventDefault();
    const cleaned = quickUrl.trim();
    if (!isValidDownloadInputUrl(cleaned)) {
      setUrlError(t.quickAddInvalid);
      return;
    }
    setUrlError(null);
    setIsAdding(true);
    try {
      await onStartDownload({
        url: cleaned,
      });
      setQuickUrl('');
    } finally {
      setIsAdding(false);
    }
  };

  const handleAddTorrentFileClick = async () => {
    if (!onAddTorrentFile) return;
    setIsAddingTorrentFile(true);
    try {
      await onAddTorrentFile();
    } finally {
      setIsAddingTorrentFile(false);
    }
  };

  const getSourceLabel = (source: DownloadSourceType): string => {
    switch (source) {
      case 'qbittorrent':
        return t.sourceQbittorrent;
      case 'mediafire':
        return t.sourceMediafire;
      case 'mega':
        return t.sourceMega;
      case 'browser':
        return t.sourceBrowser;
      default:
        return t.sourceDirect;
    }
  };

  const getStatusMeta = (status: DownloadStatus) => {
    switch (status) {
      case 'downloading':
        return {
          label: t.statusDownloading,
          textClass: 'text-[#0284c7] dark:text-[#38bdf8]',
          barClass: 'bg-gradient-to-r from-[#0284c7] to-[#38bdf8]',
        };
      case 'resolving':
        return {
          label: t.statusResolving,
          textClass: 'text-sky-600 dark:text-sky-400',
          barClass: 'bg-sky-500',
        };
      case 'queued':
        return {
          label: t.statusQueued,
          textClass: 'text-slate-600 dark:text-[#9cb0c9]',
          barClass: 'bg-slate-400 dark:bg-slate-500',
        };
      case 'paused':
        return {
          label: t.statusPaused,
          textClass: 'text-amber-700 dark:text-amber-400',
          barClass: 'bg-amber-500',
        };
      case 'completed':
        return {
          label: t.statusCompleted,
          textClass: 'text-emerald-700 dark:text-[#4ade80]',
          barClass: 'bg-emerald-500',
        };
      case 'cancelled':
        return {
          label: t.statusCancelled,
          textClass: 'text-slate-500 dark:text-[#8b9bb4]',
          barClass: 'bg-slate-400 dark:bg-slate-600',
        };
      case 'failed':
      default:
        return {
          label: t.statusFailed,
          textClass: 'text-rose-600 dark:text-rose-400',
          barClass: 'bg-rose-500',
        };
    }
  };

  const filterTabs: { id: DownloadFilterTab; label: string; count: number }[] = [
    { id: 'all', label: t.tabAll, count: counts.all },
    { id: 'active', label: t.tabActive, count: counts.active },
    { id: 'paused', label: t.tabPaused, count: counts.paused },
    { id: 'completed', label: t.tabCompleted, count: counts.completed },
    { id: 'failed', label: t.tabFailed, count: counts.failed },
  ];

  const hasFinishedToClear = counts.completed > 0 || counts.failed > 0;

  return (
    <div className="flex-1 min-w-0 h-full overflow-y-auto bg-gradient-to-b from-slate-50 via-[#f4f6f9] to-slate-100 dark:from-[#1d2633] dark:via-[#171d26] dark:to-[#12161d]">
      <div className="max-w-[1600px] mx-auto px-3.5 sm:px-6 lg:px-8 py-5 sm:py-7 space-y-5">
        {/* Page Header + Folder Controls */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-slate-200 dark:border-white/[0.08]">
          <div className="space-y-1 min-w-0">
            <div className="flex flex-wrap items-center gap-2.5">
              <span className="w-9 h-9 rounded-lg bg-sky-500/10 dark:bg-[#1a9fff]/15 border border-sky-500/25 dark:border-[#1a9fff]/35 text-[#0284c7] dark:text-[#66c0f4] flex items-center justify-center shrink-0">
                <DownloadSimple weight="duotone" className="w-5 h-5" />
              </span>
              <h1 className="font-display text-lg sm:text-xl font-bold tracking-tight text-slate-900 dark:text-white">
                {t.pageTitle}
              </h1>
            </div>
            <p className="text-[12.5px] text-slate-600 dark:text-[#8b9bb4]">
              {t.pageSubtitle}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {isDesktopApp && snapshot.downloadFolder && (
              <div
                title={snapshot.downloadFolder}
                className="inline-flex items-center gap-2 min-h-[40px] max-w-full sm:max-w-[300px] px-3 py-1.5 rounded-lg bg-white dark:bg-[#141b25] border border-slate-200 dark:border-white/[0.08] text-[12px] text-slate-600 dark:text-[#9cb0c9]"
              >
                <FolderOpen className="w-4 h-4 text-[#0284c7] dark:text-[#66c0f4] shrink-0" />
                <span className="truncate font-mono-tabular" dir="ltr">
                  {snapshot.downloadFolder}
                </span>
              </div>
            )}

            {isDesktopApp && (
              <>
                <button
                  type="button"
                  onClick={onChooseFolder}
                  className="inline-flex items-center gap-1.5 min-h-[40px] px-3.5 py-2 rounded-lg bg-white hover:bg-slate-100 dark:bg-[#1f2835] dark:hover:bg-[#293546] border border-slate-200 dark:border-white/[0.1] text-[12.5px] font-semibold text-slate-800 dark:text-[#e5e9f0] transition-colors whitespace-nowrap shrink-0 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0284c7] dark:focus-visible:ring-[#38bdf8]"
                >
                  <FolderOpen className="w-4 h-4 text-[#0284c7] dark:text-[#66c0f4]" />
                  <span>{t.chooseFolder}</span>
                </button>

                <button
                  type="button"
                  onClick={() => onOpenFolder()}
                  className="inline-flex items-center gap-1.5 min-h-[40px] px-3.5 py-2 rounded-lg bg-white hover:bg-slate-100 dark:bg-[#1f2835] dark:hover:bg-[#293546] border border-slate-200 dark:border-white/[0.1] text-[12.5px] font-semibold text-slate-800 dark:text-[#e5e9f0] transition-colors whitespace-nowrap shrink-0 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0284c7] dark:focus-visible:ring-[#38bdf8]"
                >
                  <ArrowSquareOut className="w-4 h-4" />
                  <span>{t.openFolder}</span>
                </button>
              </>
            )}

            {hasFinishedToClear && (
              <button
                type="button"
                onClick={onClearCompleted}
                className="inline-flex items-center gap-1.5 min-h-[40px] px-3.5 py-2 rounded-lg bg-slate-200/80 hover:bg-slate-300/80 dark:bg-white/[0.06] dark:hover:bg-white/[0.11] border border-slate-300/70 dark:border-white/[0.09] text-[12.5px] font-semibold text-slate-700 dark:text-[#c7d4e5] transition-colors whitespace-nowrap shrink-0 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0284c7] dark:focus-visible:ring-[#38bdf8]"
              >
                <Trash className="w-4 h-4" />
                <span>{t.clearFinished}</span>
              </button>
            )}
          </div>
        </div>

        {/* Web Preview Notice */}
        {!isDesktopApp && (
          <div className="sa-ps5-subpanel rounded-xl p-4 bg-sky-50/90 dark:bg-[#121e2e] border border-sky-200 dark:border-[#1a9fff]/30 flex items-start gap-3">
            <Desktop className="w-5 h-5 text-[#0284c7] dark:text-[#66c0f4] shrink-0 mt-0.5" />
            <div className="space-y-0.5 min-w-0">
              <div className="text-[13px] font-bold text-slate-900 dark:text-white">
                {t.webNoticeTitle}
              </div>
              <p className="text-[12px] text-slate-600 dark:text-[#9cb0c9] leading-relaxed">
                {t.webNoticeBody}
              </p>
            </div>
          </div>
        )}

        {/* Always-Visible qBittorrent Connection Indicator */}
        <div
          role="status"
          aria-live="polite"
          className={`sa-ps5-subpanel rounded-xl px-4 py-3 border flex flex-wrap items-center justify-between gap-3 ${
            isDesktopApp && snapshot.torrentConnected
              ? 'bg-emerald-50/75 dark:bg-emerald-950/25 border-emerald-300/70 dark:border-emerald-500/30'
              : 'bg-white dark:bg-[#171d25] border-slate-200 dark:border-white/[0.08]'
          }`}
        >
          <div className="flex items-center gap-2.5 min-w-0 flex-1">
            <Magnet
              className={`w-4.5 h-4.5 shrink-0 ${
                isDesktopApp && snapshot.torrentConnected
                  ? 'text-emerald-600 dark:text-emerald-400'
                  : 'text-amber-600 dark:text-amber-400'
              }`}
            />
            <span
              aria-hidden="true"
              className={`w-2 h-2 rounded-full shrink-0 ${
                isDesktopApp && snapshot.torrentConnected
                  ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.7)]'
                  : 'bg-amber-500 dark:bg-amber-400'
              }`}
            />
            <div className="min-w-0 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[12.5px]">
              <span
                className={`font-semibold ${
                  isDesktopApp && snapshot.torrentConnected
                    ? 'text-emerald-800 dark:text-emerald-300'
                    : 'text-slate-800 dark:text-[#e5e9f0]'
                }`}
              >
                {isDesktopApp && snapshot.torrentConnected
                  ? t.torrentConnected
                  : t.torrentDisconnected}
              </span>
              {isDesktopApp && snapshot.torrentConnected && snapshot.torrentVersion && (
                <span dir="ltr" className="font-mono-tabular text-slate-600 dark:text-[#9cb0c9]">
                  · {snapshot.torrentVersion}
                  {snapshot.torrentWebApiVersion ? ` (API ${snapshot.torrentWebApiVersion})` : ''}
                </span>
              )}
              {!isDesktopApp ? (
                <span className="text-[12px] text-slate-500 dark:text-[#8b9bb4]">
                  · {t.torrentWebPreviewStatus}
                </span>
              ) : !snapshot.torrentConnected && snapshot.torrentError ? (
                <span className="text-[12px] text-amber-700 dark:text-amber-300 truncate max-w-full sm:max-w-xl">
                  · {snapshot.torrentError}
                </span>
              ) : null}
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 shrink-0">
            {onOpenQbitSetupWizard && (
              <button
                type="button"
                onClick={onOpenQbitSetupWizard}
                className="inline-flex items-center gap-1.5 min-h-[36px] px-3 py-1.5 rounded-lg bg-[#0284c7] hover:bg-[#0369a1] dark:bg-[#1a9fff] dark:hover:bg-[#38adff] text-white text-[12px] font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer"
              >
                <DownloadSimple className="w-3.5 h-3.5" />
                <span>{tr.settings.torrentManageSetupBtn}</span>
              </button>
            )}

            <button
              type="button"
              onClick={onOpenTorrentSettings}
              className="inline-flex items-center gap-1.5 min-h-[36px] px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-[#1e2633] dark:hover:bg-[#273142] border border-slate-200 dark:border-white/[0.1] text-[12px] font-semibold text-slate-800 dark:text-white transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              <Gear className="w-3.5 h-3.5" />
              <span>{t.configureTorrentBtn}</span>
            </button>
          </div>
        </div>

        {/* Quick-Add URL / Magnet / .torrent Bar */}
        <form
          onSubmit={handleQuickAdd}
          className="sa-ps5-panel rounded-xl bg-white dark:bg-[#171d25] border border-slate-200 dark:border-white/[0.08] p-3.5 sm:p-4 shadow-sm dark:shadow-lg space-y-2"
        >
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
            <div className="relative flex-1 min-w-0">
              <LinkSimple className="w-4 h-4 text-slate-400 dark:text-[#7f91a8] absolute start-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                dir="ltr"
                value={quickUrl}
                onChange={(e) => {
                  setQuickUrl(e.target.value);
                  if (urlError) setUrlError(null);
                }}
                placeholder={t.quickAddPlaceholder}
                className="w-full min-h-[42px] ps-10 pe-3.5 py-2 rounded-lg bg-slate-50 dark:bg-[#10151c] border border-slate-200 dark:border-white/[0.1] focus:border-[#0284c7] dark:focus:border-[#38bdf8] text-[13px] text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-[#6f829a] focus:outline-none"
              />
            </div>

            <div className="flex flex-wrap sm:flex-nowrap items-center gap-2 shrink-0">
              <button
                type="submit"
                disabled={isAdding || !quickUrl.trim()}
                className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-2 min-h-[42px] px-5 py-2 rounded-lg bg-[#0284c7] hover:bg-[#0369a1] dark:bg-[#1a9fff] dark:hover:bg-[#38adff] disabled:opacity-50 text-white text-[13px] font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0284c7] dark:focus-visible:ring-[#38bdf8]"
              >
                <Plus weight="bold" className="w-4 h-4 shrink-0" />
                <span>{t.quickAddBtn}</span>
              </button>

              {isDesktopApp && onAddTorrentFile && (
                <button
                  type="button"
                  disabled={isAddingTorrentFile}
                  onClick={handleAddTorrentFileClick}
                  className="inline-flex items-center justify-center gap-2 min-h-[42px] px-4 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-[#1f2835] dark:hover:bg-[#293546] border border-slate-200 dark:border-white/[0.1] disabled:opacity-50 text-slate-800 dark:text-[#e5e9f0] text-[13px] font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0284c7] dark:focus-visible:ring-[#38bdf8]"
                >
                  <FilePlus className="w-4 h-4 text-[#0284c7] dark:text-[#66c0f4] shrink-0" />
                  <span>{t.addTorrentFileBtn}</span>
                </button>
              )}
            </div>
          </div>

          {urlError && (
            <p className="text-[12px] text-rose-600 dark:text-rose-400 flex items-center gap-1.5">
              <WarningCircle className="w-4 h-4 shrink-0" />
              <span>{urlError}</span>
            </p>
          )}
        </form>

        {/* 4-Metric Summary Strip */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <div className="sa-ps5-subpanel rounded-xl bg-white dark:bg-[#171d25] border border-slate-200 dark:border-white/[0.08] p-3.5 sm:p-4">
            <div className="text-[11.5px] font-medium text-slate-500 dark:text-[#8b9bb4]">
              {t.metricActive}
            </div>
            <div className="mt-1 text-xl font-bold font-mono-tabular text-slate-900 dark:text-white">
              {counts.active}
            </div>
          </div>

          <div className="sa-ps5-subpanel rounded-xl bg-white dark:bg-[#171d25] border border-slate-200 dark:border-white/[0.08] p-3.5 sm:p-4">
            <div className="text-[11.5px] font-medium text-slate-500 dark:text-[#8b9bb4]">
              {t.metricSpeed}
            </div>
            <div
              dir="ltr"
              className="mt-1 flex flex-wrap items-baseline gap-x-2.5 gap-y-0.5 text-start"
            >
              <span className="text-xl font-bold font-mono-tabular text-[#0284c7] dark:text-[#38bdf8]">
                {formatDownloadSpeed(counts.totalSpeed)}
              </span>
              {counts.totalUploadSpeed > 0 && (
                <span className="text-[12px] font-semibold font-mono-tabular text-emerald-700 dark:text-[#4ade80]">
                  ↑ {formatDownloadSpeed(counts.totalUploadSpeed)}
                </span>
              )}
            </div>
          </div>

          <div className="sa-ps5-subpanel rounded-xl bg-white dark:bg-[#171d25] border border-slate-200 dark:border-white/[0.08] p-3.5 sm:p-4">
            <div className="text-[11.5px] font-medium text-slate-500 dark:text-[#8b9bb4]">
              {t.metricCompleted}
            </div>
            <div className="mt-1 text-xl font-bold font-mono-tabular text-emerald-700 dark:text-[#4ade80]">
              {counts.completed}
            </div>
          </div>

          <div className="sa-ps5-subpanel rounded-xl bg-white dark:bg-[#171d25] border border-slate-200 dark:border-white/[0.08] p-3.5 sm:p-4">
            <div className="text-[11.5px] font-medium text-slate-500 dark:text-[#8b9bb4] flex items-center gap-1.5">
              <HardDrive className="w-3.5 h-3.5 shrink-0" />
              <span>{t.metricFreeDisk}</span>
            </div>
            <div
              dir="ltr"
              className="mt-1 text-xl font-bold font-mono-tabular text-slate-900 dark:text-white text-start"
            >
              {freeSpaceGB !== null && Number.isFinite(freeSpaceGB)
                ? `${freeSpaceGB.toFixed(1)} GB`
                : '—'}
            </div>
          </div>
        </div>

        {/* Live Animated Download & Upload Speed Graph */}
        <TorrentSpeedGraph
          downloadBytesPerSec={counts.totalSpeed}
          uploadBytesPerSec={counts.totalUploadSpeed}
          hasActiveTransfers={
            counts.active > 0 || counts.totalSpeed > 0 || counts.totalUploadSpeed > 0
          }
          language={language}
          reduceVisualEffects={reduceVisualEffects}
        />

        {/* Filter Tabs + Search Input */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div
            role="tablist"
            aria-label={t.pageTitle}
            className="no-scrollbar flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0"
          >
            {filterTabs.map((tab) => {
              const isSelected = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  role="tab"
                  aria-selected={isSelected}
                  onClick={() => setActiveTab(tab.id)}
                  className={`inline-flex items-center gap-2 min-h-[40px] px-3.5 py-2 rounded-lg text-[12.5px] font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0284c7] dark:focus-visible:ring-[#38bdf8] ${
                    isSelected
                      ? 'bg-[#0284c7] dark:bg-[#1a9fff] text-white shadow-sm'
                      : 'bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 dark:bg-[#171d25] dark:hover:bg-[#1e2631] dark:text-[#b8c6d8] dark:border-white/[0.08]'
                  }`}
                >
                  <span>{tab.label}</span>
                  <span
                    className={`font-mono-tabular text-[11px] ${
                      isSelected ? 'text-white/85' : 'text-slate-500 dark:text-[#7f91a8]'
                    }`}
                  >
                    {tab.count}
                  </span>
                </button>
              );
            })}
          </div>

          <div className="relative w-full md:w-72 shrink-0">
            <MagnifyingGlass className="w-4 h-4 text-slate-400 dark:text-[#7f91a8] absolute start-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={t.searchPlaceholder}
              className="w-full min-h-[40px] ps-9 pe-8 py-2 rounded-lg bg-white dark:bg-[#171d25] border border-slate-200 dark:border-white/[0.08] focus:border-[#0284c7] dark:focus:border-[#38bdf8] text-[12.5px] text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-[#6f829a] focus:outline-none"
            />
            {searchQuery && (
              <button
                type="button"
                aria-label={tr.library.clear}
                onClick={() => setSearchQuery('')}
                className="absolute end-2 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-700 dark:hover:text-white cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* Downloads List / Empty State */}
        {filteredTasks.length === 0 ? (
          <div className="sa-ps5-panel rounded-xl bg-white dark:bg-[#171d25] border border-slate-200 dark:border-white/[0.08] py-14 px-6 text-center space-y-2.5">
            <div className="w-12 h-12 mx-auto rounded-xl bg-slate-100 dark:bg-[#11161d] border border-slate-200 dark:border-white/[0.08] flex items-center justify-center text-[#0284c7] dark:text-[#66c0f4]">
              <FileArrowDown weight="duotone" className="w-6 h-6" />
            </div>
            <h2 className="text-[15px] font-bold text-slate-900 dark:text-white">
              {t.emptyTitle}
            </h2>
            <p className="text-[12.5px] text-slate-500 dark:text-[#8b9bb4] max-w-md mx-auto leading-relaxed">
              {t.emptySubtitle}
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredTasks.map((task: DownloadTask) => (
              <DownloadTaskCard
                key={task.id}
                task={task}
                isDesktopApp={isDesktopApp}
                language={language}
                onPauseDownload={onPauseDownload}
                onResumeDownload={onResumeDownload}
                onCancelDownload={onCancelDownload}
                onRetryDownload={onRetryDownload}
                onRemoveDownload={onRemoveDownload}
                onOpenFolder={onOpenFolder}
                onOpenFile={onOpenFile}
                onOpenExternal={onOpenExternal}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
