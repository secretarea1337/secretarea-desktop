export type SheetTabKey =
  | 'game'
  | 'hypervisor'
  | 'steamtools'
  | 'architect'
  | 'extra'
  | 'upcoming'
  | 'steamaccounts'
  | 'mastergift'
  | 'profil'
  | 'topgames'
  | 'upcominglist'
  | 'popularrepacks'
  | 'bestgameseries'
  | 'maintenance'
  | 'upcomingtrailers'
  | 'ps5'
  | 'onlinegames';

export interface RawSheetRow {
  id?: string | number;
  category?: string;
  name?: string;
  title?: string;
  version?: string;
  repackSize?: string;
  originalSize?: string;
  genres?: string;
  languages?: string;
  repackBy?: string;
  coverImage?: string;
  image?: string;
  gallery?: string;
  description?: string;
  requirements?: string;
  steps?: string;
  part1?: string;
  mirror1?: string;
  part2?: string;
  mirror2?: string;
  full?: string;
  trailer?: string;
  pinned?: string | boolean;
  tools?: string;
  Free?: string | boolean;
  free?: string | boolean;
  Date?: string;
  date?: string;
  'dodi 1'?: string;
  'dodi 2'?: string;
  'dodi 3'?: string;
  'skidrow 1'?: string;
  'skidrow 2'?: string;
  'skidrow 3'?: string;
  'steamrip 1'?: string;
  'steamrip 2'?: string;
  anker1?: string;
  anker2?: string;
  'unlock 01'?: string;
  'unlock 02'?: string;
  'unlock 03'?: string;
  [key: string]: unknown;
}

export interface ParsedRequirements {
  os?: string;
  ram?: string;
  cpu?: string;
  gpu?: string;
  raw: string;
}

export interface ToolLink {
  name: string;
  url: string;
}

export interface MirrorLink {
  label: string;
  group:
    | 'Magnet Link'
    | 'Full Download'
    | 'MediaFire (Direct Link)'
    | 'Mega (Backup)'
    | 'FitGirl-Repacks'
    | 'DoDI-Repack'
    | 'Skidrow'
    | 'SteamRIP'
    | 'Direct Mirrors'
    | 'Anker'
    | 'Unlockers'
    | 'Resources';
  url: string;
  isMagnet: boolean;
}

export interface GameItem {
  id: string;
  tab: SheetTabKey;
  category: string;
  name: string;
  version: string;
  repackSize: string;
  repackSizeMB: number;
  originalSize: string;
  genreList: string[];
  genresRaw: string;
  languages: string;
  repackBy: string;
  coverImage: string;
  galleryImages: string[];
  galleryVideos: string[];
  description: string;
  parsedRequirements: ParsedRequirements;
  parsedSteps: string[];
  mirrors: MirrorLink[];
  primaryMagnet: string | null;
  trailerUrl: string;
  embedTrailerUrl: string | null;
  isPinned: boolean;
  isFree: boolean;
  isNew: boolean;
  parsedTools: ToolLink[];
  dateAdded: string;
  dateTimestamp: number;
  rawFields: Record<string, string>;
}

export type SheetCatalogData = Record<SheetTabKey, GameItem[]>;

export interface ReplyItem {
  id: string;
  author: string;
  text: string;
  timestamp: string;
  reactions: {
    like: number;
    dislike: number;
    love: number;
  };
}

export interface CommentItem {
  id: string;
  itemId: string;
  author: string;
  text: string;
  tags: string[];
  reactions: {
    like: number;
    dislike: number;
    love: number;
  };
  timestamp: string;
  replies: ReplyItem[];
}

export interface ItemRequestPayload {
  id?: string;
  title: string;
  category: string;
  image?: string;
  message: string;
  timestamp?: string;
  status?: string;
  syncedToSheet?: boolean;
}

export type PrimarySection =
  | 'store'
  | 'library'
  | 'deals'
  | 'extras'
  | 'downloads'
  | 'requests'
  | 'studios'
  | 'hardware'
  | 'settings';

export type LibrarySectionTab =
  | 'game'
  | 'hypervisor'
  | 'steamtools'
  | 'ps5'
  | 'architect'
  | 'extra';

export type SortOption =
  | 'smart'
  | 'latest'
  | 'alphabetical'
  | 'alphabetical-desc'
  | 'favorites'
  | 'size-asc'
  | 'size-desc'
  | 'mirrors';

export type DownloadSourceType = 'direct' | 'mediafire' | 'mega' | 'qbittorrent' | 'browser';

export type DownloadStatus =
  | 'queued'
  | 'resolving'
  | 'downloading'
  | 'paused'
  | 'completed'
  | 'failed'
  | 'cancelled';

