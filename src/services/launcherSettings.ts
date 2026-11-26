import type {
  CloseBehaviorMode,
  EffectivePerformanceConfig,
  PerformanceAdvancedSettings,
  PerformanceMode,
} from '../types';

export type AppLanguage = 'en' | 'fr' | 'es' | 'ar';
export type AppThemeMode = 'default' | 'ps5' | 'xbox';

export type CustomThemeSurfaceStyle = 'midnight' | 'obsidian' | 'abyss' | 'daylight';
export type CustomThemeButtonStyle = 'rounded' | 'pill' | 'sharp';
export type CustomThemeCardRadius = 'sharp' | 'medium' | 'soft';

export interface CustomThemeConfig {
  enabled: boolean;
  accentColor: string;
  secondaryColor: string;
  surfaceStyle: CustomThemeSurfaceStyle;
  buttonStyle: CustomThemeButtonStyle;
  cardRadius: CustomThemeCardRadius;
  glassBlur: boolean;
}

export interface LauncherSettings {
  language: AppLanguage;
  startWithComputer: boolean;
  closeBehavior: CloseBehaviorMode;
  enableCanRunIt: boolean;
  compactNavbar: boolean;
  lightMode: boolean;
  alwaysPs5Theme: boolean;
  alwaysXboxTheme: boolean;
  ambientMusicEnabled: boolean;
  uiClickSoundsEnabled: boolean;
  customCursorEnabled: boolean;
  soundVolume: number;
  customTheme: CustomThemeConfig;
  performanceMode: PerformanceMode;
  performanceAdvanced: PerformanceAdvancedSettings;
}

export const CUSTOM_THEME_ACCENT_PRESETS: { id: string; hex: string; secondary: string }[] = [
  { id: 'sky', hex: '#1a9fff', secondary: '#38bdf8' },
  { id: 'indigo', hex: '#6366f1', secondary: '#818cf8' },
  { id: 'rose', hex: '#f43f5e', secondary: '#fb7185' },
  { id: 'emerald', hex: '#10b981', secondary: '#34d399' },
  { id: 'amber', hex: '#f59e0b', secondary: '#fbbf24' },
  { id: 'violet', hex: '#a855f7', secondary: '#c084fc' },
  { id: 'orange', hex: '#f97316', secondary: '#fb923c' },
  { id: 'teal', hex: '#14b8a6', secondary: '#2dd4bf' },
];

export const CUSTOM_THEME_SURFACE_PALETTES: Record<
  CustomThemeSurfaceStyle,
  {
    isDark: boolean;
    canvas: string;
    surface: string;
    subsurface: string;
    border: string;
    swatchTop: string;
    swatchBottom: string;
  }
> = {
  midnight: {
    isDark: true,
    canvas: '#0e141b',
    surface: '#161e29',
    subsurface: '#10161f',
    border: 'rgba(255, 255, 255, 0.09)',
    swatchTop: '#1c2635',
    swatchBottom: '#0e141b',
  },
  obsidian: {
    isDark: true,
    canvas: '#07090d',
    surface: '#11141c',
    subsurface: '#0b0e14',
    border: 'rgba(255, 255, 255, 0.08)',
    swatchTop: '#161a24',
    swatchBottom: '#07090d',
  },
  abyss: {
    isDark: true,
    canvas: '#071124',
    surface: '#0d1b36',
    subsurface: '#09152b',
    border: 'rgba(147, 197, 253, 0.14)',
    swatchTop: '#12284e',
    swatchBottom: '#071124',
  },
  daylight: {
    isDark: false,
    canvas: '#f4f6f9',
    surface: '#ffffff',
    subsurface: '#f8fafc',
    border: 'rgba(15, 23, 42, 0.1)',
    swatchTop: '#ffffff',
    swatchBottom: '#e2e8f0',
  },
};

