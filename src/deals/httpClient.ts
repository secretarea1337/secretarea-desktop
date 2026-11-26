import type {
  DealsCredentialsStatus,
  DealsProviderId,
  OptionalCredentialProviderId,
  ProviderHealthStatus,
} from './types';

interface DesktopDealsFetchResult {
  ok: boolean;
  status: number;
  headers: Record<string, string>;
  body: string;
  missingCredential?: boolean;
  error?: string;
}

interface DesktopDealsBridge {
  fetchJson: (url: string) => Promise<DesktopDealsFetchResult>;
  fetchProviderJson?: (payload: {
    providerId: OptionalCredentialProviderId;
    url: string;
  }) => Promise<DesktopDealsFetchResult>;
  getCredentialStatus?: () => Promise<DealsCredentialsStatus>;
  setCredential?: (
    providerId: OptionalCredentialProviderId,
    apiKey: string
  ) => Promise<{ ok: boolean; error?: string; warning?: string; status?: DealsCredentialsStatus }>;
  clearCredential?: (
    providerId: OptionalCredentialProviderId
  ) => Promise<{ ok: boolean; error?: string; status?: DealsCredentialsStatus }>;
}

interface CacheEntry<T> {
  expiresAt: number;
  data: T;
  headers: Record<string, string>;
}

export class DealsApiError extends Error {
  readonly status: number;
  readonly provider: DealsProviderId;
  readonly retryAfterSec: number | null;
  readonly isRateLimited: boolean;
  readonly isCorsLikely: boolean;
  readonly isOffline: boolean;
  readonly missingCredential: boolean;

  constructor(
    message: string,
    opts: {
      status: number;
      provider: DealsProviderId;
      retryAfterSec?: number | null;
      isCorsLikely?: boolean;
      isOffline?: boolean;
      missingCredential?: boolean;
    }
  ) {
    super(message);
    this.name = 'DealsApiError';
    this.status = opts.status;
    this.provider = opts.provider;
    this.retryAfterSec = opts.retryAfterSec ?? null;
    this.isRateLimited = opts.status === 429;
    this.isCorsLikely = Boolean(opts.isCorsLikely);
    this.isOffline = Boolean(opts.isOffline);
    this.missingCredential = Boolean(opts.missingCredential);
  }
}

const memoryCache = new Map<string, CacheEntry<unknown>>();
const inflightRequests = new Map<string, Promise<unknown>>();
const providerCooldownUntil = new Map<DealsProviderId, number>();
const providerHealthRegistry = new Map<DealsProviderId, ProviderHealthStatus>();

const DEFAULT_TIMEOUT_MS = 14000;
const MAX_RETRY_ATTEMPTS = 2;
const MAX_DEALS_CACHE_ENTRIES = 120;

function writeBoundedDealsCache(
  key: string,
  entry: CacheEntry<unknown>,
  now = Date.now()
): void {
  // Prune expired entries first, then enforce LRU cap
  for (const [k, v] of memoryCache) {
    if (v.expiresAt <= now) {
      memoryCache.delete(k);
    }
  }
  if (memoryCache.has(key)) {
    memoryCache.delete(key);
  }
  while (memoryCache.size >= MAX_DEALS_CACHE_ENTRIES) {
    const oldestKey = memoryCache.keys().next().value;
    if (oldestKey === undefined) break;
    memoryCache.delete(oldestKey);
  }
  memoryCache.set(key, entry);
}

export function getDesktopDealsBridge(): DesktopDealsBridge | null {
  if (typeof window === 'undefined') return null;
  const win = window as unknown as {
    secretAreaDesktop?: {
      isDesktop?: boolean;
      dealsBridge?: DesktopDealsBridge;
    };
  };
  if (win.secretAreaDesktop?.isDesktop && win.secretAreaDesktop?.dealsBridge?.fetchJson) {
    return win.secretAreaDesktop.dealsBridge;
  }
  return null;
}

