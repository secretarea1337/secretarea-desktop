import type {
  CommentItem,
  ItemRequestPayload,
  RawSheetRow,
  ReplyItem,
  SheetCatalogData,
  SheetTabKey,
} from '../types';
import {
  ALL_SHEET_TABS,
  isUntitledPlaceholderName,
  isValidSheetRow,
  markLatestThreeNewGames,
  normalizeRow,
} from '../utils/parsers';

export const DEFAULT_GAS_URL =
  'https://script.google.com/macros/s/AKfycbzS2jQfIave1KcB0_JdlE7Akv0y5i2HzR2N_Cy3vrCTs5q7r-Uv8duxrlv7lZiAKA3eiw/exec';

const GAS_URL_STORAGE_KEY = 'secretarea_gas_url';
const OFFLINE_MODE_SENTINEL = '__OFFLINE__';
const COMMENTS_STORAGE_KEY = 'secretarea_local_comments';
const FAVORITES_STORAGE_KEY = 'secretarea_favorites';
const REQUESTS_STORAGE_KEY = 'secretarea_requests';

function isValidHttpsEndpoint(rawUrl: string): boolean {
  if (typeof rawUrl !== 'string') return false;
  const trimmed = rawUrl.trim();
  if (!trimmed || trimmed.length > 2048 || /[\x00-\x1f\x7f]/.test(trimmed)) return false;
  try {
    const parsed = new URL(trimmed);
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
      host.endsWith('.localhost') ||
      /^10\./.test(host) ||
      /^192\.168\./.test(host) ||
      /^169\.254\./.test(host) ||
      /^172\.(1[6-9]|2\d|3[01])\./.test(host)
    ) {
      return false;
    }
    return true;
  } catch {
    return false;
  }
}

export function getSavedGasUrl(): string {
  try {
    const stored = localStorage.getItem(GAS_URL_STORAGE_KEY);
    if (stored === OFFLINE_MODE_SENTINEL) return '';
    if (stored && isValidHttpsEndpoint(stored)) {
      return stored.trim();
    }
    return DEFAULT_GAS_URL;
  } catch {
    return DEFAULT_GAS_URL;
  }
}

export function saveGasUrl(url: string): void {
  try {
    const trimmed = url.trim();
    if (!trimmed) {
      localStorage.setItem(GAS_URL_STORAGE_KEY, OFFLINE_MODE_SENTINEL);
    } else if (isValidHttpsEndpoint(trimmed)) {
      localStorage.setItem(GAS_URL_STORAGE_KEY, trimmed);
    }
  } catch {
    // ignore storage errors
  }
}

