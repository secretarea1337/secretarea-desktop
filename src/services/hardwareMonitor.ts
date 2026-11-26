import type {
  BenchmarkMetricResult,
  BenchmarkRunProgress,
  CleanerCleanResult,
  CleanerProgressEvent,
  CleanerScanResult,
  DeepHardwareInventory,
  GamingProcessCandidate,
  GamingSessionHistoryItem,
  GamingSessionState,
  HardwareDbEntry,
  HardwareDbState,
  HardwareGpuMetrics,
  HardwareMonitorSnapshot,
  HardwareNetworkInterfaceMetrics,
  HardwareStorageDriveMetrics,
  OpenSourceToolsManagerState,
} from '../types';

export interface DesktopHardwareMonitorBridge {
  getSnapshot: () => Promise<HardwareMonitorSnapshot | null>;
  start: (intervalMs?: number) => Promise<HardwareMonitorSnapshot | null>;
  stop: () => Promise<{ ok: boolean; isMonitoring: boolean } | null>;
  setInterval: (intervalMs: number) => Promise<{ ok: boolean; intervalMs: number } | null>;
  onUpdate: (callback: (snapshot: HardwareMonitorSnapshot) => void) => () => void;
}

export interface DesktopHardwareIntelligenceBridge {
  getDeepInventory: (forceRefresh?: boolean) => Promise<DeepHardwareInventory | null>;
  getDbState: () => Promise<HardwareDbState | null>;
  getDbEntries: () => Promise<HardwareDbEntry[]>;
  checkDbUpdate: (
    customUrl?: string,
    options?: { allowCustomFeed?: boolean }
  ) => Promise<{ updated: boolean; state: HardwareDbState; error: string | null } | null>;
  importDbFile: () => Promise<{ imported: boolean; canceled: boolean; state: HardwareDbState; error: string | null } | null>;
  rollbackDb: () => Promise<{ ok: boolean; state: HardwareDbState; error: string | null } | null>;
  runBenchmark: (testIds?: string[]) => Promise<{ ok: boolean; abortedForSafety?: boolean; cancelled?: boolean; results: BenchmarkMetricResult[]; error?: string } | null>;
  cancelBenchmark: () => Promise<{ ok: boolean }>;
  onBenchmarkProgress: (callback: (progress: BenchmarkRunProgress) => void) => () => void;
  exportReportJson: (payload: { jsonContent: string; defaultFilename?: string }) => Promise<{ ok: boolean; canceled?: boolean; filePath?: string }>;
  exportReportPdf: (payload: { htmlContent: string; defaultFilename?: string }) => Promise<{ ok: boolean; canceled?: boolean; filePath?: string }>;
}

export interface DesktopGamingMonitorBridge {
  listProcesses: () => Promise<GamingProcessCandidate[]>;
  checkPresentMon: () => Promise<{ available: boolean; path: string | null }>;
  getState: () => Promise<GamingSessionState | null>;
  startSession: (opts?: { pid?: number | null; processName?: string; pingHost?: string }) => Promise<GamingSessionState | null>;
  stopSession: () => Promise<{ state: GamingSessionState; savedSummary: GamingSessionHistoryItem | null } | null>;
  getHistory: () => Promise<GamingSessionHistoryItem[]>;
  clearHistory: () => Promise<GamingSessionHistoryItem[]>;
  setPingHost: (host: string) => Promise<{ ok: boolean; pingHost: string }>;
  onUpdate: (callback: (state: GamingSessionState) => void) => () => void;
}

export interface DesktopPcCleanerBridge {
  scan: () => Promise<CleanerScanResult | null>;
  clean: (payload: { categoryIds: string[]; confirmationToken: string }) => Promise<CleanerCleanResult | null>;
  cancel: () => Promise<{ ok: boolean }>;
  onProgress: (callback: (event: CleanerProgressEvent) => void) => () => void;
}