export function isSafeExternalHttpUrl(rawUrl: string | null | undefined): boolean {
  if (!rawUrl || typeof rawUrl !== 'string') return false;
  try {
    const parsed = new URL(rawUrl.trim());
    return parsed.protocol === 'https:' || parsed.protocol === 'http:';
  } catch {
    return false;
  }
}

export function sanitizeExternalHttpUrl(rawUrl: string | null | undefined): string | null {
  if (!isSafeExternalHttpUrl(rawUrl)) return null;
  return rawUrl!.trim();
}

export function setProviderHealth(status: ProviderHealthStatus): void {
  providerHealthRegistry.set(status.provider, status);
}

export function getProviderHealthSnapshot(): ProviderHealthStatus[] {
  return Array.from(providerHealthRegistry.values());
}

export function getProviderCooldownRemainingSec(provider: DealsProviderId): number {
  const until = providerCooldownUntil.get(provider) || 0;
  const diffMs = until - Date.now();
  return diffMs > 0 ? Math.ceil(diffMs / 1000) : 0;
}

export function clearDealsMemoryCache(): void {
  memoryCache.clear();
}

export async function getDealsCredentialStatus(): Promise<DealsCredentialsStatus> {
  const bridge = getDesktopDealsBridge();
  if (bridge?.getCredentialStatus) {
    return bridge.getCredentialStatus();
  }
  return {
    safeStorageAvailable: false,
    providers: {
      steam_index: {
        id: 'steam_index',
        label: 'Steam Index API',
        configured: false,
        maskedPreview: null,
        source: 'none',
      },
      metacritic_apish: {
        id: 'metacritic_apish',
        label: 'API.SH Metacritic API',
        configured: false,
        maskedPreview: null,
        source: 'none',
      },
      opencritic_rapidapi: {
        id: 'opencritic_rapidapi',
        label: 'OpenCritic RapidAPI',
        configured: false,
        maskedPreview: null,
        source: 'none',
      },
    },
  };
}

export async function saveDealsProviderCredential(
  providerId: OptionalCredentialProviderId,
  apiKey: string
): Promise<{ ok: boolean; error?: string; warning?: string; status?: DealsCredentialsStatus }> {
  const bridge = getDesktopDealsBridge();
  if (!bridge?.setCredential) {
    return {
      ok: false,
      error:
        'Secure API key storage is available in the SecretArea Desktop (Electron) app using OS keychain encryption.',
    };
  }
  const result = await bridge.setCredential(providerId, apiKey);
  if (result.ok) {
    clearDealsMemoryCache();
  }
  return result;
}

export async function removeDealsProviderCredential(
  providerId: OptionalCredentialProviderId
): Promise<{ ok: boolean; error?: string; status?: DealsCredentialsStatus }> {
  const bridge = getDesktopDealsBridge();
  if (!bridge?.clearCredential) {
    return {
      ok: false,
      error: 'Electron credential storage is only available in the desktop app.',
    };
  }
  const result = await bridge.clearCredential(providerId);
  if (result.ok) {
    clearDealsMemoryCache();
  }
  return result;
}

function parseRetryAfterSeconds(rawHeader: string | null | undefined): number {
  if (!rawHeader) return 30;
  const numeric = Number(rawHeader.trim());
  if (Number.isFinite(numeric) && numeric > 0) {
    return Math.min(300, Math.ceil(numeric));
  }
  const dateMs = Date.parse(rawHeader);
  if (Number.isFinite(dateMs)) {
    const diff = Math.ceil((dateMs - Date.now()) / 1000);
    return Math.min(300, Math.max(5, diff));
  }
  return 30;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => globalThis.setTimeout(resolve, ms));
}