export interface DownloadTask {
  id: string;
  title: string;
  fileName: string;
  url: string;
  resolvedUrl?: string;
  source: DownloadSourceType;
  channelGroup: string;
  coverImage?: string;
  gameId?: string;
  gameTab?: SheetTabKey;
  status: DownloadStatus;
  progress: number;
  downloadedBytes: number;
  totalBytes: number;
  speedBytesPerSec: number;
  uploadSpeedBytesPerSec?: number;
  etaSeconds: number | null;
  savePath: string;
  canPauseResume: boolean;
  torrentHash?: string;
  torrentPeers?: number;
  torrentPeersTotal?: number;
  torrentSeeds?: number;
  torrentSeedsTotal?: number;
  torrentRatio?: number;
  torrentStateRaw?: string;
  error?: string | null;
  createdAt: number;
  updatedAt: number;
  completedAt?: number | null;
}

export interface TorrentIntegrationConfig {
  enabled: boolean;
  host: string;
  port: number;
  username: string;
  password: string;
  apiKey?: string;
  hasSavedPassword?: boolean;
  hasSavedApiKey?: boolean;
  pollIntervalMs?: number;
}

export interface TorrentDetectionResult {
  installed: boolean;
  clientName: string;
  executablePath: string | null;
  openWebUiPorts: number[];
  recommendedHost: string;
  recommendedPort: number;
  isRunning: boolean;
  downloadUrl: string;
}

export interface TorrentConnectionTestResult {
  ok: boolean;
  version?: string;
  webApiVersion?: string;
  activeCount?: number;
  authMethod?: 'cookie' | 'api-key' | 'localhost-bypass';
  message: string;
  hint?: string;
}

export interface DownloadManagerSnapshot {
  tasks: DownloadTask[];
  downloadFolder: string;
  maxConcurrent: number;
  torrentConfig: TorrentIntegrationConfig;
  torrentConnected: boolean;
  torrentVersion?: string | null;
  torrentWebApiVersion?: string | null;
  torrentError?: string | null;
}

export type QbitSetupStage =
  | 'idle'
  | 'checking_dependencies'
  | 'detecting_qbit'
  | 'fetching_release'
  | 'ready'
  | 'downloading'
  | 'verifying'
  | 'installing'
  | 'configuring'
  | 'waiting_for_close'
  | 'completed'
  | 'error';

export type QbitSetupActionNeeded =
  | 'install_required'
  | 'update_available'
  | 'up_to_date'
  | 'newer_installed'
  | 'close_required_for_update'
  | 'unknown_latest';

export interface QbitReleaseInfo {
  version: string;
  tagName: string;
  publishedAt: string | null;
  releaseUrl: string;
  assetName: string;
  assetUrl: string;
  assetSizeBytes: number;
  expectedSha256: string | null;
  source: 'github_api' | 'official_website' | 'unavailable';
}

export interface QbitVerificationInfo {
  sha256Actual: string | null;
  sha256Expected: string | null;
  sha256Verified: boolean;
  signatureStatus: string;
  publisher: string | null;
  signatureVerified: boolean;
}

export interface QbitWebUiConfigInfo {
  iniPath: string | null;
  configFound: boolean;
  webUiEnabled: boolean;
  address: string;
  port: number;
  username: string;
  isLoopbackOnly: boolean;
}

export interface QbitSetupState {
  stage: QbitSetupStage;
  actionNeeded: QbitSetupActionNeeded | null;
  platformSupported: boolean;
  installed: boolean;
  installedVersion: string | null;
  executablePath: string | null;
  isRunning: boolean;
  latestRelease: QbitReleaseInfo | null;
  releaseError: string | null;
  releaseErrorCode: 'offline' | 'rate_limited' | 'asset_missing' | 'http_error' | null;
  downloadProgress: {
    percent: number;
    downloadedBytes: number;
    totalBytes: number;
    speedBytesPerSec: number;
    etaSeconds: number | null;
  } | null;
  verification: QbitVerificationInfo | null;
  webUiConfig: QbitWebUiConfigInfo;
  webUiVerifiedConnected: boolean;
  error: string | null;
  statusMessage: string;
  officialDownloadUrl: string;
  shouldPromptOnFirstLaunch: boolean;
  firstLaunchDismissed: boolean;
  lastCheckedAt: number | null;
}

export type PresentMonSetupStage =
  | 'idle'
  | 'checking'
  | 'ready'
  | 'downloading'
  | 'verifying'
  | 'installing'
  | 'waiting_for_close'
  | 'completed'
  | 'error'
  | 'cancelled';

