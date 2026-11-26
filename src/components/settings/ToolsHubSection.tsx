import { useCallback, useEffect, useMemo, useState, type ComponentType } from 'react';
import {
  ArrowClockwise,
  ArrowCounterClockwise,
  ArrowSquareOut,
  ArrowsClockwise,
  Bell,
  Broom,
  CaretDown,
  CaretUp,
  CheckCircle,
  ClockCounterClockwise,
  Code,
  Cpu,
  Database,
  DownloadSimple,
  FloppyDisk,
  Gauge,
  GitBranch,
  Info,
  Key,
  Laptop,
  LockKey,
  Magnet,
  MagnifyingGlass,
  PlugsConnected,
  ShieldCheck,
  SlidersHorizontal,
  Sparkle,
  Trash,
  WarningCircle,
  Wrench,
  XCircle,
} from '@phosphor-icons/react';
import type {
  CleanerCleanResult,
  CleanerScanResult,
  HardwareDbState,
  OpenSourceToolItemState,
  OpenSourceToolsManagerState,
  PresentMonSetupState,
  PrimarySection,
  QbitSetupState,
  TorrentConnectionTestResult,
  TorrentDetectionResult,
  TorrentIntegrationConfig,
} from '../../types';
import type { SystemHardwareSpecs } from '../../services/systemSpecs';
import type { AppLanguage } from '../../services/launcherSettings';
import type { DesktopUpdateState } from '../../services/desktopUpdater';
import type { DealsCredentialsStatus, OptionalCredentialProviderId } from '../../deals/types';
import { getTranslations } from '../../i18n/translations';
import { DEFAULT_TORRENT_CONFIG, isLoopbackHost } from '../../services/downloadManager';
import {
  formatStorageBytes,
  getDesktopHardwareIntelligenceBridge,
  getDesktopOpenSourceToolsBridge,
  getDesktopPcCleanerBridge,
} from '../../services/hardwareMonitor';
import {
  clearDealsMemoryCache,
  getDealsCredentialStatus,
  getDesktopDealsBridge,
  removeDealsProviderCredential,
  saveDealsProviderCredential,
} from '../../deals/httpClient';
import {
  BUNDLED_HARDWARE_DATABASE,
  BUNDLED_HARDWARE_DB_UPDATED_AT,
  BUNDLED_HARDWARE_DB_VERSION,
} from '../../data/hardwareDatabase';
import { ToggleSwitch } from './SettingsUiPrimitives';

export type ToolsHubFilter = 'all' | 'hardware' | 'downloads' | 'deals' | 'utilities';

export interface ToolsHubSectionProps {
  language: AppLanguage;
  isDesktopApp: boolean;
  searchQuery?: string;
  currentVersion: string;
  enableCanRunIt: boolean;
  onToggleEnableCanRunIt: (enabled: boolean) => void;
  systemSpecs?: SystemHardwareSpecs;
  isRefreshingSpecs?: boolean;
  onRefreshSpecs?: () => Promise<void> | void;
  onSaveCustomSpecs?: (next: SystemHardwareSpecs) => void;
  onResetCustomSpecs?: () => Promise<void> | void;
  torrentConfig?: TorrentIntegrationConfig;
  torrentConnected?: boolean;
  torrentVersion?: string | null;
  torrentWebApiVersion?: string | null;
  torrentError?: string | null;
  onDetectTorrentClient?: () => Promise<TorrentDetectionResult | null>;
  onSaveTorrentConfig?: (cfg: Partial<TorrentIntegrationConfig>) => Promise<void>;
  onTestTorrentConnection?: (
    cfg?: Partial<TorrentIntegrationConfig>
  ) => Promise<TorrentConnectionTestResult | null>;
  qbitSetupState?: QbitSetupState;
  onOpenQbitSetupWizard?: () => void;
  presentMonSetupState?: PresentMonSetupState;
  onOpenPresentMonManager?: () => void;
  onCheckPresentMonUpdates?: () => Promise<void> | void;
  onStartPresentMonInstallOrUpdate?: (
    userConfirmed: boolean,
    mode?: 'auto' | 'install' | 'update' | 'repair' | 'reinstall'
  ) => Promise<void> | void;
  desktopUpdateState?: DesktopUpdateState | null;
  onOpenUpdater?: () => void;
  onCheckForUpdates?: () => void;
  onOpenUpdateHistory?: () => void;
  onOpenNotifications?: () => void;
  onReplayOnboarding?: () => void;
  onOpenSpinWheel?: () => void;
  onOpenHypervisorGuide?: () => void;
  onNavigateSection?: (section: PrimarySection) => void;
  onOpenExternal?: (url: string) => void;
  onNotify?: (message: string, type?: 'success' | 'info' | 'error') => void;
  expandedToolId?: string | null;
  onChangeExpandedTool?: (toolId: string | null) => void;
}

const OPTIONAL_PROVIDER_DOCS: Array<{
  id: OptionalCredentialProviderId;
  title: string;
  tierNote: string;
  placeholder: string;
}> = [
  {
    id: 'steam_index',
    title: 'Steam Index API (steamidx.com)',
    tierNote: 'Free tier: 1,440 req/day · Deep Steam price history & achievement labels',
    placeholder: 'sidx_...',
  },
  {
    id: 'metacritic_apish',
    title: 'API.SH Metacritic API (api.sh)',
    tierNote: 'Free tier: 1,000 credits/mo · Full Metacritic Metascore & User Score cards',
    placeholder: 'x-api-key...',
  },
  {
    id: 'opencritic_rapidapi',
    title: 'OpenCritic API (RapidAPI)',
    tierNote: 'RapidAPI subscription key · OpenCritic Top Critic & Recommend %',
    placeholder: 'RapidAPI X-RapidAPI-Key...',
  },
];

const FREE_ACTIVE_APIS = [
  'Steam Web API (Concurrent Charts, Achievements, News & AppDetails)',
  'SteamData (Top 100 Live Counts, 24h Movers & Update Impact)',
  'The Game Census (Health Tiers, 400-day CCU & Review Velocity)',
  'CheapShark (PC Store Price Comparisons & All-Time Low)',
  'GamerPower · Epic Games Store · FreeToGame (Free Games & Giveaways)',
  'ExchangeRate-API & Frankfurter FX (Live Multi-Currency FX)',
];

type ToolId =
  | 'qbittorrent'
  | 'presentmon'
  | 'lhm'
  | 'cleaner'
  | 'canrunit'
  | 'deals_api'
  | 'bench_db'
  | 'hypervisor'
  | 'spinwheel'
  | 'updater';