export interface DesktopOpenSourceToolsBridge {
  getState: () => Promise<OpenSourceToolsManagerState | null>;
  checkUpdates: (payload?: { toolId?: string; force?: boolean }) => Promise<{ ok: boolean; error?: string; state: OpenSourceToolsManagerState } | null>;
  installOrUpdate: (payload: { toolId?: string; userConfirmed: boolean }) => Promise<{ ok: boolean; cancelled?: boolean; error?: string; state: OpenSourceToolsManagerState } | null>;
  cancel: (payload?: { toolId?: string }) => Promise<{ ok: boolean }>;
  rollback: (payload: { toolId?: string; userConfirmed: boolean }) => Promise<{ ok: boolean; error?: string; state: OpenSourceToolsManagerState } | null>;
  openExternalLink: (payload: { toolId?: string; kind: 'repository' | 'website' | 'source' | 'license' | 'nuget' | 'releases' }) => Promise<{ ok: boolean; url?: string; error?: string }>;
  onStateChange: (callback: (state: OpenSourceToolsManagerState) => void) => () => void;
}

export function getDesktopHardwareMonitorBridge(): DesktopHardwareMonitorBridge | null {
  if (typeof window === 'undefined') return null;
  const desktop = (
    window as unknown as {
      secretAreaDesktop?: {
        hardwareMonitor?: DesktopHardwareMonitorBridge;
      };
    }
  ).secretAreaDesktop;
  return desktop?.hardwareMonitor || null;
}

export function getDesktopHardwareIntelligenceBridge(): DesktopHardwareIntelligenceBridge | null {
  if (typeof window === 'undefined') return null;
  const desktop = (
    window as unknown as {
      secretAreaDesktop?: {
        hardwareIntelligence?: DesktopHardwareIntelligenceBridge;
      };
    }
  ).secretAreaDesktop;
  return desktop?.hardwareIntelligence || null;
}

export function getDesktopGamingMonitorBridge(): DesktopGamingMonitorBridge | null {
  if (typeof window === 'undefined') return null;
  const desktop = (
    window as unknown as {
      secretAreaDesktop?: {
        gamingMonitor?: DesktopGamingMonitorBridge;
      };
    }
  ).secretAreaDesktop;
  return desktop?.gamingMonitor || null;
}

export function getDesktopPcCleanerBridge(): DesktopPcCleanerBridge | null {
  if (typeof window === 'undefined') return null;
  const desktop = (
    window as unknown as {
      secretAreaDesktop?: {
        pcCleaner?: DesktopPcCleanerBridge;
      };
    }
  ).secretAreaDesktop;
  return desktop?.pcCleaner || null;
}

export function getDesktopOpenSourceToolsBridge(): DesktopOpenSourceToolsBridge | null {
  if (typeof window === 'undefined') return null;
  const desktop = (
    window as unknown as {
      secretAreaDesktop?: {
        openSourceTools?: DesktopOpenSourceToolsBridge;
      };
    }
  ).secretAreaDesktop;
  return desktop?.openSourceTools || null;
}

