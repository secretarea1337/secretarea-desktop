import { memo, useEffect, useMemo, useState, type ComponentType } from 'react';
import {
  ArrowSquareOut,
  ArrowsIn,
  Bell,
  CornersOut,
  Cpu,
  DownloadSimple,
  Gear,
  GraphicsCard,
  Memory,
  SpeakerHigh,
  SpeakerSlash,
  SpinnerGap,
  Thermometer,
  WifiHigh,
} from '@phosphor-icons/react';
import type { HardwareMonitorSnapshot, PrimarySection } from '../types';
import type { AppLanguage, AppThemeMode } from '../services/launcherSettings';
import {
  formatStorageBytes,
  getDesktopHardwareMonitorBridge,
  isValidMetric,
  selectPrimaryGpu,
} from '../services/hardwareMonitor';
import { getTranslations } from '../i18n/translations';

interface TopUtilityBarProps {
  activeTheme: AppThemeMode;
  activeSection: PrimarySection;
  onSelectSection: (section: PrimarySection) => void;
  activeDownloadsCount?: number;
  soundEnabled: boolean;
  isFullscreen: boolean;
  onToggleSound: () => void;
  onToggleFullscreen: () => void;
  desktopVersion?: string | null;
  updateBadgeStatus?: 'none' | 'checking' | 'available' | 'downloading' | 'downloaded';
  onOpenUpdates?: () => void;
  onOpenUpdateHistory?: () => void;
  unreadNotificationsCount?: number;
  isNotificationCenterOpen?: boolean;
  onOpenNotifications?: () => void;
  hardwareSnapshot?: HardwareMonitorSnapshot | null;
  telemetryIntervalMs?: number;
  language?: AppLanguage;
}

function formatCompactPercent(value: number | null | undefined): string {
  if (!isValidMetric(value)) return '--';
  const clamped = Math.max(0, Math.min(100, Math.round(value)));
  return `${clamped}%`;
}

function formatCompactNetSpeed(bytesPerSec: number | null | undefined): string {
  if (!isValidMetric(bytesPerSec) || bytesPerSec < 0) return '--';
  const mb = bytesPerSec / (1024 * 1024);
  if (mb >= 1) {
    return `${mb >= 10 ? Math.round(mb) : mb.toFixed(1)} MB/s`;
  }
  const kb = bytesPerSec / 1024;
  return `${Math.round(kb)} KB/s`;
}

function formatCompactTemp(celsius: number | null | undefined): string {
  if (!isValidMetric(celsius) || celsius <= 0) return '--';
  return `${Math.round(celsius)}°C`;
}