export type PresentMonSetupActionNeeded =
  | 'install_required'
  | 'update_available'
  | 'repair_required'
  | 'up_to_date'
  | 'newer_installed'
  | 'close_required_for_update';

export interface PresentMonReleaseInfo {
  version: string;
  tagName: string;
  publishedAt: string | null;
  releaseUrl: string;
  assetName: string;
  assetUrl: string;
  assetKind: 'exe' | 'zip' | 'msi';
  assetSizeBytes: number;
  expectedSha256: string | null;
  releaseNotes?: string;
  source: 'github_api' | 'unavailable';
}

export interface PresentMonVerificationInfo {
  sha256Actual: string | null;
  sha256Expected: string | null;
  sha256Verified: boolean;
  signatureStatus: string;
  publisher: string | null;
  signatureVerified: boolean;
}

export interface PresentMonCliCapabilities {
  functional: boolean;
  doubleDash: boolean;
  supportsProcessId: boolean;
  supportsOutputStdout: boolean;
  supportsNoTop: boolean;
  supportsTerminateOnExit: boolean;
  supportsV1Metrics: boolean;
}

export interface PresentMonSetupState {
  stage: PresentMonSetupStage;
  actionNeeded: PresentMonSetupActionNeeded | null;
  platformSupported: boolean;
  installed: boolean;
  healthy: boolean;
  healthIssue: string | null;
  installSource: 'managed' | 'bundled' | 'system_msi' | 'system_path' | null;
  installedVersion: string | null;
  executablePath: string | null;
  installDirectory: string | null;
  cliCapabilities: PresentMonCliCapabilities | null;
  isRunning: boolean;
  latestRelease: PresentMonReleaseInfo | null;
  releaseError: string | null;
  releaseErrorCode: 'offline' | 'rate_limited' | 'asset_missing' | 'http_error' | null;
  downloadProgress: {
    percent: number;
    downloadedBytes: number;
    totalBytes: number;
    speedBytesPerSec: number;
    etaSeconds: number | null;
  } | null;
  verification: PresentMonVerificationInfo | null;
  error: string | null;
  statusMessage: string;
  officialReleasesUrl: string;
  shouldPrompt: boolean;
  declinedForVersion: string | null;
  dismissedForVersion: string | null;
  lastCheckedAt: number | null;
}

export type CloseBehaviorMode = 'minimize-to-tray' | 'exit';

export type HardwareTechStatus =
  | 'supported'
  | 'detected'
  | 'active'
  | 'unsupported'
  | 'unavailable'
  | 'requires_game_integration'
  | 'requires_driver_or_sdk';

export interface GpuTechnologyFeature {
  id: string;
  name: string;
  vendor: 'NVIDIA' | 'AMD' | 'Intel' | string;
  status: HardwareTechStatus;
  hardwareSupported: boolean;
  activeState: boolean | null;
  detail: string;
}

export interface GpuCapabilitiesProfile {
  gpuId: string;
  model: string | null;
  vendor: string;
  architecture: string | null;
  driverVersion: string | null;
  resizableBarActive: boolean | null;
  isIntegrated: boolean;
  features: GpuTechnologyFeature[];
}

export interface DisplayMonitorInfo {
  id: string;
  model: string;
  isPrimary: boolean;
  width: number | null;
  height: number | null;
  resolutionText: string | null;
  refreshRateHz: number | null;
  connectionType: string | null;
  builtin: boolean;
}

export interface DisplayCapabilitiesProfile {
  monitors: DisplayMonitorInfo[];
  primaryMonitor: DisplayMonitorInfo | null;
  activeRenderingGpu: string | null;
  directXVersion: string | null;
  hagsStatus: string | null;
  windowsGameMode: string | null;
  hdrSupported: boolean | null;
  hdrActive: boolean | null;
  vrrSupported: boolean | null;
  vrrActive: boolean | null;
}

export interface LaptopCapabilitiesProfile {
  isLaptopOrBatteryDevice: boolean;
  batteryPercent: number | null;
  acConnected: boolean | null;
  isCharging: boolean | null;
  batteryHealthPercent: number | null;
  powerPlan: string | null;
  hybridGpuMode: string | null;
}

export interface HardwareCpuMetrics {
  model: string | null;
  manufacturer: string | null;
  series?: string | null;
  generation?: string | null;
  usagePercent: number | null;
  temperatureCelsius: number | null;
  clockSpeedGhz: number | null;
  physicalCores: number | null;
  logicalThreads: number | null;
  powerWatts: number | null;
  voltageVolts?: number | null;
  coreLoads: number[];
}