export async function collectBrowserDeepInventory(): Promise<DeepHardwareInventory> {
  const nav = typeof navigator !== 'undefined' ? (navigator as Navigator & {
    deviceMemory?: number;
    connection?: { effectiveType?: string; downlink?: number; rtt?: number };
    getBattery?: () => Promise<{ level: number; charging: boolean }>;
  }) : null;

  let webglRenderer: string | null = null;
  let webglVendor: string | null = null;
  if (typeof document !== 'undefined') {
    try {
      const canvas = document.createElement('canvas');
      const gl = (canvas.getContext('webgl2') || canvas.getContext('webgl')) as WebGLRenderingContext | null;
      if (gl) {
        const dbg = gl.getExtension('WEBGL_debug_renderer_info');
        if (dbg) {
          webglRenderer = String(gl.getParameter(dbg.UNMASKED_RENDERER_WEBGL) || '') || null;
          webglVendor = String(gl.getParameter(dbg.UNMASKED_VENDOR_WEBGL) || '') || null;
        }
      }
    } catch {
      // ignore webgl block
    }
  }

  let batteryObj: DeepHardwareInventory['power']['battery'] = null;
  if (nav?.getBattery) {
    try {
      const bat = await nav.getBattery();
      batteryObj = {
        present: true,
        manufacturer: null,
        chemistry: null,
        chargePercent: Math.round((bat.level || 0) * 100),
        isCharging: Boolean(bat.charging),
        designCapacityMwh: null,
        fullChargeCapacityMwh: null,
        wearPercent: null,
        healthPercent: null,
        cycleCount: null,
        chargeRateWatts: null,
        voltageMv: null,
        provenance: 'measured',
      };
    } catch {
      batteryObj = null;
    }
  }

  const threads = nav?.hardwareConcurrency ?? null;
  const approxRamGb = nav?.deviceMemory ?? null;
  const screenW = typeof window !== 'undefined' ? Math.round(window.screen.width * (window.devicePixelRatio || 1)) : null;
  const screenH = typeof window !== 'undefined' ? Math.round(window.screen.height * (window.devicePixelRatio || 1)) : null;
  const conn = nav?.connection;

  return {
    collectedAt: Date.now(),
    sourceMode: 'web_browser',
    platform: nav?.platform || 'web',
    isElevated: null,
    detectionLimitations: [
      'Running inside Web Browser mode: sandbox prevents direct access to CPU/GPU temperature sensors, fan RPMs, SMART disk wear, motherboard SMBIOS, physical USB port headers, signed drivers, and Windows Event Viewer.',
      'Use SecretArea Desktop (Electron on Windows/Linux) for real OS, WMI/SMBIOS, SMART, and sensor telemetry.',
    ],
    system: {
      formFactor: batteryObj ? 'laptop' : 'unknown',
      chassisTypeLabel: batteryObj ? 'Battery API Present (Browser)' : 'Unavailable in Web Browser',
      manufacturer: null,
      model: null,
      sku: null,
      family: null,
      serialMasked: null,
      uuidMasked: null,
      architecture: nav?.platform || 'Web Sandbox',
      osName: nav?.userAgent ? (nav.userAgent.includes('Windows') ? 'Windows (Browser UA)' : nav.userAgent.includes('Mac') ? 'macOS (Browser UA)' : nav.userAgent.includes('Linux') ? 'Linux (Browser UA)' : 'Browser') : 'Browser',
      osVersion: null,
      osBuild: null,
      bootMode: 'Unknown',
      secureBoot: null,
      tpm: { present: null, enabled: null, specVersion: null, manufacturer: null },
      sensorBackends: { lhmRunning: false, ohmRunning: false, nvidiaSmiAvailable: false, smartctlAvailable: false },
      provenance: 'estimated',
    },
    motherboard: {
      manufacturer: null,
      model: null,
      version: null,
      serialMasked: null,
      chipset: null,
      socket: null,
      biosVendor: null,
      biosVersion: null,
      biosReleaseDate: null,
      memorySlotsTotal: null,
      memorySlotsUsed: null,
      maxRamGB: null,
      ramGenSupported: null,
      pcieSlots: [],
      voltages: [],
      boardTemps: [],
      provenance: 'sensor_unavailable',
    },
    cpu: {
      model: threads ? `Browser-Reported Processor (${threads} logical threads)` : null,
      manufacturer: null,
      architecture: nav?.platform || null,
      socket: null,
      physicalCores: null,
      logicalThreads: threads,
      baseClockGhz: null,
      maxBoostClockGhz: null,
      l2CacheKB: null,
      l3CacheKB: null,
      stepping: null,
      virtualizationFirmwareEnabled: null,
      hypervisorPresent: null,
      instructionSets: [],
      throttlingState: 'unknown',
      provenance: threads ? 'detected' : 'sensor_unavailable',
    },
    gpus: webglRenderer
      ? [
          {
            id: 'webgl-gpu-0',
            model: webglRenderer,
            vendor: webglVendor,
            isIntegrated: /uhd|iris|radeon\(tm\) graphics|apple/i.test(webglRenderer),
            workloadRole: 'Browser WebGL2 Renderer',
            driverVersion: null,
            driverDate: null,
            vramMB: null,
            directXFeatureLevel: null,
            pnpDeviceId: null,
            provenance: 'detected',
          },
        ]
      : [],
    memory: {
      totalBytes: approxRamGb ? approxRamGb * 1024 * 1024 * 1024 : null,
      slotsTotal: null,
      slotsUsed: null,
      maxCapacityBytes: null,
      channelMode: null,
      eccStatus: null,
      pageFileTotalMB: null,
      pageFileUsedMB: null,
      modules: [],
      provenance: approxRamGb ? 'estimated' : 'sensor_unavailable',
    },
    storage: [],
    fans: {
      items: [],
      totalDetectedCount: 0,
      runningCount: 0,
      stoppedCount: 0,
      sensorSource: null,
      provenance: 'sensor_unavailable',
    },
    thermals: {
      sensors: [],
      inspectionNote: 'Temperature sensors are blocked by web browser sandboxing. Software also cannot directly detect dust buildup or dried thermal paste—physical inspection is required.',
    },
    ports: {
      confirmedPhysical: [],
      controllers: [],
      connectedDevices: [],
      unconfirmedPhysical: [],
      summaryNotes: ['Physical ports and PCI/USB controllers require SecretArea Desktop OS access.'],
    },
    power: {
      psuTelemetryExposed: false,
      psuNote: 'Desktop PSU telemetry is not exposed via browser APIs or standard OS power sensors.',
      acAdapterConnected: batteryObj ? !batteryObj.isCharging ? null : true : null,
      powerPlan: null,
      battery: batteryObj,
    },
    displays: screenW && screenH
      ? [
          {
            id: 'browser-screen-0',
            name: 'Browser Display Surface',
            manufacturer: null,
            serialMasked: null,
            diagonalInches: null,
            physicalWidthMm: null,
            physicalHeightMm: null,
            nativeResolution: `${screenW} × ${screenH}`,
            currentResolution: `${screenW} × ${screenH}`,
            refreshRateHz: null,
            maxRefreshRateHz: null,
            colorDepthBits: typeof window !== 'undefined' ? window.screen.colorDepth : null,
            connectionType: null,
            isInternal: false,
            isPrimary: true,
            hdrCapable: null,
            vrrCapable: null,
            provenance: 'detected',
          },
        ]
      : [],
    network: {
      adapters: conn
        ? [
            {
              id: 'browser-net',
              name: `Browser Network Connection (${conn.effectiveType || 'Online'})`,
              interfaceName: null,
              kind: 'other',
              status: typeof navigator !== 'undefined' && navigator.onLine ? 'Up' : 'Offline',
              macMasked: null,
              linkSpeedMbps: typeof conn.downlink === 'number' ? Math.round(conn.downlink) : null,
              wifiGeneration: null,
              ssid: null,
              signalQualityPercent: null,
              rssiDbm: null,
              driverVersion: null,
              driverDate: null,
              provenance: 'estimated',
            },
          ]
        : [],
      bluetoothAdapters: [],
    },
    peripherals: [],
    otherComponents: [],
    drivers: [],
    diagnosticEvents: {
      pnpErrors: [],
      eventLogWarnings: [],
      eventLogErrorNote: 'Windows Event Viewer and Device Manager codes are only accessible in SecretArea Desktop.',
    },
  };
}