const TopHardwareTelemetryStrip = memo(function TopHardwareTelemetryStrip({
  activeTheme,
  activeSection,
  onSelectSection,
  hasConsoleAudio,
  externalSnapshot,
  telemetryIntervalMs = 4000,
  label,
}: {
  activeTheme: AppThemeMode;
  activeSection: PrimarySection;
  onSelectSection: (section: PrimarySection) => void;
  hasConsoleAudio: boolean;
  externalSnapshot?: HardwareMonitorSnapshot | null;
  telemetryIntervalMs?: number;
  label: string;
}) {
  const hardwareBridge = useMemo(() => getDesktopHardwareMonitorBridge(), []);
  const [liveSnapshot, setLiveSnapshot] = useState<HardwareMonitorSnapshot | null>(null);
  const pollIntervalMs = Math.max(2000, Math.min(30000, Number(telemetryIntervalMs) || 4000));

  useEffect(() => {
    if (!hardwareBridge) return;
    let active = true;

    const unsubscribe = hardwareBridge.onUpdate((snap) => {
      if (active && snap) {
        setLiveSnapshot(snap);
      }
    });

    const fetchOnce = () => {
      if (!active || document.hidden || !document.hasFocus()) return;
      void hardwareBridge.getSnapshot().then((snap) => {
        if (active && snap) {
          setLiveSnapshot(snap);
        }
      });
    };

    if (!document.hidden) {
      void hardwareBridge.getSnapshot().then((snap) => {
        if (active && snap) {
          setLiveSnapshot(snap);
        }
      });
    }

    if (activeSection === 'hardware') {
      return () => {
        active = false;
        unsubscribe();
      };
    }

    const timer = window.setInterval(fetchOnce, pollIntervalMs);
    const handleRestore = () => {
      if (!document.hidden && document.hasFocus()) {
        fetchOnce();
      }
    };
    document.addEventListener('visibilitychange', handleRestore);
    window.addEventListener('focus', handleRestore);

    return () => {
      active = false;
      unsubscribe();
      window.clearInterval(timer);
      document.removeEventListener('visibilitychange', handleRestore);
      window.removeEventListener('focus', handleRestore);
    };
  }, [hardwareBridge, activeSection, pollIntervalMs]);

  const hardwareSnapshot = externalSnapshot ?? liveSnapshot;
  const isPs5Theme = activeTheme === 'ps5';
  const isXboxTheme = activeTheme === 'xbox';

  const primaryGpu = selectPrimaryGpu(hardwareSnapshot?.gpus);
  const gpuUtil = primaryGpu?.utilizationPercent ?? null;
  const cpuUtil = hardwareSnapshot?.cpu?.usagePercent ?? null;
  const ramUtil = hardwareSnapshot?.ram?.usagePercent ?? null;
  const netDownBytes =
    hardwareSnapshot?.network?.totalDownloadBytesPerSec ??
    hardwareSnapshot?.network?.activeInterface?.downloadBytesPerSec ??
    null;
  const cpuTemp = hardwareSnapshot?.cpu?.temperatureCelsius ?? null;
  const gpuTemps = (hardwareSnapshot?.gpus || [])
    .map((g) => g?.temperatureCelsius)
    .filter((temp): temp is number => isValidMetric(temp) && temp > 0);
  const gpuTemp =
    isValidMetric(primaryGpu?.temperatureCelsius) && primaryGpu.temperatureCelsius > 0
      ? primaryGpu.temperatureCelsius
      : gpuTemps.length > 0
      ? Math.max(...gpuTemps)
      : null;
  const validTemps = [cpuTemp, ...gpuTemps].filter(
    (temp): temp is number => isValidMetric(temp) && temp > 0
  );
  const pcTemp = validTemps.length > 0 ? Math.max(...validTemps) : null;

  const getLoadColorClass = (pct: number | null | undefined) => {
    if (!isValidMetric(pct)) {
      return isPs5Theme
        ? 'text-white/55'
        : isXboxTheme
        ? 'text-[#b7dab9]/70'
        : 'text-slate-400 dark:text-[#7c8da6]';
    }
    if (pct >= 88) return 'text-rose-500 dark:text-[#fb7185]';
    if (pct >= 70) return 'text-amber-500 dark:text-[#fbbf24]';
    return isPs5Theme
      ? 'text-[#7cc4ff]'
      : isXboxTheme
      ? 'text-[#6ee755]'
      : 'text-[#0284c7] dark:text-[#38bdf8]';
  };

  const getTempColorClass = (temp: number | null | undefined) => {
    if (!isValidMetric(temp) || temp <= 0) {
      return isPs5Theme
        ? 'text-white/55'
        : isXboxTheme
        ? 'text-[#b7dab9]/70'
        : 'text-slate-400 dark:text-[#7c8da6]';
    }
    if (temp >= 85) return 'text-rose-500 dark:text-[#fb7185]';
    if (temp >= 72) return 'text-amber-500 dark:text-[#fbbf24]';
    return isXboxTheme ? 'text-[#6ee755]' : 'text-emerald-600 dark:text-[#34d399]';
  };

  const gpuTooltip = primaryGpu?.model
    ? `GPU (${primaryGpu.model}): ${formatCompactPercent(gpuUtil)}`
    : `GPU: ${formatCompactPercent(gpuUtil)}`;
  const cpuTooltip = hardwareSnapshot?.cpu?.model
    ? `CPU (${hardwareSnapshot.cpu.model}): ${formatCompactPercent(cpuUtil)}`
    : `CPU: ${formatCompactPercent(cpuUtil)}`;
  const ramTooltip =
    isValidMetric(hardwareSnapshot?.ram?.usedBytes) &&
    isValidMetric(hardwareSnapshot?.ram?.totalBytes)
      ? `RAM: ${formatStorageBytes(hardwareSnapshot.ram.usedBytes)} / ${formatStorageBytes(
          hardwareSnapshot.ram.totalBytes
        )} (${formatCompactPercent(ramUtil)})`
      : `RAM: ${formatCompactPercent(ramUtil)}`;
  const wifiTooltip = hardwareSnapshot?.network?.activeInterface
    ? `${hardwareSnapshot.network.activeInterface.displayName}: ↓ ${formatCompactNetSpeed(
        netDownBytes
      )}${
        isValidMetric(hardwareSnapshot.network.activeInterface.speedMbps)
          ? ` (${hardwareSnapshot.network.activeInterface.speedMbps} Mbps)`
          : ''
      }`
    : `Wi-Fi Speed: ${formatCompactNetSpeed(netDownBytes)}`;
  const tempTooltip = [
    isValidMetric(cpuTemp) && cpuTemp > 0 ? `CPU: ${Math.round(cpuTemp)}°C` : null,
    isValidMetric(gpuTemp) && gpuTemp > 0 ? `GPU: ${Math.round(gpuTemp)}°C` : null,
  ]
    .filter(Boolean)
    .join(' · ') || `PC Temperature: ${formatCompactTemp(pcTemp)}`;

  return (
    <button
      type="button"
      dir="ltr"
      onClick={() => onSelectSection('hardware')}
      title={label}
      aria-label={label}
      className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1 overflow-x-auto no-scrollbar font-mono-tabular text-start cursor-pointer hover:opacity-90 transition-opacity"
    >
      {/* GPU */}
      <span
        title={gpuTooltip}
        className="inline-flex items-center gap-1 whitespace-nowrap shrink-0"
      >
        <GraphicsCard className={`w-3.5 h-3.5 shrink-0 ${getLoadColorClass(gpuUtil)}`} />
        <span
          className={`font-semibold ${
            hasConsoleAudio ? 'text-white/95' : 'text-slate-800 dark:text-[#e2e8f0]'
          }`}
        >
          {formatCompactPercent(gpuUtil)}
        </span>
      </span>

      {/* CPU */}
      <span
        title={cpuTooltip}
        className="inline-flex items-center gap-1 whitespace-nowrap shrink-0"
      >
        <Cpu className={`w-3.5 h-3.5 shrink-0 ${getLoadColorClass(cpuUtil)}`} />
        <span
          className={`font-semibold ${
            hasConsoleAudio ? 'text-white/95' : 'text-slate-800 dark:text-[#e2e8f0]'
          }`}
        >
          {formatCompactPercent(cpuUtil)}
        </span>
      </span>

      {/* RAM */}
      <span
        title={ramTooltip}
        className="inline-flex items-center gap-1 whitespace-nowrap shrink-0"
      >
        <Memory className={`w-3.5 h-3.5 shrink-0 ${getLoadColorClass(ramUtil)}`} />
        <span
          className={`font-semibold ${
            hasConsoleAudio ? 'text-white/95' : 'text-slate-800 dark:text-[#e2e8f0]'
          }`}
        >
          {formatCompactPercent(ramUtil)}
        </span>
      </span>

      {/* Wi-Fi / Network Speed */}
      <span
        title={wifiTooltip}
        className="inline-flex items-center gap-1 whitespace-nowrap shrink-0"
      >
        <WifiHigh
          className={`w-3.5 h-3.5 shrink-0 ${
            isPs5Theme
              ? 'text-[#7cc4ff]'
              : isXboxTheme
              ? 'text-[#6ee755]'
              : 'text-[#0284c7] dark:text-[#38bdf8]'
          }`}
        />
        <span
          className={`font-semibold ${
            hasConsoleAudio ? 'text-white/95' : 'text-slate-800 dark:text-[#e2e8f0]'
          }`}
        >
          {formatCompactNetSpeed(netDownBytes)}
        </span>
      </span>

      {/* PC Temperature */}
      <span
        title={tempTooltip}
        className="inline-flex items-center gap-1 whitespace-nowrap shrink-0"
      >
        <Thermometer className={`w-3.5 h-3.5 shrink-0 ${getTempColorClass(pcTemp)}`} />
        <span
          className={`font-semibold ${
            hasConsoleAudio ? 'text-white/95' : 'text-slate-800 dark:text-[#e2e8f0]'
          }`}
        >
          {formatCompactTemp(pcTemp)}
        </span>
      </span>
    </button>
  );
});