export const DEFAULT_CUSTOM_THEME: CustomThemeConfig = {
  enabled: false,
  accentColor: '#1a9fff',
  secondaryColor: '#38bdf8',
  surfaceStyle: 'midnight',
  buttonStyle: 'rounded',
  cardRadius: 'medium',
  glassBlur: true,
};

const STORAGE_KEY = 'secretarea_launcher_settings_v1';

export const DEFAULT_PERFORMANCE_ADVANCED: PerformanceAdvancedSettings = {
  pauseBackgroundWhenMinimized: true,
  reduceVisualEffects: false,
  hardwareMonitorIntervalMs: 'auto',
  downloadUiThrottleMs: 'auto',
  adaptiveTorrentPolling: true,
  deferBackgroundChecks: false,
};

export const DEFAULT_LAUNCHER_SETTINGS: LauncherSettings = {
  language: 'en',
  startWithComputer: false,
  closeBehavior: 'exit',
  enableCanRunIt: true,
  compactNavbar: false,
  lightMode: false,
  alwaysPs5Theme: false,
  alwaysXboxTheme: false,
  ambientMusicEnabled: true,
  uiClickSoundsEnabled: true,
  customCursorEnabled: true,
  soundVolume: 70,
  customTheme: { ...DEFAULT_CUSTOM_THEME },
  performanceMode: 'balanced',
  performanceAdvanced: { ...DEFAULT_PERFORMANCE_ADVANCED },
};

export function getAppVersionString(): string {
  try {
    if (typeof __APP_VERSION__ === 'string' && __APP_VERSION__.trim()) {
      return __APP_VERSION__.trim();
    }
  } catch {
    // ignore undefined define during isolated tests
  }
  return '1.0.12';
}

const LAST_SEEN_VERSION_KEY = 'secretarea_last_seen_app_version_v1';

export function getLastSeenAppVersion(): string | null {
  try {
    if (typeof localStorage === 'undefined') return null;
    const raw = localStorage.getItem(LAST_SEEN_VERSION_KEY);
    return raw && raw.trim() ? raw.trim() : null;
  } catch {
    return null;
  }
}

export function setLastSeenAppVersion(version: string): void {
  try {
    if (typeof localStorage === 'undefined') return;
    const clean = version.trim();
    if (!clean) return;
    localStorage.setItem(LAST_SEEN_VERSION_KEY, clean);
  } catch {
    // ignore localStorage failures
  }
}

export function compareAppVersions(a: string, b: string): number {
  const parse = (val: string) =>
    val
      .replace(/^v/i, '')
      .trim()
      .split('-')[0]
      .split('.')
      .map((n) => parseInt(n, 10) || 0);
  const pa = parse(a);
  const pb = parse(b);
  const len = Math.max(pa.length, pb.length, 3);
  for (let i = 0; i < len; i++) {
    const va = pa[i] || 0;
    const vb = pb[i] || 0;
    if (va > vb) return 1;
    if (va < vb) return -1;
  }
  return 0;
}

function normalizeLanguage(value: unknown): AppLanguage {
  if (value === 'fr' || value === 'es' || value === 'ar' || value === 'en') {
    return value;
  }
  return 'en';
}

function normalizeVolume(value: unknown): number {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return Math.min(100, Math.max(0, Math.round(value)));
  }
  return DEFAULT_LAUNCHER_SETTINGS.soundVolume;
}

export function sanitizeHexColor(value: unknown, fallback = '#1a9fff'): string {
  if (typeof value === 'string') {
    const clean = value.trim();
    if (/^#[0-9a-fA-F]{6}$/.test(clean)) {
      return clean.toLowerCase();
    }
  }
  return fallback;
}

function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const clean = sanitizeHexColor(hex).slice(1);
  return {
    r: parseInt(clean.slice(0, 2), 16),
    g: parseInt(clean.slice(2, 4), 16),
    b: parseInt(clean.slice(4, 6), 16),
  };
}

