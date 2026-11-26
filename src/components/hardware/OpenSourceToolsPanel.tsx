import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ArrowClockwise,
  ArrowCounterClockwise,
  ArrowSquareOut,
  CheckCircle,
  Code,
  DownloadSimple,
  FileText,
  GitBranch,
  Info,
  Package,
  ShieldCheck,
  WarningCircle,
  XCircle,
} from '@phosphor-icons/react';
import type { OpenSourceToolItemState, OpenSourceToolsManagerState } from '../../types';
import { getDesktopOpenSourceToolsBridge } from '../../services/hardwareMonitor';

interface OpenSourceToolsPanelProps {
  isDesktopApp: boolean;
  t: Record<string, string>;
}

const PREVIEW_TOOL_REFERENCE: OpenSourceToolItemState = {
  id: 'librehardwaremonitor',
  name: 'LibreHardwareMonitorLib',
  displayName: 'LibreHardwareMonitor (LibreHardwareMonitorLib)',
  category: 'sensors_telemetry',
  licenseId: 'MPL-2.0',
  licenseName: 'Mozilla Public License 2.0',
  licenseUrl: 'https://github.com/LibreHardwareMonitor/LibreHardwareMonitor/blob/master/LICENSE',
  repositoryUrl: 'https://github.com/LibreHardwareMonitor/LibreHardwareMonitor',
  websiteUrl: 'https://github.com/LibreHardwareMonitor/LibreHardwareMonitor',
  sourceCodeUrl: 'https://github.com/LibreHardwareMonitor/LibreHardwareMonitor',
  nugetUrl: 'https://www.nuget.org/packages/LibreHardwareMonitorLib/',
  officialReleasesUrl: 'https://github.com/LibreHardwareMonitor/LibreHardwareMonitor/releases/latest',
  supportsDirectLibrary: true,
  requiresStandaloneGui: false,
  requiresPermanentAdmin: false,
  description:
    'Open-source hardware sensor engine integrated directly via LibreHardwareMonitorLib.dll for CPU, GPU, motherboard, VRM, RAM, storage, fan RPM, voltage, clock, and power telemetry.',
  adminNote:
    'Runs safely under a standard user account for GPU, NVMe/storage, and memory telemetry. Kernel-level Ring0 motherboard SuperIO, VRM, voltage, and fan RPM sensors may require Administrator privileges when accessed.',
  stage: 'idle',
  statusBadge: 'not_installed',
  actionNeeded: 'install_required',
  installed: false,
  healthy: false,
  healthIssue: null,
  installedVersion: null,
  installedSource: null,
  installDirectory: null,
  libraryPath: null,
  hasBackup: false,
  backupVersion: null,
  latestRelease: null,
  updateAvailable: false,
  lastCheckedAt: null,
  lastRateLimitRemaining: null,
  progress: null,
  verification: null,
  error: null,
};