export const TopUtilityBar = memo(function TopUtilityBar({
  activeTheme,
  activeSection,
  onSelectSection,
  activeDownloadsCount = 0,
  soundEnabled,
  isFullscreen,
  onToggleSound,
  onToggleFullscreen,
  desktopVersion = null,
  updateBadgeStatus = 'none',
  onOpenUpdates,
  onOpenUpdateHistory,
  unreadNotificationsCount = 0,
  isNotificationCenterOpen = false,
  onOpenNotifications,
  hardwareSnapshot = null,
  telemetryIntervalMs = 4000,
  language = 'en',
}: TopUtilityBarProps) {
  const t = getTranslations(language);

  const isPs5Theme = activeTheme === 'ps5';
  const isXboxTheme = activeTheme === 'xbox';
  const hasConsoleAudio = isPs5Theme || isXboxTheme;

  const utilityNavItems: {
    id: PrimarySection;
    label: string;
    icon: ComponentType<{ className?: string }>;
    count?: number;
  }[] = [
    {
      id: 'downloads',
      label: t.nav.downloads,
      icon: DownloadSimple,
      count: activeDownloadsCount > 0 ? activeDownloadsCount : undefined,
    },
    { id: 'hardware', label: t.nav.hardwareMonitor, icon: Cpu },
    { id: 'settings', label: t.nav.settings, icon: Gear },
  ];

  return (
    <div
      className={`sa-topbar relative z-30 h-9 shrink-0 select-none border-b transition-colors duration-200 ${
        isPs5Theme
          ? 'bg-[#020f2b]/85 border-white/[0.12] text-white/90 backdrop-blur-md shadow-[0_4px_20px_rgba(0,6,20,0.45)]'
          : isXboxTheme
          ? 'bg-[#071509]/88 border-[#52e042]/22 text-[#e8f8ea] backdrop-blur-md shadow-[0_4px_20px_rgba(2,14,4,0.5)]'
          : 'bg-slate-50/95 border-slate-200/80 text-slate-600 dark:bg-[#0b0f16]/95 dark:border-white/[0.06] dark:text-[#9fb0c7]'
      }`}
    >
      <div className="w-full max-w-[1600px] mx-auto h-full px-3 sm:px-5 lg:px-8 flex items-center justify-between gap-2 text-[11.5px]">
      {/* Left Zone: Live Desktop Hardware Telemetry (GPU, CPU, RAM, Wi-Fi Speed, PC Temp — Icon & Value Only) */}
      <TopHardwareTelemetryStrip
        activeTheme={activeTheme}
        activeSection={activeSection}
        onSelectSection={onSelectSection}
        hasConsoleAudio={hasConsoleAudio}
        externalSnapshot={hardwareSnapshot}
        telemetryIntervalMs={telemetryIntervalMs}
        label={t.nav.hardwareMonitor}
      />

      {/* Center Zone: Clickable SecretArea Web Version Link */}
      <div className="flex items-center justify-center shrink-0">
        <a
          href="https://www.secretarea.site"
          target="_blank"
          rel="noopener noreferrer"
          title="Open https://www.secretarea.site"
          className={`inline-flex items-center gap-1.5 font-semibold tracking-[0.02em] whitespace-nowrap transition-colors ${
            isPs5Theme
              ? 'text-white/90 hover:text-white drop-shadow-[0_1px_6px_rgba(0,118,255,0.45)]'
              : isXboxTheme
              ? 'text-[#dcfce0] hover:text-[#6ee755] drop-shadow-[0_1px_6px_rgba(82,224,66,0.35)]'
              : 'text-slate-800 hover:text-[#1a9fff] dark:text-[#d4e2f4] dark:hover:text-[#1a9fff]'
          }`}
        >
          <span>{t.topbar.webVersion}</span>
          <ArrowSquareOut className="w-3.5 h-3.5 opacity-80 shrink-0" />
        </a>
      </div>

      {/* Right Zone: Desktop Version / Updates + Sound + Utility Nav (Downloads, Hardware Monitor, Settings) + Fullscreen */}
      <div className="flex items-center justify-end gap-1.5 flex-1 min-w-0">
        {desktopVersion && onOpenUpdates ? (
          <button
            type="button"
            onClick={onOpenUpdates}
            title={t.topbar.updatesTitle}
            aria-label={t.topbar.updatesTitle}
            className={`relative inline-flex items-center gap-1.5 px-2 py-1 rounded text-[11px] font-semibold font-mono-tabular transition-colors cursor-pointer shrink-0 ${
              isPs5Theme
                ? 'rounded-full bg-white/[0.1] hover:bg-white/[0.2] text-white/90 border border-white/[0.16]'
                : isXboxTheme
                ? 'rounded-md bg-[#122b15] hover:bg-[#183b1c] text-[#e7fce9] border border-[#52e042]/30 hover:border-[#6ee755]/75'
                : 'bg-slate-100 hover:bg-slate-200 text-slate-700 hover:text-slate-900 border border-slate-300 dark:bg-[#1a222d] dark:hover:bg-[#243040] dark:text-[#c7d5e8] dark:hover:text-white dark:border-white/[0.08]'
            }`}
          >
            {updateBadgeStatus === 'checking' || updateBadgeStatus === 'downloading' ? (
              <SpinnerGap
                className={`w-3.5 h-3.5 animate-spin shrink-0 ${
                  isXboxTheme ? 'text-[#6ee755]' : 'text-[#66c0f4]'
                }`}
              />
            ) : updateBadgeStatus === 'available' || updateBadgeStatus === 'downloaded' ? (
              <DownloadSimple
                className={`w-3.5 h-3.5 shrink-0 ${
                  updateBadgeStatus === 'downloaded'
                    ? 'text-[#34d399]'
                    : isXboxTheme
                    ? 'text-[#6ee755]'
                    : 'text-[#66c0f4]'
                }`}
              />
            ) : null}
            <span dir="ltr">v{desktopVersion}</span>
            {(updateBadgeStatus === 'available' || updateBadgeStatus === 'downloaded') && (
              <span
                className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                  updateBadgeStatus === 'downloaded'
                    ? 'bg-[#34d399]'
                    : isXboxTheme
                    ? 'bg-[#6ee755]'
                    : 'bg-[#1a9fff]'
                }`}
              />
            )}
          </button>
        ) : desktopVersion && onOpenUpdateHistory ? (
          <button
            type="button"
            onClick={onOpenUpdateHistory}
            title={t.updateHistory.title}
            aria-label={t.updateHistory.title}
            className={`inline-flex items-center px-2 py-1 rounded text-[11px] font-semibold font-mono-tabular transition-colors cursor-pointer shrink-0 ${
              isPs5Theme
                ? 'rounded-full bg-white/[0.1] hover:bg-white/[0.2] text-white/90 border border-white/[0.16]'
                : isXboxTheme
                ? 'rounded-md bg-[#122b15] hover:bg-[#183b1c] text-[#e7fce9] border border-[#52e042]/30 hover:border-[#6ee755]/75'
                : 'bg-slate-100 hover:bg-slate-200 text-slate-700 hover:text-slate-900 border border-slate-300 dark:bg-[#1a222d] dark:hover:bg-[#243040] dark:text-[#c7d5e8] dark:hover:text-white dark:border-white/[0.08]'
            }`}
          >
            <span dir="ltr">v{desktopVersion}</span>
          </button>
        ) : desktopVersion ? (
          <span
            dir="ltr"
            className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold font-mono-tabular shrink-0 ${
              isPs5Theme
                ? 'rounded-full bg-white/[0.08] text-white/85 border border-white/[0.14]'
                : isXboxTheme
                ? 'rounded-md bg-[#122b15] text-[#d5f8d9] border border-[#52e042]/25'
                : 'bg-slate-100 text-slate-600 border border-slate-200 dark:bg-[#1a222d] dark:text-[#9cb0c9] dark:border-white/[0.08]'
            }`}
          >
            v{desktopVersion}
          </span>
        ) : null}

        {hasConsoleAudio && (
          <button
            type="button"
            onClick={onToggleSound}
            title={
              isXboxTheme
                ? soundEnabled
                  ? t.topbar.muteXboxSounds
                  : t.topbar.enableXboxSounds
                : soundEnabled
                ? t.topbar.muteSounds
                : t.topbar.enableSounds
            }
            aria-label={
              isXboxTheme
                ? soundEnabled
                  ? t.topbar.muteXboxSounds
                  : t.topbar.enableXboxSounds
                : soundEnabled
                ? t.topbar.muteSounds
                : t.topbar.enableSounds
            }
            className={`inline-flex items-center gap-1.5 px-2 py-1 transition-colors cursor-pointer shrink-0 border ${
              isXboxTheme
                ? 'rounded-md bg-[#112914] hover:bg-[#193d1d] text-[#e8fcef] border-[#52e042]/35 hover:border-[#6ee755]/80'
                : 'rounded-full bg-white/[0.1] hover:bg-white/[0.2] text-white/90 hover:text-white border-white/[0.18]'
            }`}
          >
            {soundEnabled ? (
              <>
                <SpeakerHigh
                  className={`w-3.5 h-3.5 ${
                    isXboxTheme ? 'text-[#6ee755]' : 'text-[#7cc4ff]'
                  }`}
                />
                <span className="inline-flex items-end gap-[2px] h-2.5" aria-hidden="true">
                  <span
                    className={`w-[2px] h-full rounded-full sa-ps5-eq-bar-1 ${
                      isXboxTheme ? 'bg-[#6ee755]' : 'bg-[#7cc4ff]'
                    }`}
                  />
                  <span className="w-[2px] h-full rounded-full bg-white sa-ps5-eq-bar-2" />
                  <span
                    className={`w-[2px] h-full rounded-full sa-ps5-eq-bar-3 ${
                      isXboxTheme ? 'bg-[#6ee755]' : 'bg-[#7cc4ff]'
                    }`}
                  />
                </span>
              </>
            ) : (
              <SpeakerSlash className="w-3.5 h-3.5 opacity-65" />
            )}
          </button>
        )}

        {/* Quick Utility Navigation (Downloads, Hardware Monitor, Settings) next to Fullscreen */}
        <nav
          aria-label="Utility navigation"
          className="hidden sm:inline-flex items-center gap-1 shrink-0"
        >
          <span
            aria-hidden="true"
            className={`h-4 w-px mx-0.5 ${
              hasConsoleAudio ? 'bg-white/15' : 'bg-slate-200 dark:bg-white/[0.08]'
            }`}
          />
          {utilityNavItems.map((item) => {
            const isActive = activeSection === item.id;
            const Icon = item.icon;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => onSelectSection(item.id)}
                title={item.label}
                aria-label={item.label}
                aria-current={isActive ? 'page' : undefined}
                className={`inline-flex items-center gap-1.5 px-2 py-1 text-[11px] whitespace-nowrap transition-colors cursor-pointer shrink-0 border ${
                  isPs5Theme
                    ? isActive
                      ? 'rounded-full bg-white/[0.22] border-white/[0.4] text-white font-semibold shadow-[0_0_12px_rgba(96,178,255,0.35)]'
                      : 'rounded-full bg-white/[0.08] hover:bg-white/[0.18] border-white/[0.14] text-white/80 hover:text-white font-medium'
                    : isXboxTheme
                    ? isActive
                      ? 'rounded-md bg-[#107C10]/85 border-[#6ee755]/85 text-white font-semibold shadow-[0_0_12px_rgba(82,224,66,0.3)]'
                      : 'rounded-md bg-[#122b15] hover:bg-[#193b1c] border-[#52e042]/28 hover:border-[#6ee755]/70 text-[#ccecd0] hover:text-white font-medium'
                    : isActive
                    ? 'rounded bg-sky-500/[0.14] border-sky-500/35 text-[#0284c7] dark:bg-[#1a9fff]/20 dark:border-[#38bdf8]/40 dark:text-[#38bdf8] font-semibold'
                    : 'rounded bg-slate-100 hover:bg-slate-200 border-slate-300 text-slate-700 hover:text-slate-900 dark:bg-[#1a222d] dark:hover:bg-[#243040] dark:border-white/[0.08] dark:text-[#c7d5e8] dark:hover:text-white font-medium'
                }`}
              >
                <Icon className="w-3.5 h-3.5 shrink-0" />
                <span className="hidden xl:inline">{item.label}</span>
                {typeof item.count === 'number' && (
                  <span
                    className={`font-mono-tabular text-[10.5px] font-bold ${
                      isPs5Theme
                        ? 'text-white'
                        : isXboxTheme
                        ? 'text-[#6ee755]'
                        : 'text-[#0284c7] dark:text-[#38bdf8]'
                    }`}
                  >
                    ({item.count})
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        {onOpenNotifications && (
          <button
            type="button"
            onClick={onOpenNotifications}
            title={t.notificationCenter.buttonLabel}
            aria-label={t.notificationCenter.buttonLabel}
            aria-expanded={isNotificationCenterOpen}
            className={`relative inline-flex items-center gap-1 p-1.5 rounded transition-colors cursor-pointer shrink-0 border ${
              isPs5Theme
                ? isNotificationCenterOpen
                  ? 'rounded-full bg-white/[0.24] border-white/[0.45] text-white shadow-[0_0_14px_rgba(96,178,255,0.4)]'
                  : 'rounded-full bg-white/[0.1] hover:bg-white/[0.2] border-white/[0.16] text-white/85 hover:text-white'
                : isXboxTheme
                ? isNotificationCenterOpen
                  ? 'rounded-md bg-[#107C10]/85 border-[#6ee755]/85 text-white shadow-[0_0_12px_rgba(82,224,66,0.3)]'
                  : 'rounded-md bg-[#122b15] hover:bg-[#183c1d] border-[#52e042]/35 hover:border-[#6ee755] text-[#e7fce9]'
                : isNotificationCenterOpen
                ? 'rounded bg-sky-500/[0.14] border-sky-500/35 text-[#0284c7] dark:bg-[#1a9fff]/20 dark:border-[#38bdf8]/40 dark:text-[#38bdf8]'
                : 'bg-slate-100 hover:bg-slate-200 text-slate-700 hover:text-slate-900 border-slate-300 dark:bg-[#1a222d] dark:hover:bg-[#243040] dark:text-[#c7d5e8] dark:hover:text-white dark:border-white/[0.08]'
            }`}
          >
            <Bell className="w-3.5 h-3.5 shrink-0" />
            {unreadNotificationsCount > 0 && (
              <span
                dir="ltr"
                className={`font-mono-tabular text-[10px] font-bold leading-none ${
                  isPs5Theme
                    ? 'text-[#7cc4ff]'
                    : isXboxTheme
                    ? 'text-[#6ee755]'
                    : 'text-[#0284c7] dark:text-[#38bdf8]'
                }`}
              >
                {unreadNotificationsCount > 99 ? '99+' : unreadNotificationsCount}
              </span>
            )}
          </button>
        )}

        <button
          type="button"
          onClick={onToggleFullscreen}
          title={isFullscreen ? t.topbar.exitFullscreen : t.topbar.enterFullscreen}
          aria-label={isFullscreen ? t.topbar.exitFullscreen : t.topbar.enterFullscreen}
          className={`p-1.5 rounded transition-colors cursor-pointer shrink-0 ${
            isPs5Theme
              ? 'rounded-full bg-white/[0.12] hover:bg-white/[0.24] text-white ring-1 ring-white/40 hover:ring-white/80 shadow-[0_0_14px_rgba(0,118,255,0.4)]'
              : isXboxTheme
              ? 'rounded-md bg-[#122b15] hover:bg-[#183c1d] text-[#e7fce9] border border-[#52e042]/40 hover:border-[#6ee755] shadow-[0_0_12px_rgba(82,224,66,0.22)]'
              : 'bg-slate-100 hover:bg-slate-200 text-slate-700 hover:text-slate-900 border border-slate-300 dark:bg-[#1a222d] dark:hover:bg-[#243040] dark:text-[#c7d5e8] dark:hover:text-white dark:border-white/[0.08]'
          }`}
        >
          {isFullscreen ? (
            <ArrowsIn className="w-3.5 h-3.5" />
          ) : (
            <CornersOut className="w-3.5 h-3.5" />
          )}
        </button>
      </div>
      </div>
    </div>
  );
});