function mixHex(hex: string, target: number, ratio: number): string {
  const { r, g, b } = hexToRgb(hex);
  const mr = Math.round(r + (target - r) * ratio);
  const mg = Math.round(g + (target - g) * ratio);
  const mb = Math.round(b + (target - b) * ratio);
  return `#${mr.toString(16).padStart(2, '0')}${mg.toString(16).padStart(2, '0')}${mb.toString(16).padStart(2, '0')}`;
}

export function normalizeCustomTheme(value: unknown): CustomThemeConfig {
  const raw =
    value && typeof value === 'object' ? (value as Partial<CustomThemeConfig>) : {};
  const surfaceStyle: CustomThemeSurfaceStyle =
    raw.surfaceStyle === 'obsidian' ||
    raw.surfaceStyle === 'abyss' ||
    raw.surfaceStyle === 'daylight' ||
    raw.surfaceStyle === 'midnight'
      ? raw.surfaceStyle
      : DEFAULT_CUSTOM_THEME.surfaceStyle;
  const buttonStyle: CustomThemeButtonStyle =
    raw.buttonStyle === 'pill' ||
    raw.buttonStyle === 'sharp' ||
    raw.buttonStyle === 'rounded'
      ? raw.buttonStyle
      : DEFAULT_CUSTOM_THEME.buttonStyle;
  const cardRadius: CustomThemeCardRadius =
    raw.cardRadius === 'sharp' ||
    raw.cardRadius === 'soft' ||
    raw.cardRadius === 'medium'
      ? raw.cardRadius
      : DEFAULT_CUSTOM_THEME.cardRadius;

  return {
    enabled: Boolean(raw.enabled),
    accentColor: sanitizeHexColor(raw.accentColor, DEFAULT_CUSTOM_THEME.accentColor),
    secondaryColor: sanitizeHexColor(raw.secondaryColor, DEFAULT_CUSTOM_THEME.secondaryColor),
    surfaceStyle,
    buttonStyle,
    cardRadius,
    glassBlur:
      typeof raw.glassBlur === 'boolean' ? raw.glassBlur : DEFAULT_CUSTOM_THEME.glassBlur,
  };
}

export function getActiveConsoleTheme(settings: LauncherSettings): AppThemeMode {
  if (settings.alwaysXboxTheme) return 'xbox';
  if (settings.alwaysPs5Theme) return 'ps5';
  return 'default';
}

export function normalizePerformanceMode(value: unknown): PerformanceMode {
  if (value === 'eco' || value === 'balanced' || value === 'performance') {
    return value;
  }
  return 'balanced';
}

export function normalizePerformanceAdvanced(
  value: unknown,
  mode: PerformanceMode = 'balanced'
): PerformanceAdvancedSettings {
  const raw =
    value && typeof value === 'object' ? (value as Partial<PerformanceAdvancedSettings>) : {};
  const hwRaw = raw.hardwareMonitorIntervalMs;
  const hardwareMonitorIntervalMs: PerformanceAdvancedSettings['hardwareMonitorIntervalMs'] =
    hwRaw === 1000 || hwRaw === 1500 || hwRaw === 2000 || hwRaw === 3000 || hwRaw === 5000
      ? hwRaw
      : 'auto';
  const dlRaw = raw.downloadUiThrottleMs;
  const downloadUiThrottleMs: PerformanceAdvancedSettings['downloadUiThrottleMs'] =
    dlRaw === 200 || dlRaw === 350 || dlRaw === 750 ? dlRaw : 'auto';

  return {
    pauseBackgroundWhenMinimized:
      typeof raw.pauseBackgroundWhenMinimized === 'boolean'
        ? raw.pauseBackgroundWhenMinimized
        : DEFAULT_PERFORMANCE_ADVANCED.pauseBackgroundWhenMinimized,
    reduceVisualEffects:
      typeof raw.reduceVisualEffects === 'boolean'
        ? raw.reduceVisualEffects
        : mode === 'eco',
    hardwareMonitorIntervalMs,
    downloadUiThrottleMs,
    adaptiveTorrentPolling:
      typeof raw.adaptiveTorrentPolling === 'boolean'
        ? raw.adaptiveTorrentPolling
        : DEFAULT_PERFORMANCE_ADVANCED.adaptiveTorrentPolling,
    deferBackgroundChecks:
      typeof raw.deferBackgroundChecks === 'boolean'
        ? raw.deferBackgroundChecks
        : mode === 'eco',
  };
}