export interface HardwareGpuMetrics {
  id: string;
  model: string | null;
  manufacturer: string | null;
  utilizationPercent: number | null;
  temperatureCelsius: number | null;
  hotspotTempCelsius?: number | null;
  vramUsedMB: number | null;
  vramTotalMB: number | null;
  clockSpeedMhz: number | null;
  memoryClockMhz?: number | null;
  fanSpeedPercent: number | null;
  fanSpeedRpm: number | null;
  powerWatts: number | null;
}

export interface HardwareRamMetrics {
  totalBytes: number | null;
  usedBytes: number | null;
  availableBytes: number | null;
  usagePercent: number | null;
  memoryType: string | null;
  speedMhz: number | null;
  populatedSlots?: number | null;
  channelMode?: string | null;
}

export interface HardwareStorageDriveMetrics {
  id: string;
  name: string;
  model: string | null;
  mount: string | null;
  driveType: string | null;
  totalBytes: number | null;
  usedBytes: number | null;
  freeBytes: number | null;
  usagePercent: number | null;
  readBytesPerSec: number | null;
  writeBytesPerSec: number | null;
  temperatureCelsius: number | null;
}

export interface HardwareNetworkInterfaceMetrics {
  iface: string;
  displayName: string;
  type: string | null;
  operstate: string | null;
  downloadBytesPerSec: number | null;
  uploadBytesPerSec: number | null;
  totalRxBytes: number | null;
  totalTxBytes: number | null;
  speedMbps: number | null;
  isActive: boolean;
}

export interface LiveFanTelemetryItem {
  id: string;
  name: string;
  rpm: number | null;
  percent: number | null;
  source: string;
}

export interface LiveExtraTempItem {
  id: string;
  name: string;
  category: 'motherboard' | 'chipset' | 'storage' | 'vrm' | 'gpu_hotspot' | 'vram' | 'other';
  celsius: number;
  source: string;
}

export interface HardwareMonitorSnapshot {
  timestamp: number;
  platform: string;
  hostname: string | null;
  uptimeSeconds: number | null;
  isMonitoring: boolean;
  intervalMs: number;
  cpu: HardwareCpuMetrics;
  gpus: HardwareGpuMetrics[];
  ram: HardwareRamMetrics;
  storage: HardwareStorageDriveMetrics[];
  storageTotals: {
    totalBytes: number | null;
    usedBytes: number | null;
    freeBytes: number | null;
    usagePercent: number | null;
    readBytesPerSec: number | null;
    writeBytesPerSec: number | null;
  };
  network: {
    activeInterface: HardwareNetworkInterfaceMetrics | null;
    interfaces: HardwareNetworkInterfaceMetrics[];
    totalDownloadBytesPerSec: number | null;
    totalUploadBytesPerSec: number | null;
  };
  liveSensors?: {
    fans: LiveFanTelemetryItem[];
    extraTemps: LiveExtraTempItem[];
    source: string | null;
  } | null;
  capabilities?: {
    gpuTechnologies: GpuCapabilitiesProfile[];
    display: DisplayCapabilitiesProfile | null;
    laptop: LaptopCapabilitiesProfile | null;
  } | null;
}

export interface GamingProcessCandidate {
  pid: number;
  name: string;
  windowTitle: string | null;
  memoryMB: number | null;
}

export interface GamingFpsSummary {
  currentFps: number | null;
  averageFps: number | null;
  low1PercentFps: number | null;
  low01PercentFps: number | null;
  maxFps: number | null;
  currentFrameTimeMs: number | null;
  avgFrameTimeMs: number | null;
  minFrameTimeMs: number | null;
  maxFrameTimeMs: number | null;
  p95FrameTimeMs: number | null;
  spikeCount: number;
  stutterCount: number;
  framePacingStabilityPercent: number | null;
  droppedFrames: number;
}

export interface GamingBottleneckFinding {
  id: string;
  severity: 'info' | 'warning' | 'critical';
  confidence: 'high' | 'medium';
  title: string;
  cause: string;
  recommendations: string[];
}

export interface GamingBottleneckAnalysis {
  ready: boolean;
  sampleCount: number;
  requiredSamples: number;
  thermalThrottlingDetected: boolean;
  findings: GamingBottleneckFinding[];
}

