import type { GameItem, SheetCatalogData, SheetTabKey } from '../types';

export const IMPORTANT_NOTIFICATION_TABS = [
  'game',
  'hypervisor',
  'steamtools',
  'ps5',
  'architect',
  'extra',
] as const;

export const NEWS_NOTIFICATION_TABS = [
  'upcoming',
  'upcominglist',
  'popularrepacks',
] as const;

export type ImportantNotificationTab = (typeof IMPORTANT_NOTIFICATION_TABS)[number];
export type NewsNotificationTab = (typeof NEWS_NOTIFICATION_TABS)[number];
export type NotificationSourceTab = ImportantNotificationTab | NewsNotificationTab;
export type NotificationImportance = 'important' | 'news';
export type NotificationEventKind =
  | 'new_addition'
  | 'version_update'
  | 'latest_release'
  | 'upcoming_announcement'
  | 'upcoming_queue'
  | 'popular_repack';

export interface CatalogNotificationItem {
  id: string;
  importance: NotificationImportance;
  tab: NotificationSourceTab;
  kind: NotificationEventKind;
  title: string;
  subtitle: string;
  versionLabel?: string;
  sizeLabel?: string;
  coverImage?: string;
  timestamp: number;
  dateLabel?: string;
  isLiveDiff: boolean;
  targetRef?: { tab: SheetTabKey; id: string };
  targetItem?: GameItem | null;
  upcomingSubCategory?: string;
}

const BASELINE_STORAGE_KEY = 'secretarea_notif_baseline_v1';
const LIVE_EVENTS_STORAGE_KEY = 'secretarea_notif_live_events_v1';
const READ_IDS_STORAGE_KEY = 'secretarea_notif_read_ids_v1';
const LAST_SYNC_STORAGE_KEY = 'secretarea_notif_last_sync_v1';
const MAX_LIVE_EVENTS = 80;
const MAX_SNAPSHOT_PER_IMPORTANT_TAB = 6;
const MAX_SNAPSHOT_NEWS_PER_TAB = 10;

interface BaselineRecord {
  signatures: Record<string, string>;
  initializedAt: number;
}

function resolvePopularRefToken(refToken: string, catalog: SheetCatalogData): GameItem | null {
  const token = refToken.trim().toLowerCase();
  if (!token) return null;
  const match = token.match(/^([ghsape])(\d+)$/);
  if (!match) return null;
  const [, prefix, numId] = match;
  const map: Record<string, SheetTabKey> = {
    g: 'game',
    h: 'hypervisor',
    s: 'steamtools',
    a: 'architect',
    p: 'ps5',
    e: 'extra',
  };
  const tab = map[prefix];
  if (!tab) return null;
  return catalog[tab]?.find((x) => x.id === numId) || null;
}

function buildImportantRowSignature(item: GameItem): string {
  return [
    item.name.trim(),
    item.version.trim(),
    item.repackSize.trim(),
    String(item.mirrors.length),
    item.dateAdded.trim(),
  ].join('::');
}

function buildUpcomingListEntries(rows: GameItem[]): {
  key: string;
  title: string;
  subCategory: string;
  timestamp: number;
}[] {
  const columns = ['game', 'hypervisor', 'steamtools', 'ps5', 'tools', 'savegames'] as const;
  const entries: { key: string; title: string; subCategory: string; timestamp: number }[] = [];
  const seen = new Set<string>();

  rows.forEach((row, idx) => {
    for (const col of columns) {
      const val = (row.rawFields[col] || '').trim();
      if (!val) continue;
      const key = `upcominglist:${col}:${val.toLowerCase()}`;
      if (seen.has(key)) continue;
      seen.add(key);
      entries.push({
        key,
        title: val,
        subCategory: col,
        timestamp: row.dateTimestamp || Date.now() - (rows.length - idx) * 60000,
      });
    }
  });

  return entries;
}