export function getEffectivePerformanceConfig(
  settings: Pick<LauncherSettings, 'performanceMode' | 'performanceAdvanced'>
): EffectivePerformanceConfig {
  const mode = normalizePerformanceMode(settings?.performanceMode);
  const adv = normalizePerformanceAdvanced(settings?.performanceAdvanced, mode);

  const isEco = mode === 'eco';
  const isPerf = mode === 'performance';

  const hardwarePollIntervalMs =
    adv.hardwareMonitorIntervalMs === 'auto'
      ? isEco
        ? 3000
        : isPerf
        ? 1000
        : 1500
      : adv.hardwareMonitorIntervalMs;

  const topBarTelemetryIntervalMs = isEco ? 8000 : isPerf ? 2500 : 4000;

  const downloadUiThrottleMs =
    adv.downloadUiThrottleMs === 'auto'
      ? isEco
        ? 750
        : isPerf
        ? 200
        : 350
      : adv.downloadUiThrottleMs;

  const torrentActivePollMs = isEco ? 3000 : isPerf ? 1000 : 1500;
  const torrentIdlePollMs = adv.adaptiveTorrentPolling
    ? isEco
      ? 20000
      : isPerf
      ? 6000
      : 12000
    : torrentActivePollMs;

  const reduceVisualEffects = isEco || adv.reduceVisualEffects;
  const deferBackgroundChecks = isEco || adv.deferBackgroundChecks;

  return {
    mode,
    pauseBackgroundWhenMinimized: adv.pauseBackgroundWhenMinimized,
    reduceVisualEffects,
    hardwarePollIntervalMs,
    topBarTelemetryIntervalMs,
    downloadUiThrottleMs,
    torrentActivePollMs,
    torrentIdlePollMs,
    adaptiveTorrentPolling: adv.adaptiveTorrentPolling,
    deferBackgroundChecks,
    disableHeavyAnimations: reduceVisualEffects,
    maxImageCacheEntries: isEco ? 140 : isPerf ? 360 : 240,
  };
}