export const EMPTY_HARDWARE_SNAPSHOT: HardwareMonitorSnapshot = {
  timestamp: 0,
  platform: 'web',
  hostname: null,
  uptimeSeconds: null,
  isMonitoring: false,
  intervalMs: 1500,
  cpu: {
    model: null,
    manufacturer: null,
    series: null,
    generation: null,
    usagePercent: null,
    temperatureCelsius: null,
    clockSpeedGhz: null,
    physicalCores: null,
    logicalThreads: null,
    powerWatts: null,
    coreLoads: [],
  },
  gpus: [],
  ram: {
    totalBytes: null,
    usedBytes: null,
    availableBytes: null,
    usagePercent: null,
    memoryType: null,
    speedMhz: null,
    populatedSlots: null,
    channelMode: null,
  },
  storage: [],
  storageTotals: {
    totalBytes: null,
    usedBytes: null,
    freeBytes: null,
    usagePercent: null,
    readBytesPerSec: null,
    writeBytesPerSec: null,
  },
  network: {
    activeInterface: null,
    interfaces: [],
    totalDownloadBytesPerSec: null,
    totalUploadBytesPerSec: null,
  },
  capabilities: null,
};

export const EMPTY_GAMING_SESSION_STATE: GamingSessionState = {
  isActive: false,
  sessionId: null,
  processName: null,
  pid: null,
  startedAt: null,
  durationSeconds: 0,
  presentMonAvailable: false,
  presentMonPath: null,
  fpsTelemetryStatus: 'requires_presentmon',
  fps: {
    currentFps: null,
    averageFps: null,
    low1PercentFps: null,
    low01PercentFps: null,
    maxFps: null,
    currentFrameTimeMs: null,
    avgFrameTimeMs: null,
    minFrameTimeMs: null,
    maxFrameTimeMs: null,
    p95FrameTimeMs: null,
    spikeCount: 0,
    stutterCount: 0,
    framePacingStabilityPercent: null,
    droppedFrames: 0,
  },
  frameTimeHistory: [],
  inputLatencyMs: null,
  inputLatencyNote: 'Requires game integration or PresentMon ETW telemetry',
  pingMs: null,
  packetLossPercent: null,
  pingHost: '1.1.1.1',
  thermalThrottlingDetected: false,
  bottleneckAnalysis: {
    ready: false,
    sampleCount: 0,
    requiredSamples: 5,
    thermalThrottlingDetected: false,
    findings: [],
  },
  sessionAverages: {
    avgCpuPercent: null,
    avgGpuPercent: null,
    avgRamPercent: null,
    peakCpuTempC: null,
    peakGpuTempC: null,
    peakVramUsedMB: null,
  },
};

