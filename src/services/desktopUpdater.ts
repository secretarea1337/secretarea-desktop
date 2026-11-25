export type DesktopUpdateStatus =
  | 'idle'
  | 'checking'
  | 'available'
  | 'not-available'
  | 'downloading'
  | 'downloaded'
  | 'error';

export interface DesktopUpdateProgress {
  percent: number;
  bytesPerSecond: number;
  transferred: number;
  total: number;
}

export interface DesktopUpdateState {
  status: DesktopUpdateStatus;
  currentVersion: string;
  availableVersion: string | null;
  releaseName: string | null;
  releaseNotes: string | null;
  releaseDate: string | null;
  progress: DesktopUpdateProgress | null;
  error: string | null;
  isManualCheck: boolean;
  postponed: boolean;
  lastCheckedAt: string | null;
}

export interface DesktopReleaseNotesPayload {
  version: string;
  releaseName: string;
  notes: string;
  publishedAt: string | null;
  source: 'github' | 'updater';
}

export interface DesktopReleaseHistoryEntry {
  version: string;
  tagName: string;
  releaseName: string;
  notes: string;
  publishedAt: string | null;
  htmlUrl: string | null;
  prerelease: boolean;
  source: 'github' | 'local';
}

export interface SecretAreaUpdaterBridge {
  getVersion: () => Promise<string>;
  getState: () => Promise<DesktopUpdateState | null>;
  checkForUpdates: () => Promise<DesktopUpdateState | null>;
  downloadUpdate: () => Promise<DesktopUpdateState | null>;
  postponeUpdate: () => Promise<DesktopUpdateState | null>;
  installUpdate: () => Promise<void>;
  getReleaseNotes?: (version?: string) => Promise<DesktopReleaseNotesPayload | null>;
  getReleaseHistory?: (forceRefresh?: boolean) => Promise<DesktopReleaseHistoryEntry[]>;
  onStateChange: (callback: (state: DesktopUpdateState) => void) => () => void;
}

interface SecretAreaWindowBridge {
  isFullscreen: () => Promise<boolean>;
  setFullscreen: (flag: boolean) => Promise<boolean>;
  onFullscreenChange: (callback: (isFullscreen: boolean) => void) => () => void;
}

export interface DesktopSystemSpecsPayload {
  source: 'electron';
  osName: string;
  cpuName: string;
  cpuCores: number | null;
  cpuSpeedGhz: number | null;
  gpuName: string;
  gpuVramGB: number | null;
  allGpus?: string[];
  ramGB: number | null;
  ramIsApprox?: boolean;
  freeSpaceGB: number | null;
  totalSpaceGB: number | null;
  spaceDrive: string | null;
  detectedAt: string;
}

export interface DesktopSettingsStatePayload {
  startWithComputer: boolean;
  closeBehavior?: 'minimize-to-tray' | 'exit';
  onboardingCompleted?: boolean;
  lastOnboardedVersion?: string | null;
  appVersion?: string;
  isPackaged: boolean;
  platform: string;
  trayActive: boolean;
}

interface SecretAreaSettingsBridge {
  getDesktopSettings: () => Promise<DesktopSettingsStatePayload | null>;
  setStartWithComputer: (enabled: boolean) => Promise<DesktopSettingsStatePayload | null>;
  setCloseBehavior?: (
    behavior: 'minimize-to-tray' | 'exit'
  ) => Promise<DesktopSettingsStatePayload | null>;
  exitApplication?: () => Promise<{ ok: boolean } | null>;
  completeOnboarding?: (
    payload?: boolean | { completed?: boolean; version?: string }
  ) => Promise<DesktopSettingsStatePayload | null>;
}

interface SecretAreaSystemBridge {
  getSpecs: (forceRefresh?: boolean) => Promise<DesktopSystemSpecsPayload | null>;
}

interface SecretAreaDesktopGlobal {
  isDesktop?: boolean;
  platform?: string;
  updater?: SecretAreaUpdaterBridge;
  windowControls?: SecretAreaWindowBridge;
  system?: SecretAreaSystemBridge;
  settings?: SecretAreaSettingsBridge;
}

export function getDesktopUpdaterBridge(): SecretAreaUpdaterBridge | null {
  if (typeof window === 'undefined') return null;
  const win = window as unknown as {
    secretAreaDesktop?: SecretAreaDesktopGlobal;
  };
  if (!win.secretAreaDesktop?.isDesktop || !win.secretAreaDesktop?.updater) {
    return null;
  }
  return win.secretAreaDesktop.updater;
}

export function getDesktopWindowBridge(): SecretAreaWindowBridge | null {
  if (typeof window === 'undefined') return null;
  const win = window as unknown as {
    secretAreaDesktop?: SecretAreaDesktopGlobal;
  };
  if (!win.secretAreaDesktop?.isDesktop || !win.secretAreaDesktop?.windowControls) {
    return null;
  }
  return win.secretAreaDesktop.windowControls;
}

export function getDesktopSystemBridge(): SecretAreaSystemBridge | null {
  if (typeof window === 'undefined') return null;
  const win = window as unknown as {
    secretAreaDesktop?: SecretAreaDesktopGlobal;
  };
  if (!win.secretAreaDesktop?.isDesktop || !win.secretAreaDesktop?.system) {
    return null;
  }
  return win.secretAreaDesktop.system;
}

export function getDesktopSettingsBridge(): SecretAreaSettingsBridge | null {
  if (typeof window === 'undefined') return null;
  const win = window as unknown as {
    secretAreaDesktop?: SecretAreaDesktopGlobal;
  };
  if (!win.secretAreaDesktop?.isDesktop || !win.secretAreaDesktop?.settings) {
    return null;
  }
  return win.secretAreaDesktop.settings;
}

export function formatByteSize(bytes: number): string {
  if (!bytes || bytes <= 0) return '0 MB';
  const mb = bytes / (1024 * 1024);
  if (mb >= 100) return `${mb.toFixed(0)} MB`;
  if (mb >= 1) return `${mb.toFixed(1)} MB`;
  const kb = bytes / 1024;
  return `${Math.max(1, Math.round(kb))} KB`;
}

export function formatTransferSpeed(bytesPerSecond: number): string {
  if (!bytesPerSecond || bytesPerSecond <= 0) return '';
  const mbps = bytesPerSecond / (1024 * 1024);
  if (mbps >= 1) return `${mbps.toFixed(1)} MB/s`;
  const kbps = bytesPerSecond / 1024;
  return `${Math.max(1, Math.round(kbps))} KB/s`;
}