export function loadLauncherSettings(): LauncherSettings {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return {
        ...DEFAULT_LAUNCHER_SETTINGS,
        customTheme: { ...DEFAULT_CUSTOM_THEME },
        performanceAdvanced: { ...DEFAULT_PERFORMANCE_ADVANCED },
      };
    }
    const parsed = JSON.parse(raw) as Partial<LauncherSettings>;
    const alwaysXboxTheme = Boolean(parsed.alwaysXboxTheme);
    const alwaysPs5Theme = alwaysXboxTheme ? false : Boolean(parsed.alwaysPs5Theme);
    const customTheme = normalizeCustomTheme(parsed.customTheme);
    const lightMode =
      alwaysXboxTheme || alwaysPs5Theme
        ? false
        : customTheme.enabled
        ? customTheme.surfaceStyle === 'daylight'
        : Boolean(parsed.lightMode);
    const performanceMode = normalizePerformanceMode(parsed.performanceMode);
    const performanceAdvanced = normalizePerformanceAdvanced(
      parsed.performanceAdvanced,
      performanceMode
    );

    return {
      language: normalizeLanguage(parsed.language),
      startWithComputer: Boolean(parsed.startWithComputer),
      closeBehavior:
        parsed.closeBehavior === 'minimize-to-tray' || parsed.closeBehavior === 'exit'
          ? parsed.closeBehavior
          : Boolean(parsed.startWithComputer)
          ? 'minimize-to-tray'
          : 'exit',
      enableCanRunIt:
        typeof parsed.enableCanRunIt === 'boolean'
          ? parsed.enableCanRunIt
          : DEFAULT_LAUNCHER_SETTINGS.enableCanRunIt,
      compactNavbar: Boolean(parsed.compactNavbar),
      lightMode,
      alwaysPs5Theme,
      alwaysXboxTheme,
      ambientMusicEnabled:
        typeof parsed.ambientMusicEnabled === 'boolean'
          ? parsed.ambientMusicEnabled
          : DEFAULT_LAUNCHER_SETTINGS.ambientMusicEnabled,
      uiClickSoundsEnabled:
        typeof parsed.uiClickSoundsEnabled === 'boolean'
          ? parsed.uiClickSoundsEnabled
          : DEFAULT_LAUNCHER_SETTINGS.uiClickSoundsEnabled,
      customCursorEnabled:
        typeof parsed.customCursorEnabled === 'boolean'
          ? parsed.customCursorEnabled
          : DEFAULT_LAUNCHER_SETTINGS.customCursorEnabled,
      soundVolume: normalizeVolume(parsed.soundVolume),
      customTheme: alwaysXboxTheme || alwaysPs5Theme ? { ...customTheme, enabled: false } : customTheme,
      performanceMode,
      performanceAdvanced,
    };
  } catch {
    return {
      ...DEFAULT_LAUNCHER_SETTINGS,
      customTheme: { ...DEFAULT_CUSTOM_THEME },
      performanceAdvanced: { ...DEFAULT_PERFORMANCE_ADVANCED },
    };
  }
}

export function saveLauncherSettings(settings: LauncherSettings): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
  } catch {
    // Ignore storage quota / private mode failures cleanly
  }
}

export function applyDocumentLanguageSettings(language: AppLanguage): void {
  if (typeof document === 'undefined') return;
  const html = document.documentElement;
  const isRtl = language === 'ar';
  html.lang = language;
  html.dir = isRtl ? 'rtl' : 'ltr';
  html.classList.toggle('lang-rtl', isRtl);
}

const CUSTOM_CSS_VAR_KEYS = [
  '--sa-accent',
  '--sa-accent-hover',
  '--sa-accent-soft',
  '--sa-accent-ring',
  '--sa-secondary',
  '--sa-bg-canvas',
  '--sa-bg-surface',
  '--sa-bg-subsurface',
  '--sa-border-subtle',
  '--sa-btn-radius',
  '--sa-card-radius',
  '--sa-panel-blur',
];