export function isValidMetric(value: number | null | undefined): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

export function formatPercent(value: number | null | undefined, naLabel = 'N/A'): string {
  if (!isValidMetric(value)) return naLabel;
  const clamped = Math.max(0, Math.min(100, value));
  return `${clamped.toFixed(clamped >= 100 || clamped === 0 ? 0 : 1)}%`;
}

export function formatFps(value: number | null | undefined, naLabel = 'N/A'): string {
  if (!isValidMetric(value) || value <= 0) return naLabel;
  return `${Math.round(value)} FPS`;
}

export function formatFrameTimeMs(value: number | null | undefined, naLabel = 'N/A'): string {
  if (!isValidMetric(value) || value <= 0) return naLabel;
  return `${value.toFixed(1)} ms`;
}

export function formatPingMs(value: number | null | undefined, naLabel = 'N/A'): string {
  if (!isValidMetric(value) || value < 0) return naLabel;
  return `${Math.round(value)} ms`;
}

export function formatTemperatureC(celsius: number | null | undefined, naLabel = 'N/A'): string {
  if (!isValidMetric(celsius) || celsius <= 0) return naLabel;
  return `${Math.round(celsius)} °C`;
}

export function formatClockGhz(ghz: number | null | undefined, naLabel = 'N/A'): string {
  if (!isValidMetric(ghz) || ghz <= 0) return naLabel;
  return `${ghz.toFixed(2)} GHz`;
}

export function formatClockMhz(mhz: number | null | undefined, naLabel = 'N/A'): string {
  if (!isValidMetric(mhz) || mhz <= 0) return naLabel;
  return `${Math.round(mhz)} MHz`;
}

export function formatPowerWatts(watts: number | null | undefined, naLabel = 'N/A'): string {
  if (!isValidMetric(watts) || watts < 0) return naLabel;
  return `${watts.toFixed(1)} W`;
}

export function formatStorageBytes(bytes: number | null | undefined, naLabel = 'N/A'): string {
  if (!isValidMetric(bytes) || bytes < 0) return naLabel;
  if (bytes === 0) return '0 B';
  const tb = bytes / (1024 ** 4);
  if (tb >= 1) {
    return `${tb.toFixed(2)} TB`;
  }
  const gb = bytes / (1024 ** 3);
  if (gb >= 1) {
    return `${gb.toFixed(gb >= 100 ? 0 : 1)} GB`;
  }
  const mb = bytes / (1024 ** 2);
  if (mb >= 1) {
    return `${mb.toFixed(mb >= 10 ? 0 : 1)} MB`;
  }
  const kb = bytes / 1024;
  return `${kb.toFixed(0)} KB`;
}

export function formatVramMB(mb: number | null | undefined, naLabel = 'N/A'): string {
  if (!isValidMetric(mb) || mb < 0) return naLabel;
  if (mb >= 1024) {
    return `${(mb / 1024).toFixed(1)} GB`;
  }
  return `${Math.round(mb)} MB`;
}

export function formatDiskSpeed(bytesPerSec: number | null | undefined, naLabel = 'N/A'): string {
  if (!isValidMetric(bytesPerSec) || bytesPerSec < 0) return naLabel;
  const mbPerSec = bytesPerSec / (1024 * 1024);
  if (mbPerSec >= 1) {
    return `${mbPerSec.toFixed(mbPerSec >= 100 ? 0 : 1)} MB/s`;
  }
  const kbPerSec = bytesPerSec / 1024;
  return `${kbPerSec.toFixed(kbPerSec >= 10 ? 0 : 1)} KB/s`;
}