export interface GamingSessionState {
  isActive: boolean;
  sessionId: string | null;
  processName: string | null;
  pid: number | null;
  startedAt: number | null;
  durationSeconds: number;
  presentMonAvailable: boolean;
  presentMonPath: string | null;
  fpsTelemetryStatus: 'ready' | 'waiting_frames' | 'active' | 'requires_presentmon' | 'unavailable_on_os';
  fps: GamingFpsSummary;
  frameTimeHistory: number[];
  inputLatencyMs: number | null;
  inputLatencyNote: string;
  pingMs: number | null;
  packetLossPercent: number | null;
  pingHost: string;
  thermalThrottlingDetected: boolean;
  bottleneckAnalysis: GamingBottleneckAnalysis;
  sessionAverages: {
    avgCpuPercent: number | null;
    avgGpuPercent: number | null;
    avgRamPercent: number | null;
    peakCpuTempC: number | null;
    peakGpuTempC: number | null;
    peakVramUsedMB: number | null;
  };
}

export interface GamingSessionHistoryItem {
  sessionId: string;
  processName: string | null;
  startedAt: number | null;
  endedAt: number;
  durationSeconds: number;
  averageFps: number | null;
  low1PercentFps: number | null;
  low01PercentFps: number | null;
  maxFps: number | null;
  avgFrameTimeMs: number | null;
  stutterCount: number;
  avgCpuPercent: number | null;
  avgGpuPercent: number | null;
  avgRamPercent: number | null;
  peakCpuTempC: number | null;
  peakGpuTempC: number | null;
  pingMs: number | null;
  packetLossPercent: number | null;
  bottleneckIds: string[];
  thermalThrottlingDetected: boolean;
}

export interface CleanerCategoryScan {
  id:
    | 'old_temp'
    | 'user_temp'
    | 'app_cache'
    | 'secretarea_cache'
    | 'thumbnail_cache'
    | 'dx_shader_cache'
    | 'recycle_bin'
    | 'browser_cache';
  defaultSelected: boolean;
  optInWarning: boolean;
  supported: boolean;
  paths: string[];
  fileCount: number;
  estimatedBytes: number;
}

export interface CleanerScanResult {
  confirmationToken: string;
  scannedAt: number;
  totalEstimatedBytes: number;
  categories: CleanerCategoryScan[];
}

export interface CleanerCleanResult {
  cleanedAt: number;
  cleanedBytes: number;
  cleanedFiles: number;
  skippedLockedCount: number;
  cancelled: boolean;
  categoryResults: Array<{
    id: string;
    cleanedBytes: number;
    cleanedFiles: number;
    skippedLockedCount: number;
  }>;
}

export interface CleanerProgressEvent {
  phase: 'scanning' | 'scan_complete' | 'cleaning' | 'clean_complete';
  categoryId: string | null;
  percent: number;
  currentPath: string | null;
}

// --- Deep Hardware Inspection, Intelligence, Database, Benchmarks & 2030+ Advisors ---

export type DataProvenance =
  | 'detected'
  | 'measured'
  | 'manufacturer_spec'
  | 'estimated'
  | 'not_supported'
  | 'not_detected'
  | 'sensor_unavailable'
  | 'requires_admin'
  | 'unknown';

export type WorkloadProfileId =
  | 'gaming'
  | 'office'
  | 'programming'
  | '3d_rendering'
  | 'video_editing'
  | 'graphic_design'
  | 'ai_ml'
  | 'professional'
  | 'mixed';

export type FanStatus =
  | 'running'
  | 'stopped_confirmed'
  | 'abnormal_rpm'
  | 'not_detected'
  | 'sensor_unavailable'
  | 'unknown';

export interface SensorReadingItem {
  id: string;
  name: string;
  category:
    | 'cpu'
    | 'gpu'
    | 'gpu_hotspot'
    | 'vram'
    | 'motherboard'
    | 'chipset'
    | 'storage'
    | 'ambient'
    | 'voltage'
    | 'other';
  value: number | null;
  unit: 'C' | 'V' | 'RPM' | 'W' | '%';
  minValue: number | null;
  maxValue: number | null;
  source: string;
  provenance: DataProvenance;
}

export interface PcieSlotInfo {
  designation: string;
  slotType: string | null;
  laneWidth: string | null;
  currentUsage: 'In Use' | 'Available' | 'Unknown';
  supportsHotPlug: boolean | null;
  provenance: DataProvenance;
}

export interface MemoryDimmInfo {
  bankLabel: string | null;
  deviceLocator: string | null;
  manufacturer: string | null;
  partNumber: string | null;
  serialMasked: string | null;
  capacityBytes: number | null;
  configuredSpeedMhz: number | null;
  ratedSpeedMhz: number | null;
  memoryType: string | null;
  formFactor: string | null;
  voltageMv: number | null;
  isSolderedHint: boolean;
  provenance: DataProvenance;
}

