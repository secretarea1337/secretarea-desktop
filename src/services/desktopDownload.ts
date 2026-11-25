const DESKTOP_URL_STORAGE_KEY = 'secretarea_desktop_exe_url';

export function isRunningInDesktopApp(): boolean {
  if (typeof window === 'undefined') return false;
  const win = window as unknown as {
    secretAreaDesktop?: { isDesktop?: boolean };
  };
  return Boolean(win.secretAreaDesktop?.isDesktop);
}

function isSafePublicHttpsUrl(rawUrl: string): boolean {
  if (!rawUrl || /[\x00-\x1f\x7f]/.test(rawUrl)) return false;
  try {
    const parsed = new URL(rawUrl);
    if (parsed.protocol !== 'https:') return false;
    if (parsed.username || parsed.password) return false;
    const host = parsed.hostname.toLowerCase().replace(/^\[|\]$/g, '');
    if (
      !host ||
      host === 'localhost' ||
      host === '127.0.0.1' ||
      host === '::1' ||
      host === '0.0.0.0' ||
      host.endsWith('.local') ||
      host.endsWith('.internal') ||
      host.endsWith('.localhost')
    ) {
      return false;
    }
    return true;
  } catch {
    return false;
  }
}

/**
 * Accepts a direct HTTPS SecretArea.exe URL OR a GitHub repo URL/slug (e.g. https://github.com/user/repo)
 * and resolves it to the direct GitHub Releases installer link:
 * https://github.com/<user>/<repo>/releases/latest/download/SecretArea.exe
 */
export function resolveInstallerUrl(input: string): string {
  const trimmed = input.trim();
  if (!trimmed || /[\x00-\x1f\x7f]/.test(trimmed)) return '';

  // Direct HTTPS executable / release asset URL
  if (/^https:\/\/.+\.(exe|msi)(\?.*)?$/i.test(trimmed) && isSafePublicHttpsUrl(trimmed)) {
    return trimmed;
  }

  // GitHub repository URL -> latest release SecretArea.exe
  const ghUrlMatch = trimmed.match(
    /^https:\/\/(?:www\.)?github\.com\/([A-Za-z0-9_.-]+)\/([A-Za-z0-9_.-]+?)(?:\.git|\/.*)?$/i
  );
  if (ghUrlMatch) {
    return `https://github.com/${ghUrlMatch[1]}/${ghUrlMatch[2]}/releases/latest/download/SecretArea.exe`;
  }

  // Short "owner/repo" slug
  const slugMatch = trimmed.match(/^([A-Za-z0-9_.-]+)\/([A-Za-z0-9_.-]+)$/);
  if (slugMatch) {
    return `https://github.com/${slugMatch[1]}/${slugMatch[2]}/releases/latest/download/SecretArea.exe`;
  }

  if (isSafePublicHttpsUrl(trimmed)) {
    return trimmed;
  }

  return '';
}

export function getConfiguredDesktopExeUrl(): string {
  const envUrl = import.meta.env.VITE_DESKTOP_DOWNLOAD_URL;
  if (typeof envUrl === 'string' && envUrl.trim()) {
    return resolveInstallerUrl(envUrl);
  }

  try {
    const saved = localStorage.getItem(DESKTOP_URL_STORAGE_KEY);
    if (saved && saved.trim()) {
      return resolveInstallerUrl(saved);
    }
  } catch {
    // ignore storage errors
  }

  // Auto-detect GitHub Pages hosting: <owner>.github.io/<repo>/
  if (typeof window !== 'undefined' && window.location.hostname.endsWith('.github.io')) {
    const owner = window.location.hostname.replace(/\.github\.io$/i, '');
    const pathPart = window.location.pathname.split('/').filter(Boolean)[0];
    if (owner && pathPart) {
      return `https://github.com/${owner}/${pathPart}/releases/latest/download/SecretArea.exe`;
    }
  }

  return '';
}

export function saveDesktopExeUrl(rawInput: string): string {
  const resolved = resolveInstallerUrl(rawInput);
  try {
    if (resolved) {
      localStorage.setItem(DESKTOP_URL_STORAGE_KEY, resolved);
    } else {
      localStorage.removeItem(DESKTOP_URL_STORAGE_KEY);
    }
  } catch {
    // ignore storage errors
  }
  return resolved;
}

export function triggerExeDownload(exeUrl: string): void {
  const safeUrl = resolveInstallerUrl(exeUrl);
  if (!safeUrl || typeof document === 'undefined') return;
  const link = document.createElement('a');
  link.href = safeUrl;
  link.download = 'SecretArea.exe';
  link.rel = 'noopener noreferrer';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