export function formatNetworkSpeed(bytesPerSec: number | null | undefined, naLabel = 'N/A'): string {
  if (!isValidMetric(bytesPerSec) || bytesPerSec < 0) return naLabel;
  const mbPerSec = bytesPerSec / (1024 * 1024);
  if (mbPerSec >= 1) {
    return `${mbPerSec.toFixed(2)} MB/s`;
  }
  const kbPerSec = bytesPerSec / 1024;
  return `${kbPerSec.toFixed(kbPerSec >= 100 ? 0 : 1)} KB/s`;
}

export function formatUptime(seconds: number | null | undefined, naLabel = 'N/A'): string {
  if (!isValidMetric(seconds) || seconds < 0) return naLabel;
  const total = Math.floor(seconds);
  const days = Math.floor(total / 86400);
  const hours = Math.floor((total % 86400) / 3600);
  const mins = Math.floor((total % 3600) / 60);
  if (days > 0) return `${days}d ${hours}h ${mins}m`;
  if (hours > 0) return `${hours}h ${mins}m`;
  return `${mins}m`;
}

export function formatFanSpeed(
  rpm: number | null | undefined,
  percent: number | null | undefined,
  naLabel = 'N/A'
): string {
  const hasRpm = isValidMetric(rpm) && rpm >= 0;
  const hasPct = isValidMetric(percent) && percent >= 0;
  if (hasRpm && hasPct) return `${Math.round(rpm)} RPM (${Math.round(percent)}%)`;
  if (hasRpm) return `${Math.round(rpm)} RPM`;
  if (hasPct) return `${Math.round(percent)}%`;
  return naLabel;
}

export function getPrimaryDriveSummary(
  drives: HardwareStorageDriveMetrics[]
): HardwareStorageDriveMetrics | null {
  if (!drives || drives.length === 0) return null;
  return drives[0];
}

export function getActiveNetworkLabel(
  iface: HardwareNetworkInterfaceMetrics | null,
  naLabel = 'N/A'
): string {
  if (!iface) return naLabel;
  return iface.displayName || iface.iface || naLabel;
}

export function selectPrimaryGpu(
  gpus: HardwareGpuMetrics[] | null | undefined
): HardwareGpuMetrics | null {
  if (!gpus || gpus.length === 0) return null;
  if (gpus.length === 1) return gpus[0];

  const scoreGpu = (gpu: HardwareGpuMetrics): number => {
    const model = String(gpu.model || '').toLowerCase();
    const mfg = String(gpu.manufacturer || '').toLowerCase();
    let score = 0;

    if (
      model.includes('microsoft basic') ||
      model.includes('virtual') ||
      model.includes('parsec') ||
      model.includes('vnc') ||
      model.includes('citrix') ||
      model.includes('mirage')
    ) {
      score -= 100;
    } else if (
      mfg.includes('nvidia') ||
      model.includes('geforce') ||
      model.includes('rtx') ||
      model.includes('gtx') ||
      model.includes('quadro')
    ) {
      score += 100;
    } else if (
      /\brx\s*\d{3,4}/i.test(model) ||
      model.includes('radeon pro') ||
      (mfg.includes('intel') && /\barc(?:\((?:r|tm)\)|[®™])?\s*(?:pro\s*)?[ab]\d{2,3}/i.test(model))
    ) {
      score += 90;
    } else if (mfg.includes('amd') || model.includes('radeon')) {
      const isIgpu =
        model.includes('radeon(tm) graphics') ||
        model.includes('radeon graphics') ||
        /\b[678]\d0m\b/.test(model);
      score += isIgpu ? 30 : 55;
    } else if (
      mfg.includes('intel') ||
      model.includes('uhd') ||
      model.includes('iris') ||
      /\barc\b/i.test(model)
    ) {
      score += 25;
    } else {
      score += 10;
    }

    if (isValidMetric(gpu.temperatureCelsius) && gpu.temperatureCelsius > 0) score += 15;
    if (isValidMetric(gpu.vramTotalMB) && gpu.vramTotalMB >= 2048) score += 12;
    if (isValidMetric(gpu.utilizationPercent)) score += 6;
    if (isValidMetric(gpu.powerWatts)) score += 4;
    return score;
  };

  let best = gpus[0];
  let bestScore = scoreGpu(best);
  for (let i = 1; i < gpus.length; i++) {
    const s = scoreGpu(gpus[i]);
    if (s > bestScore) {
      best = gpus[i];
      bestScore = s;
    }
  }
  return best;
}