function formatBytesMb(bytes: number | null | undefined): string {
  if (typeof bytes !== 'number' || !Number.isFinite(bytes) || bytes <= 0) return '0 MB';
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

function formatDateReadable(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const parsed = Date.parse(raw);
  if (!Number.isFinite(parsed)) return null;
  return new Date(parsed).toLocaleString();
}

function LibreHardwareMonitorLogo() {
  return (
    <div className="w-11 h-11 rounded-xl bg-sky-500/12 dark:bg-[#38bdf8]/15 border border-sky-500/25 dark:border-[#38bdf8]/30 flex items-center justify-center shrink-0">
      <svg
        viewBox="0 0 32 32"
        className="w-6 h-6 text-[#0284c7] dark:text-[#38bdf8]"
        fill="none"
        aria-hidden="true"
      >
        <rect x="6" y="6" width="20" height="20" rx="4" stroke="currentColor" strokeWidth="2" />
        <path
          d="M10 16h3l2-5 3 10 2-5h2"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          d="M11 3v3M21 3v3M11 26v3M21 26v3M3 11h3M3 21h3M26 11h3M26 21h3"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
        />
      </svg>
    </div>
  );
}

export function OpenSourceToolsPanel({ isDesktopApp, t }: OpenSourceToolsPanelProps) {
  const bridge = useMemo(() => getDesktopOpenSourceToolsBridge(), []);
  const hasDesktopBridge = Boolean(isDesktopApp && bridge);

  const [managerState, setManagerState] = useState<OpenSourceToolsManagerState>({
    platform: typeof navigator !== 'undefined' ? navigator.platform : 'web',
    platformSupported: hasDesktopBridge,
    isElevated: null,
    approvedCount: 1,
    policySummary: t.ossPolicyDesc,
    tools: [PREVIEW_TOOL_REFERENCE],
  });

  const [pendingConfirm, setPendingConfirm] = useState<{
    toolId: string;
    mode: 'install' | 'rollback';
  } | null>(null);
  const [expandedNotesIds, setExpandedNotesIds] = useState<Record<string, boolean>>({});
  const [expandedLicenseNotice, setExpandedLicenseNotice] = useState<boolean>(false);
  const [busyAction, setBusyAction] = useState<string | null>(null);

  useEffect(() => {
    if (!hasDesktopBridge || !bridge) return;
    let active = true;
    void bridge.getState().then((st) => {
      if (active && st) setManagerState(st);
    });
    const unsubscribe = bridge.onStateChange((nextState) => {
      if (active && nextState) setManagerState(nextState);
    });
    return () => {
      active = false;
      unsubscribe();
    };
  }, [hasDesktopBridge, bridge]);

  const handleCheckUpdates = useCallback(
    async (toolId: string) => {
      if (!bridge) return;
      setBusyAction(`check:${toolId}`);
      try {
        const res = await bridge.checkUpdates({ toolId, force: true });
        if (res?.state) setManagerState(res.state);
      } finally {
        setBusyAction(null);
      }
    },
    [bridge]
  );

  const handleConfirmedInstallOrUpdate = useCallback(
    async (toolId: string) => {
      if (!bridge) return;
      setPendingConfirm(null);
      setBusyAction(`install:${toolId}`);
      try {
        const res = await bridge.installOrUpdate({ toolId, userConfirmed: true });
        if (res?.state) setManagerState(res.state);
      } finally {
        setBusyAction(null);
      }
    },
    [bridge]
  );

  const handleConfirmedRollback = useCallback(
    async (toolId: string) => {
      if (!bridge) return;
      setPendingConfirm(null);
      setBusyAction(`rollback:${toolId}`);
      try {
        const res = await bridge.rollback({ toolId, userConfirmed: true });
        if (res?.state) setManagerState(res.state);
      } finally {
        setBusyAction(null);
      }
    },
    [bridge]
  );

  const handleCancel = useCallback(
    async (toolId: string) => {
      if (!bridge) return;
      await bridge.cancel({ toolId });
    },
    [bridge]
  );

  const handleOpenLink = useCallback(
    (tool: OpenSourceToolItemState, kind: 'repository' | 'releases' | 'nuget' | 'license' | 'source') => {
      if (hasDesktopBridge && bridge) {
        void bridge.openExternalLink({ toolId: tool.id, kind });
        return;
      }
      const fallbackUrl =
        kind === 'repository'
          ? tool.repositoryUrl
          : kind === 'nuget'
          ? tool.nugetUrl
          : kind === 'license'
          ? tool.licenseUrl
          : kind === 'source'
          ? tool.sourceCodeUrl
          : tool.latestRelease?.releaseUrl || tool.officialReleasesUrl;
      if (typeof window !== 'undefined' && /^https:\/\//i.test(fallbackUrl)) {
        const anchor = document.createElement('a');
        anchor.href = fallbackUrl;
        anchor.target = '_blank';
        anchor.rel = 'noopener noreferrer';
        anchor.click();
      }
    },
    [hasDesktopBridge, bridge]
  );

  const getStatusLabel = (tool: OpenSourceToolItemState) => {
    switch (tool.statusBadge) {
      case 'up_to_date':
        return {
          text: t.ossStatusUpToDate,
          cls: 'bg-emerald-500/12 border-emerald-500/30 text-emerald-700 dark:text-[#34d399]',
        };
      case 'update_available':
        return {
          text: t.ossStatusUpdateAvailable,
          cls: 'bg-amber-500/12 border-amber-500/30 text-amber-700 dark:text-amber-300',
        };
      case 'newer_installed':
        return {
          text: t.ossStatusNewerInstalled,
          cls: 'bg-sky-500/12 border-sky-500/30 text-[#0284c7] dark:text-[#38bdf8]',
        };
      case 'repair_required':
        return {
          text: t.ossStatusRepairRequired,
          cls: 'bg-rose-500/12 border-rose-500/30 text-rose-700 dark:text-rose-300',
        };
      default:
        return {
          text: t.ossStatusNotInstalled,
          cls: 'bg-slate-100 dark:bg-white/[0.06] border-slate-200 dark:border-white/[0.1] text-slate-600 dark:text-[#9cb0c9]',
        };
    }
  };

  return (
    <div className="space-y-4">
      {/* Header & Strict Eligibility Policy Banner */}
      <section className="sa-ps5-panel rounded-xl bg-white dark:bg-[#171d25] border border-slate-200 dark:border-white/[0.08] p-4 sm:p-5 shadow-xs dark:shadow-md space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="space-y-1 min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="font-display text-[17px] font-bold text-slate-900 dark:text-white">
                {t.ossTitle}
              </h2>
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md text-[11px] font-semibold bg-emerald-500/12 border border-emerald-500/30 text-emerald-700 dark:text-[#34d399]">
                <ShieldCheck weight="duotone" className="w-3.5 h-3.5" />
                <span>{t.ossPolicyBadge}</span>
              </span>
            </div>
            <p className="text-[12.5px] text-slate-600 dark:text-[#9cb0c9]">
              {t.ossSubtitle}
            </p>
          </div>
        </div>

        <div className="rounded-lg bg-slate-50 dark:bg-[#11161d] border border-slate-200/80 dark:border-white/[0.07] px-3.5 py-2.5 text-[12px] text-slate-600 dark:text-[#9cb0c9] flex items-start gap-2.5">
          <Info weight="duotone" className="w-4 h-4 text-[#0284c7] dark:text-[#38bdf8] shrink-0 mt-0.5" />
          <span className="text-start">{t.ossPolicyDesc}</span>
        </div>

        {!hasDesktopBridge && (
          <div className="rounded-lg bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-400/30 px-3.5 py-2.5 text-[12px] text-amber-800 dark:text-amber-200 flex items-start gap-2.5">
            <WarningCircle weight="duotone" className="w-4 h-4 shrink-0 mt-0.5" />
            <span className="text-start">{t.ossWebPreviewNote}</span>
          </div>
        )}

        {hasDesktopBridge && !managerState.platformSupported && (
          <div className="rounded-lg bg-sky-50 dark:bg-sky-500/10 border border-sky-200 dark:border-sky-400/30 px-3.5 py-2.5 text-[12px] text-sky-800 dark:text-sky-200 flex items-start gap-2.5">
            <Info weight="duotone" className="w-4 h-4 shrink-0 mt-0.5" />
            <span className="text-start">{t.ossPlatformUnsupportedNote}</span>
          </div>
        )}
      </section>

      {/* Approved Open-Source Tools List */}
      <div className="space-y-4">
        {managerState.tools.map((tool) => {
          const statusMeta = getStatusLabel(tool);
          const isBusyStage =
            tool.stage === 'checking' ||
            tool.stage === 'downloading' ||
            tool.stage === 'verifying' ||
            tool.stage === 'installing';
          const isTransferring =
            tool.stage === 'downloading' ||
            tool.stage === 'verifying' ||
            tool.stage === 'installing';
          const notesExpanded = Boolean(expandedNotesIds[tool.id]);
          const releaseDateStr = formatDateReadable(tool.latestRelease?.releaseDate);
          const lastCheckedStr = formatDateReadable(tool.lastCheckedAt);
          const confirmingThis = pendingConfirm?.toolId === tool.id ? pendingConfirm.mode : null;

          return (
            <article
              key={tool.id}
              className="sa-ps5-panel rounded-xl bg-white dark:bg-[#171d25] border border-slate-200 dark:border-white/[0.08] p-4 sm:p-5 shadow-xs dark:shadow-md space-y-4"
            >
              {/* Top Tool Identity Header */}
              <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
                <div className="flex items-start gap-3.5 min-w-0">
                  <LibreHardwareMonitorLogo />
                  <div className="space-y-1.5 min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="font-display text-[16px] font-bold text-slate-900 dark:text-white">
                        {tool.displayName}
                      </h3>
                      <span
                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md border text-[11px] font-semibold ${statusMeta.cls}`}
                      >
                        {tool.statusBadge === 'up_to_date' && <CheckCircle weight="fill" className="w-3.5 h-3.5" />}
                        {tool.statusBadge === 'update_available' && <WarningCircle weight="fill" className="w-3.5 h-3.5" />}
                        <span>{statusMeta.text}</span>
                      </span>
                      <button
                        type="button"
                        onClick={() => handleOpenLink(tool, 'license')}
                        className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md border border-sky-500/25 dark:border-[#38bdf8]/30 bg-sky-500/10 dark:bg-[#38bdf8]/12 text-[#0284c7] dark:text-[#38bdf8] text-[11px] font-semibold hover:bg-sky-500/20 transition-colors cursor-pointer"
                      >
                        <ShieldCheck weight="duotone" className="w-3.5 h-3.5" />
                        <span>{tool.licenseId}</span>
                      </button>
                      {tool.supportsDirectLibrary && !tool.requiresStandaloneGui && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md border border-slate-200 dark:border-white/[0.1] bg-slate-100 dark:bg-white/[0.05] text-slate-700 dark:text-[#cbd5e1] text-[11px] font-medium">
                          <Package weight="duotone" className="w-3.5 h-3.5" />
                          <span>{t.ossDirectLibBadge}</span>
                        </span>
                      )}
                    </div>

                    <p className="text-[12.5px] text-slate-600 dark:text-[#9cb0c9] text-start">
                      {tool.description}
                    </p>

                    {/* Official Repository / Source / Releases / NuGet / License Links */}
                    <div className="flex flex-wrap items-center gap-2 pt-1">
                      <button
                        type="button"
                        onClick={() => handleOpenLink(tool, 'repository')}
                        className="inline-flex items-center gap-1.5 text-[11.5px] font-semibold text-[#0284c7] dark:text-[#38bdf8] hover:underline cursor-pointer"
                      >
                        <GitBranch className="w-3.5 h-3.5" />
                        <span>{t.ossLinkRepo}</span>
                        <ArrowSquareOut className="w-3 h-3" />
                      </button>
                      <span aria-hidden="true" className="text-slate-300 dark:text-white/20">•</span>
                      <button
                        type="button"
                        onClick={() => handleOpenLink(tool, 'releases')}
                        className="inline-flex items-center gap-1.5 text-[11.5px] font-semibold text-[#0284c7] dark:text-[#38bdf8] hover:underline cursor-pointer"
                      >
                        <span>{t.ossLinkReleases}</span>
                        <ArrowSquareOut className="w-3 h-3" />
                      </button>
                      <span aria-hidden="true" className="text-slate-300 dark:text-white/20">•</span>
                      <button
                        type="button"
                        onClick={() => handleOpenLink(tool, 'nuget')}
                        className="inline-flex items-center gap-1.5 text-[11.5px] font-semibold text-[#0284c7] dark:text-[#38bdf8] hover:underline cursor-pointer"
                      >
                        <span>{t.ossLinkNuget}</span>
                        <ArrowSquareOut className="w-3 h-3" />
                      </button>
                      <span aria-hidden="true" className="text-slate-300 dark:text-white/20">•</span>
                      <button
                        type="button"
                        onClick={() => handleOpenLink(tool, 'source')}
                        className="inline-flex items-center gap-1.5 text-[11.5px] font-semibold text-[#0284c7] dark:text-[#38bdf8] hover:underline cursor-pointer"
                      >
                        <Code className="w-3.5 h-3.5" />
                        <span>{t.ossLinkSource}</span>
                        <ArrowSquareOut className="w-3 h-3" />
                      </button>
                      <span aria-hidden="true" className="text-slate-300 dark:text-white/20">•</span>
                      <button
                        type="button"
                        onClick={() => handleOpenLink(tool, 'license')}
                        className="inline-flex items-center gap-1.5 text-[11.5px] font-semibold text-[#0284c7] dark:text-[#38bdf8] hover:underline cursor-pointer"
                      >
                        <span>{t.ossLinkLicense}</span>
                        <ArrowSquareOut className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex flex-wrap items-center gap-2 shrink-0">
                  <button
                    type="button"
                    disabled={!hasDesktopBridge || isBusyStage || busyAction !== null}
                    onClick={() => void handleCheckUpdates(tool.id)}
                    className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-[12px] font-semibold border border-slate-200 dark:border-white/[0.1] bg-slate-50 hover:bg-slate-100 dark:bg-white/[0.04] dark:hover:bg-white/[0.08] text-slate-700 dark:text-white disabled:opacity-50 transition-colors cursor-pointer"
                  >
                    <ArrowClockwise
                      className={`w-3.5 h-3.5 ${tool.stage === 'checking' ? 'motion-safe:animate-spin' : ''}`}
                    />
                    <span>
                      {tool.stage === 'checking' ? t.ossCheckingBtn : t.ossCheckUpdatesBtn}
                    </span>
                  </button>

                  {isTransferring ? (
                    <button
                      type="button"
                      onClick={() => void handleCancel(tool.id)}
                      className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-[12px] font-semibold bg-rose-600 hover:bg-rose-500 text-white transition-colors cursor-pointer"
                    >
                      <XCircle className="w-4 h-4" />
                      <span>{t.ossCancelBtn}</span>
                    </button>
                  ) : (
                    <>
                      <button
                        type="button"
                        disabled={!hasDesktopBridge || !managerState.platformSupported || isBusyStage || busyAction !== null}
                        onClick={() => setPendingConfirm({ toolId: tool.id, mode: 'install' })}
                        className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-[12px] font-semibold bg-[#0284c7] hover:bg-[#0369a1] dark:bg-[#0ea5e9] dark:hover:bg-[#38bdf8] text-white disabled:opacity-50 transition-colors cursor-pointer"
                      >
                        <DownloadSimple className="w-4 h-4" />
                        <span>
                          {!tool.installed
                            ? t.ossInstallBtn
                            : tool.updateAvailable
                            ? t.ossUpdateBtn
                            : t.ossReinstallBtn}
                        </span>
                      </button>

                      {tool.hasBackup && (
                        <button
                          type="button"
                          disabled={!hasDesktopBridge || isBusyStage || busyAction !== null}
                          onClick={() => setPendingConfirm({ toolId: tool.id, mode: 'rollback' })}
                          className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-[12px] font-semibold border border-amber-300 dark:border-amber-400/30 bg-amber-50 hover:bg-amber-100 dark:bg-amber-500/10 dark:hover:bg-amber-500/20 text-amber-800 dark:text-amber-200 disabled:opacity-50 transition-colors cursor-pointer"
                        >
                          <ArrowCounterClockwise className="w-3.5 h-3.5" />
                          <span>
                            {t.ossRollbackBtn}
                            {tool.backupVersion ? ` (v${tool.backupVersion})` : ''}
                          </span>
                        </button>
                      )}
                    </>
                  )}
                </div>
              </div>

              {/* Explicit User Confirmation Prompt */}
              {confirmingThis && (
                <div className="rounded-xl border border-sky-300 dark:border-[#38bdf8]/40 bg-sky-50/90 dark:bg-[#0e1e2e] p-3.5 space-y-2.5">
                  <div className="flex items-start gap-2.5">
                    <ShieldCheck weight="duotone" className="w-5 h-5 text-[#0284c7] dark:text-[#38bdf8] shrink-0 mt-0.5" />
                    <div className="space-y-1 min-w-0">
                      <h4 className="text-[13px] font-bold text-slate-900 dark:text-white">
                        {t.ossConfirmDownloadTitle}
                      </h4>
                      <p className="text-[12px] text-slate-600 dark:text-[#cbd5e1]">
                        {confirmingThis === 'rollback'
                          ? t.ossConfirmRollbackDesc
                          : t.ossConfirmDownloadDesc}
                      </p>
                      {confirmingThis === 'install' && tool.latestRelease && (
                        <p dir="ltr" className="text-[11.5px] font-mono-tabular text-slate-500 dark:text-[#9cb0c9]">
                          {tool.latestRelease.assetName} · v{tool.latestRelease.version} ({tool.latestRelease.sourceType === 'github_release' ? 'GitHub Releases' : 'NuGet'})
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center gap-2 ps-7">
                    <button
                      type="button"
                      onClick={() =>
                        confirmingThis === 'rollback'
                          ? void handleConfirmedRollback(tool.id)
                          : void handleConfirmedInstallOrUpdate(tool.id)
                      }
                      className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-[12px] font-semibold bg-[#0284c7] hover:bg-[#0369a1] dark:bg-[#0ea5e9] dark:hover:bg-[#38bdf8] text-white cursor-pointer"
                    >
                      <CheckCircle weight="fill" className="w-3.5 h-3.5" />
                      <span>{t.ossConfirmProceedBtn}</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setPendingConfirm(null)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-semibold border border-slate-200 dark:border-white/[0.12] bg-white dark:bg-[#171d25] text-slate-700 dark:text-[#cbd5e1] cursor-pointer"
                    >
                      <span>{t.ossCancelBtn}</span>
                    </button>
                  </div>
                </div>
              )}

              {/* Version & Check Metadata Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                <div className="sa-ps5-subpanel rounded-lg bg-slate-50 dark:bg-[#11161d] border border-slate-200/80 dark:border-white/[0.07] p-3">
                  <div className="text-[11px] text-slate-500 dark:text-[#8b9bb4]">
                    {t.ossInstalledVersionLabel}
                  </div>
                  <div dir="ltr" className="mt-1 text-[13.5px] font-bold font-mono-tabular text-slate-900 dark:text-white">
                    {tool.installed && tool.installedVersion ? `v${tool.installedVersion}` : t.ossStatusNotInstalled}
                  </div>
                </div>

                <div className="sa-ps5-subpanel rounded-lg bg-slate-50 dark:bg-[#11161d] border border-slate-200/80 dark:border-white/[0.07] p-3">
                  <div className="text-[11px] text-slate-500 dark:text-[#8b9bb4]">
                    {t.ossLatestVersionLabel}
                  </div>
                  <div dir="ltr" className="mt-1 text-[13.5px] font-bold font-mono-tabular text-[#0284c7] dark:text-[#38bdf8]">
                    {tool.latestRelease?.version ? `v${tool.latestRelease.version}` : t.naValue}
                  </div>
                </div>

                <div className="sa-ps5-subpanel rounded-lg bg-slate-50 dark:bg-[#11161d] border border-slate-200/80 dark:border-white/[0.07] p-3">
                  <div className="text-[11px] text-slate-500 dark:text-[#8b9bb4]">
                    {t.ossReleaseDateLabel}
                  </div>
                  <div dir="ltr" className="mt-1 text-[12px] font-semibold font-mono-tabular text-slate-800 dark:text-[#e2eaf4] truncate">
                    {releaseDateStr || t.naValue}
                  </div>
                </div>

                <div className="sa-ps5-subpanel rounded-lg bg-slate-50 dark:bg-[#11161d] border border-slate-200/80 dark:border-white/[0.07] p-3">
                  <div className="text-[11px] text-slate-500 dark:text-[#8b9bb4]">
                    {t.ossLastCheckedLabel}
                  </div>
                  <div dir="ltr" className="mt-1 text-[12px] font-semibold font-mono-tabular text-slate-800 dark:text-[#e2eaf4] truncate">
                    {lastCheckedStr || t.naValue}
                  </div>
                </div>
              </div>

              {/* Active Download / Verification Progress Bar */}
              {isTransferring && (
                <div className="rounded-lg bg-slate-50 dark:bg-[#11161d] border border-slate-200/80 dark:border-white/[0.07] p-3 space-y-2">
                  <div className="flex items-center justify-between gap-2 text-[12px] font-semibold text-slate-700 dark:text-[#cbd5e1]">
                    <span>
                      {tool.stage === 'downloading'
                        ? t.ossStageDownloading
                        : tool.stage === 'verifying'
                        ? t.ossStageVerifying
                        : t.ossStageInstalling}
                    </span>
                    <span dir="ltr" className="font-mono-tabular">
                      {tool.progress ? `${Math.round(tool.progress.percent)}% · ${formatBytesMb(tool.progress.downloadedBytes)} / ${formatBytesMb(tool.progress.totalBytes)}` : '...'}
                    </span>
                  </div>
                  <div className="h-2 rounded-full bg-slate-200 dark:bg-white/[0.08] overflow-hidden">
                    <div
                      className="h-full bg-[#0284c7] dark:bg-[#38bdf8] transition-all duration-150"
                      style={{ width: `${Math.min(100, Math.max(4, tool.progress?.percent || 10))}%` }}
                    />
                  </div>
                </div>
              )}

              {/* SHA-256 & Verification Details */}
              {tool.verification && (
                <div className="flex flex-wrap items-center gap-2 text-[11.5px]">
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-emerald-500/10 border border-emerald-500/25 text-emerald-700 dark:text-[#34d399] font-semibold">
                    <ShieldCheck weight="fill" className="w-3.5 h-3.5" />
                    <span>{t.ossShaVerifiedBadge}</span>
                  </span>
                  {tool.verification.sha256Actual && (
                    <span dir="ltr" className="font-mono-tabular text-slate-500 dark:text-[#8b9bb4] truncate max-w-full">
                      SHA-256: {tool.verification.sha256Actual}
                    </span>
                  )}
                </div>
              )}

              {/* Error Banner */}
              {(tool.error || tool.healthIssue) && (
                <div className="rounded-lg bg-rose-50 dark:bg-rose-500/10 border border-rose-200 dark:border-rose-400/30 px-3.5 py-2.5 text-[12px] text-rose-700 dark:text-rose-300 flex items-start gap-2">
                  <WarningCircle weight="duotone" className="w-4 h-4 shrink-0 mt-0.5" />
                  <span className="text-start">{tool.error || tool.healthIssue}</span>
                </div>
              )}

              {/* Standard User & Admin-Optional Sensor Access Guidance */}
              <div className="rounded-lg bg-slate-50 dark:bg-[#11161d] border border-slate-200/80 dark:border-white/[0.07] px-3.5 py-2.5 space-y-1">
                <div className="text-[12px] font-semibold text-slate-800 dark:text-white">
                  {t.ossAdminTitle}
                </div>
                <p className="text-[11.5px] text-slate-600 dark:text-[#9cb0c9] text-start">
                  {managerState.isElevated ? t.ossAdminDescElevated : t.ossAdminDescStandard}
                </p>
              </div>

              {/* Release Notes Collapsible Box */}
              <div className="border-t border-slate-100 dark:border-white/[0.06] pt-3">
                <button
                  type="button"
                  onClick={() =>
                    setExpandedNotesIds((prev) => ({ ...prev, [tool.id]: !prev[tool.id] }))
                  }
                  className="inline-flex items-center gap-1.5 text-[12px] font-semibold text-[#0284c7] dark:text-[#38bdf8] hover:underline cursor-pointer"
                >
                  <FileText className="w-3.5 h-3.5" />
                  <span>{t.ossReleaseNotesLabel}</span>
                </button>
                {notesExpanded && (
                  <pre className="mt-2.5 rounded-lg bg-slate-50 dark:bg-[#11161d] border border-slate-200/80 dark:border-white/[0.07] p-3 text-[11.5px] font-sans whitespace-pre-wrap text-slate-700 dark:text-[#cbd5e1] max-h-64 overflow-y-auto text-start">
                    {tool.latestRelease?.releaseNotes || t.ossNoReleaseNotes}
                  </pre>
                )}
              </div>
            </article>
          );
        })}
      </div>

      {/* Third-Party Open-Source License Compliance Summary */}
      <section className="sa-ps5-panel rounded-xl bg-white dark:bg-[#171d25] border border-slate-200 dark:border-white/[0.08] p-4 sm:p-5 shadow-xs dark:shadow-md space-y-2.5">
        <button
          type="button"
          onClick={() => setExpandedLicenseNotice((prev) => !prev)}
          className="w-full flex items-center justify-between gap-3 text-start cursor-pointer"
        >
          <div className="flex items-center gap-2 min-w-0">
            <ShieldCheck weight="duotone" className="w-4.5 h-4.5 text-[#0284c7] dark:text-[#38bdf8] shrink-0" />
            <span className="text-[13px] font-bold text-slate-900 dark:text-white truncate">
              {t.ossThirdPartyTitle}
            </span>
          </div>
          <span className="text-[11px] font-semibold text-[#0284c7] dark:text-[#38bdf8] shrink-0">
            MPL-2.0
          </span>
        </button>
        {expandedLicenseNotice && (
          <div className="pt-1 text-[12px] text-slate-600 dark:text-[#9cb0c9] space-y-1.5 text-start">
            <p>{t.ossThirdPartyDesc}</p>
            <p dir="ltr" className="font-mono-tabular text-[11.5px] text-slate-500 dark:text-[#8b9bb4]">
              Repository: https://github.com/LibreHardwareMonitor/LibreHardwareMonitor · License: https://github.com/LibreHardwareMonitor/LibreHardwareMonitor/blob/master/LICENSE
            </p>
          </div>
        )}
      </section>
    </div>
  );
}