export function ToolsHubSection({
  language,
  isDesktopApp,
  searchQuery = '',
  currentVersion,
  enableCanRunIt,
  onToggleEnableCanRunIt,
  systemSpecs,
  isRefreshingSpecs = false,
  onRefreshSpecs,
  onSaveCustomSpecs,
  onResetCustomSpecs,
  torrentConfig = DEFAULT_TORRENT_CONFIG,
  torrentConnected = false,
  torrentVersion = null,
  torrentWebApiVersion = null,
  torrentError = null,
  onDetectTorrentClient,
  onSaveTorrentConfig,
  onTestTorrentConnection,
  qbitSetupState,
  onOpenQbitSetupWizard,
  presentMonSetupState,
  onOpenPresentMonManager,
  onCheckPresentMonUpdates,
  onStartPresentMonInstallOrUpdate,
  desktopUpdateState,
  onOpenUpdater,
  onCheckForUpdates,
  onOpenUpdateHistory,
  onOpenNotifications,
  onReplayOnboarding,
  onOpenSpinWheel,
  onOpenHypervisorGuide,
  onNavigateSection,
  onOpenExternal,
  onNotify,
  expandedToolId: controlledExpandedId,
  onChangeExpandedTool,
}: ToolsHubSectionProps) {
  const tr = getTranslations(language);
  const t = tr.settings;
  const th = tr.settingsHub;
  const tp = tr.presentMonSetup;
  const thw = tr.hardware;

  const [filter, setFilter] = useState<ToolsHubFilter>('all');
  const [internalExpanded, setInternalExpanded] = useState<string | null>(null);
  const activeExpanded =
    controlledExpandedId !== undefined ? controlledExpandedId : internalExpanded;

  const setExpanded = (id: string | null) => {
    if (onChangeExpandedTool) {
      onChangeExpandedTool(id);
    } else {
      setInternalExpanded(id);
    }
  };

  // --- qBittorrent state ---
  const [draftTorrent, setDraftTorrent] = useState<TorrentIntegrationConfig>(torrentConfig);
  const [isDetectingTorrent, setIsDetectingTorrent] = useState(false);
  const [isTestingTorrent, setIsTestingTorrent] = useState(false);
  const [isSavingTorrent, setIsSavingTorrent] = useState(false);
  const [detectionResult, setDetectionResult] = useState<TorrentDetectionResult | null>(null);
  const [testResult, setTestResult] = useState<TorrentConnectionTestResult | null>(null);
  const [hostError, setHostError] = useState<string | null>(null);
  const [showTorrentGuide, setShowTorrentGuide] = useState(!torrentConnected);

  useEffect(() => {
    setDraftTorrent((prev) => ({
      ...torrentConfig,
      password: prev.password,
      apiKey: prev.apiKey || '',
    }));
  }, [
    torrentConfig.enabled,
    torrentConfig.host,
    torrentConfig.port,
    torrentConfig.username,
    torrentConfig.hasSavedPassword,
    torrentConfig.hasSavedApiKey,
  ]);

  const handleAutoDetectTorrent = async () => {
    setIsDetectingTorrent(true);
    setTestResult(null);
    setHostError(null);
    try {
      if (!isDesktopApp || !onDetectTorrentClient) {
        await new Promise((resolve) => setTimeout(resolve, 200));
        setTestResult({
          ok: false,
          message: t.torrentTestingWebPreviewMsg,
          hint: t.torrentTestingWebPreviewHint,
        });
        return;
      }
      const detected = await onDetectTorrentClient();
      setDetectionResult(detected);
      if (detected) {
        setDraftTorrent((prev) => ({
          ...prev,
          enabled: detected.installed ? true : prev.enabled,
          host: detected.recommendedHost || '127.0.0.1',
          port: detected.recommendedPort || prev.port || 8080,
        }));
      }
    } finally {
      setIsDetectingTorrent(false);
    }
  };

  const handleTestTorrent = async () => {
    if (!isLoopbackHost(draftTorrent.host)) {
      setHostError(t.torrentLoopbackError);
      return;
    }
    setHostError(null);
    setIsTestingTorrent(true);
    try {
      if (!isDesktopApp || !onTestTorrentConnection) {
        await new Promise((resolve) => setTimeout(resolve, 250));
        setTestResult({
          ok: false,
          message: t.torrentTestingWebPreviewMsg,
          hint: t.torrentTestingWebPreviewHint,
        });
        return;
      }
      const result = await onTestTorrentConnection(draftTorrent);
      setTestResult(
        result || {
          ok: false,
          message: t.torrentStatusDisconnected,
        }
      );
    } finally {
      setIsTestingTorrent(false);
    }
  };

  const handleSaveTorrent = async () => {
    if (!onSaveTorrentConfig) return;
    if (!isLoopbackHost(draftTorrent.host)) {
      setHostError(t.torrentLoopbackError);
      return;
    }
    setHostError(null);
    setIsSavingTorrent(true);
    try {
      await onSaveTorrentConfig(draftTorrent);
      setDraftTorrent((prev) => ({ ...prev, password: '', apiKey: '' }));
    } finally {
      setIsSavingTorrent(false);
    }
  };

  const handleToggleTorrentEnabled = async (nextEnabled: boolean) => {
    const safeHost = isLoopbackHost(draftTorrent.host) ? draftTorrent.host.trim() : '127.0.0.1';
    const nextCfg = { ...draftTorrent, host: safeHost, enabled: nextEnabled };
    setHostError(null);
    setDraftTorrent(nextCfg);
    if (onSaveTorrentConfig) {
      await onSaveTorrentConfig(nextCfg);
    }
  };

  const isVerifiedTorrentConnected =
    isDesktopApp &&
    !isTestingTorrent &&
    (testResult?.ok === true || (torrentConnected && testResult?.ok !== false));

  const effectiveTorrentVersion = testResult?.ok
    ? testResult.version || torrentVersion
    : torrentVersion;
  const effectiveTorrentWebApiVersion = testResult?.ok
    ? testResult.webApiVersion || torrentWebApiVersion
    : torrentWebApiVersion;

  // --- LibreHardwareMonitorLib state ---
  const ossBridge = useMemo(() => getDesktopOpenSourceToolsBridge(), []);
  const hasOssDesktop = Boolean(isDesktopApp && ossBridge);
  const [ossState, setOssState] = useState<OpenSourceToolsManagerState | null>(null);
  const [ossBusyAction, setOssBusyAction] = useState<string | null>(null);
  const [ossPendingConfirm, setOssPendingConfirm] = useState<{
    toolId: string;
    mode: 'install' | 'rollback';
  } | null>(null);

  useEffect(() => {
    if (!hasOssDesktop || !ossBridge) return;
    let active = true;
    void ossBridge.getState().then((st) => {
      if (active && st) setOssState(st);
    });
    const unsub = ossBridge.onStateChange((next) => {
      if (active && next) setOssState(next);
    });
    return () => {
      active = false;
      unsub();
    };
  }, [hasOssDesktop, ossBridge]);

  const lhmTool: OpenSourceToolItemState | null = ossState?.tools?.[0] || null;

  // --- Safe PC Cleaner quick-scan state ---
  const cleanerBridge = useMemo(() => getDesktopPcCleanerBridge(), []);
  const hasCleanerDesktop = Boolean(isDesktopApp && cleanerBridge);
  const [cleanerScan, setCleanerScan] = useState<CleanerScanResult | null>(null);
  const [cleanerSelected, setCleanerSelected] = useState<Set<string>>(new Set());
  const [cleanerBusy, setCleanerBusy] = useState<'scan' | 'clean' | null>(null);
  const [cleanerConfirm, setCleanerConfirm] = useState(false);
  const [cleanerResult, setCleanerResult] = useState<CleanerCleanResult | null>(null);

  const handleQuickCleanerScan = useCallback(async () => {
    if (!cleanerBridge || cleanerBusy) return;
    setCleanerBusy('scan');
    setCleanerResult(null);
    setCleanerConfirm(false);
    try {
      const res = await cleanerBridge.scan();
      if (res) {
        setCleanerScan(res);
        setCleanerSelected(
          new Set(res.categories.filter((c) => c.defaultSelected && c.supported).map((c) => c.id))
        );
      }
    } finally {
      setCleanerBusy(null);
    }
  }, [cleanerBridge, cleanerBusy]);

  const handleQuickCleanerExecute = useCallback(async () => {
    if (!cleanerBridge || !cleanerScan || cleanerSelected.size === 0 || cleanerBusy) return;
    setCleanerBusy('clean');
    setCleanerConfirm(false);
    try {
      const res = await cleanerBridge.clean({
        categoryIds: Array.from(cleanerSelected),
        confirmationToken: cleanerScan.confirmationToken,
      });
      if (res) {
        setCleanerResult(res);
        onNotify?.(
          `${thw.cleanerReportTitle}: ${formatStorageBytes(res.cleanedBytes, thw.naValue)}`,
          'success'
        );
        const refreshed = await cleanerBridge.scan();
        if (refreshed) {
          setCleanerScan(refreshed);
          setCleanerSelected(
            new Set(
              refreshed.categories.filter((c) => c.defaultSelected && c.supported).map((c) => c.id)
            )
          );
        }
      }
    } finally {
      setCleanerBusy(null);
    }
  }, [cleanerBridge, cleanerScan, cleanerSelected, cleanerBusy, onNotify, thw.cleanerReportTitle, thw.naValue]);

  // --- Deals API Credentials state ---
  const isElectronDeals = Boolean(getDesktopDealsBridge());
  const [dealsCredStatus, setDealsCredStatus] = useState<DealsCredentialsStatus | null>(null);
  const [dealsKeyInputs, setDealsKeyInputs] = useState<Record<OptionalCredentialProviderId, string>>({
    steam_index: '',
    metacritic_apish: '',
    opencritic_rapidapi: '',
  });
  const [dealsBusyId, setDealsBusyId] = useState<OptionalCredentialProviderId | null>(null);
  const [dealsFeedback, setDealsFeedback] = useState<string | null>(null);

  useEffect(() => {
    void getDealsCredentialStatus().then(setDealsCredStatus);
  }, []);

  const configuredOptionalKeysCount = useMemo(() => {
    if (!dealsCredStatus?.providers) return 0;
    return Object.values(dealsCredStatus.providers).filter((p) => p?.configured).length;
  }, [dealsCredStatus]);

  const handleSaveDealsKey = async (providerId: OptionalCredentialProviderId) => {
    const val = dealsKeyInputs[providerId].trim();
    if (!val) return;
    setDealsBusyId(providerId);
    setDealsFeedback(null);
    try {
      const res = await saveDealsProviderCredential(providerId, val);
      if (res.status) setDealsCredStatus(res.status);
      if (!res.ok) {
        setDealsFeedback(res.error || 'Could not save credential.');
      } else {
        setDealsKeyInputs((prev) => ({ ...prev, [providerId]: '' }));
        setDealsFeedback(res.warning || 'Credential encrypted and saved.');
      }
    } finally {
      setDealsBusyId(null);
    }
  };

  const handleClearDealsKey = async (providerId: OptionalCredentialProviderId) => {
    setDealsBusyId(providerId);
    setDealsFeedback(null);
    try {
      const res = await removeDealsProviderCredential(providerId);
      if (res.status) setDealsCredStatus(res.status);
    } finally {
      setDealsBusyId(null);
    }
  };

  // --- Hardware Specs Inline Customizer ---
  const [editingSpecs, setEditingSpecs] = useState(false);
  const [draftCpu, setDraftCpu] = useState(systemSpecs?.cpuName || '');
  const [draftGpu, setDraftGpu] = useState(systemSpecs?.gpuName || '');
  const [draftVram, setDraftVram] = useState(
    systemSpecs?.gpuVramGB != null ? String(systemSpecs.gpuVramGB) : ''
  );
  const [draftRam, setDraftRam] = useState(
    systemSpecs?.ramGB != null ? String(systemSpecs.ramGB) : ''
  );
  const [draftDiskFree, setDraftDiskFree] = useState(
    systemSpecs?.freeSpaceGB != null ? String(systemSpecs.freeSpaceGB) : ''
  );

  useEffect(() => {
    if (!systemSpecs || editingSpecs) return;
    setDraftCpu(systemSpecs.cpuName || '');
    setDraftGpu(systemSpecs.gpuName || '');
    setDraftVram(systemSpecs.gpuVramGB != null ? String(systemSpecs.gpuVramGB) : '');
    setDraftRam(systemSpecs.ramGB != null ? String(systemSpecs.ramGB) : '');
    setDraftDiskFree(systemSpecs.freeSpaceGB != null ? String(systemSpecs.freeSpaceGB) : '');
  }, [systemSpecs, editingSpecs]);

  const handleSaveCustomSpecsForm = (e: React.FormEvent) => {
    e.preventDefault();
    if (!systemSpecs || !onSaveCustomSpecs) return;
    const ramNum = Number(draftRam);
    const vramNum = Number(draftVram);
    const diskNum = Number(draftDiskFree);
    onSaveCustomSpecs({
      ...systemSpecs,
      source: 'custom',
      cpuName: draftCpu.trim() || systemSpecs.cpuName,
      gpuName: draftGpu.trim() || systemSpecs.gpuName,
      gpuVramGB:
        draftVram.trim() !== '' && Number.isFinite(vramNum) && vramNum >= 0
          ? Number(vramNum.toFixed(1))
          : systemSpecs.gpuVramGB,
      ramGB:
        draftRam.trim() !== '' && Number.isFinite(ramNum) && ramNum > 0
          ? Math.max(1, Math.round(ramNum))
          : systemSpecs.ramGB,
      freeSpaceGB:
        draftDiskFree.trim() !== '' && Number.isFinite(diskNum) && diskNum >= 0
          ? Math.round(diskNum)
          : systemSpecs.freeSpaceGB,
      ramIsApprox: false,
      detectedAt: new Date().toISOString(),
    });
    setEditingSpecs(false);
    onNotify?.(th.specsCustomOverride, 'success');
  };

  // --- Hardware DB state ---
  const hwIntelBridge = useMemo(() => getDesktopHardwareIntelligenceBridge(), []);
  const [dbState, setDbState] = useState<HardwareDbState | null>(null);
  const [isUpdatingDb, setIsUpdatingDb] = useState(false);

  useEffect(() => {
    if (!isDesktopApp || !hwIntelBridge) return;
    let active = true;
    void hwIntelBridge.getDbState().then((st) => {
      if (active && st) setDbState(st);
    });
    return () => {
      active = false;
    };
  }, [isDesktopApp, hwIntelBridge]);

  const handleCheckDbUpdate = async () => {
    if (!hwIntelBridge || isUpdatingDb) return;
    setIsUpdatingDb(true);
    try {
      const res = await hwIntelBridge.checkDbUpdate();
      if (res?.state) setDbState(res.state);
      if (res?.error) {
        onNotify?.(res.error, 'error');
      } else {
        onNotify?.(
          res?.updated
            ? `Hardware DB updated to v${res.state.dbVersion}`
            : `Hardware DB is up to date (v${res?.state?.dbVersion || BUNDLED_HARDWARE_DB_VERSION})`,
          res?.updated ? 'success' : 'info'
        );
      }
    } finally {
      setIsUpdatingDb(false);
    }
  };

  interface ToolDescriptor {
    id: ToolId;
    category: Exclude<ToolsHubFilter, 'all'>;
    name: string;
    purpose: string;
    keywords: string;
    icon: ComponentType<{ className?: string }>;
    statusText: string;
    statusTone: 'ready' | 'attention' | 'standby' | 'builtin';
    metaLine: string;
    hasInlineConfig: boolean;
  }

  const tools: ToolDescriptor[] = useMemo(() => {
    const qbitStatus: ToolDescriptor['statusTone'] = !isDesktopApp
      ? 'standby'
      : isVerifiedTorrentConnected
      ? 'ready'
      : torrentConfig.enabled
      ? 'attention'
      : 'standby';

    const qbitStatusLabel = !isDesktopApp
      ? t.modeWebPreviewBadge
      : isVerifiedTorrentConnected
      ? t.torrentStatusConnected
      : torrentConfig.enabled
      ? t.torrentStatusDisconnected
      : th.hubStatusStandby;

    const pmReady = Boolean(presentMonSetupState?.installed && presentMonSetupState.healthy);
    const pmNeedsAction =
      presentMonSetupState?.actionNeeded === 'repair_required' ||
      presentMonSetupState?.actionNeeded === 'update_available';
    const pmTone: ToolDescriptor['statusTone'] = !isDesktopApp
      ? 'standby'
      : pmNeedsAction
      ? 'attention'
      : pmReady
      ? 'ready'
      : 'standby';
    const pmStatusLabel = !isDesktopApp
      ? t.modeWebPreviewBadge
      : presentMonSetupState?.actionNeeded === 'repair_required'
      ? tp.statusRepairRequired
      : presentMonSetupState?.actionNeeded === 'update_available'
      ? tp.statusUpdateAvailable
      : pmReady
      ? tp.statusReady
      : tp.statusNotInstalled;

    const lhmTone: ToolDescriptor['statusTone'] = !hasOssDesktop
      ? 'standby'
      : lhmTool?.statusBadge === 'up_to_date' || lhmTool?.statusBadge === 'newer_installed'
      ? 'ready'
      : lhmTool?.statusBadge === 'update_available' || lhmTool?.statusBadge === 'repair_required'
      ? 'attention'
      : 'standby';
    const lhmStatusLabel = !hasOssDesktop
      ? t.modeWebPreviewBadge
      : lhmTool?.statusBadge === 'up_to_date'
      ? thw.ossStatusUpToDate
      : lhmTool?.statusBadge === 'update_available'
      ? thw.ossStatusUpdateAvailable
      : lhmTool?.statusBadge === 'repair_required'
      ? thw.ossStatusRepairRequired
      : lhmTool?.statusBadge === 'newer_installed'
      ? thw.ossStatusNewerInstalled
      : thw.ossStatusNotInstalled;

    const cleanerReclaimable = cleanerScan
      ? cleanerScan.categories.reduce((acc, c) => acc + (c.estimatedBytes || 0), 0)
      : 0;

    return [
      {
        id: 'qbittorrent',
        category: 'downloads',
        name: th.toolQbitName,
        purpose: th.toolQbitPurpose,
        keywords: 'qbittorrent torrent magnet webui api download p2p seed',
        icon: Magnet,
        statusText: qbitStatusLabel,
        statusTone: qbitStatus,
        metaLine: effectiveTorrentVersion
          ? `${effectiveTorrentVersion}${effectiveTorrentWebApiVersion ? ` · API ${effectiveTorrentWebApiVersion}` : ''}`
          : `${torrentConfig.host}:${torrentConfig.port}`,
        hasInlineConfig: true,
      },
      {
        id: 'presentmon',
        category: 'hardware',
        name: th.toolPresentMonName,
        purpose: th.toolPresentMonPurpose,
        keywords: 'intel presentmon fps frame time 1% low gaming performance telemetry',
        icon: Sparkle,
        statusText: pmStatusLabel,
        statusTone: pmTone,
        metaLine: presentMonSetupState?.installedVersion
          ? `v${presentMonSetupState.installedVersion}`
          : presentMonSetupState?.latestRelease?.version
          ? `Latest v${presentMonSetupState.latestRelease.version}`
          : 'DX11 · DX12 · Vulkan · OpenGL',
        hasInlineConfig: true,
      },
      {
        id: 'lhm',
        category: 'hardware',
        name: th.toolLhmName,
        purpose: th.toolLhmPurpose,
        keywords: 'librehardwaremonitor sensors temperature fan rpm vrm cpu gpu voltage mpl-2.0',
        icon: Cpu,
        statusText: lhmStatusLabel,
        statusTone: lhmTone,
        metaLine: lhmTool?.installedVersion
          ? `v${lhmTool.installedVersion} · MPL-2.0`
          : 'MPL-2.0 · Open-Source Sensor Engine',
        hasInlineConfig: true,
      },
      {
        id: 'cleaner',
        category: 'hardware',
        name: th.toolCleanerName,
        purpose: th.toolCleanerPurpose,
        keywords: 'pc cleaner temp cache shader directx recycle bin disk space',
        icon: Broom,
        statusText: !hasCleanerDesktop
          ? t.modeWebPreviewBadge
          : cleanerScan
          ? formatStorageBytes(cleanerReclaimable, thw.naValue)
          : th.hubStatusReady,
        statusTone: hasCleanerDesktop ? 'ready' : 'standby',
        metaLine: cleanerScan
          ? `${cleanerScan.categories.filter((c) => c.supported).length} scan categories`
          : 'Temp · App Cache · DX Shaders',
        hasInlineConfig: true,
      },
      {
        id: 'deals_api',
        category: 'deals',
        name: th.toolDealsApiName,
        purpose: th.toolDealsApiPurpose,
        keywords: 'deals api key steam index metacritic opencritic cheapshark steamdata census',
        icon: Key,
        statusText: `${6} Free · ${configuredOptionalKeysCount}/3 Keys`,
        statusTone: 'ready',
        metaLine: isElectronDeals ? 'OS Keychain safeStorage' : t.modeWebPreviewBadge,
        hasInlineConfig: true,
      },
      {
        id: 'canrunit',
        category: 'hardware',
        name: th.toolCanRunItName,
        purpose: th.toolCanRunItPurpose,
        keywords: 'can run it hardware specs cpu gpu ram vram compatibility system requirements',
        icon: Laptop,
        statusText: enableCanRunIt ? t.activeLabel : t.inactiveLabel,
        statusTone: enableCanRunIt ? 'ready' : 'standby',
        metaLine: systemSpecs
          ? `${systemSpecs.source === 'custom' ? th.specsCustomOverride : systemSpecs.source === 'electron' ? th.specsAutoDetected : th.specsBrowserMode}${systemSpecs.ramGB ? ` · ${systemSpecs.ramGB} GB RAM` : ''}`
          : 'Hardware Profiler',
        hasInlineConfig: true,
      },
      {
        id: 'bench_db',
        category: 'hardware',
        name: th.toolBenchDbName,
        purpose: th.toolBenchDbPurpose,
        keywords: 'benchmark cpu ram storage latency hardware-db database gpu specs',
        icon: Database,
        statusText: `v${dbState?.dbVersion || BUNDLED_HARDWARE_DB_VERSION}`,
        statusTone: 'builtin',
        metaLine: `${dbState?.entryCount || BUNDLED_HARDWARE_DATABASE.length} ${th.dbEntriesLabel}`,
        hasInlineConfig: true,
      },
      {
        id: 'hypervisor',
        category: 'utilities',
        name: th.toolHypervisorName,
        purpose: th.toolHypervisorPurpose,
        keywords: 'hypervisor virtualization bios vt-x svm amd-v hyper-v guide',
        icon: Wrench,
        statusText: th.hubStatusBuiltin,
        statusTone: 'builtin',
        metaLine: 'VT-x · AMD-V · Hyper-V Reference',
        hasInlineConfig: false,
      },
      {
        id: 'spinwheel',
        category: 'utilities',
        name: th.toolSpinWheelName,
        purpose: th.toolSpinWheelPurpose,
        keywords: 'spin wheel random game picker roulette what should i play',
        icon: Gauge,
        statusText: th.hubStatusBuiltin,
        statusTone: 'builtin',
        metaLine: 'Random Library Picker',
        hasInlineConfig: false,
      },
      {
        id: 'updater',
        category: 'utilities',
        name: th.toolUpdaterName,
        purpose: th.toolUpdaterPurpose,
        keywords: 'updater release notes changelog notifications onboarding setup version',
        icon: ClockCounterClockwise,
        statusText:
          desktopUpdateState?.status === 'available' || desktopUpdateState?.status === 'downloaded'
            ? `Update v${desktopUpdateState.availableVersion}`
            : `v${currentVersion}`,
        statusTone:
          desktopUpdateState?.status === 'available' || desktopUpdateState?.status === 'downloaded'
            ? 'attention'
            : 'builtin',
        metaLine: isDesktopApp ? 'GitHub Releases Auto-Updater' : `v${currentVersion}`,
        hasInlineConfig: false,
      },
    ];
  }, [
    isDesktopApp,
    isVerifiedTorrentConnected,
    torrentConfig.enabled,
    torrentConfig.host,
    torrentConfig.port,
    effectiveTorrentVersion,
    effectiveTorrentWebApiVersion,
    presentMonSetupState,
    hasOssDesktop,
    lhmTool,
    hasCleanerDesktop,
    cleanerScan,
    configuredOptionalKeysCount,
    isElectronDeals,
    enableCanRunIt,
    systemSpecs,
    dbState,
    desktopUpdateState,
    currentVersion,
    t,
    th,
    tp,
    thw,
  ]);

  const normalizedQuery = searchQuery.trim().toLowerCase();

  const visibleTools = useMemo(() => {
    return tools.filter((tool) => {
      if (filter !== 'all' && tool.category !== filter) return false;
      if (!normalizedQuery) return true;
      const haystack = `${tool.name} ${tool.purpose} ${tool.keywords} ${tool.metaLine} ${tool.statusText}`.toLowerCase();
      return haystack.includes(normalizedQuery);
    });
  }, [tools, filter, normalizedQuery]);

  const filterCounts = useMemo(() => {
    const base = normalizedQuery
      ? tools.filter((tool) =>
          `${tool.name} ${tool.purpose} ${tool.keywords} ${tool.metaLine}`.toLowerCase().includes(normalizedQuery)
        )
      : tools;
    return {
      all: base.length,
      hardware: base.filter((x) => x.category === 'hardware').length,
      downloads: base.filter((x) => x.category === 'downloads').length,
      deals: base.filter((x) => x.category === 'deals').length,
      utilities: base.filter((x) => x.category === 'utilities').length,
    };
  }, [tools, normalizedQuery]);

  const statusToneStyle = (tone: ToolDescriptor['statusTone']) => {
    switch (tone) {
      case 'ready':
        return 'text-emerald-700 dark:text-[#4ade80]';
      case 'attention':
        return 'text-amber-700 dark:text-amber-300';
      case 'builtin':
        return 'text-[#0284c7] dark:text-[#66c0f4]';
      default:
        return 'text-slate-500 dark:text-[#8b9bb4]';
    }
  };

  const renderInlineToolConfig = (toolId: ToolId) => {
    if (toolId === 'qbittorrent') {
      return (
        <div className="pt-4 mt-4 border-t border-slate-200 dark:border-white/[0.08] space-y-4">
          {!isDesktopApp && (
            <div className="px-3.5 py-2.5 rounded-lg bg-sky-50 dark:bg-[#121a26] border border-sky-200 dark:border-[#1a9fff]/25 text-[12px] text-sky-900 dark:text-[#9fb0c7]">
              {t.torrentWebNotice}
            </div>
          )}

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="space-y-0.5 min-w-0">
              <span
                id="setting-torrent-sync"
                className="block text-[13px] font-semibold text-slate-900 dark:text-white"
              >
                {t.torrentEnableTitle}
              </span>
              <p className="text-[12px] text-slate-600 dark:text-[#8b9bb4]">
                {t.torrentEnableDesc}
              </p>
              {isDesktopApp && torrentConfig.enabled && torrentError && !torrentConnected && (
                <p className="text-[11.5px] font-medium text-amber-700 dark:text-amber-300">
                  {torrentError}
                </p>
              )}
            </div>

            <div className="flex items-center gap-3 shrink-0">
              {onOpenQbitSetupWizard && (
                <button
                  type="button"
                  onClick={onOpenQbitSetupWizard}
                  className="inline-flex items-center gap-1.5 min-h-[36px] px-3 py-1.5 rounded-lg bg-[#0284c7] hover:bg-[#0369a1] dark:bg-[#1a9fff] dark:hover:bg-[#38adff] text-white text-[12px] font-semibold transition-colors whitespace-nowrap cursor-pointer"
                >
                  <DownloadSimple className="w-3.5 h-3.5" />
                  <span>{t.torrentManageSetupBtn}</span>
                </button>
              )}
              <ToggleSwitch
                checked={draftTorrent.enabled}
                labelId="setting-torrent-sync"
                onLabel={t.activeLabel}
                offLabel={t.inactiveLabel}
                onChange={handleToggleTorrentEnabled}
              />
            </div>
          </div>

          {detectionResult && (
            <div
              className={`p-3 rounded-lg border text-[12px] space-y-1.5 ${
                detectionResult.installed
                  ? 'bg-sky-50 dark:bg-[#122030] border-sky-200 dark:border-[#1a9fff]/35 text-slate-800 dark:text-[#d5e4f5]'
                  : 'bg-amber-50 dark:bg-[#1e1a12] border-amber-300 dark:border-amber-500/40 text-amber-900 dark:text-amber-200'
              }`}
            >
              <div className="font-semibold flex items-center gap-2">
                <Info className="w-4 h-4 shrink-0" />
                <span>
                  {detectionResult.installed
                    ? detectionResult.clientName
                    : t.torrentNotInstalledTitle}
                  {detectionResult.installed && detectionResult.openWebUiPorts.length > 0 && (
                    <span dir="ltr" className="ms-2 font-mono-tabular">
                      (Ports: {detectionResult.openWebUiPorts.join(', ')})
                    </span>
                  )}
                </span>
              </div>
              {detectionResult.executablePath && (
                <div dir="ltr" className="font-mono-tabular text-[11.5px] opacity-80 break-all">
                  {detectionResult.executablePath}
                </div>
              )}
              {!detectionResult.installed && (
                <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
                  <p className="opacity-90">{t.torrentNotInstalledDesc}</p>
                  <button
                    type="button"
                    onClick={() =>
                      onOpenExternal?.(
                        detectionResult.downloadUrl || 'https://www.qbittorrent.org/download'
                      )
                    }
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white dark:bg-[#212a37] border border-slate-300 dark:border-white/[0.1] text-[11.5px] font-semibold cursor-pointer"
                  >
                    <ArrowSquareOut className="w-3.5 h-3.5" />
                    <span>{t.torrentDownloadBtn}</span>
                  </button>
                </div>
              )}
            </div>
          )}

          {testResult && (
            <div
              className={`p-3 rounded-lg border text-[12px] space-y-1 ${
                testResult.ok
                  ? 'bg-emerald-50 dark:bg-emerald-950/30 border-emerald-300 dark:border-emerald-500/40 text-emerald-900 dark:text-emerald-200'
                  : 'bg-rose-50 dark:bg-rose-950/30 border-rose-300 dark:border-rose-500/40 text-rose-900 dark:text-rose-200'
              }`}
            >
              <div className="font-semibold flex items-center gap-2">
                {testResult.ok ? (
                  <CheckCircle weight="fill" className="w-4 h-4 shrink-0" />
                ) : (
                  <WarningCircle weight="fill" className="w-4 h-4 shrink-0" />
                )}
                <span>
                  {testResult.message}
                  {testResult.version ? ` (${testResult.version})` : ''}
                </span>
              </div>
              {testResult.hint && <p className="opacity-90">{testResult.hint}</p>}
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <div className="space-y-1">
              <label
                htmlFor="torrent-host-input"
                className="block text-[11.5px] font-semibold text-slate-700 dark:text-[#c6d4df]"
              >
                {t.torrentHostLabel}
              </label>
              <input
                id="torrent-host-input"
                type="text"
                dir="ltr"
                value={draftTorrent.host}
                onChange={(e) => {
                  const nextHost = e.target.value;
                  setDraftTorrent((prev) => ({ ...prev, host: nextHost }));
                  if (hostError && isLoopbackHost(nextHost)) setHostError(null);
                }}
                placeholder="127.0.0.1"
                className="w-full min-h-[38px] px-3 py-1.5 rounded-lg bg-slate-50 dark:bg-[#0e131b] border border-slate-200 dark:border-white/[0.1] text-[12.5px] font-mono-tabular text-slate-900 dark:text-white focus:border-[#0284c7] dark:focus:border-[#38bdf8] focus:outline-none"
              />
            </div>

            <div className="space-y-1">
              <label
                htmlFor="torrent-port-input"
                className="block text-[11.5px] font-semibold text-slate-700 dark:text-[#c6d4df]"
              >
                {t.torrentPortLabel}
              </label>
              <input
                id="torrent-port-input"
                type="number"
                dir="ltr"
                min={1}
                max={65535}
                value={draftTorrent.port}
                onChange={(e) =>
                  setDraftTorrent((prev) => ({
                    ...prev,
                    port: Number(e.target.value) || 8080,
                  }))
                }
                className="w-full min-h-[38px] px-3 py-1.5 rounded-lg bg-slate-50 dark:bg-[#0e131b] border border-slate-200 dark:border-white/[0.1] text-[12.5px] font-mono-tabular text-slate-900 dark:text-white focus:border-[#0284c7] dark:focus:border-[#38bdf8] focus:outline-none"
              />
            </div>

            <div className="space-y-1">
              <label
                htmlFor="torrent-username-input"
                className="block text-[11.5px] font-semibold text-slate-700 dark:text-[#c6d4df]"
              >
                {t.torrentUsernameLabel}
              </label>
              <input
                id="torrent-username-input"
                type="text"
                dir="ltr"
                value={draftTorrent.username}
                onChange={(e) =>
                  setDraftTorrent((prev) => ({ ...prev, username: e.target.value }))
                }
                placeholder="admin"
                className="w-full min-h-[38px] px-3 py-1.5 rounded-lg bg-slate-50 dark:bg-[#0e131b] border border-slate-200 dark:border-white/[0.1] text-[12.5px] text-slate-900 dark:text-white focus:border-[#0284c7] dark:focus:border-[#38bdf8] focus:outline-none"
              />
            </div>

            <div className="space-y-1">
              <label
                htmlFor="torrent-password-input"
                className="block text-[11.5px] font-semibold text-slate-700 dark:text-[#c6d4df]"
              >
                {t.torrentPasswordLabel}
              </label>
              <input
                id="torrent-password-input"
                type="password"
                dir="ltr"
                value={draftTorrent.password}
                onChange={(e) =>
                  setDraftTorrent((prev) => ({ ...prev, password: e.target.value }))
                }
                placeholder={
                  torrentConfig.hasSavedPassword ? t.torrentPasswordSavedPlaceholder : '••••••••'
                }
                className="w-full min-h-[38px] px-3 py-1.5 rounded-lg bg-slate-50 dark:bg-[#0e131b] border border-slate-200 dark:border-white/[0.1] text-[12.5px] text-slate-900 dark:text-white focus:border-[#0284c7] dark:focus:border-[#38bdf8] focus:outline-none"
              />
            </div>

            <div className="sm:col-span-2 lg:col-span-4 space-y-1">
              <label
                htmlFor="torrent-apikey-input"
                className="block text-[11.5px] font-semibold text-slate-700 dark:text-[#c6d4df]"
              >
                {t.torrentApiKeyLabel}
              </label>
              <input
                id="torrent-apikey-input"
                type="password"
                dir="ltr"
                value={draftTorrent.apiKey || ''}
                onChange={(e) =>
                  setDraftTorrent((prev) => ({ ...prev, apiKey: e.target.value }))
                }
                placeholder={
                  torrentConfig.hasSavedApiKey
                    ? t.torrentApiKeySavedPlaceholder
                    : t.torrentApiKeyPlaceholder
                }
                className="w-full min-h-[38px] px-3 py-1.5 rounded-lg bg-slate-50 dark:bg-[#0e131b] border border-slate-200 dark:border-white/[0.1] text-[12.5px] font-mono-tabular text-slate-900 dark:text-white focus:border-[#0284c7] dark:focus:border-[#38bdf8] focus:outline-none"
              />
            </div>
          </div>

          {hostError ? (
            <p className="text-[12px] text-rose-600 dark:text-rose-400 flex items-center gap-1.5">
              <WarningCircle className="w-4 h-4 shrink-0" />
              <span>{hostError}</span>
            </p>
          ) : (
            <p className="text-[11.5px] text-slate-500 dark:text-[#8b9bb4]">
              {t.torrentLoopbackNotice}
            </p>
          )}

          <div className="flex flex-wrap items-center justify-between gap-3">
            <button
              type="button"
              onClick={() => setShowTorrentGuide((prev) => !prev)}
              className="text-[12px] font-semibold text-[#0284c7] dark:text-[#66c0f4] hover:underline cursor-pointer"
            >
              {t.torrentGuideTitle}
            </button>

            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                disabled={isDetectingTorrent}
                onClick={handleAutoDetectTorrent}
                className="inline-flex items-center gap-1.5 min-h-[38px] px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-[#212a37] dark:hover:bg-[#2c3849] border border-slate-300 dark:border-white/[0.1] text-[12px] font-semibold text-slate-800 dark:text-white disabled:opacity-60 transition-colors whitespace-nowrap cursor-pointer"
              >
                <MagnifyingGlass className="w-3.5 h-3.5 text-[#0284c7] dark:text-[#66c0f4]" />
                <span>{isDetectingTorrent ? t.torrentDetectingBtn : t.torrentAutoDetectBtn}</span>
              </button>

              <button
                type="button"
                disabled={isTestingTorrent}
                onClick={handleTestTorrent}
                className="inline-flex items-center gap-1.5 min-h-[38px] px-3 py-1.5 rounded-lg bg-[#0284c7] hover:bg-[#0369a1] dark:bg-[#1a9fff] dark:hover:bg-[#38adff] text-white text-[12px] font-semibold disabled:opacity-60 transition-colors whitespace-nowrap cursor-pointer"
              >
                <PlugsConnected className="w-3.5 h-3.5" />
                <span>{isTestingTorrent ? t.torrentTestingBtn : t.torrentTestBtn}</span>
              </button>

              <button
                type="button"
                disabled={isSavingTorrent}
                onClick={handleSaveTorrent}
                className="inline-flex items-center gap-1.5 min-h-[38px] px-3.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 text-white text-[12px] font-semibold transition-colors whitespace-nowrap cursor-pointer"
              >
                <FloppyDisk className="w-3.5 h-3.5" />
                <span>{isSavingTorrent ? t.torrentSavingBtn : t.torrentSaveBtn}</span>
              </button>
            </div>
          </div>

          {showTorrentGuide && (
            <ol className="pt-2.5 border-t border-slate-200 dark:border-white/[0.08] space-y-1 text-[11.5px] text-slate-600 dark:text-[#9cb0c9] leading-relaxed">
              <li>{t.torrentGuideStep1}</li>
              <li>{t.torrentGuideStep2}</li>
              <li>{t.torrentGuideStep3}</li>
              <li>{t.torrentGuideStep4}</li>
              <li>{t.torrentGuideStep5}</li>
            </ol>
          )}
        </div>
      );
    }

    if (toolId === 'presentmon') {
      return (
        <div className="pt-4 mt-4 border-t border-slate-200 dark:border-white/[0.08] space-y-3.5">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
            <div className="p-3 rounded-lg bg-slate-50 dark:bg-[#10151c] border border-slate-200 dark:border-white/[0.06]">
              <div className="text-[11px] text-slate-500 dark:text-[#8b9bb4]">
                {tp.installedVersionLabel}
              </div>
              <div dir="ltr" className="mt-0.5 text-[13px] font-bold font-mono-tabular text-slate-900 dark:text-white">
                {presentMonSetupState?.installedVersion
                  ? `v${presentMonSetupState.installedVersion}`
                  : tp.notInstalledValue}
              </div>
            </div>

            <div className="p-3 rounded-lg bg-slate-50 dark:bg-[#10151c] border border-slate-200 dark:border-white/[0.06]">
              <div className="text-[11px] text-slate-500 dark:text-[#8b9bb4]">
                {tp.latestVersionLabel}
              </div>
              <div dir="ltr" className="mt-0.5 text-[13px] font-bold font-mono-tabular text-[#0284c7] dark:text-[#38bdf8]">
                {presentMonSetupState?.latestRelease?.version
                  ? `v${presentMonSetupState.latestRelease.version}`
                  : thw.naValue}
              </div>
            </div>

            <div className="p-3 rounded-lg bg-slate-50 dark:bg-[#10151c] border border-slate-200 dark:border-white/[0.06] min-w-0">
              <div className="text-[11px] text-slate-500 dark:text-[#8b9bb4]">
                {tp.installPathLabel}
              </div>
              <div
                dir="ltr"
                title={presentMonSetupState?.executablePath || undefined}
                className="mt-0.5 text-[12px] font-mono-tabular text-slate-700 dark:text-[#cbd5e1] truncate"
              >
                {presentMonSetupState?.executablePath || tp.notInstalledValue}
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2.5">
            <button
              type="button"
              onClick={() =>
                onOpenExternal?.(
                  presentMonSetupState?.officialReleasesUrl ||
                    'https://github.com/GameTechDev/PresentMon/releases/latest'
                )
              }
              className="inline-flex items-center gap-1.5 text-[12px] font-semibold text-[#0284c7] dark:text-[#66c0f4] hover:underline cursor-pointer"
            >
              <ArrowSquareOut className="w-3.5 h-3.5" />
              <span>{tp.officialReleasesBtn}</span>
            </button>

            <div className="flex flex-wrap items-center gap-2">
              {onOpenPresentMonManager && (
                <button
                  type="button"
                  onClick={onOpenPresentMonManager}
                  className="inline-flex items-center gap-1.5 min-h-[36px] px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-[#212a37] dark:hover:bg-[#2c3849] border border-slate-300 dark:border-white/[0.1] text-[12px] font-semibold text-slate-800 dark:text-white cursor-pointer"
                >
                  <SlidersHorizontal className="w-3.5 h-3.5" />
                  <span>{tp.managePresentMonBtn}</span>
                </button>
              )}

              {isDesktopApp && onCheckPresentMonUpdates && (
                <button
                  type="button"
                  disabled={presentMonSetupState?.stage === 'checking'}
                  onClick={() => void onCheckPresentMonUpdates()}
                  className="inline-flex items-center gap-1.5 min-h-[36px] px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-[#212a37] dark:hover:bg-[#2c3849] border border-slate-300 dark:border-white/[0.1] text-[12px] font-semibold text-slate-800 dark:text-white disabled:opacity-55 cursor-pointer"
                >
                  <ArrowCounterClockwise
                    className={`w-3.5 h-3.5 ${
                      presentMonSetupState?.stage === 'checking' ? 'motion-safe:animate-spin' : ''
                    }`}
                  />
                  <span>
                    {presentMonSetupState?.stage === 'checking'
                      ? tp.checkingBtn
                      : tp.checkUpdatesBtn}
                  </span>
                </button>
              )}

              {isDesktopApp &&
                onStartPresentMonInstallOrUpdate &&
                presentMonSetupState?.actionNeeded === 'update_available' && (
                  <button
                    type="button"
                    onClick={() => {
                      onOpenPresentMonManager?.();
                      void onStartPresentMonInstallOrUpdate(true, 'update');
                    }}
                    className="inline-flex items-center gap-1.5 min-h-[36px] px-3 py-1.5 rounded-lg bg-[#0284c7] hover:bg-[#0369a1] dark:bg-[#1a9fff] dark:hover:bg-[#38adff] text-white text-[12px] font-semibold cursor-pointer"
                  >
                    <DownloadSimple className="w-3.5 h-3.5" />
                    <span>{tp.updateNowBtn}</span>
                  </button>
                )}

              {isDesktopApp &&
                onStartPresentMonInstallOrUpdate &&
                presentMonSetupState?.actionNeeded === 'repair_required' && (
                  <button
                    type="button"
                    onClick={() => {
                      onOpenPresentMonManager?.();
                      void onStartPresentMonInstallOrUpdate(true, 'repair');
                    }}
                    className="inline-flex items-center gap-1.5 min-h-[36px] px-3 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-700 text-white text-[12px] font-semibold cursor-pointer"
                  >
                    <span>{tp.repairBtn}</span>
                  </button>
                )}

              {isDesktopApp &&
                onStartPresentMonInstallOrUpdate &&
                !presentMonSetupState?.installed && (
                  <button
                    type="button"
                    onClick={() => onOpenPresentMonManager?.()}
                    className="inline-flex items-center gap-1.5 min-h-[36px] px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-[12px] font-semibold cursor-pointer"
                  >
                    <DownloadSimple className="w-3.5 h-3.5" />
                    <span>{tp.enablePresentMonBtn}</span>
                  </button>
                )}
            </div>
          </div>
        </div>
      );
    }

    if (toolId === 'lhm') {
      const targetTool = lhmTool;
      const isTransferring =
        targetTool?.stage === 'downloading' ||
        targetTool?.stage === 'verifying' ||
        targetTool?.stage === 'installing';
      const confirmingMode =
        targetTool && ossPendingConfirm?.toolId === targetTool.id ? ossPendingConfirm.mode : null;

      return (
        <div className="pt-4 mt-4 border-t border-slate-200 dark:border-white/[0.08] space-y-3.5">
          {!hasOssDesktop && (
            <div className="px-3.5 py-2 rounded-lg bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-400/30 text-[12px] text-amber-800 dark:text-amber-200">
              {thw.ossWebPreviewNote}
            </div>
          )}

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
            <div className="p-3 rounded-lg bg-slate-50 dark:bg-[#10151c] border border-slate-200 dark:border-white/[0.06]">
              <div className="text-[11px] text-slate-500 dark:text-[#8b9bb4]">
                {thw.ossInstalledVersionLabel}
              </div>
              <div dir="ltr" className="mt-0.5 text-[13px] font-bold font-mono-tabular text-slate-900 dark:text-white">
                {targetTool?.installed && targetTool.installedVersion
                  ? `v${targetTool.installedVersion}`
                  : thw.ossStatusNotInstalled}
              </div>
            </div>

            <div className="p-3 rounded-lg bg-slate-50 dark:bg-[#10151c] border border-slate-200 dark:border-white/[0.06]">
              <div className="text-[11px] text-slate-500 dark:text-[#8b9bb4]">
                {thw.ossLatestVersionLabel}
              </div>
              <div dir="ltr" className="mt-0.5 text-[13px] font-bold font-mono-tabular text-[#0284c7] dark:text-[#38bdf8]">
                {targetTool?.latestRelease?.version
                  ? `v${targetTool.latestRelease.version}`
                  : thw.naValue}
              </div>
            </div>

            <div className="p-3 rounded-lg bg-slate-50 dark:bg-[#10151c] border border-slate-200 dark:border-white/[0.06]">
              <div className="text-[11px] text-slate-500 dark:text-[#8b9bb4]">License</div>
              <div dir="ltr" className="mt-0.5 text-[12.5px] font-semibold font-mono-tabular text-slate-800 dark:text-white">
                {targetTool?.licenseId || 'MPL-2.0'}
              </div>
            </div>

            <div className="p-3 rounded-lg bg-slate-50 dark:bg-[#10151c] border border-slate-200 dark:border-white/[0.06]">
              <div className="text-[11px] text-slate-500 dark:text-[#8b9bb4]">Elevation</div>
              <div className="mt-0.5 text-[12px] font-semibold text-slate-800 dark:text-[#cbd5e1] truncate">
                {ossState?.isElevated ? 'Administrator' : 'Standard User'}
              </div>
            </div>
          </div>

          {targetTool?.verification?.sha256Actual && (
            <div className="flex flex-wrap items-center gap-2 text-[11.5px] text-emerald-700 dark:text-[#34d399]">
              <ShieldCheck weight="fill" className="w-4 h-4 shrink-0" />
              <span className="font-semibold">{thw.ossShaVerifiedBadge}</span>
              <span dir="ltr" className="font-mono-tabular text-slate-500 dark:text-[#8b9bb4] truncate">
                {targetTool.verification.sha256Actual}
              </span>
            </div>
          )}

          {confirmingMode && targetTool && (
            <div className="rounded-lg border border-sky-300 dark:border-[#38bdf8]/40 bg-sky-50 dark:bg-[#0e1e2e] p-3 space-y-2">
              <div className="text-[12.5px] font-bold text-slate-900 dark:text-white">
                {thw.ossConfirmDownloadTitle}
              </div>
              <p className="text-[12px] text-slate-600 dark:text-[#cbd5e1]">
                {confirmingMode === 'rollback'
                  ? thw.ossConfirmRollbackDesc
                  : thw.ossConfirmDownloadDesc}
              </p>
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={async () => {
                    if (!ossBridge) return;
                    setOssPendingConfirm(null);
                    setOssBusyAction(`${confirmingMode}:${targetTool.id}`);
                    try {
                      const res =
                        confirmingMode === 'rollback'
                          ? await ossBridge.rollback({ toolId: targetTool.id, userConfirmed: true })
                          : await ossBridge.installOrUpdate({
                              toolId: targetTool.id,
                              userConfirmed: true,
                            });
                      if (res?.state) setOssState(res.state);
                    } finally {
                      setOssBusyAction(null);
                    }
                  }}
                  className="px-3 py-1.5 rounded-lg bg-[#0284c7] hover:bg-[#0369a1] text-white text-[12px] font-semibold cursor-pointer"
                >
                  {thw.ossConfirmProceedBtn}
                </button>
                <button
                  type="button"
                  onClick={() => setOssPendingConfirm(null)}
                  className="px-3 py-1.5 rounded-lg border border-slate-300 dark:border-white/[0.12] bg-white dark:bg-[#171d25] text-[12px] font-semibold cursor-pointer"
                >
                  {thw.ossCancelBtn}
                </button>
              </div>
            </div>
          )}

          <div className="flex flex-wrap items-center justify-between gap-2.5">
            <div className="flex flex-wrap items-center gap-3 text-[12px]">
              <button
                type="button"
                onClick={() =>
                  hasOssDesktop && ossBridge && targetTool
                    ? void ossBridge.openExternalLink({ toolId: targetTool.id, kind: 'repository' })
                    : onOpenExternal?.('https://github.com/LibreHardwareMonitor/LibreHardwareMonitor')
                }
                className="inline-flex items-center gap-1 font-semibold text-[#0284c7] dark:text-[#38bdf8] hover:underline cursor-pointer"
              >
                <GitBranch className="w-3.5 h-3.5" />
                <span>{thw.ossLinkRepo}</span>
              </button>
              <button
                type="button"
                onClick={() =>
                  hasOssDesktop && ossBridge && targetTool
                    ? void ossBridge.openExternalLink({ toolId: targetTool.id, kind: 'source' })
                    : onOpenExternal?.('https://github.com/LibreHardwareMonitor/LibreHardwareMonitor')
                }
                className="inline-flex items-center gap-1 font-semibold text-[#0284c7] dark:text-[#38bdf8] hover:underline cursor-pointer"
              >
                <Code className="w-3.5 h-3.5" />
                <span>{thw.ossLinkSource}</span>
              </button>
              {onNavigateSection && (
                <button
                  type="button"
                  onClick={() => onNavigateSection('hardware')}
                  className="inline-flex items-center gap-1 font-semibold text-[#0284c7] dark:text-[#38bdf8] hover:underline cursor-pointer"
                >
                  <span>{th.openHardwareMonitorBtn}</span>
                </button>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                disabled={!hasOssDesktop || ossBusyAction !== null}
                onClick={async () => {
                  if (!ossBridge || !targetTool) return;
                  setOssBusyAction('check');
                  try {
                    const res = await ossBridge.checkUpdates({
                      toolId: targetTool.id,
                      force: true,
                    });
                    if (res?.state) setOssState(res.state);
                  } finally {
                    setOssBusyAction(null);
                  }
                }}
                className="inline-flex items-center gap-1.5 min-h-[36px] px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-[#212a37] dark:hover:bg-[#2c3849] border border-slate-300 dark:border-white/[0.1] text-[12px] font-semibold disabled:opacity-50 cursor-pointer"
              >
                <ArrowClockwise className="w-3.5 h-3.5" />
                <span>{thw.ossCheckUpdatesBtn}</span>
              </button>

              {isTransferring && targetTool ? (
                <button
                  type="button"
                  onClick={() => void ossBridge?.cancel({ toolId: targetTool.id })}
                  className="inline-flex items-center gap-1.5 min-h-[36px] px-3 py-1.5 rounded-lg bg-rose-600 text-white text-[12px] font-semibold cursor-pointer"
                >
                  <XCircle className="w-3.5 h-3.5" />
                  <span>{thw.ossCancelBtn}</span>
                </button>
              ) : (
                targetTool && (
                  <button
                    type="button"
                    disabled={!hasOssDesktop || ossBusyAction !== null}
                    onClick={() => setOssPendingConfirm({ toolId: targetTool.id, mode: 'install' })}
                    className="inline-flex items-center gap-1.5 min-h-[36px] px-3 py-1.5 rounded-lg bg-[#0284c7] hover:bg-[#0369a1] dark:bg-[#1a9fff] dark:hover:bg-[#38adff] text-white text-[12px] font-semibold disabled:opacity-50 cursor-pointer"
                  >
                    <DownloadSimple className="w-3.5 h-3.5" />
                    <span>
                      {!targetTool.installed
                        ? thw.ossInstallBtn
                        : targetTool.updateAvailable
                        ? thw.ossUpdateBtn
                        : thw.ossReinstallBtn}
                    </span>
                  </button>
                )
              )}
            </div>
          </div>
        </div>
      );
    }

    if (toolId === 'cleaner') {
      const selectedList = cleanerScan
        ? cleanerScan.categories.filter((c) => cleanerSelected.has(c.id))
        : [];
      const selectedBytes = selectedList.reduce((acc, c) => acc + (c.estimatedBytes || 0), 0);

      return (
        <div className="pt-4 mt-4 border-t border-slate-200 dark:border-white/[0.08] space-y-3.5">
          {!hasCleanerDesktop && (
            <div className="px-3.5 py-2 rounded-lg bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-400/30 text-[12px] text-amber-800 dark:text-amber-200">
              {th.cleanerWebNote}
            </div>
          )}

          {cleanerResult && (
            <div className="px-3.5 py-2.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-300 dark:border-emerald-500/40 text-[12px] text-emerald-900 dark:text-emerald-200 flex items-center gap-2">
              <CheckCircle weight="fill" className="w-4 h-4 shrink-0" />
              <span>
                {thw.cleanerReportTitle}:{' '}
                <strong dir="ltr" className="font-mono-tabular">
                  {formatStorageBytes(cleanerResult.cleanedBytes, thw.naValue)}
                </strong>
              </span>
            </div>
          )}

          {cleanerScan && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {cleanerScan.categories.map((cat) => {
                const checked = cleanerSelected.has(cat.id);
                return (
                  <label
                    key={cat.id}
                    className={`flex items-center justify-between gap-2.5 p-2.5 rounded-lg border text-[12px] cursor-pointer transition-colors ${
                      !cat.supported
                        ? 'opacity-50 cursor-not-allowed bg-slate-50 dark:bg-[#10151c] border-slate-200 dark:border-white/[0.05]'
                        : checked
                        ? 'bg-sky-50/70 dark:bg-[#142233] border-[#0284c7]/45 dark:border-[#38bdf8]/45'
                        : 'bg-slate-50 dark:bg-[#10151c] border-slate-200 dark:border-white/[0.07]'
                    }`}
                  >
                    <span className="flex items-center gap-2 min-w-0">
                      <input
                        type="checkbox"
                        disabled={!cat.supported}
                        checked={checked}
                        onChange={() =>
                          setCleanerSelected((prev) => {
                            const next = new Set(prev);
                            if (next.has(cat.id)) next.delete(cat.id);
                            else next.add(cat.id);
                            return next;
                          })
                        }
                        className="accent-[#0284c7] dark:accent-[#38bdf8]"
                      />
                      <span className="font-medium text-slate-800 dark:text-white truncate">
                        {cat.id.replace(/_/g, ' ')}
                      </span>
                    </span>
                    <span dir="ltr" className="font-mono-tabular font-semibold text-slate-600 dark:text-[#9cb0c9] shrink-0">
                      {formatStorageBytes(cat.estimatedBytes, thw.naValue)}
                    </span>
                  </label>
                );
              })}
            </div>
          )}

          {cleanerConfirm && (
            <div className="p-3 rounded-lg border border-amber-300 dark:border-amber-500/40 bg-amber-50 dark:bg-[#1e1a12] flex flex-wrap items-center justify-between gap-2.5 text-[12px]">
              <span className="text-amber-900 dark:text-amber-200 font-semibold">
                {thw.cleanerConfirmTitle} ({formatStorageBytes(selectedBytes, thw.naValue)})
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => void handleQuickCleanerExecute()}
                  className="px-3 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-700 text-white font-semibold cursor-pointer"
                >
                  {thw.cleanerConfirmAction}
                </button>
                <button
                  type="button"
                  onClick={() => setCleanerConfirm(false)}
                  className="px-3 py-1.5 rounded-lg border border-slate-300 dark:border-white/[0.12] bg-white dark:bg-[#171d25] font-semibold cursor-pointer"
                >
                  {t.exitAppCancelBtn}
                </button>
              </div>
            </div>
          )}

          <div className="flex flex-wrap items-center justify-between gap-2.5">
            {onNavigateSection && (
              <button
                type="button"
                onClick={() => onNavigateSection('hardware')}
                className="inline-flex items-center gap-1.5 text-[12px] font-semibold text-[#0284c7] dark:text-[#66c0f4] hover:underline cursor-pointer"
              >
                <Broom className="w-3.5 h-3.5" />
                <span>{th.openPcCleanerBtn}</span>
              </button>
            )}

            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                disabled={!hasCleanerDesktop || cleanerBusy !== null}
                onClick={() => void handleQuickCleanerScan()}
                className="inline-flex items-center gap-1.5 min-h-[36px] px-3 py-1.5 rounded-lg bg-[#0284c7] hover:bg-[#0369a1] dark:bg-[#1a9fff] dark:hover:bg-[#38adff] text-white text-[12px] font-semibold disabled:opacity-50 cursor-pointer"
              >
                <MagnifyingGlass className="w-3.5 h-3.5" />
                <span>{cleanerBusy === 'scan' ? thw.cleanerScanningBtn : th.cleanerQuickScanBtn}</span>
              </button>

              {cleanerScan && selectedList.length > 0 && (
                <button
                  type="button"
                  disabled={!hasCleanerDesktop || cleanerBusy !== null}
                  onClick={() => setCleanerConfirm(true)}
                  className="inline-flex items-center gap-1.5 min-h-[36px] px-3 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-700 text-white text-[12px] font-semibold disabled:opacity-50 cursor-pointer"
                >
                  <Trash className="w-3.5 h-3.5" />
                  <span>
                    {th.cleanerQuickCleanBtn} ({formatStorageBytes(selectedBytes, thw.naValue)})
                  </span>
                </button>
              )}
            </div>
          </div>
        </div>
      );
    }

    if (toolId === 'deals_api') {
      return (
        <div className="pt-4 mt-4 border-t border-slate-200 dark:border-white/[0.08] space-y-4">
          <div className="space-y-1.5">
            <div className="text-[11.5px] font-bold uppercase tracking-wider text-emerald-700 dark:text-[#4ade80]">
              {tr.deals.apiKeysFreeLabel}
            </div>
            <ul className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 text-[11.5px] text-slate-700 dark:text-[#c7d7eb]">
              {FREE_ACTIVE_APIS.map((item) => (
                <li key={item} className="flex items-start gap-1.5">
                  <CheckCircle weight="fill" className="w-3.5 h-3.5 text-emerald-500 shrink-0 mt-0.5" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>

          {!isElectronDeals && (
            <div className="px-3.5 py-2 rounded-lg bg-sky-50 dark:bg-[#121a26] border border-sky-200 dark:border-[#1a9fff]/25 text-[12px] text-sky-900 dark:text-[#9fb0c7]">
              {tr.deals.apiKeysSafeStorageNote} ({t.modeWebPreviewBadge})
            </div>
          )}

          {dealsFeedback && (
            <div className="px-3 py-2 rounded-lg border border-slate-200 dark:border-white/[0.12] bg-slate-50 dark:bg-white/[0.05] text-[12px] flex items-center gap-2">
              <WarningCircle className="w-4 h-4 text-[#0284c7] shrink-0" />
              <span>{dealsFeedback}</span>
            </div>
          )}

          <div className="space-y-2.5">
            <div className="text-[11.5px] font-bold uppercase tracking-wider text-slate-500 dark:text-[#8b9bb4]">
              {tr.deals.apiKeysOptionalLabel}
            </div>
            {OPTIONAL_PROVIDER_DOCS.map((spec) => {
              const entry = dealsCredStatus?.providers?.[spec.id];
              const configured = Boolean(entry?.configured);
              return (
                <div
                  key={spec.id}
                  className="p-3 rounded-lg bg-slate-50 dark:bg-[#10151c] border border-slate-200 dark:border-white/[0.07] space-y-2"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <div className="text-[12.5px] font-bold text-slate-900 dark:text-white">
                        {spec.title}
                      </div>
                      <div className="text-[11px] text-slate-500 dark:text-[#8b9bb4]">
                        {spec.tierNote}
                      </div>
                    </div>
                    <span
                      className={`inline-flex items-center gap-1 text-[11px] font-semibold ${
                        configured
                          ? 'text-emerald-600 dark:text-[#4ade80]'
                          : 'text-slate-500 dark:text-[#8b9bb4]'
                      }`}
                    >
                      <LockKey className="w-3.5 h-3.5" />
                      {configured
                        ? `${tr.deals.apiKeysConfiguredBadge} (${entry?.maskedPreview || '••••'})`
                        : tr.deals.apiKeysNotSetBadge}
                    </span>
                  </div>

                  <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                    <input
                      type="password"
                      dir="ltr"
                      value={dealsKeyInputs[spec.id]}
                      onChange={(e) =>
                        setDealsKeyInputs((prev) => ({ ...prev, [spec.id]: e.target.value }))
                      }
                      disabled={!isElectronDeals || dealsBusyId === spec.id}
                      placeholder={spec.placeholder}
                      className="flex-1 min-h-[36px] px-3 rounded-lg border border-slate-200 dark:border-white/[0.1] bg-white dark:bg-[#161e29] text-[12px] font-mono-tabular focus:outline-none focus:border-[#0284c7]"
                    />
                    <button
                      type="button"
                      disabled={!isElectronDeals || !dealsKeyInputs[spec.id].trim() || dealsBusyId === spec.id}
                      onClick={() => void handleSaveDealsKey(spec.id)}
                      className="px-3 py-1.5 min-h-[36px] rounded-lg bg-[#0284c7] hover:bg-[#0369a1] dark:bg-[#1a9fff] dark:hover:bg-[#38adff] text-white text-[12px] font-semibold disabled:opacity-45 whitespace-nowrap cursor-pointer"
                    >
                      {tr.deals.apiKeysSaveBtn}
                    </button>
                    {configured && (
                      <button
                        type="button"
                        disabled={!isElectronDeals || dealsBusyId === spec.id}
                        onClick={() => void handleClearDealsKey(spec.id)}
                        className="inline-flex items-center justify-center gap-1 px-2.5 py-1.5 min-h-[36px] rounded-lg border border-rose-500/35 text-rose-600 dark:text-rose-400 hover:bg-rose-500/10 text-[12px] font-semibold whitespace-nowrap cursor-pointer"
                      >
                        <Trash className="w-3.5 h-3.5" />
                        <span>{tr.deals.apiKeysClearBtn}</span>
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2">
            <button
              type="button"
              onClick={() => {
                clearDealsMemoryCache();
                onNotify?.(th.dealsCacheCleared, 'info');
              }}
              className="inline-flex items-center gap-1.5 min-h-[36px] px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-[#212a37] dark:hover:bg-[#2c3849] border border-slate-300 dark:border-white/[0.1] text-[12px] font-semibold cursor-pointer"
            >
              <Trash className="w-3.5 h-3.5" />
              <span>{th.clearDealsCacheBtn}</span>
            </button>

            {onNavigateSection && (
              <button
                type="button"
                onClick={() => onNavigateSection('deals')}
                className="inline-flex items-center gap-1.5 min-h-[36px] px-3.5 py-1.5 rounded-lg bg-[#0284c7] hover:bg-[#0369a1] dark:bg-[#1a9fff] dark:hover:bg-[#38adff] text-white text-[12px] font-semibold cursor-pointer"
              >
                <span>{th.openDealsBtn}</span>
              </button>
            )}
          </div>
        </div>
      );
    }

    if (toolId === 'canrunit') {
      return (
        <div className="pt-4 mt-4 border-t border-slate-200 dark:border-white/[0.08] space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="space-y-0.5">
              <span
                id="hub-setting-can-run-it"
                className="block text-[13px] font-semibold text-slate-900 dark:text-white"
              >
                {t.canRunItTitle}
              </span>
              <p className="text-[12px] text-slate-600 dark:text-[#8b9bb4]">{t.canRunItDesc}</p>
            </div>
            <ToggleSwitch
              checked={enableCanRunIt}
              labelId="hub-setting-can-run-it"
              onLabel={t.activeLabel}
              offLabel={t.inactiveLabel}
              onChange={onToggleEnableCanRunIt}
            />
          </div>

          {systemSpecs && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
              <div className="p-3 rounded-lg bg-slate-50 dark:bg-[#10151c] border border-slate-200 dark:border-white/[0.06]">
                <div className="text-[11px] text-slate-500 dark:text-[#8b9bb4]">{th.specsCpuLabel}</div>
                <div className="mt-0.5 text-[12px] font-semibold text-slate-900 dark:text-white truncate" title={systemSpecs.cpuName}>
                  {systemSpecs.cpuName}
                </div>
              </div>
              <div className="p-3 rounded-lg bg-slate-50 dark:bg-[#10151c] border border-slate-200 dark:border-white/[0.06]">
                <div className="text-[11px] text-slate-500 dark:text-[#8b9bb4]">{th.specsGpuLabel}</div>
                <div className="mt-0.5 text-[12px] font-semibold text-slate-900 dark:text-white truncate" title={systemSpecs.gpuName}>
                  {systemSpecs.gpuName}
                  {systemSpecs.gpuVramGB ? ` (${systemSpecs.gpuVramGB} GB)` : ''}
                </div>
              </div>
              <div className="p-3 rounded-lg bg-slate-50 dark:bg-[#10151c] border border-slate-200 dark:border-white/[0.06]">
                <div className="text-[11px] text-slate-500 dark:text-[#8b9bb4]">{th.specsRamLabel}</div>
                <div dir="ltr" className="mt-0.5 text-[12.5px] font-bold font-mono-tabular text-slate-900 dark:text-white">
                  {systemSpecs.ramGB != null ? `${systemSpecs.ramGB} GB` : thw.naValue}
                </div>
              </div>
              <div className="p-3 rounded-lg bg-slate-50 dark:bg-[#10151c] border border-slate-200 dark:border-white/[0.06]">
                <div className="text-[11px] text-slate-500 dark:text-[#8b9bb4]">{th.specsDiskFreeLabel}</div>
                <div dir="ltr" className="mt-0.5 text-[12.5px] font-bold font-mono-tabular text-slate-900 dark:text-white">
                  {systemSpecs.freeSpaceGB != null
                    ? `${systemSpecs.freeSpaceGB} GB${systemSpecs.spaceDrive ? ` (${systemSpecs.spaceDrive})` : ''}`
                    : thw.naValue}
                </div>
              </div>
            </div>
          )}

          {editingSpecs && systemSpecs && (
            <form
              onSubmit={handleSaveCustomSpecsForm}
              className="p-3.5 rounded-lg bg-slate-50 dark:bg-[#10151c] border border-slate-200 dark:border-white/[0.08] space-y-3"
            >
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2.5">
                <div className="sm:col-span-2 space-y-1">
                  <label className="block text-[11px] font-semibold text-slate-600 dark:text-[#9cb0c9]">
                    {th.specsCpuLabel}
                  </label>
                  <input
                    type="text"
                    value={draftCpu}
                    onChange={(e) => setDraftCpu(e.target.value)}
                    className="w-full min-h-[36px] px-2.5 rounded-lg bg-white dark:bg-[#161e29] border border-slate-200 dark:border-white/[0.1] text-[12px]"
                  />
                </div>
                <div className="sm:col-span-2 space-y-1">
                  <label className="block text-[11px] font-semibold text-slate-600 dark:text-[#9cb0c9]">
                    {th.specsGpuLabel}
                  </label>
                  <input
                    type="text"
                    value={draftGpu}
                    onChange={(e) => setDraftGpu(e.target.value)}
                    className="w-full min-h-[36px] px-2.5 rounded-lg bg-white dark:bg-[#161e29] border border-slate-200 dark:border-white/[0.1] text-[12px]"
                  />
                </div>
                <div className="space-y-1">
                  <label className="block text-[11px] font-semibold text-slate-600 dark:text-[#9cb0c9]">
                    {th.specsVramLabel}
                  </label>
                  <input
                    type="number"
                    step="0.5"
                    min="0"
                    dir="ltr"
                    value={draftVram}
                    onChange={(e) => setDraftVram(e.target.value)}
                    className="w-full min-h-[36px] px-2.5 rounded-lg bg-white dark:bg-[#161e29] border border-slate-200 dark:border-white/[0.1] text-[12px] font-mono-tabular"
                  />
                </div>
                <div className="space-y-1">
                  <label className="block text-[11px] font-semibold text-slate-600 dark:text-[#9cb0c9]">
                    {th.specsRamLabel}
                  </label>
                  <input
                    type="number"
                    min="1"
                    dir="ltr"
                    value={draftRam}
                    onChange={(e) => setDraftRam(e.target.value)}
                    className="w-full min-h-[36px] px-2.5 rounded-lg bg-white dark:bg-[#161e29] border border-slate-200 dark:border-white/[0.1] text-[12px] font-mono-tabular"
                  />
                </div>
                <div className="space-y-1">
                  <label className="block text-[11px] font-semibold text-slate-600 dark:text-[#9cb0c9]">
                    {th.specsDiskFreeLabel}
                  </label>
                  <input
                    type="number"
                    min="0"
                    dir="ltr"
                    value={draftDiskFree}
                    onChange={(e) => setDraftDiskFree(e.target.value)}
                    className="w-full min-h-[36px] px-2.5 rounded-lg bg-white dark:bg-[#161e29] border border-slate-200 dark:border-white/[0.1] text-[12px] font-mono-tabular"
                  />
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="submit"
                  className="inline-flex items-center gap-1.5 min-h-[34px] px-3 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-[12px] font-semibold cursor-pointer"
                >
                  <FloppyDisk className="w-3.5 h-3.5" />
                  <span>{th.specsSaveBtn}</span>
                </button>
                <button
                  type="button"
                  onClick={() => setEditingSpecs(false)}
                  className="min-h-[34px] px-3 py-1 rounded-lg border border-slate-300 dark:border-white/[0.12] bg-white dark:bg-[#171d25] text-[12px] font-semibold cursor-pointer"
                >
                  {t.exitAppCancelBtn}
                </button>
              </div>
            </form>
          )}

          <div className="flex flex-wrap items-center gap-2">
            {onRefreshSpecs && (
              <button
                type="button"
                disabled={isRefreshingSpecs}
                onClick={() => void onRefreshSpecs()}
                className="inline-flex items-center gap-1.5 min-h-[36px] px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-[#212a37] dark:hover:bg-[#2c3849] border border-slate-300 dark:border-white/[0.1] text-[12px] font-semibold disabled:opacity-50 cursor-pointer"
              >
                <ArrowsClockwise
                  className={`w-3.5 h-3.5 ${isRefreshingSpecs ? 'motion-safe:animate-spin' : ''}`}
                />
                <span>{th.specsRescanBtn}</span>
              </button>
            )}
            {onSaveCustomSpecs && systemSpecs && (
              <button
                type="button"
                onClick={() => setEditingSpecs((prev) => !prev)}
                className="inline-flex items-center gap-1.5 min-h-[36px] px-3 py-1.5 rounded-lg bg-[#0284c7] hover:bg-[#0369a1] dark:bg-[#1a9fff] dark:hover:bg-[#38adff] text-white text-[12px] font-semibold cursor-pointer"
              >
                <SlidersHorizontal className="w-3.5 h-3.5" />
                <span>{th.specsCustomizeBtn}</span>
              </button>
            )}
            {onResetCustomSpecs && systemSpecs?.source === 'custom' && (
              <button
                type="button"
                onClick={() => void onResetCustomSpecs()}
                className="inline-flex items-center gap-1.5 min-h-[36px] px-3 py-1.5 rounded-lg border border-slate-300 dark:border-white/[0.1] text-[12px] font-semibold cursor-pointer"
              >
                <ArrowCounterClockwise className="w-3.5 h-3.5" />
                <span>{th.specsResetAutoBtn}</span>
              </button>
            )}
          </div>
        </div>
      );
    }

    if (toolId === 'bench_db') {
      return (
        <div className="pt-4 mt-4 border-t border-slate-200 dark:border-white/[0.08] space-y-3.5">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
            <div className="p-3 rounded-lg bg-slate-50 dark:bg-[#10151c] border border-slate-200 dark:border-white/[0.06]">
              <div className="text-[11px] text-slate-500 dark:text-[#8b9bb4]">{th.dbVersionLabel}</div>
              <div dir="ltr" className="mt-0.5 text-[13px] font-bold font-mono-tabular text-slate-900 dark:text-white">
                v{dbState?.dbVersion || BUNDLED_HARDWARE_DB_VERSION}
              </div>
            </div>
            <div className="p-3 rounded-lg bg-slate-50 dark:bg-[#10151c] border border-slate-200 dark:border-white/[0.06]">
              <div className="text-[11px] text-slate-500 dark:text-[#8b9bb4]">{th.dbEntriesLabel}</div>
              <div dir="ltr" className="mt-0.5 text-[13px] font-bold font-mono-tabular text-[#0284c7] dark:text-[#38bdf8]">
                {dbState?.entryCount || BUNDLED_HARDWARE_DATABASE.length}
              </div>
            </div>
            <div className="p-3 rounded-lg bg-slate-50 dark:bg-[#10151c] border border-slate-200 dark:border-white/[0.06]">
              <div className="text-[11px] text-slate-500 dark:text-[#8b9bb4]">{thw.ossReleaseDateLabel}</div>
              <div dir="ltr" className="mt-0.5 text-[12px] font-semibold font-mono-tabular text-slate-700 dark:text-[#cbd5e1] truncate">
                {(dbState?.lastUpdatedAt || BUNDLED_HARDWARE_DB_UPDATED_AT).slice(0, 10)}
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {isDesktopApp && hwIntelBridge && (
              <button
                type="button"
                disabled={isUpdatingDb}
                onClick={() => void handleCheckDbUpdate()}
                className="inline-flex items-center gap-1.5 min-h-[36px] px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-[#212a37] dark:hover:bg-[#2c3849] border border-slate-300 dark:border-white/[0.1] text-[12px] font-semibold disabled:opacity-50 cursor-pointer"
              >
                <ArrowsClockwise className={`w-3.5 h-3.5 ${isUpdatingDb ? 'motion-safe:animate-spin' : ''}`} />
                <span>{th.dbCheckUpdateBtn}</span>
              </button>
            )}
            {onNavigateSection && (
              <button
                type="button"
                onClick={() => onNavigateSection('hardware')}
                className="inline-flex items-center gap-1.5 min-h-[36px] px-3.5 py-1.5 rounded-lg bg-[#0284c7] hover:bg-[#0369a1] dark:bg-[#1a9fff] dark:hover:bg-[#38adff] text-white text-[12px] font-semibold cursor-pointer"
              >
                <span>{th.openBenchmarksBtn}</span>
              </button>
            )}
          </div>
        </div>
      );
    }

    return null;
  };

  const renderQuickActionForTool = (tool: ToolDescriptor) => {
    if (tool.id === 'hypervisor' && onOpenHypervisorGuide) {
      return (
        <button
          type="button"
          onClick={onOpenHypervisorGuide}
          className="inline-flex items-center gap-1.5 min-h-[36px] px-3 py-1.5 rounded-lg bg-[#0284c7] hover:bg-[#0369a1] dark:bg-[#1a9fff] dark:hover:bg-[#38adff] text-white text-[12px] font-semibold whitespace-nowrap cursor-pointer"
        >
          <Wrench className="w-3.5 h-3.5" />
          <span>{th.openHypervisorBtn}</span>
        </button>
      );
    }

    if (tool.id === 'spinwheel' && onOpenSpinWheel) {
      return (
        <button
          type="button"
          onClick={onOpenSpinWheel}
          className="inline-flex items-center gap-1.5 min-h-[36px] px-3 py-1.5 rounded-lg bg-[#0284c7] hover:bg-[#0369a1] dark:bg-[#1a9fff] dark:hover:bg-[#38adff] text-white text-[12px] font-semibold whitespace-nowrap cursor-pointer"
        >
          <Gauge className="w-3.5 h-3.5" />
          <span>{th.openSpinWheelBtn}</span>
        </button>
      );
    }

    if (tool.id === 'updater') {
      return (
        <div className="flex flex-wrap items-center gap-1.5">
          {(onOpenUpdater || onCheckForUpdates) && (
            <button
              type="button"
              onClick={() => (onOpenUpdater ? onOpenUpdater() : onCheckForUpdates?.())}
              className="inline-flex items-center gap-1.5 min-h-[36px] px-3 py-1.5 rounded-lg bg-[#0284c7] hover:bg-[#0369a1] dark:bg-[#1a9fff] dark:hover:bg-[#38adff] text-white text-[12px] font-semibold whitespace-nowrap cursor-pointer"
            >
              <ArrowClockwise className="w-3.5 h-3.5" />
              <span>{th.openUpdaterBtn}</span>
            </button>
          )}
          {onOpenUpdateHistory && (
            <button
              type="button"
              onClick={onOpenUpdateHistory}
              className="inline-flex items-center gap-1.5 min-h-[36px] px-2.5 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-[#212a37] dark:hover:bg-[#2c3849] border border-slate-300 dark:border-white/[0.1] text-[12px] font-semibold whitespace-nowrap cursor-pointer"
            >
              <ClockCounterClockwise className="w-3.5 h-3.5" />
              <span>{tr.updateHistory.openHistoryBtn}</span>
            </button>
          )}
          {onOpenNotifications && (
            <button
              type="button"
              onClick={onOpenNotifications}
              aria-label={tr.notificationCenter.title}
              title={tr.notificationCenter.title}
              className="inline-flex items-center justify-center min-h-[36px] px-2.5 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-[#212a37] dark:hover:bg-[#2c3849] border border-slate-300 dark:border-white/[0.1] cursor-pointer"
            >
              <Bell className="w-3.5 h-3.5" />
            </button>
          )}
          {onReplayOnboarding && (
            <button
              type="button"
              onClick={onReplayOnboarding}
              className="inline-flex items-center gap-1 min-h-[36px] px-2.5 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-[#212a37] dark:hover:bg-[#2c3849] border border-slate-300 dark:border-white/[0.1] text-[12px] font-semibold whitespace-nowrap cursor-pointer"
            >
              <span>{t.replaySetupBtn}</span>
            </button>
          )}
        </div>
      );
    }

    return null;
  };

  const filterTabs: { id: ToolsHubFilter; label: string; count: number }[] = [
    { id: 'all', label: th.hubFilterAll, count: filterCounts.all },
    { id: 'hardware', label: th.hubFilterHardware, count: filterCounts.hardware },
    { id: 'downloads', label: th.hubFilterDownloads, count: filterCounts.downloads },
    { id: 'deals', label: th.hubFilterDeals, count: filterCounts.deals },
    { id: 'utilities', label: th.hubFilterUtilities, count: filterCounts.utilities },
  ];

  return (
    <section
      id="tools-integrations-hub"
      className="sa-ps5-panel rounded-xl bg-white dark:bg-[#171d25] border border-slate-200 dark:border-white/[0.08] p-4 sm:p-5 space-y-4 shadow-sm dark:shadow-lg"
    >
      <div className="flex flex-wrap items-start justify-between gap-3 pb-3 border-b border-slate-200 dark:border-white/[0.06]">
        <div className="flex items-start gap-3 min-w-0 flex-1">
          <span className="w-9 h-9 rounded-lg bg-sky-500/10 dark:bg-[#1a9fff]/15 border border-sky-500/25 dark:border-[#1a9fff]/35 text-[#0284c7] dark:text-[#66c0f4] flex items-center justify-center shrink-0">
            <Wrench className="w-4.5 h-4.5" />
          </span>
          <div className="space-y-0.5 min-w-0">
            <h2 className="text-[15px] font-bold text-slate-900 dark:text-white tracking-tight">
              {th.hubTitle}
            </h2>
            <p className="text-[12px] text-slate-600 dark:text-[#8b9bb4] leading-relaxed">
              {th.hubSubtitle}
            </p>
          </div>
        </div>
      </div>

      {/* Category Filter Segmented Control */}
      <div className="flex flex-wrap items-center gap-1.5 p-1 rounded-lg bg-slate-100 dark:bg-[#10151c] border border-slate-200/70 dark:border-white/[0.06]">
        {filterTabs.map((tab) => {
          const active = filter === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              aria-pressed={active}
              onClick={() => setFilter(tab.id)}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-[12px] font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                active
                  ? 'bg-white dark:bg-[#1d2735] text-slate-900 dark:text-white shadow-xs'
                  : 'text-slate-600 dark:text-[#8b9bb4] hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <span>{tab.label}</span>
              <span className="font-mono-tabular text-[11px] opacity-75">{tab.count}</span>
            </button>
          );
        })}
      </div>

      {/* Tools Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {visibleTools.map((tool) => {
          const Icon = tool.icon;
          const isExpanded = activeExpanded === tool.id;
          return (
            <div
              key={tool.id}
              id={`tool-card-${tool.id}`}
              className={`sa-ps5-subpanel rounded-xl border p-4 transition-colors flex flex-col justify-between ${
                isExpanded
                  ? 'md:col-span-2 bg-white dark:bg-[#131922] border-[#0284c7]/50 dark:border-[#38bdf8]/45'
                  : 'bg-slate-50 dark:bg-[#12171f] border-slate-200 dark:border-white/[0.07]'
              }`}
            >
              <div className="space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3 min-w-0">
                    <span className="w-9 h-9 rounded-lg bg-slate-200/80 dark:bg-[#1a2433] border border-slate-300/70 dark:border-white/[0.08] text-[#0284c7] dark:text-[#66c0f4] flex items-center justify-center shrink-0">
                      <Icon className="w-4.5 h-4.5" />
                    </span>
                    <div className="min-w-0 space-y-1">
                      <h3 className="text-[13.5px] font-bold text-slate-900 dark:text-white leading-snug">
                        {tool.name}
                      </h3>
                      <div className="flex flex-wrap items-center gap-1.5 text-[11.5px]">
                        <span className={`font-semibold ${statusToneStyle(tool.statusTone)}`}>
                          {tool.statusText}
                        </span>
                        <span aria-hidden="true" className="text-slate-400 dark:text-white/25">
                          ·
                        </span>
                        <span dir="ltr" className="font-mono-tabular text-slate-500 dark:text-[#8b9bb4] truncate">
                          {tool.metaLine}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="space-y-1">
                  <div className="text-[11px] font-semibold text-slate-500 dark:text-[#7f91ab]">
                    {th.hubPurposeLabel}
                  </div>
                  <p className="text-[12px] text-slate-700 dark:text-[#b4c2d4] leading-relaxed">
                    {tool.purpose}
                  </p>
                </div>
              </div>

              <div className="pt-3.5 mt-3.5 border-t border-slate-200/70 dark:border-white/[0.06] flex flex-wrap items-center justify-between gap-2">
                {tool.hasInlineConfig ? (
                  <button
                    type="button"
                    aria-expanded={isExpanded}
                    onClick={() => setExpanded(isExpanded ? null : tool.id)}
                    className={`inline-flex items-center gap-1.5 min-h-[36px] px-3 py-1.5 rounded-lg text-[12px] font-semibold transition-colors whitespace-nowrap cursor-pointer ${
                      isExpanded
                        ? 'bg-slate-200 dark:bg-[#232d3d] text-slate-900 dark:text-white'
                        : 'bg-[#0284c7] hover:bg-[#0369a1] dark:bg-[#1a9fff] dark:hover:bg-[#38adff] text-white'
                    }`}
                  >
                    <SlidersHorizontal className="w-3.5 h-3.5" />
                    <span>{isExpanded ? th.hubHideConfigBtn : th.hubConfigureBtn}</span>
                    {isExpanded ? (
                      <CaretUp className="w-3.5 h-3.5" />
                    ) : (
                      <CaretDown className="w-3.5 h-3.5" />
                    )}
                  </button>
                ) : (
                  renderQuickActionForTool(tool)
                )}
              </div>

              {isExpanded && tool.hasInlineConfig && renderInlineToolConfig(tool.id)}
            </div>
          );
        })}
      </div>
    </section>
  );
}