export interface DeepStorageDriveInfo {
  id: string;
  index: number | null;
  friendlyName: string;
  model: string | null;
  vendor: string | null;
  serialMasked: string | null;
  mediaType: 'NVMe SSD' | 'SATA SSD' | 'HDD' | 'External / USB' | 'SSD' | 'Unknown';
  busType: string | null;
  interfaceDetail: string | null;
  sizeBytes: number | null;
  temperatureC: number | null;
  smartSupported: boolean | null;
  smartAvailable: boolean;
  smartHealthStatus: 'healthy' | 'warning' | 'critical' | 'unavailable';
  smartSource: string | null;
  powerOnHours: number | null;
  powerCycles: number | null;
  wearPercent: number | null;
  remainingLifePercent: number | null;
  tbwBytes: number | null;
  tbrBytes: number | null;
  reallocatedSectors: number | null;
  pendingSectors: number | null;
  mediaErrors: number | null;
  unsafeShutdowns: number | null;
  readErrorsUncorrected: number | null;
  writeErrorsUncorrected: number | null;
  warnings: string[];
  provenance: DataProvenance;
}

export interface FanSensorInfo {
  id: string;
  name: string;
  role: 'cpu' | 'gpu' | 'case' | 'aio_pump' | 'laptop' | 'other';
  rpm: number | null;
  percent: number | null;
  minRpm: number | null;
  maxRpm: number | null;
  status: FanStatus;
  linkedTempSensor: string | null;
  source: string;
  provenance: DataProvenance;
}

export interface PortEntry {
  id: string;
  category: 'confirmed_physical' | 'controller' | 'connected_device' | 'unconfirmed_physical';
  kind: 'usb' | 'video' | 'network' | 'audio' | 'storage' | 'pcie' | 'expansion' | 'other';
  name: string;
  connectorType: string | null;
  versionOrSpec: string | null;
  theoreticalBandwidth: string | null;
  status: 'connected' | 'available' | 'active' | 'unknown';
  connectedDeviceName: string | null;
  capabilities: string[];
  confidence: 'high' | 'medium' | 'low';
  source: string;
  provenance: DataProvenance;
}

export interface DeepDisplayInfo {
  id: string;
  name: string;
  manufacturer: string | null;
  serialMasked: string | null;
  diagonalInches: number | null;
  physicalWidthMm: number | null;
  physicalHeightMm: number | null;
  nativeResolution: string | null;
  currentResolution: string | null;
  refreshRateHz: number | null;
  maxRefreshRateHz: number | null;
  colorDepthBits: number | null;
  connectionType: string | null;
  isInternal: boolean;
  isPrimary: boolean;
  hdrCapable: boolean | null;
  vrrCapable: boolean | null;
  gpuPnpDeviceId?: string | null;
  provenance: DataProvenance;
}

export interface NetworkAdapterDeepInfo {
  id: string;
  name: string;
  interfaceName: string | null;
  kind: 'ethernet' | 'wifi' | 'bluetooth' | 'virtual' | 'other';
  status: string | null;
  macMasked: string | null;
  linkSpeedMbps: number | null;
  wifiGeneration: string | null;
  ssid: string | null;
  signalQualityPercent: number | null;
  rssiDbm: number | null;
  driverVersion: string | null;
  driverDate: string | null;
  provenance: DataProvenance;
}

export interface PeripheralDeviceEntry {
  id: string;
  name: string;
  category:
    | 'keyboard'
    | 'mouse'
    | 'audio'
    | 'camera'
    | 'printer'
    | 'storage_usb'
    | 'controller'
    | 'bluetooth'
    | 'dock_hub'
    | 'other';
  manufacturer: string | null;
  status: string | null;
  connectionBus: string | null;
  driverVersion: string | null;
  provenance: DataProvenance;
}

export interface SystemComponentEntry {
  id: string;
  name: string;
  category:
    | 'tpm_security'
    | 'audio_controller'
    | 'usb_controller'
    | 'pci_bridge'
    | 'optical'
    | 'card_reader'
    | 'acceleration_npu'
    | 'capture'
    | 'other';
  manufacturer: string | null;
  driverVersion: string | null;
  status: string | null;
  errorCode: number | null;
  provenance: DataProvenance;
}

export interface SignedDriverInfo {
  deviceName: string;
  deviceClass: string | null;
  manufacturer: string | null;
  driverVersion: string | null;
  driverDate: string | null;
  isSigned: boolean | null;
  signer: string | null;
}

export interface PnpErrorDeviceInfo {
  name: string;
  deviceId: string | null;
  deviceClass: string | null;
  errorCode: number | null;
  status: string | null;
}

