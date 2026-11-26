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

const BASELINE_STORAGE_KEY = 'secretarea_notif_baseline_v2';
const LIVE_EVENTS_STORAGE_KEY = 'secretarea_notif_live_events_v2';
const LEGACY_BASELINE_STORAGE_KEY = 'secretarea_notif_baseline_v1';
const LEGACY_LIVE_EVENTS_STORAGE_KEY = 'secretarea_notif_live_events_v1';
const READ_IDS_STORAGE_KEY = 'secretarea_notif_read_ids_v1';
const LAST_SYNC_STORAGE_KEY = 'secretarea_notif_last_sync_v1';
export const MAX_NOTIFICATION_FEED_ITEMS = 3;
const MAX_LIVE_EVENTS = 12;

interface BaselineRecord {
  signatures: Record<string, string>;
  initializedAt: number;
}

function clearLegacyNotificationCacheV1(): void {
  try {
    localStorage.removeItem(LEGACY_BASELINE_STORAGE_KEY);
    localStorage.removeItem(LEGACY_LIVE_EVENTS_STORAGE_KEY);
  } catch {
    // ignore
  }
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
  clearLegacyNotificationCacheV1();
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
  clearLegacyNotificationCacheV1();
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
 * and appends real live additions & updates. Never runs against bundled fallback data.
 */
export function reconcileCatalogNotifications(
  nextCatalog: SheetCatalogData,
  options: { isLiveSync?: boolean } = {}
): { newEvents: CatalogNotificationItem[]; allEvents: CatalogNotificationItem[] } {
  const existingEvents = loadPersistedLiveNotificationEvents();

  if (!options.isLiveSync) {
    return { newEvents: [], allEvents: existingEvents };
  }

  const {
    signatures: currentSigs,
    importantItemsByKey,
    upcomingByKey,
    upcomingListByKey,
    popularRepacksByKey,
  } = extractCurrentBaselineSignatures(nextCatalog);

  const existingBaseline = readBaseline();
  const now = Date.now();

  if (!existingBaseline) {
    writeBaseline({
      signatures: currentSigs,
      initializedAt: now,
    });
    setLastNotificationSyncAt(now);
    return { newEvents: [], allEvents: existingEvents };
  }

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
        subtitle: [item.repackBy || item.category, item.repackSize || item.originalSize]
          .filter(Boolean)
          .join(' · '),
        versionLabel: item.version || undefined,
        sizeLabel: item.repackSize || item.originalSize || undefined,
        coverImage: item.coverImage || undefined,
        timestamp: item.dateTimestamp > 0 ? item.dateTimestamp : now,
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
        subtitle: [item.repackBy || item.category, item.repackSize || item.originalSize]
          .filter(Boolean)
          .join(' · '),
        versionLabel: item.version || undefined,
        sizeLabel: item.repackSize || item.originalSize || undefined,
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
        timestamp: item.dateTimestamp > 0 ? item.dateTimestamp : now,
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
        timestamp: resolved.dateTimestamp > 0 ? resolved.dateTimestamp : now,
        isLiveDiff: true,
        targetItem: resolved,
      });
    }
  }

  writeBaseline({
    signatures: currentSigs,
    initializedAt: existingBaseline.initializedAt || now,
  });
  setLastNotificationSyncAt(now);

  if (discovered.length === 0) {
    return { newEvents: [], allEvents: existingEvents };
  }

  const getSortOrder = (ev: CatalogNotificationItem): number =>
    ev.kind === 'version_update'
      ? ev.timestamp
      : ev.targetItem?.dateTimestamp || ev.timestamp;

  // Deduplicate live events while keeping truly newest items first
  const mergedMap = new Map<string, CatalogNotificationItem>();
  for (const ev of [...discovered, ...existingEvents]) {
    if (!mergedMap.has(ev.id)) {
      mergedMap.set(ev.id, ev);
    }
  }
  const merged = Array.from(mergedMap.values())
    .sort(
      (a, b) =>
        getSortOrder(b) - getSortOrder(a) ||
        b.timestamp - a.timestamp ||
        Number(b.targetItem?.id || 0) - Number(a.targetItem?.id || 0)
    )
    .slice(0, MAX_LIVE_EVENTS);

  savePersistedLiveNotificationEvents(merged);
  return { newEvents: discovered, allEvents: merged };
}

/**
 * Returns strictly the 3 newest live catalog updates or newly added games/releases
 * from the active catalog + verified live diffs.
 */
