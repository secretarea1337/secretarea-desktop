import { getDesktopSystemBridge } from './desktopUpdater';

export interface SystemHardwareSpecs {
  source: 'electron' | 'browser' | 'custom';
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

const CUSTOM_SPECS_STORAGE_KEY = 'sa_custom_pc_specs_v1';

function cleanWebGlRenderer(rawRenderer: string): string {
  if (!rawRenderer) return '';
  let text = rawRenderer.trim();

  // Unwrap Chromium ANGLE wrapper e.g. "ANGLE (NVIDIA, NVIDIA GeForce RTX 4050 Laptop GPU (0x000028A1) Direct3D11 ...)"
  const angleMatch = text.match(/^ANGLE\s*\((.+)\)$/i);
  if (angleMatch) {
    const inner = angleMatch[1];
    const parts = inner.split(',').map((p) => p.trim());
    const modelPart = parts.length >= 2 ? parts.slice(1).join(' ') : parts[0];
    text = modelPart
      .replace(/Direct3D\d*[^)]*/gi, '')
      .replace(/vs_\d+_\d+[^)]*/gi, '')
      .replace(/ps_\d+_\d+[^)]*/gi, '')
      .replace(/OpenGL[^)]*/gi, '')
      .replace(/Vulkan[^)]*/gi, '')
      .replace(/\(0x[0-9a-f]+\)/gi, '')
      .replace(/,\s*$/, '')
      .trim();
  }

  return text
    .replace(/\(R\)/gi, '')
    .replace(/\(TM\)/gi, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function detectBrowserGpuName(): string {
  if (typeof document === 'undefined') return 'Browser GPU';
  try {
    const canvas = document.createElement('canvas');
    const gl =
      (canvas.getContext('webgl2') as WebGLRenderingContext | null) ||
      (canvas.getContext('webgl') as WebGLRenderingContext | null) ||
      (canvas.getContext('experimental-webgl') as WebGLRenderingContext | null);
    if (!gl) return 'Browser GPU';
    const ext = gl.getExtension('WEBGL_debug_renderer_info');
    if (ext) {
      const unmasked = gl.getParameter(ext.UNMASKED_RENDERER_WEBGL);
      if (typeof unmasked === 'string' && unmasked.trim()) {
        return cleanWebGlRenderer(unmasked) || 'Browser GPU';
      }
    }
    const renderer = gl.getParameter(gl.RENDERER);
    if (typeof renderer === 'string' && renderer.trim()) {
      return cleanWebGlRenderer(renderer) || 'Browser GPU';
    }
  } catch {
    // ignore WebGL detection failure
  }
  return 'Browser GPU';
}

function detectBrowserOsName(): string {
  if (typeof navigator === 'undefined') return 'Windows PC';
  const ua = navigator.userAgent || '';
  if (/Windows NT 10\.0/i.test(ua)) return 'Windows 10 / 11';
  if (/Windows/i.test(ua)) return 'Windows';
  if (/Mac OS X/i.test(ua)) return 'macOS';
  if (/Linux/i.test(ua)) return 'Linux';
  return 'PC';
}

export function detectBrowserSystemSpecs(): SystemHardwareSpecs {
  const threads =
    typeof navigator !== 'undefined' &&
    typeof navigator.hardwareConcurrency === 'number' &&
    navigator.hardwareConcurrency > 0
      ? navigator.hardwareConcurrency
      : null;
  const navMem =
    typeof navigator !== 'undefined' &&
    typeof (navigator as unknown as { deviceMemory?: number }).deviceMemory === 'number' &&
    (navigator as unknown as { deviceMemory: number }).deviceMemory > 0
      ? (navigator as unknown as { deviceMemory: number }).deviceMemory
      : null;

  return {
    source: 'browser',
    osName: detectBrowserOsName(),
    cpuName: threads ? `${threads}-Thread Processor` : 'Unknown CPU',
    cpuCores: threads,
    cpuSpeedGhz: null,
    gpuName: detectBrowserGpuName(),
    gpuVramGB: null,
    ramGB: navMem,
    ramIsApprox: navMem !== null && navMem >= 8,
    freeSpaceGB: null,
    totalSpaceGB: null,
    spaceDrive: null,
    detectedAt: new Date().toISOString(),
  };
}

export function loadSavedCustomSystemSpecs(): SystemHardwareSpecs | null {
  try {
    const raw = localStorage.getItem(CUSTOM_SPECS_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<SystemHardwareSpecs>;
    if (!parsed || typeof parsed !== 'object') return null;
    return {
      source: 'custom',
      osName: typeof parsed.osName === 'string' && parsed.osName ? parsed.osName : 'Unknown OS',
      cpuName: typeof parsed.cpuName === 'string' && parsed.cpuName ? parsed.cpuName : 'Unknown CPU',
      cpuCores: typeof parsed.cpuCores === 'number' && parsed.cpuCores > 0 ? parsed.cpuCores : null,
      cpuSpeedGhz: typeof parsed.cpuSpeedGhz === 'number' && parsed.cpuSpeedGhz > 0 ? parsed.cpuSpeedGhz : null,
      gpuName: typeof parsed.gpuName === 'string' && parsed.gpuName ? parsed.gpuName : 'Unknown GPU',
      gpuVramGB: typeof parsed.gpuVramGB === 'number' && parsed.gpuVramGB > 0 ? parsed.gpuVramGB : null,
      ramGB: typeof parsed.ramGB === 'number' && parsed.ramGB > 0 ? parsed.ramGB : null,
      ramIsApprox: false,
      freeSpaceGB: typeof parsed.freeSpaceGB === 'number' && parsed.freeSpaceGB >= 0 ? parsed.freeSpaceGB : null,
      totalSpaceGB: typeof parsed.totalSpaceGB === 'number' && parsed.totalSpaceGB > 0 ? parsed.totalSpaceGB : null,
      spaceDrive: typeof parsed.spaceDrive === 'string' && parsed.spaceDrive ? parsed.spaceDrive : null,
      detectedAt: parsed.detectedAt || new Date().toISOString(),
    };
  } catch {
    return null;
  }
}

export function saveCustomSystemSpecs(specs: SystemHardwareSpecs | null): void {
  try {
    if (!specs) {
      localStorage.removeItem(CUSTOM_SPECS_STORAGE_KEY);
    } else {
      localStorage.setItem(
        CUSTOM_SPECS_STORAGE_KEY,
        JSON.stringify({ ...specs, source: 'custom', ramIsApprox: false })
      );
    }
  } catch {
    // ignore storage errors
  }
}

export async function detectAutoSystemSpecs(
  forceRefresh = false
): Promise<SystemHardwareSpecs> {
  const bridge = getDesktopSystemBridge();
  if (bridge) {
    try {
      const desktopSpecs = await bridge.getSpecs(forceRefresh);
      if (desktopSpecs) {
        return desktopSpecs;
      }
    } catch {
      // fall through cleanly to browser detection
    }
  }
  return detectBrowserSystemSpecs();
}