export interface SystemEventLogItem {
  id: string;
  timestamp: string;
  level: 'Error' | 'Critical' | 'Warning' | 'Information';
  providerName: string;
  eventId: number;
  category: 'whea' | 'disk' | 'display' | 'power' | 'thermal' | 'other';
  message: string;
}

export interface DeepHardwareInventory {
  collectedAt: number;
  sourceMode: 'desktop_ipc' | 'web_browser';
  platform: string;
  isElevated: boolean | null;
  detectionLimitations: string[];
  system: {
    formFactor: 'desktop' | 'laptop' | 'tablet_convertible' | 'unknown';
    chassisTypeLabel: string | null;
    manufacturer: string | null;
    model: string | null;
    sku: string | null;
    family: string | null;
    serialMasked: string | null;
    uuidMasked: string | null;
    architecture: string;
    osName: string | null;
    osVersion: string | null;
    osBuild: string | null;
    bootMode: 'UEFI' | 'Legacy BIOS' | 'Unknown';
    secureBoot: boolean | null;
    tpm: {
      present: boolean | null;
      enabled: boolean | null;
      specVersion: string | null;
      manufacturer: string | null;
      status?: 'detected' | 'not_detected' | 'unknown' | 'requires_admin' | 'not_supported';
      provenance?: DataProvenance;
    };
    sensorBackends: {
      lhmRunning: boolean;
      ohmRunning: boolean;
      nvidiaSmiAvailable: boolean;
      smartctlAvailable: boolean;
    };
    provenance: DataProvenance;
  };
  motherboard: {
    manufacturer: string | null;
    model: string | null;
    version: string | null;
    serialMasked: string | null;
    chipset: string | null;
    socket: string | null;
    biosVendor: string | null;
    biosVersion: string | null;
    biosReleaseDate: string | null;
    memorySlotsTotal: number | null;
    memorySlotsUsed: number | null;
    maxRamGB: number | null;
    ramGenSupported: string | null;
    pcieSlots: PcieSlotInfo[];
    voltages: SensorReadingItem[];
    boardTemps: SensorReadingItem[];
    provenance: DataProvenance;
  };
  cpu: {
    model: string | null;
    manufacturer: string | null;
    architecture: string | null;
    socket: string | null;
    physicalCores: number | null;
    logicalThreads: number | null;
    baseClockGhz: number | null;
    maxBoostClockGhz: number | null;
    l2CacheKB: number | null;
    l3CacheKB: number | null;
    stepping: string | null;
    virtualizationFirmwareEnabled: boolean | null;
    hypervisorPresent: boolean | null;
    instructionSets: string[];
    throttlingState: 'none' | 'thermal' | 'power_limit' | 'unknown';
    provenance: DataProvenance;
  };
  gpus: Array<{
    id: string;
    model: string | null;
    vendor: string | null;
    isIntegrated: boolean;
    workloadRole: string;
    driverVersion: string | null;
    driverDate: string | null;
    vramMB: number | null;
    directXFeatureLevel: string | null;
    pnpDeviceId: string | null;
    provenance: DataProvenance;
  }>;
  memory: {
    totalBytes: number | null;
    slotsTotal: number | null;
    slotsUsed: number | null;
    maxCapacityBytes: number | null;
    channelMode: string | null;
    eccStatus: string | null;
    pageFileTotalMB: number | null;
    pageFileUsedMB: number | null;
    modules: MemoryDimmInfo[];
    provenance: DataProvenance;
  };
  storage: DeepStorageDriveInfo[];
  fans: {
    items: FanSensorInfo[];
    totalDetectedCount: number;
    runningCount: number;
    stoppedCount: number;
    sensorSource: string | null;
    provenance: DataProvenance;
  };
  thermals: {
    sensors: SensorReadingItem[];
    inspectionNote: string;
  };
  ports: {
    confirmedPhysical: PortEntry[];
    controllers: PortEntry[];
    connectedDevices: PortEntry[];
    unconfirmedPhysical: PortEntry[];
    summaryNotes: string[];
    provenance?: DataProvenance;
  };
  power: {
    psuTelemetryExposed: boolean;
    psuNote: string;
    acAdapterConnected: boolean | null;
    powerPlan: string | null;
    battery: {
      present: boolean;
      manufacturer: string | null;
      chemistry: string | null;
      chargePercent: number | null;
      isCharging: boolean | null;
      designCapacityMwh: number | null;
      fullChargeCapacityMwh: number | null;
      wearPercent: number | null;
      healthPercent: number | null;
      cycleCount: number | null;
      chargeRateWatts: number | null;
      voltageMv: number | null;
      provenance: DataProvenance;
    } | null;
  };
  displays: DeepDisplayInfo[];
  network: {
    adapters: NetworkAdapterDeepInfo[];
    bluetoothAdapters: Array<{ name: string; status: string | null; driverVersion: string | null }>;
  };
  peripherals: PeripheralDeviceEntry[];
  otherComponents: SystemComponentEntry[];
  drivers: SignedDriverInfo[];
  diagnosticEvents: {
    pnpErrors: PnpErrorDeviceInfo[];
    eventLogWarnings: SystemEventLogItem[];
    eventLogErrorNote: string | null;
  };
}

