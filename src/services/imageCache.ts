import type { SheetCatalogData } from '../types';
import { ALL_SHEET_TABS } from '../utils/parsers';

export const IMAGE_CACHE_NAME = 'secretarea-images-v1';

let isPrecaching = false;

export interface ImagePrecacheOptions {
  deferBackground?: boolean;
  maxEntries?: number;
  pauseWhenHidden?: boolean;
}

export function collectCatalogImageUrls(
  catalog: SheetCatalogData,
  options: { primaryOnly?: boolean; limit?: number } = {}
): string[] {
  const seen = new Set<string>();
  const urls: string[] = [];
  const primaryOnly = Boolean(options.primaryOnly);
  const limit = Number.isFinite(options.limit) && (options.limit as number) > 0
    ? Math.round(options.limit as number)
    : 260;

  const pushUrl = (raw?: string) => {
    if (urls.length >= limit) return;
    if (!raw || typeof raw !== 'string') return;
    const clean = raw.trim();
    if (!/^https?:\/\//i.test(clean)) return;
    if (!seen.has(clean)) {
      seen.add(clean);
      urls.push(clean);
    }
  };

  const pushItemMedia = (item: SheetCatalogData[keyof SheetCatalogData][number]) => {
    pushUrl(item.coverImage);
    if (primaryOnly) return;
    if (item.galleryImages?.[0]) {
      pushUrl(item.galleryImages[0]);
    }
    pushUrl(item.rawFields?.background);
    pushUrl(item.rawFields?.banner);
    pushUrl(item.rawFields?.logo);
    if (item.rawFields?.images) {
      for (const token of item.rawFields.images.split(/[\n,|]+/)) {
        pushUrl(token);
      }
    }
  };

  // Prioritize Home/Store/Extras/Studio sections first so visible pages are cached fastest
  const priorityTabs: (keyof SheetCatalogData)[] = [
    'popularrepacks',
    'onlinegames',
    'profil',
    'upcomingtrailers',
    'bestgameseries',
    'topgames',
    'upcoming',
    'ps5',
    'game',
    'hypervisor',
    'steamtools',
    'architect',
    'extra',
  ];

  const orderedTabs = [
    ...priorityTabs,
    ...ALL_SHEET_TABS.filter((tab) => !priorityTabs.includes(tab)),
  ];

  for (const tab of orderedTabs) {
    if (urls.length >= limit) break;
    const items = catalog[tab] || [];
    for (const item of items) {
      pushItemMedia(item);
      if (urls.length >= limit) break;
    }
  }

  return urls;
}

function yieldToIdle(ms = 180): Promise<void> {
  return new Promise((resolve) => {
    if (typeof window === 'undefined') {
      resolve();
      return;
    }
    const timer = window.setTimeout(() => {
      const ric = (window as unknown as { requestIdleCallback?: (cb: () => void, opts?: { timeout: number }) => number })
        .requestIdleCallback;
      if (typeof ric === 'function') {
        ric(() => resolve(), { timeout: 300 });
      } else {
        resolve();
      }
    }, ms);
    void timer;
  });
}

async function waitWhileHidden(pauseWhenHidden: boolean): Promise<void> {
  if (!pauseWhenHidden || typeof document === 'undefined' || !document.hidden) return;
  await new Promise<void>((resolve) => {
    let settled = false;
    const done = () => {
      if (settled) return;
      settled = true;
      document.removeEventListener('visibilitychange', onVis);
      resolve();
    };
    const onVis = () => {
      if (!document.hidden) done();
    };
    document.addEventListener('visibilitychange', onVis);
    window.setTimeout(done, 45000);
  });
}

/**
 * Quietly pre-caches catalog cover images into bounded CacheStorage while online
 * so offline mode renders visuals cleanly without bloating disk or idle network.
 */
export async function precacheCatalogImages(
  catalog: SheetCatalogData,
  options: ImagePrecacheOptions = {}
): Promise<void> {
  if (
    isPrecaching ||
    typeof window === 'undefined' ||
    !('caches' in window) ||
    !navigator.onLine
  ) {
    return;
  }

  const deferBackground = Boolean(options.deferBackground);
  const pauseWhenHidden = options.pauseWhenHidden !== false;
  const maxEntries = Math.max(40, Math.min(500, Math.round(options.maxEntries || 240)));

  isPrecaching = true;
  try {
    // Let initial UI interactions and animations settle before background image caching
    await yieldToIdle(deferBackground ? 4800 : 2000);
    if (!navigator.onLine) return;
    if (pauseWhenHidden && typeof document !== 'undefined' && document.hidden) {
      await waitWhileHidden(true);
    }

    const allUrls = collectCatalogImageUrls(catalog, {
      primaryOnly: deferBackground,
      limit: maxEntries,
    });
    if (allUrls.length === 0) return;

    const cache = await window.caches.open(IMAGE_CACHE_NAME);
    const existingKeys = await cache.keys();

    // Enforce bounded cache size by evicting oldest entries beyond maxEntries
    if (existingKeys.length > maxEntries) {
      const overflow = existingKeys.length - maxEntries;
      for (let idx = 0; idx < overflow; idx += 1) {
        await cache.delete(existingKeys[idx]);
      }
    }

    const cachedSet = new Set(existingKeys.slice(Math.max(0, existingKeys.length - maxEntries)).map((req) => req.url));
    const missing = allUrls.filter((u) => !cachedSet.has(u));
    if (missing.length === 0) return;

    const BATCH_SIZE = deferBackground ? 1 : 2;
    const stepDelay = deferBackground ? 350 : 180;
    for (let i = 0; i < missing.length; i += BATCH_SIZE) {
      if (!navigator.onLine) break;
      if (pauseWhenHidden && typeof document !== 'undefined' && document.hidden) {
        await waitWhileHidden(true);
      }

      const batch = missing.slice(i, i + BATCH_SIZE);
      await Promise.all(
        batch.map(async (url) => {
          try {
            const response = await fetch(url, {
              method: 'GET',
              mode: 'no-cors',
              referrerPolicy: 'no-referrer',
            });
            if (response && (response.ok || response.type === 'opaque')) {
              await cache.put(url, response);
            }
          } catch {
            // Skip unreachable image hosts gracefully
          }
        })
      );

      await yieldToIdle(stepDelay);
    }
  } catch {
    // Ignore storage quota or browser cache errors cleanly
  } finally {
    isPrecaching = false;
  }
}