function extractCurrentBaselineSignatures(catalog: SheetCatalogData): {
  signatures: Record<string, string>;
  importantItemsByKey: Map<string, GameItem>;
  upcomingByKey: Map<string, GameItem>;
  upcomingListByKey: Map<string, { key: string; title: string; subCategory: string; timestamp: number }>;
  popularRepacksByKey: Map<string, { key: string; resolved: GameItem; rowIdx: number }>;
} {
  const signatures: Record<string, string> = {};
  const importantItemsByKey = new Map<string, GameItem>();
  const upcomingByKey = new Map<string, GameItem>();
  const upcomingListByKey = new Map<
    string,
    { key: string; title: string; subCategory: string; timestamp: number }
  >();
  const popularRepacksByKey = new Map<
    string,
    { key: string; resolved: GameItem; rowIdx: number }
  >();

  for (const tab of IMPORTANT_NOTIFICATION_TABS) {
    const list = catalog[tab] || [];
    for (const item of list) {
      const key = `${tab}:${item.id}`;
      signatures[key] = buildImportantRowSignature(item);
      importantItemsByKey.set(key, item);
    }
  }

  for (const item of catalog.upcoming || []) {
    const key = `upcoming:${item.name.trim().toLowerCase()}`;
    signatures[key] = [
      item.name.trim(),
      item.rawFields.platform || '',
      item.rawFields.price || '',
      item.dateAdded || '',
    ].join('::');
    upcomingByKey.set(key, item);
  }

  for (const entry of buildUpcomingListEntries(catalog.upcominglist || [])) {
    signatures[entry.key] = `${entry.title}::${entry.subCategory}`;
    upcomingListByKey.set(entry.key, entry);
  }

  (catalog.popularrepacks || []).forEach((row, rowIdx) => {
    const tokens = (row.rawFields['Game ID'] || '')
      .split(/[,\s|]+/)
      .map((t) => t.trim())
      .filter(Boolean);
    for (const tok of tokens) {
      const resolved = resolvePopularRefToken(tok, catalog);
      if (!resolved) continue;
      const key = `popularrepacks:${resolved.tab}:${resolved.id}`;
      signatures[key] = `${resolved.name}::${resolved.version}`;
      if (!popularRepacksByKey.has(key)) {
        popularRepacksByKey.set(key, { key, resolved, rowIdx });
      }
    }
  });

  return {
    signatures,
    importantItemsByKey,
    upcomingByKey,
    upcomingListByKey,
    popularRepacksByKey,
  };
}