export function buildNotificationFeed(
  catalog: SheetCatalogData,
  liveEvents: CatalogNotificationItem[]
): CatalogNotificationItem[] {
  const byTitle = new Map<string, CatalogNotificationItem>();
  const hasCatalogData = IMPORTANT_NOTIFICATION_TABS.some((tab) => (catalog[tab]?.length || 0) > 0);

  const attachTarget = (ev: CatalogNotificationItem): { item: CatalogNotificationItem; matched: boolean } => {
    if (ev.tab === 'upcominglist') return { item: ev, matched: true };

    let resolved: GameItem | undefined;
    if (ev.targetRef?.tab && ev.targetRef?.id && catalog[ev.targetRef.tab]) {
      resolved = catalog[ev.targetRef.tab].find((x) => x.id === ev.targetRef!.id);
    }
    if (!resolved) {
      const rawId = ev.id.split(':').slice(2).join(':');
      const [tabPart, idPart] = rawId.split(':');
      if (tabPart && idPart && catalog[tabPart as SheetTabKey]) {
        resolved = catalog[tabPart as SheetTabKey].find((x) => x.id === idPart);
      }
    }
    if (!resolved && ev.targetItem?.tab && ev.targetItem?.id && catalog[ev.targetItem.tab]) {
      resolved = catalog[ev.targetItem.tab].find((x) => x.id === ev.targetItem!.id);
    }

    if (resolved) {
      return {
        matched: true,
        item: {
          ...ev,
          title: resolved.name,
          subtitle: [resolved.repackBy || resolved.category, resolved.repackSize || resolved.originalSize]
            .filter(Boolean)
            .join(' · '),
          versionLabel: resolved.version || ev.versionLabel,
          sizeLabel: resolved.repackSize || resolved.originalSize || ev.sizeLabel,
          coverImage: resolved.coverImage || ev.coverImage,
          dateLabel: resolved.dateAdded || ev.dateLabel,
          targetItem: resolved,
        },
      };
    }

    return {
      item: ev,
      matched: !hasCatalogData || Boolean(ev.targetItem),
    };
  };

  const upsertCandidate = (candidate: CatalogNotificationItem) => {
    const dedupKey = candidate.title.trim().toLowerCase();
    if (!dedupKey) return;
    const existing = byTitle.get(dedupKey);
    if (!existing) {
      byTitle.set(dedupKey, candidate);
      return;
    }
    const existingTs =
      existing.kind === 'version_update'
        ? existing.timestamp
        : existing.targetItem?.dateTimestamp || existing.timestamp;
    const candidateTs =
      candidate.kind === 'version_update'
        ? candidate.timestamp
        : candidate.targetItem?.dateTimestamp || candidate.timestamp;
    if (
      candidateTs > existingTs ||
      (candidateTs === existingTs && candidate.isLiveDiff && !existing.isLiveDiff)
    ) {
      byTitle.set(dedupKey, candidate);
    }
  };

  // 1. Collect verified live events matching current catalog
  for (const rawEv of liveEvents) {
    if (
      rawEv.kind !== 'new_addition' &&
      rawEv.kind !== 'version_update' &&
      rawEv.importance !== 'important'
    ) {
      continue;
    }
    const { item, matched } = attachTarget(rawEv);
    if (!matched) continue;
    upsertCandidate(item);
  }

  // 2. Collect top newest items directly from core Google Sheet tabs
  const candidates: { tab: ImportantNotificationTab; item: GameItem }[] = [];
  for (const tab of IMPORTANT_NOTIFICATION_TABS) {
    for (const item of catalog[tab] || []) {
      if (!item?.name) continue;
      candidates.push({ tab, item });
    }
  }

  candidates.sort(
    (a, b) =>
      b.item.dateTimestamp - a.item.dateTimestamp ||
      Number(b.item.isNew) - Number(a.item.isNew) ||
      Number(b.item.id) - Number(a.item.id)
  );

  for (const { tab, item } of candidates.slice(0, 12)) {
    upsertCandidate({
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

  const getRankTimestamp = (ev: CatalogNotificationItem): number =>
    ev.kind === 'version_update'
      ? ev.timestamp
      : ev.targetItem?.dateTimestamp || ev.timestamp;

  return Array.from(byTitle.values())
    .sort((a, b) => {
      const rankDiff = getRankTimestamp(b) - getRankTimestamp(a);
      if (rankDiff !== 0) return rankDiff;
      if (a.isLiveDiff !== b.isLiveDiff) return a.isLiveDiff ? -1 : 1;
      return Number(b.targetItem?.id || 0) - Number(a.targetItem?.id || 0);
    })
    .slice(0, MAX_NOTIFICATION_FEED_ITEMS);
}

/**
 * Seeds read IDs on first run so only the latest 3 items are tracked cleanly.
 */
export function ensureInitialUnreadSeeding(_feed: CatalogNotificationItem[]): Set<string> {
  try {
    const raw = localStorage.getItem(READ_IDS_STORAGE_KEY);
    if (raw !== null) {
      return loadReadNotificationIds();
    }
    const readSet = new Set<string>();
    saveReadNotificationIds(readSet);
    return readSet;
  } catch {
    return new Set();
  }
}