export type HardwareDbCategory =
  | 'cpu'
  | 'gpu'
  | 'ram'
  | 'storage'
  | 'chipset_platform'
  | 'network';

export interface HardwareDbEntry {
  id: string;
  category: HardwareDbCategory;
  vendor: string;
  family: string;
  generation: string;
  architecture: string;
  matchPatterns: string[];
  releaseYear: number;
  tierScore: number;
  specsSummary: string;
  supportedTechnologies: string[];
  driverSupportStatus: 'active' | 'legacy_security' | 'eol';
  limitations: string[];
  recommendedSuccessor: string | null;
  suitability2030Score: number;
}

export interface HardwareDbPayload {
  schemaVersion: number;
  dbVersion: string;
  lastUpdatedAt: string;
  sourceLabel: string;
  entries: HardwareDbEntry[];
}

export interface HardwareDbState {
  dbVersion: string;
  lastUpdatedAt: string;
  lastCheckedAt: string | null;
  updateFeedUrl: string;
  entryCount: number;
  hasBackup: boolean;
  lastError: string | null;
  sourceLabel: string;
  customEntriesCount: number;
}

export type FutureTargetYear = 2027 | 2028 | 2029 | 2030 | 2032;

export interface HealthComponentScore {
  id: 'cpu' | 'gpu' | 'ram' | 'storage' | 'thermals' | 'cooling' | 'battery' | 'stability';
  label: string;
  score: number | null;
  status: 'healthy' | 'fair' | 'warning' | 'critical' | 'unavailable';
  summary: string;
  provenance: DataProvenance;
}

export interface HealthAssessmentReport {
  overallPhysicalHealthScore: number | null;
  performanceCapabilityScore: number | null;
  measuredComponentsCount: number;
  totalComponentsCount: number;
  hardwareAgeLabel: string;
  oldestDetectedComponentYear: number | null;
  estimatedUsefulLifeRange: string;
  componentScores: HealthComponentScore[];
  bottleneckSummary: {
    primaryLimitingFactor: string;
    explanation: string;
    provenance: DataProvenance;
  };
  gamingSuitability: {
    resolutions: Array<{
      resolution: '720p' | '1080p' | '1440p' | '4K';
      verdict: 'Strong' | 'Playable' | 'Entry / Upscaled' | 'Not Ideal' | 'Unknown';
      recommendedPreset: string;
      notes: string;
    }>;
    featureMatrix: Array<{ name: string; status: string; provenance: DataProvenance }>;
  };
  proCompatibility: Array<{
    workload: string;
    verdict: 'Excellent' | 'Good' | 'Basic' | 'Limited' | 'Unknown';
    reason: string;
    limitingFactor: string | null;
  }>;
  upgradeRecommendations: Array<{
    id: string;
    priority: 'High' | 'Medium' | 'Optional';
    component: string;
    currentItem: string;
    recommendedUpgrade: string;
    whyRecommended: string;
    compatibilityVerified: boolean;
    compatibilityNotes: string;
    expectedBenefit: string;
    prerequisites: string[];
  }>;
  maintenanceAdvisories: Array<{
    id: string;
    priority: 'Critical' | 'High' | 'Medium' | 'Low';
    title: string;
    whyItMatters: string;
    steps: string[];
    requiresPhysicalInspection: boolean;
  }>;
}

export interface BenchmarkMetricResult {
  id: 'cpu_single' | 'cpu_multi' | 'ram_throughput' | 'storage_seq' | 'storage_4k' | 'network_latency' | 'webgl_frame';
  label: string;
  value: number | null;
  unit: string;
  durationMs: number;
  peakTempC: number | null;
  abortedForSafety: boolean;
  cancelled?: boolean;
  note: string;
  completedAt: number;
}

export interface BenchmarkRunProgress {
  running: boolean;
  activeTestId: string | null;
  progressPercent: number;
  statusMessage: string;
  currentTempC: number | null;
  abortedReason: string | null;
}