function readBaseline(): BaselineRecord | null {
  try {
    const raw = localStorage.getItem(BASELINE_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as BaselineRecord;
    return parsed && typeof parsed.signatures === 'object' ? parsed : null;
  } catch {
    return null;
  }
}

function writeBaseline(record: BaselineRecord): void {
  try {
    localStorage.setItem(BASELINE_STORAGE_KEY, JSON.stringify(record));
  } catch {
    // ignore storage errors
  }
}

function stripNotificationForPersistence(ev: CatalogNotificationItem): CatalogNotificationItem {
  const resolvedRef =
    ev.targetRef ||
    (ev.targetItem?.tab && ev.targetItem?.id
      ? { tab: ev.targetItem.tab, id: ev.targetItem.id }
      : undefined);

  const lean: CatalogNotificationItem = {
    id: ev.id,
    importance: ev.importance,
    tab: ev.tab,
    kind: ev.kind,
    title: ev.title,
    subtitle: ev.subtitle,
    timestamp: ev.timestamp,
    isLiveDiff: ev.isLiveDiff,
  };
  if (ev.versionLabel) lean.versionLabel = ev.versionLabel;
  if (ev.sizeLabel) lean.sizeLabel = ev.sizeLabel;
  if (ev.coverImage) lean.coverImage = ev.coverImage;
  if (ev.dateLabel) lean.dateLabel = ev.dateLabel;
  if (ev.upcomingSubCategory) lean.upcomingSubCategory = ev.upcomingSubCategory;
  if (resolvedRef) lean.targetRef = resolvedRef;
  return lean;
}

export function loadPersistedLiveNotificationEvents(): CatalogNotificationItem[] {
  try {
    const raw = localStorage.getItem(LIVE_EVENTS_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function savePersistedLiveNotificationEvents(events: CatalogNotificationItem[]): void {
  try {
    const compact = events.slice(0, MAX_LIVE_EVENTS).map(stripNotificationForPersistence);
    localStorage.setItem(LIVE_EVENTS_STORAGE_KEY, JSON.stringify(compact));
  } catch {
    // ignore
  }
}

export function loadReadNotificationIds(): Set<string> {
  try {
    const raw = localStorage.getItem(READ_IDS_STORAGE_KEY);
    if (!raw) return new Set();
    const parsed = JSON.parse(raw);
    return new Set(Array.isArray(parsed) ? parsed.filter((x) => typeof x === 'string') : []);
  } catch {
    return new Set();
  }
}

export function saveReadNotificationIds(ids: Set<string>): void {
  try {
    // Keep up to 400 most recent IDs cleanly
    const arr = Array.from(ids).slice(-400);
    localStorage.setItem(READ_IDS_STORAGE_KEY, JSON.stringify(arr));
  } catch {
    // ignore
  }
}

export function getLastNotificationSyncAt(): number | null {
  try {
    const raw = localStorage.getItem(LAST_SYNC_STORAGE_KEY);
    const num = raw ? Number(raw) : NaN;
    return Number.isFinite(num) && num > 0 ? num : null;
  } catch {
    return null;
  }
}

export function setLastNotificationSyncAt(ts: number): void {
  try {
    localStorage.setItem(LAST_SYNC_STORAGE_KEY, String(ts));
  } catch {
    // ignore
  }
}

/**
 * Compares newly synced Google Sheet catalog data against stored baseline signatures
 * and appends real live additions & updates for Important tabs + News tabs.
 */
export function reconcileCatalogNotifications(
  nextCatalog: SheetCatalogData,
  options: { isLiveSync?: boolean } = {}
): { newEvents: CatalogNotificationItem[]; allEvents: CatalogNotificationItem[] } {
  const {
    signatures: currentSigs,
    importantItemsByKey,
    upcomingByKey,
    upcomingListByKey,
    popularRepacksByKey,
  } = extractCurrentBaselineSignatures(nextCatalog);

  const existingBaseline = readBaseline();
  const existingEvents = loadPersistedLiveNotificationEvents();

  if (!existingBaseline) {
    writeBaseline({
      signatures: currentSigs,
      initializedAt: Date.now(),
    });
    if (options.isLiveSync) {
      setLastNotificationSyncAt(Date.now());
    }
    return { newEvents: [], allEvents: existingEvents };
  }

  const now = Date.now();
  const discovered: CatalogNotificationItem[] = [];
  const prevSigs = existingBaseline.signatures || {};

  // 1. Important Tabs: game, hypervisor, steamtools, ps5, architect, extra
  for (const [key, item] of importantItemsByKey.entries()) {
    const nextSig = currentSigs[key];
    const prevSig = prevSigs[key];
    if (!prevSig) {
      discovered.push({
        id: `live:add:${key}`,
        importance: 'important',
        tab: item.tab as ImportantNotificationTab,
        kind: 'new_addition',
        title: item.name,
        subtitle: item.category || item.repackBy || item.tab,
        versionLabel: item.version || undefined,
        sizeLabel: item.repackSize || item.originalSize || undefined,
        coverImage: item.coverImage || undefined,
        timestamp: Math.max(now, item.dateTimestamp || 0),
        dateLabel: item.dateAdded || undefined,
        isLiveDiff: true,
        targetItem: item,
      });
    } else if (prevSig !== nextSig) {
      discovered.push({
        id: `live:upd:${key}:${nextSig.length}`,
        importance: 'important',
        tab: item.tab as ImportantNotificationTab,
        kind: 'version_update',
        title: item.name,
        subtitle: item.version
          ? `${item.version}${item.repackSize ? ` · ${item.repackSize}` : ''}`
          : item.category || item.tab,
        versionLabel: item.version || undefined,
        sizeLabel: item.repackSize || undefined,
        coverImage: item.coverImage || undefined,
        timestamp: now,
        dateLabel: item.dateAdded || undefined,
        isLiveDiff: true,
        targetItem: item,
      });
    }
  }

  // 2. Just News Tabs: upcoming
  for (const [key, item] of upcomingByKey.entries()) {
    if (!prevSigs[key]) {
      const platform = (item.rawFields.platform || '').trim();
      const price = (item.rawFields.price || '').trim();
      discovered.push({
        id: `live:news:${key}`,
        importance: 'news',
        tab: 'upcoming',
        kind: 'upcoming_announcement',
        title: item.name,
        subtitle: [platform, price ? `$${price}` : ''].filter(Boolean).join(' · ') || 'Upcoming',
        coverImage: item.coverImage || undefined,
        timestamp: Math.max(now, item.dateTimestamp || 0),
        dateLabel: item.dateAdded || undefined,
        isLiveDiff: true,
        targetItem: item,
      });
    }
  }

  // 3. Just News Tabs: upcominglist
  for (const [key, entry] of upcomingListByKey.entries()) {
    if (!prevSigs[key]) {
      discovered.push({
        id: `live:news:${key}`,
        importance: 'news',
        tab: 'upcominglist',
        kind: 'upcoming_queue',
        title: entry.title,
        subtitle: entry.subCategory,
        timestamp: now,
        isLiveDiff: true,
        upcomingSubCategory: entry.subCategory,
      });
    }
  }

  // 4. Just News Tabs: popularrepacks
  for (const [key, { resolved }] of popularRepacksByKey.entries()) {
    if (!prevSigs[key]) {
      discovered.push({
        id: `live:news:${key}`,
        importance: 'news',
        tab: 'popularrepacks',
        kind: 'popular_repack',
        title: resolved.name,
        subtitle: [resolved.repackBy || resolved.category, resolved.repackSize]
          .filter(Boolean)
          .join(' · '),
        versionLabel: resolved.version || undefined,
        sizeLabel: resolved.repackSize || undefined,
        coverImage: resolved.coverImage || undefined,
        timestamp: now,
        isLiveDiff: true,
        targetItem: resolved,
      });
    }
  }

  writeBaseline({
    signatures: currentSigs,
    initializedAt: existingBaseline.initializedAt || now,
  });

  if (options.isLiveSync) {
    setLastNotificationSyncAt(now);
  }

  if (discovered.length === 0) {
    return { newEvents: [], allEvents: existingEvents };
  }

  // Deduplicate live events while keeping newest timestamp first
  const mergedMap = new Map<string, CatalogNotificationItem>();
  for (const ev of [...discovered, ...existingEvents]) {
    if (!mergedMap.has(ev.id)) {
      mergedMap.set(ev.id, ev);
    }
  }
  const merged = Array.from(mergedMap.values())
    .sort((a, b) => b.timestamp - a.timestamp)
    .slice(0, MAX_LIVE_EVENTS);

  savePersistedLiveNotificationEvents(merged);
  return { newEvents: discovered, allEvents: merged };
}

/**
 * Combines live Google Sheets diff notifications with current sheet highlights
 * across the 6 Important Tabs and 3 Just News Tabs so the Notification Center
 * always displays fresh, actionable content cleanly without duplicates.
 */
export function buildNotificationFeed(
  catalog: SheetCatalogData,
  liveEvents: CatalogNotificationItem[]
): CatalogNotificationItem[] {
  const byIdentity = new Map<string, CatalogNotificationItem>();

  const attachTarget = (ev: CatalogNotificationItem): CatalogNotificationItem => {
    if (ev.targetItem) return ev;
    if (ev.tab === 'upcominglist') return ev;
    if (ev.targetRef?.tab && ev.targetRef?.id && catalog[ev.targetRef.tab]) {
      const foundByRef = catalog[ev.targetRef.tab].find((x) => x.id === ev.targetRef!.id);
      if (foundByRef) return { ...ev, targetItem: foundByRef };
    }
    const rawId = ev.id.split(':').slice(2).join(':');
    const [tabPart, idPart] = rawId.split(':');
    if (tabPart && idPart && catalog[tabPart as SheetTabKey]) {
      const found = catalog[tabPart as SheetTabKey].find((x) => x.id === idPart);
      if (found) return { ...ev, targetItem: found };
    }
    return ev;
  };

  for (const rawEv of liveEvents) {
    const ev = attachTarget(rawEv);
    const dedupKey = `${ev.importance}:${ev.tab}:${ev.title.toLowerCase()}`;
    if (!byIdentity.has(dedupKey)) {
      byIdentity.set(dedupKey, ev);
    }
  }

  // Fill recent Important Tab releases (game, hypervisor, steamtools, ps5, architect, extra)
  for (const tab of IMPORTANT_NOTIFICATION_TABS) {
    const items = [...(catalog[tab] || [])]
      .sort(
        (a, b) =>
          Number(b.isNew) - Number(a.isNew) ||
          b.dateTimestamp - a.dateTimestamp ||
          Number(b.isPinned) - Number(a.isPinned) ||
          Number(b.id) - Number(a.id)
      )
      .slice(0, MAX_SNAPSHOT_PER_IMPORTANT_TAB);

    for (const item of items) {
      const dedupKey = `important:${tab}:${item.name.toLowerCase()}`;
      if (byIdentity.has(dedupKey)) continue;
      byIdentity.set(dedupKey, {
        id: `snap:${tab}:${item.id}`,
        importance: 'important',
        tab,
        kind: item.isNew ? 'new_addition' : 'latest_release',
        title: item.name,
        subtitle: [item.repackBy || item.category, item.repackSize || item.originalSize]
          .filter(Boolean)
          .join(' · '),
        versionLabel: item.version || undefined,
        sizeLabel: item.repackSize || item.originalSize || undefined,
        coverImage: item.coverImage || undefined,
        timestamp: item.dateTimestamp || 0,
        dateLabel: item.dateAdded || undefined,
        isLiveDiff: false,
        targetItem: item,
      });
    }
  }

  // Fill Just News Tab #1: upcoming
  const upcomingSorted = [...(catalog.upcoming || [])]
    .sort((a, b) => b.dateTimestamp - a.dateTimestamp)
    .slice(0, MAX_SNAPSHOT_NEWS_PER_TAB);

  for (const item of upcomingSorted) {
    const dedupKey = `news:upcoming:${item.name.toLowerCase()}`;
    if (byIdentity.has(dedupKey)) continue;
    const platform = (item.rawFields.platform || '').trim();
    const price = (item.rawFields.price || '').trim();
    byIdentity.set(dedupKey, {
      id: `snap:upcoming:${item.id}`,
      importance: 'news',
      tab: 'upcoming',
      kind: 'upcoming_announcement',
      title: item.name,
      subtitle: [platform, price ? `$${price}` : ''].filter(Boolean).join(' · '),
      coverImage: item.coverImage || undefined,
      timestamp: item.dateTimestamp || 0,
      dateLabel: item.dateAdded || undefined,
      isLiveDiff: false,
      targetItem: item,
    });
  }

  // Fill Just News Tab #2: upcominglist (capped cleanly across columns)
  const queueEntries = buildUpcomingListEntries(catalog.upcominglist || []).slice(
    0,
    MAX_SNAPSHOT_NEWS_PER_TAB
  );
  queueEntries.forEach((entry, idx) => {
    const dedupKey = `news:upcominglist:${entry.title.toLowerCase()}`;
    if (byIdentity.has(dedupKey)) return;
    byIdentity.set(dedupKey, {
      id: `snap:upcominglist:${entry.subCategory}:${idx}`,
      importance: 'news',
      tab: 'upcominglist',
      kind: 'upcoming_queue',
      title: entry.title,
      subtitle: entry.subCategory,
      timestamp: 0,
      isLiveDiff: false,
      upcomingSubCategory: entry.subCategory,
    });
  });

  // Fill Just News Tab #3: popularrepacks (resolved via Game ID)
  const popularSeen = new Set<string>();
  for (const row of catalog.popularrepacks || []) {
    const tokens = (row.rawFields['Game ID'] || '')
      .split(/[,\s|]+/)
      .map((t) => t.trim())
      .filter(Boolean);
    for (const tok of tokens) {
      if (popularSeen.size >= MAX_SNAPSHOT_NEWS_PER_TAB) break;
      const resolved = resolvePopularRefToken(tok, catalog);
      if (!resolved) continue;
      const key = `${resolved.tab}:${resolved.id}`;
      if (popularSeen.has(key)) continue;
      popularSeen.add(key);

      const dedupKey = `news:popularrepacks:${resolved.name.toLowerCase()}`;
      if (byIdentity.has(dedupKey)) continue;
      byIdentity.set(dedupKey, {
        id: `snap:popularrepacks:${key}`,
        importance: 'news',
        tab: 'popularrepacks',
        kind: 'popular_repack',
        title: resolved.name,
        subtitle: [resolved.repackBy || resolved.category, resolved.repackSize]
          .filter(Boolean)
          .join(' · '),
        versionLabel: resolved.version || undefined,
        sizeLabel: resolved.repackSize || undefined,
        coverImage: resolved.coverImage || undefined,
        timestamp: resolved.dateTimestamp || 0,
        dateLabel: resolved.dateAdded || undefined,
        isLiveDiff: false,
        targetItem: resolved,
      });
    }
  }

  return Array.from(byIdentity.values()).sort((a, b) => {
    if (a.isLiveDiff !== b.isLiveDiff) return a.isLiveDiff ? -1 : 1;
    return b.timestamp - a.timestamp;
  });
}

/**
 * Seeds read IDs on first run so only the freshest highlights appear unread,
 * preventing an overwhelming initial badge count on first launch.
 */
export function ensureInitialUnreadSeeding(feed: CatalogNotificationItem[]): Set<string> {
  try {
    const raw = localStorage.getItem(READ_IDS_STORAGE_KEY);
    if (raw !== null) {
      return loadReadNotificationIds();
    }
    const readSet = new Set<string>();
    const unreadImportantLimit = 4;
    const unreadNewsLimit = 3;
    let impCount = 0;
    let newsCount = 0;

    for (const item of feed) {
      if (item.importance === 'important') {
        if (impCount < unreadImportantLimit) {
          impCount += 1;
        } else {
          readSet.add(item.id);
        }
      } else {
        if (newsCount < unreadNewsLimit) {
          newsCount += 1;
        } else {
          readSet.add(item.id);
        }
      }
    }
    saveReadNotificationIds(readSet);
    return readSet;
  } catch {
    return new Set();
  }
}