async function performSingleFetch(
  url: string,
  provider: DealsProviderId,
  authProviderId?: OptionalCredentialProviderId
): Promise<{ status: number; headers: Record<string, string>; body: string; missingCredential?: boolean }> {
  const bridge = getDesktopDealsBridge();
  if (authProviderId) {
    if (!bridge?.fetchProviderJson) {
      throw new DealsApiError(
        'Authenticated provider requires SecretArea Desktop Electron safeStorage bridge.',
        {
          status: 401,
          provider,
          missingCredential: true,
        }
      );
    }
    const res = await bridge.fetchProviderJson({ providerId: authProviderId, url });
    if (res.missingCredential) {
      throw new DealsApiError(res.error || 'Optional API key not configured.', {
        status: 401,
        provider,
        missingCredential: true,
      });
    }
    if (!res.ok && res.status === 0) {
      const offline = typeof navigator !== 'undefined' && !navigator.onLine;
      throw new DealsApiError(res.error || 'Network request failed', {
        status: 0,
        provider,
        isOffline: offline,
      });
    }
    return {
      status: res.status,
      headers: res.headers || {},
      body: res.body || '',
    };
  }

  if (bridge) {
    const res = await bridge.fetchJson(url);
    if (!res.ok && res.status === 0) {
      const offline = typeof navigator !== 'undefined' && !navigator.onLine;
      throw new DealsApiError(res.error || 'Network request failed', {
        status: 0,
        provider,
        isOffline: offline,
      });
    }
    return {
      status: res.status,
      headers: res.headers || {},
      body: res.body || '',
    };
  }

  const controller = new AbortController();
  const timeoutId = globalThis.setTimeout(() => controller.abort(), DEFAULT_TIMEOUT_MS);

  const requestHeaders: Record<string, string> = {
    Accept: 'application/json',
  };
  if (typeof document === 'undefined') {
    requestHeaders['User-Agent'] = 'SecretAreaDesktop/1.0.5 (+https://www.secretarea.site)';
  }

  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: requestHeaders,
      signal: controller.signal,
    });
    const body = await response.text();
    const headers: Record<string, string> = {};
    for (const h of ['retry-after', 'x-total-page-count', 'content-type', 'ratelimit-remaining', 'ratelimit-limit']) {
      const val = response.headers.get(h);
      if (val) headers[h] = val;
    }

    return {
      status: response.status,
      headers,
      body,
    };
  } catch (err) {
    const offline = typeof navigator !== 'undefined' && !navigator.onLine;
    const isAbort = err instanceof DOMException && err.name === 'AbortError';
    const message = isAbort
      ? 'Request timed out'
      : err instanceof Error
      ? err.message
      : 'Network request failed';
    const isCorsLikely =
      !offline && !isAbort && /failed to fetch|networkerror|cors/i.test(message);

    throw new DealsApiError(message, {
      status: isAbort ? 408 : 0,
      provider,
      isCorsLikely,
      isOffline: offline,
    });
  } finally {
    globalThis.clearTimeout(timeoutId);
  }
}