export function loadFavorites(): string[] {
  try {
    const raw = localStorage.getItem(FAVORITES_STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function saveFavorites(ids: string[]): void {
  try {
    localStorage.setItem(FAVORITES_STORAGE_KEY, JSON.stringify(ids));
  } catch {
    // ignore
  }
}

export function loadLocalRequests(): ItemRequestPayload[] {
  try {
    const raw = localStorage.getItem(REQUESTS_STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function saveLocalRequest(req: ItemRequestPayload): ItemRequestPayload[] {
  const existing = loadLocalRequests();
  const next = [
    {
      ...req,
      id: req.id || `req-${Date.now()}`,
      timestamp: req.timestamp || new Date().toISOString(),
    },
    ...existing,
  ];
  try {
    localStorage.setItem(REQUESTS_STORAGE_KEY, JSON.stringify(next));
  } catch {
    // ignore
  }
  return next;
}

function getAllLocalCommentsMap(): Record<string, CommentItem[]> {
  try {
    const raw = localStorage.getItem(COMMENTS_STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function saveAllLocalCommentsMap(map: Record<string, CommentItem[]>): void {
  try {
    localStorage.setItem(COMMENTS_STORAGE_KEY, JSON.stringify(map));
  } catch {
    // ignore
  }
}

function hasAnyCellValue(row: RawSheetRow | null | undefined): boolean {
  if (!row || typeof row !== 'object') return false;
  return Object.values(row).some(
    (v) => v !== undefined && v !== null && String(v).trim() !== ''
  );
}

function buildCacheBustedGasUrl(rawUrl: string): string {
  const clean = rawUrl.trim();
  const sep = clean.includes('?') ? '&' : '?';
  return `${clean}${sep}_ts=${Date.now()}`;
}

export async function fetchCatalogFromGas(gasUrl: string): Promise<SheetCatalogData> {
  if (!isValidHttpsEndpoint(gasUrl)) {
    throw new Error('Blocked invalid or non-HTTPS sync endpoint URL.');
  }
  const cleanUrl = buildCacheBustedGasUrl(gasUrl);
  const response = await fetch(cleanUrl, {
    method: 'GET',
    redirect: 'follow',
  });

  if (!response.ok) {
    throw new Error(`Sheet sync failed with HTTP ${response.status}`);
  }

  const json = (await response.json()) as Record<string, RawSheetRow[]>;
  const normalized: SheetCatalogData = {
    game: [],
    hypervisor: [],
    steamtools: [],
    architect: [],
    extra: [],
    upcoming: [],
    steamaccounts: [],
    mastergift: [],
    profil: [],
    topgames: [],
    upcominglist: [],
    popularrepacks: [],
    bestgameseries: [],
    maintenance: [],
    upcomingtrailers: [],
    ps5: [],
    onlinegames: [],
  };

  for (const tab of ALL_SHEET_TABS) {
    const rows = Array.isArray(json[tab]) ? json[tab] : [];
    normalized[tab] = rows
      .filter((r) => isValidSheetRow(r, tab as SheetTabKey))
      .map((row, idx) => normalizeRow(row, tab as SheetTabKey, idx));
  }

  normalized.game = markLatestThreeNewGames(normalized.game);

  return normalized;
}

const CATALOG_DB_NAME = 'secretarea_offline_db';
const CATALOG_STORE_NAME = 'catalog_cache';
const CATALOG_CACHE_KEY = 'latest_live_catalog_v2';

function openCatalogDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') {
      reject(new Error('IndexedDB unavailable'));
      return;
    }
    const req = indexedDB.open(CATALOG_DB_NAME, 1);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(CATALOG_STORE_NAME)) {
        db.createObjectStore(CATALOG_STORE_NAME);
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export async function saveCachedCatalog(catalog: SheetCatalogData): Promise<void> {
  try {
    const db = await openCatalogDb();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(CATALOG_STORE_NAME, 'readwrite');
      tx.objectStore(CATALOG_STORE_NAME).put(catalog, CATALOG_CACHE_KEY);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
    db.close();
  } catch {
    // ignore storage errors cleanly
  }
}

const TITLED_CACHE_TABS = new Set<SheetTabKey>([
  'game',
  'hypervisor',
  'steamtools',
  'ps5',
  'architect',
  'extra',
  'profil',
  'upcoming',
  'topgames',
  'upcomingtrailers',
  'bestgameseries',
]);

function sanitizeCachedCatalog(catalog: SheetCatalogData): SheetCatalogData {
  const cleaned = { ...catalog };
  for (const tab of ALL_SHEET_TABS) {
    const list = Array.isArray(cleaned[tab]) ? cleaned[tab] : [];
    if (TITLED_CACHE_TABS.has(tab)) {
      cleaned[tab] = list.filter((item) => item && !isUntitledPlaceholderName(item.name));
    } else {
      cleaned[tab] = list;
    }
  }
  return cleaned;
}

export async function loadCachedCatalog(): Promise<SheetCatalogData | null> {
  try {
    const db = await openCatalogDb();
    const result = await new Promise<SheetCatalogData | null>((resolve, reject) => {
      const tx = db.transaction(CATALOG_STORE_NAME, 'readonly');
      const req = tx.objectStore(CATALOG_STORE_NAME).get(CATALOG_CACHE_KEY);
      req.onsuccess = () => resolve((req.result as SheetCatalogData) || null);
      req.onerror = () => reject(req.error);
    });
    db.close();
    return result ? sanitizeCachedCatalog(result) : null;
  } catch {
    return null;
  }
}

export async function fetchComments(itemId: string, gasUrl?: string): Promise<CommentItem[]> {
  const localMap = getAllLocalCommentsMap();
  const localForItem = localMap[itemId] || [];

  if (!gasUrl || !isValidHttpsEndpoint(gasUrl)) {
    return localForItem;
  }

  try {
    const sep = gasUrl.includes('?') ? '&' : '?';
    const res = await fetch(
      `${gasUrl.trim()}${sep}action=getComments&itemId=${encodeURIComponent(itemId)}`,
      { method: 'GET', redirect: 'follow' }
    );
    if (!res.ok) return localForItem;
    const data = (await res.json()) as { comments?: CommentItem[] };
    if (Array.isArray(data.comments)) {
      return data.comments;
    }
    return localForItem;
  } catch {
    return localForItem;
  }
}

async function postToGas(gasUrl: string, payload: Record<string, unknown>): Promise<boolean> {
  if (!isValidHttpsEndpoint(gasUrl)) return false;
  const res = await fetch(gasUrl.trim(), {
    method: 'POST',
    redirect: 'follow',
    headers: {
      'Content-Type': 'text/plain;charset=utf-8',
    },
    body: JSON.stringify(payload),
  });
  return res.ok;
}

export async function addComment(
  itemId: string,
  author: string,
  text: string,
  tags: string[],
  gasUrl?: string
): Promise<CommentItem> {
  const comment: CommentItem = {
    id: `c-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    itemId,
    author: author.trim() || 'Anonymous',
    text: text.trim(),
    tags,
    reactions: { like: 0, dislike: 0, love: 0 },
    timestamp: new Date().toISOString(),
    replies: [],
  };

  const map = getAllLocalCommentsMap();
  map[itemId] = [comment, ...(map[itemId] || [])];
  saveAllLocalCommentsMap(map);

  if (gasUrl && gasUrl.trim()) {
    try {
      await postToGas(gasUrl, {
        action: 'addComment',
        comment,
      });
    } catch {
      // already persisted locally
    }
  }

  return comment;
}

export async function addReply(
  itemId: string,
  commentId: string,
  author: string,
  text: string,
  gasUrl?: string
): Promise<ReplyItem> {
  const reply: ReplyItem = {
    id: `r-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    author: author.trim() || 'Anonymous',
    text: text.trim(),
    timestamp: new Date().toISOString(),
    reactions: { like: 0, dislike: 0, love: 0 },
  };

  const map = getAllLocalCommentsMap();
  const list = map[itemId] || [];
  map[itemId] = list.map((c) =>
    c.id === commentId ? { ...c, replies: [...(c.replies || []), reply] } : c
  );
  saveAllLocalCommentsMap(map);

  if (gasUrl && gasUrl.trim()) {
    try {
      await postToGas(gasUrl, {
        action: 'addReply',
        commentId,
        reply,
      });
    } catch {
      // local state kept
    }
  }

  return reply;
}

export async function reactComment(
  itemId: string,
  commentId: string,
  type: 'like' | 'dislike' | 'love',
  replyId?: string,
  gasUrl?: string
): Promise<CommentItem[]> {
  const map = getAllLocalCommentsMap();
  const list = map[itemId] || [];
  map[itemId] = list.map((c) => {
    if (c.id !== commentId) return c;
    if (!replyId) {
      return {
        ...c,
        reactions: {
          ...c.reactions,
          [type]: (c.reactions?.[type] || 0) + 1,
        },
      };
    }
    return {
      ...c,
      replies: (c.replies || []).map((r) =>
        r.id === replyId
          ? {
              ...r,
              reactions: {
                ...r.reactions,
                [type]: (r.reactions?.[type] || 0) + 1,
              },
            }
          : r
      ),
    };
  });
  saveAllLocalCommentsMap(map);

  if (gasUrl && gasUrl.trim()) {
    try {
      await postToGas(gasUrl, {
        action: 'reactComment',
        commentId,
        replyId,
        type,
      });
    } catch {
      // local updated
    }
  }

  return map[itemId];
}

export async function fetchRequestsFromGas(gasUrl?: string): Promise<ItemRequestPayload[]> {
  const localRequests = loadLocalRequests();
  if (!gasUrl || !isValidHttpsEndpoint(gasUrl) || (typeof navigator !== 'undefined' && !navigator.onLine)) {
    return localRequests;
  }

  try {
    const cleanUrl = gasUrl.trim();
    const sep = cleanUrl.includes('?') ? '&' : '?';
    const res = await fetch(`${cleanUrl}${sep}action=getRequests`, {
      method: 'GET',
      redirect: 'follow',
    });
    if (!res.ok) return localRequests;

    const data = (await res.json()) as {
      requests?: RawSheetRow[];
    };

    if (!Array.isArray(data.requests)) {
      return localRequests;
    }

    const remoteRequests: ItemRequestPayload[] = data.requests
      .filter((r) => hasAnyCellValue(r))
      .map((row, idx) => ({
        id: row.id ? String(row.id) : `sheet-req-${idx}`,
        title: String(row.title || row.name || 'Untitled Request').trim(),
        category: String(row.category || 'PC Game').trim(),
        image: sanitizeUrlSafe(row.image || row.coverImage),
        message: String(row.message || row.description || '').trim(),
        timestamp: String(row.timestamp || row.date || row.Date || '').trim() || undefined,
        status: row.status ? String(row.status).trim() : undefined,
        syncedToSheet: true,
      }))
      .reverse();

    // Merge remote requests with any local requests not yet reflected in the sheet response
    const seenKeys = new Set(
      remoteRequests.map((r) => `${r.title.toLowerCase()}::${r.message.toLowerCase()}`)
    );
    const merged = [...remoteRequests];
    for (const local of localRequests) {
      const key = `${local.title.toLowerCase()}::${local.message.toLowerCase()}`;
      if (!seenKeys.has(key)) {
        merged.unshift(local);
        seenKeys.add(key);
      }
    }
    return merged;
  } catch {
    return localRequests;
  }
}

function sanitizeUrlSafe(raw: unknown): string | undefined {
  if (typeof raw !== 'string') return undefined;
  const trimmed = raw.trim();
  return /^https?:\/\//i.test(trimmed) ? trimmed : undefined;
}

export async function submitItemRequest(
  payload: ItemRequestPayload,
  gasUrl?: string
): Promise<{ syncedToSheet: boolean; requests: ItemRequestPayload[] }> {
  const timestamp = payload.timestamp || new Date().toISOString();
  let syncedToSheet = false;

  const isOnline = typeof navigator === 'undefined' ? true : navigator.onLine;

  if (gasUrl && isValidHttpsEndpoint(gasUrl) && isOnline) {
    try {
      const res = await fetch(gasUrl.trim(), {
        method: 'POST',
        mode: 'no-cors',
        redirect: 'follow',
        headers: {
          'Content-Type': 'text/plain;charset=utf-8',
        },
        body: JSON.stringify({
          sheet: 'requests',
          title: payload.title,
          category: payload.category,
          image: payload.image || '',
          message: payload.message,
          timestamp,
        }),
      });
      syncedToSheet = res.ok || res.type === 'opaque';
    } catch {
      syncedToSheet = false;
    }
  }

  const requests = saveLocalRequest({
    ...payload,
    timestamp,
    syncedToSheet,
  });

  return { syncedToSheet, requests };
}