export function applyDocumentThemeSettings(settings: LauncherSettings): void {
  if (typeof document === 'undefined') return;
  const html = document.documentElement;
  const consoleTheme = getActiveConsoleTheme(settings);
  const custom = settings.customTheme || DEFAULT_CUSTOM_THEME;
  const useCustom = consoleTheme === 'default' && custom.enabled;
  const surfacePalette = CUSTOM_THEME_SURFACE_PALETTES[custom.surfaceStyle] || CUSTOM_THEME_SURFACE_PALETTES.midnight;

  const isDark =
    consoleTheme !== 'default'
      ? true
      : useCustom
      ? surfacePalette.isDark
      : !settings.lightMode;

  html.classList.toggle('dark', isDark);
  html.classList.toggle('theme-ps5', consoleTheme === 'ps5');
  html.classList.toggle('theme-xbox', consoleTheme === 'xbox');
  html.classList.toggle('theme-custom', useCustom);
  html.style.colorScheme = isDark ? 'dark' : 'light';

  if (useCustom) {
    const accent = sanitizeHexColor(custom.accentColor);
    const secondary = sanitizeHexColor(custom.secondaryColor, accent);
    const { r, g, b } = hexToRgb(accent);
    const accentHover = surfacePalette.isDark ? mixHex(accent, 255, 0.16) : mixHex(accent, 0, 0.14);
    const btnRadius =
      custom.buttonStyle === 'pill'
        ? '9999px'
        : custom.buttonStyle === 'sharp'
        ? '4px'
        : '10px';
    const cardRadius =
      custom.cardRadius === 'sharp'
        ? '6px'
        : custom.cardRadius === 'soft'
        ? '20px'
        : '12px';

    html.style.setProperty('--sa-accent', accent);
    html.style.setProperty('--sa-accent-hover', accentHover);
    html.style.setProperty('--sa-accent-soft', `rgba(${r}, ${g}, ${b}, ${surfacePalette.isDark ? 0.16 : 0.11})`);
    html.style.setProperty('--sa-accent-ring', `rgba(${r}, ${g}, ${b}, 0.42)`);
    html.style.setProperty('--sa-secondary', secondary);
    html.style.setProperty('--sa-bg-canvas', surfacePalette.canvas);
    html.style.setProperty('--sa-bg-surface', surfacePalette.surface);
    html.style.setProperty('--sa-bg-subsurface', surfacePalette.subsurface);
    html.style.setProperty('--sa-border-subtle', surfacePalette.border);
    html.style.setProperty('--sa-btn-radius', btnRadius);
    html.style.setProperty('--sa-card-radius', cardRadius);
    html.style.setProperty('--sa-panel-blur', custom.glassBlur ? 'blur(14px)' : 'none');
  } else {
    for (const key of CUSTOM_CSS_VAR_KEYS) {
      html.style.removeProperty(key);
    }
  }
}

export function applyDocumentPerformanceSettings(settings: LauncherSettings): EffectivePerformanceConfig {
  const effective = getEffectivePerformanceConfig(settings);
  if (typeof document !== 'undefined') {
    const html = document.documentElement;
    html.classList.toggle('sa-perf-eco', effective.mode === 'eco');
    html.classList.toggle('sa-perf-balanced', effective.mode === 'balanced');
    html.classList.toggle('sa-perf-performance', effective.mode === 'performance');
    html.classList.toggle('sa-reduce-effects', effective.reduceVisualEffects);
  }
  return effective;
}

export function buildPerformancePayloadForDesktop(
  settings: Pick<LauncherSettings, 'performanceMode' | 'performanceAdvanced'>
): EffectivePerformanceConfig {
  return getEffectivePerformanceConfig(settings);
}

const ONBOARDING_STORAGE_KEY = 'secretarea_onboarding_completed_v1';
const ONBOARDED_VERSION_STORAGE_KEY = 'secretarea_last_onboarded_version_v1';

export function isLocalOnboardingCompleted(): boolean {
  try {
    return localStorage.getItem(ONBOARDING_STORAGE_KEY) === 'true';
  } catch {
    return false;
  }
}

export function setLocalOnboardingCompleted(completed: boolean): void {
  try {
    if (completed) {
      localStorage.setItem(ONBOARDING_STORAGE_KEY, 'true');
    } else {
      localStorage.removeItem(ONBOARDING_STORAGE_KEY);
    }
  } catch {
    // Ignore storage failures cleanly
  }
}

export function getLocalOnboardedVersion(): string | null {
  try {
    const val = localStorage.getItem(ONBOARDED_VERSION_STORAGE_KEY);
    return val && val.trim() ? val.trim() : null;
  } catch {
    return null;
  }
}

export function setLocalOnboardedVersion(version: string | null): void {
  try {
    if (version && version.trim()) {
      localStorage.setItem(ONBOARDED_VERSION_STORAGE_KEY, version.trim());
    } else {
      localStorage.removeItem(ONBOARDED_VERSION_STORAGE_KEY);
    }
  } catch {
    // Ignore storage failures cleanly
  }
}