export async function fetchCachedProviderJson<T>(opts: {
  provider: DealsProviderId;
  providerName: string;
  url: string;
  cacheKey?: string;
  ttlMs: number;
  forceRefresh?: boolean;
  authProviderId?: OptionalCredentialProviderId;
}): Promise<{ data: T; headers: Record<string, string>; fromCache: boolean }> {
  const { provider, providerName, url, ttlMs, forceRefresh = false, authProviderId } = opts;
  const cacheKey = opts.cacheKey || `${provider}:${url}`;
  const now = Date.now();

  if (!forceRefresh) {
    const cached = memoryCache.get(cacheKey) as CacheEntry<T> | undefined;
    if (cached && cached.expiresAt > now) {
      return {
        data: cached.data,
        headers: cached.headers,
        fromCache: true,
      };
    }
  }

  const cooldownLeft = getProviderCooldownRemainingSec(provider);
  if (cooldownLeft > 0) {
    const stale = memoryCache.get(cacheKey) as CacheEntry<T> | undefined;
    if (stale && !forceRefresh) {
      return { data: stale.data, headers: stale.headers, fromCache: true };
    }
    throw new DealsApiError(
      `${providerName} rate limit active. Retry in ${cooldownLeft}s.`,
      {
        status: 429,
        provider,
        retryAfterSec: cooldownLeft,
      }
    );
  }

  const existingInflight = inflightRequests.get(cacheKey) as
    | Promise<{ data: T; headers: Record<string, string>; fromCache: boolean }>
    | undefined;
  if (existingInflight) {
    return existingInflight;
  }

  const runPromise = (async () => {
    let lastError: DealsApiError | null = null;

    for (let attempt = 0; attempt <= MAX_RETRY_ATTEMPTS; attempt += 1) {
      try {
        const res = await performSingleFetch(url, provider, authProviderId);

        if (res.status === 429) {
          const retrySec = parseRetryAfterSeconds(res.headers['retry-after']);
          providerCooldownUntil.set(provider, Date.now() + retrySec * 1000);
          setProviderHealth({
            provider,
            name: providerName,
            state: 'rate_limited',
            lastSuccessAt: providerHealthRegistry.get(provider)?.lastSuccessAt ?? null,
            retryAfterSec: retrySec,
            message: `HTTP 429 rate limit — waiting ${retrySec}s (Retry-After).`,
          });
          throw new DealsApiError(`Rate limited by ${providerName} (${retrySec}s)`, {
            status: 429,
            provider,
            retryAfterSec: retrySec,
          });
        }

        if (res.status >= 500 && attempt < MAX_RETRY_ATTEMPTS) {
          await sleep(450 * 2 ** attempt);
          continue;
        }

        if (res.status < 200 || res.status >= 300) {
          throw new DealsApiError(`${providerName} returned HTTP ${res.status}`, {
            status: res.status,
            provider,
            missingCredential: res.status === 401 && Boolean(authProviderId),
          });
        }

        // Guard against HTML gateway redirects (e.g. Steam storefront 302 HTML page)
        const trimmedBody = res.body.trimStart();
        if (trimmedBody.startsWith('<')) {
          throw new DealsApiError(`${providerName} returned HTML instead of JSON`, {
            status: res.status,
            provider,
          });
        }

        const parsed = JSON.parse(res.body) as T;
        writeBoundedDealsCache(cacheKey, {
          expiresAt: Date.now() + ttlMs,
          data: parsed,
          headers: res.headers,
        });

        setProviderHealth({
          provider,
          name: providerName,
          state: 'ok',
          lastSuccessAt: Date.now(),
          retryAfterSec: null,
          message: 'Connected',
        });

        return {
          data: parsed,
          headers: res.headers,
          fromCache: false,
        };
      } catch (err) {
        const apiErr =
          err instanceof DealsApiError
            ? err
            : new DealsApiError(err instanceof Error ? err.message : 'Invalid JSON response', {
                status: 0,
                provider,
                isOffline: typeof navigator !== 'undefined' && !navigator.onLine,
              });

        lastError = apiErr;

        if (
          apiErr.isRateLimited ||
          apiErr.isCorsLikely ||
          apiErr.isOffline ||
          apiErr.missingCredential ||
          (apiErr.status >= 300 && apiErr.status < 500)
        ) {
          break;
        }
        if (attempt < MAX_RETRY_ATTEMPTS) {
          await sleep(450 * 2 ** attempt);
        }
      }
    }

    const finalErr =
      lastError ||
      new DealsApiError(`${providerName} request failed`, {
        status: 0,
        provider,
      });

    setProviderHealth({
      provider,
      name: providerName,
      state: finalErr.missingCredential
        ? 'requires_key'
        : finalErr.isRateLimited
        ? 'rate_limited'
        : finalErr.isOffline
        ? 'offline'
        : finalErr.isCorsLikely
        ? 'cors_limited'
        : 'error',
      lastSuccessAt: providerHealthRegistry.get(provider)?.lastSuccessAt ?? null,
      retryAfterSec: finalErr.retryAfterSec,
      message: finalErr.message,
    });

    throw finalErr;
  })();

  inflightRequests.set(cacheKey, runPromise);
  try {
    return await runPromise;
  } finally {
    inflightRequests.delete(cacheKey);
  }
}
