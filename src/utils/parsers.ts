import type {
  GameItem,
  MirrorLink,
  ParsedRequirements,
  RawSheetRow,
  SheetCatalogData,
  SheetTabKey,
  ToolLink,
} from '../types';

export const ALL_SHEET_TABS: SheetTabKey[] = [
  'game',
  'hypervisor',
  'steamtools',
  'architect',
  'extra',
  'upcoming',
  'steamaccounts',
  'mastergift',
  'profil',
  'topgames',
  'upcominglist',
  'popularrepacks',
  'bestgameseries',
  'maintenance',
  'upcomingtrailers',
  'ps5',
  'onlinegames',
];

export const EMPTY_SHEET_CATALOG: SheetCatalogData = {
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

export function resolveSheetRefItem(
  refToken: string,
  catalog: SheetCatalogData
): GameItem | null {
  const token = refToken.trim().toLowerCase();
  if (!token) return null;
  const match = token.match(/^([ghsa])(\d+)$/);
  if (!match) return null;
  const [, prefix, numId] = match;
  const tabMap: Record<string, SheetTabKey> = {
    g: 'game',
    h: 'hypervisor',
    s: 'steamtools',
    a: 'architect',
  };
  const targetTab = tabMap[prefix];
  if (!targetTab) return null;
  return catalog[targetTab]?.find((x) => x.id === numId) || null;
}

export function sanitizeUrl(raw?: unknown): string {
  if (typeof raw !== 'string') return '';
  let trimmed = raw.trim();
  if (!trimmed || /[\x00-\x1f\x7f]/.test(trimmed)) return '';
  if (trimmed.startsWith('https://https//')) {
    trimmed = 'https://' + trimmed.slice('https://https//'.length);
  }
  if (trimmed.startsWith('http://http//')) {
    trimmed = 'http://' + trimmed.slice('http://http//'.length);
  }
  try {
    const parsed = new URL(trimmed);
    const proto = parsed.protocol.toLowerCase();
    if ((proto === 'http:' || proto === 'https:') && parsed.hostname) {
      return trimmed;
    }
  } catch {
    return '';
  }
  return '';
}

export function isTruthyFlag(value: unknown): boolean {
  if (typeof value === 'boolean') return value;
  if (typeof value === 'number') return value === 1;
  if (typeof value !== 'string') return false;
  const v = value.trim().toLowerCase();
  return (
    v === 'true' ||
    v === 'yes' ||
    v === 'on' ||
    v === 'active' ||
    v === '1' ||
    v === 'free' ||
    v === 'pinned'
  );
}

export function parseSizeToMB(sizeStr?: string): number {
  if (!sizeStr) return 0;
  const matches = sizeStr.match(/(\d+(?:[.,]\d+)?)\s*(TB|GB|MB|KB)/gi);
  if (!matches || matches.length === 0) {
    const numMatch = sizeStr.match(/(\d+(?:[.,]\d+)?)/);
    if (!numMatch) return 0;
    const val = parseFloat(numMatch[1].replace(',', '.'));
    return sizeStr.toLowerCase().includes('mb') ? val : val * 1024;
  }

  // Pick first primary repack size (e.g. "51.2 GB" or "5/5.2 GB" -> "5.2 GB")
  const first = matches[0];
  const m = first.match(/(\d+(?:[.,]\d+)?)\s*(TB|GB|MB|KB)/i);
  if (!m) return 0;
  const num = parseFloat(m[1].replace(',', '.'));
  const unit = m[2].toUpperCase();
  switch (unit) {
    case 'TB':
      return num * 1024 * 1024;
    case 'GB':
      return num * 1024;
    case 'MB':
      return num;
    case 'KB':
      return num / 1024;
    default:
      return num;
  }
}

export function extractYouTubeEmbedUrl(raw?: string): { watchUrl: string; embedUrl: string | null } {
  if (!raw) return { watchUrl: '', embedUrl: null };
  // Handle pipe-separated OR comma/label-separated URLs (e.g. "Reveal Trailer : https://www.youtube.com/watch?v=..., Gameplay Demo : https://...")
  const urlMatches = raw.match(/https?:\/\/[^\s,|]+/gi) || [];
  const ytCandidate = urlMatches.find(
    (u) => u.includes('youtube.com') || u.includes('youtu.be')
  );
  const target = sanitizeUrl(ytCandidate || urlMatches[0] || raw);
  if (!target) return { watchUrl: '', embedUrl: null };

  let videoId = '';
  const embedMatch = target.match(/youtube(?:-nocookie)?\.com\/embed\/([A-Za-z0-9_-]{6,})/);
  const watchMatch = target.match(/[?&]v=([A-Za-z0-9_-]{6,})/);
  const shortMatch = target.match(/youtu\.be\/([A-Za-z0-9_-]{6,})/);
  const shortsOrLiveMatch = target.match(/youtube\.com\/(?:shorts|live)\/([A-Za-z0-9_-]{6,})/);

  if (embedMatch) videoId = embedMatch[1];
  else if (watchMatch) videoId = watchMatch[1];
  else if (shortMatch) videoId = shortMatch[1];
  else if (shortsOrLiveMatch) videoId = shortsOrLiveMatch[1];

  if (!videoId) {
    return { watchUrl: target, embedUrl: null };
  }

  return {
    watchUrl: `https://www.youtube.com/watch?v=${videoId}`,
    embedUrl: `https://www.youtube.com/embed/${videoId}?autoplay=1&rel=0`,
  };
}

export function parseGallery(
  raw?: string,
  extraCommaImages?: string
): { images: string[]; videos: string[] } {
  const images: string[] = [];
  const videos: string[] = [];

  const pushUrl = (rawItem: string) => {
    const url = sanitizeUrl(rawItem);
    if (!/^https?:\/\//i.test(url)) return;
    const cleanLower = url.split('?')[0].toLowerCase();
    if (cleanLower.endsWith('.webm') || cleanLower.endsWith('.mp4')) {
      if (!videos.includes(url)) videos.push(url);
    } else if (!url.includes('youtube.com/') && !url.includes('youtu.be/')) {
      if (!images.includes(url)) images.push(url);
    }
  };

  if (raw) {
    for (const s of raw.split('|')) {
      pushUrl(s);
    }
  }

  if (extraCommaImages) {
    // Split on commas followed by whitespace/http so commas inside query strings are preserved
    const parts = extraCommaImages.split(/\s*,\s*(?=https?:\/\/)/i);
    for (const s of parts) {
      pushUrl(s);
    }
  }

  return { images, videos };
}

export function parseRequirements(raw?: string): ParsedRequirements {
  if (!raw || typeof raw !== 'string') {
    return { raw: '' };
  }
  const clean = raw.trim();
  const segments = clean.split('|').map((s) => s.trim());
  let os: string | undefined;
  let ram: string | undefined;
  let cpu: string | undefined;
  let gpu: string | undefined;

  for (const seg of segments) {
    const osMatch = seg.match(/^os\s*:\s*(.+)$/i);
    if (osMatch) {
      os = osMatch[1].trim();
      continue;
    }
    const ramMatch = seg.match(/^ram\s*:\s*(.+)$/i);
    if (ramMatch) {
      ram = ramMatch[1].trim();
      continue;
    }
    const cpuMatch = seg.match(/^cpu\s*:\s*(.+)$/i);
    if (cpuMatch) {
      cpu = cpuMatch[1].trim();
      continue;
    }
    const gpuMatch = seg.match(/^gpu\s*:\s*(.+)$/i);
    if (gpuMatch) {
      gpu = gpuMatch[1].trim();
      continue;
    }
  }

  return { os, ram, cpu, gpu, raw: clean };
}

export function parseSteps(raw?: string): string[] {
  if (!raw || typeof raw !== 'string') return [];
  return raw
    .split('|')
    .map((s) => s.trim())
    .filter((s) => s.length > 0 && !s.startsWith('http'));
}

export function parseTools(raw?: string): ToolLink[] {
  if (!raw || typeof raw !== 'string') return [];
  const segments = raw
    .split('|')
    .map((s) => s.trim())
    .filter(Boolean);

  const result: ToolLink[] = [];
  for (const seg of segments) {
    if (seg.includes('^')) {
      const [namePart, urlPart] = seg.split('^');
      const name = (namePart || '').trim();
      const url = sanitizeUrl(urlPart);
      if (name && url && /^https?:\/\//i.test(url)) {
        result.push({ name, url });
      } else if (name.toLowerCase().includes('jdownloader') && !url) {
        result.push({ name: 'JDownloader', url: 'https://jdownloader.org' });
      }
    }
  }
  return result;
}

export function extractMirrors(
  row: RawSheetRow,
  tab: SheetTabKey = 'game'
): { mirrors: MirrorLink[]; primaryMagnet: string | null } {
  const mirrors: MirrorLink[] = [];
  let primaryMagnet: string | null = null;

  const pushMirror = (
    rawValue: unknown,
    label: string,
    group: MirrorLink['group'],
    httpLabelOverride?: string
  ) => {
    if (typeof rawValue !== 'string' || !rawValue.trim()) return;
    // Some rows contain multiple magnets inside `full` separated by spaces/quotes
    if (rawValue.includes('magnet:?')) {
      const magnetMatches = rawValue.match(/magnet:\?[^\s"']+/g) || [];
      magnetMatches.forEach((mag, idx) => {
        if (!primaryMagnet) primaryMagnet = mag;
        mirrors.push({
          label: magnetMatches.length > 1 ? `${label} #${idx + 1}` : label,
          group,
          url: mag,
          isMagnet: true,
        });
      });
      return;
    }

    const url = sanitizeUrl(rawValue);
    if (/^https?:\/\//i.test(url)) {
      mirrors.push({
        label: httpLabelOverride || label,
        group: group === 'Magnet Link' ? 'Direct Mirrors' : group,
        url,
        isMagnet: false,
      });
    }
  };

  const primaryDirectGroup: MirrorLink['group'] =
    tab === 'game' || tab === 'hypervisor' ? 'FitGirl-Repacks' : 'Direct Mirrors';

  if (tab === 'steamtools') {
    pushMirror(row.full, 'MediaFire (Direct Link)', 'MediaFire (Direct Link)', 'MediaFire Direct Link');
    pushMirror(row.mirror1, 'Mega Mirror #1', 'Mega (Backup)');
    pushMirror(row.mirror2, 'Mega Mirror #2', 'Mega (Backup)');
  } else if (tab === 'architect') {
    const torrentColumnVal = row['µTorrent'] ?? row['uTorrent'] ?? row['utorrent'];
    pushMirror(torrentColumnVal, 'Torrent Magnet', 'Magnet Link', 'Torrent Link');
    if (typeof row.full === 'string' && row.full.includes('magnet:?')) {
      pushMirror(row.full, 'Magnet Link', 'Magnet Link', 'Full Download');
    } else {
      const isFreeTool = isTruthyFlag(row.Free ?? row.free);
      pushMirror(
        row.full,
        'Full Download',
        'Full Download',
        isFreeTool ? 'Official Free Download' : 'Full Download (Single File)'
      );
    }
    for (let p = 1; p <= 12; p++) {
      pushMirror(row[`part${p}`], `Part ${p}`, 'Direct Mirrors');
    }
  } else {
    pushMirror(row.full, 'Magnet Link', 'Magnet Link', 'Full Download');
    pushMirror(
      row['µTorrent'] ?? row['uTorrent'] ?? row['utorrent'],
      'Torrent Magnet',
      'Magnet Link',
      'Torrent File'
    );

    pushMirror(row.part1, 'Part 1 (DataNodes)', primaryDirectGroup);
    pushMirror(row.mirror1, 'Mirror 1 (Fast)', primaryDirectGroup);
    pushMirror(row.part2, 'Part 2 (Backup)', primaryDirectGroup);
    pushMirror(row.mirror2, 'Mirror 2', primaryDirectGroup);

    for (let p = 3; p <= 12; p++) {
      pushMirror(row[`part${p}`], `Part ${p}`, 'Direct Mirrors');
    }
  }

  for (let b = 1; b <= 4; b++) {
    pushMirror(row[`button${b}`], `PS5 Mirror #${b}`, 'Direct Mirrors');
  }

  pushMirror(row['dodi 1'], 'DoDI #1', 'DoDI-Repack');
  pushMirror(row['dodi 2'], 'DoDI #2', 'DoDI-Repack');
  pushMirror(row['dodi 3'], 'DoDI #3', 'DoDI-Repack');

  pushMirror(row['skidrow 1'], 'Skidrow #1', 'Skidrow');
  pushMirror(row['skidrow 2'], 'Skidrow #2', 'Skidrow');
  pushMirror(row['skidrow 3'], 'Skidrow #3', 'Skidrow');

  pushMirror(row['steamrip 1'], 'SteamRIP #1', 'SteamRIP');
  pushMirror(row['steamrip 2'], 'SteamRIP #2', 'SteamRIP');
  pushMirror(row['steamrip 3'], 'SteamRIP #3', 'SteamRIP');

  pushMirror(row.anker1, 'Anker Mirror #1', 'Anker');
  pushMirror(row.anker2, 'Anker Mirror #2', 'Anker');

  pushMirror(row['unlock 01'], 'Unlocker #1', 'Unlockers');
  pushMirror(row['unlock 02'], 'Unlocker #2', 'Unlockers');
  pushMirror(row['unlock 03'], 'Unlocker #3', 'Unlockers');

  pushMirror(row['free steam'], 'Free Steam Resource', 'Resources');
  pushMirror(row['game review'], 'Game Reviews', 'Resources');
  pushMirror(row['digital products'], 'Digital Products', 'Resources');

  return { mirrors, primaryMagnet };
}

function buildFallbackName(row: RawSheetRow, tab: SheetTabKey, index: number): string {
  const explicit = row.name || row.title || row.Company;
  if (explicit && String(explicit).trim()) {
    return String(explicit).trim();
  }
  if (tab === 'popularrepacks' && row['Game ID']) {
    return `Popular Pack #${index + 1} (${String(row['Game ID']).trim()})`;
  }
  if (tab === 'upcominglist') {
    const firstNonEmpty = [
      row.game,
      row.steamtools,
      row.hypervisor,
      row.ps5,
      row.tools,
      row.savegames,
    ].find((v) => v && String(v).trim());
    if (firstNonEmpty) return String(firstNonEmpty).trim();
  }
  if (tab === 'onlinegames' && row.id) {
    return `Online Game ${String(row.id).trim()}`;
  }
  if (tab === 'steamaccounts') {
    if (row.username && String(row.username).trim()) {
      return `Steam Account: ${String(row.username).trim()}`;
    }
    const link = row['free steam'] || row['digital products'] || row['game review'];
    if (link) {
      return String(link)
        .replace(/^https?:\/\/(www\.)?/i, '')
        .split('/')[0];
    }
    return `Account & Resource #${index + 1}`;
  }
  if (tab === 'maintenance') {
    return 'System Maintenance Notice';
  }
  return `Untitled Item ${index + 1}`;
}

function buildFallbackDescription(row: RawSheetRow, tab: SheetTabKey): string {
  const base = row.description || row.Description;
  if (base && String(base).trim()) return String(base).trim();

  if (tab === 'bestgameseries' && row.gamelist) {
    return `Series Titles: ${String(row.gamelist).trim()}`;
  }
  if (tab === 'upcominglist') {
    const pairs: string[] = [];
    if (row.game) pairs.push(`Game: ${row.game}`);
    if (row.steamtools) pairs.push(`SteamTools: ${row.steamtools}`);
    if (row.hypervisor) pairs.push(`Hypervisor: ${row.hypervisor}`);
    if (row.ps5) pairs.push(`PS5: ${row.ps5}`);
    if (row.tools) pairs.push(`Tools: ${row.tools}`);
    if (row.savegames) pairs.push(`SaveGames: ${row.savegames}`);
    return pairs.join('\n');
  }
  if (tab === 'upcomingtrailers') {
    const parts: string[] = [];
    if (row.developer) parts.push(`Developer: ${row.developer}`);
    if (row.platforms) parts.push(`Platforms: ${row.platforms}`);
    if (row.releaseDate) parts.push(`Release: ${String(row.releaseDate).slice(0, 10)}`);
    if (row.trailerUrls) parts.push(`Trailers: ${row.trailerUrls}`);
    return parts.join('\n');
  }
  if (tab === 'upcoming') {
    const parts: string[] = [];
    if (row.platform) parts.push(`Platforms: ${row.platform}`);
    if (row.price) parts.push(`Price: $${row.price}`);
    if (row['Upcoming Games 2026+']) parts.push(String(row['Upcoming Games 2026+']));
    return parts.join(' · ');
  }
  if (tab === 'maintenance') {
    const active = row.active ? `Active: ${row.active}` : '';
    const msg = row.message ? String(row.message).trim() : '';
    return [msg, active].filter(Boolean).join('\n');
  }
  if (tab === 'popularrepacks' && row['Game ID']) {
    return `Linked Repack IDs: ${String(row['Game ID']).trim()}`;
  }
  if (tab === 'onlinegames' && row.category) {
    return `Linked ID: ${row.id || ''} — Mode: ${row.category}`;
  }
  return '';
}

function hasNonEmptyText(value: unknown): boolean {
  return value !== undefined && value !== null && String(value).trim() !== '';
}

export function isUntitledPlaceholderName(name?: string | null): boolean {
  if (!name) return true;
  const trimmed = name.trim();
  return !trimmed || /^Untitled Item \d+$/i.test(trimmed);
}

export function isValidSheetRow(
  row: RawSheetRow | null | undefined,
  tab: SheetTabKey
): boolean {
  if (!row || typeof row !== 'object') return false;

  switch (tab) {
    case 'game':
    case 'hypervisor':
    case 'steamtools':
    case 'ps5':
    case 'architect':
    case 'extra':
    case 'upcoming':
    case 'topgames':
      return hasNonEmptyText(row.name) || hasNonEmptyText(row.title);

    case 'upcomingtrailers':
    case 'bestgameseries':
      return hasNonEmptyText(row.title) || hasNonEmptyText(row.name);

    case 'profil':
      return (
        hasNonEmptyText(row.Company) ||
        hasNonEmptyText(row.name) ||
        hasNonEmptyText(row.title)
      );

    case 'upcominglist':
      return [
        row.game,
        row.steamtools,
        row.hypervisor,
        row.ps5,
        row.tools,
        row.savegames,
        row.name,
        row.title,
      ].some(hasNonEmptyText);

    case 'popularrepacks':
      return (
        hasNonEmptyText(row['Game ID']) ||
        hasNonEmptyText(row.name) ||
        hasNonEmptyText(row.title)
      );

    case 'onlinegames':
      return (
        hasNonEmptyText(row.id) ||
        hasNonEmptyText(row.name) ||
        hasNonEmptyText(row.title)
      );

    case 'steamaccounts':
      return [
        row.username,
        row['free steam'],
        row['game review'],
        row['digital products'],
        row.name,
        row.title,
      ].some(hasNonEmptyText);

    case 'maintenance':
      return hasNonEmptyText(row.message) || hasNonEmptyText(row.active);

    case 'mastergift':
    default:
      return Object.entries(row).some(
        ([k, v]) =>
          !/^(id|date|pinned|free|denuvo|launcher)$/i.test(k.trim()) &&
          hasNonEmptyText(v)
      );
  }
}

export function normalizeRow(row: RawSheetRow, tab: SheetTabKey, index: number): GameItem {
  const name = buildFallbackName(row, tab, index);
  const rawId = row.id ?? row.ID ?? row.rank;
  const id = String(rawId !== undefined && rawId !== '' ? rawId : `${tab}-${index + 1}`).trim();
  const category = String(
    row.category || row.categories || row.platform || row.platforms || tab
  ).trim();
  const genresRaw = String(row.genres || row.genre || row.categories || '').trim();
  const genreList = genresRaw
    .split(/[,/]/)
    .map((g) => g.trim())
    .filter(Boolean);

  const repackSize = String(row.repackSize || '').trim();
  const originalSize = String(
    row.originalSize || (row.price ? `$${row.price}` : '')
  ).trim();

  const { images: parsedGalleryImages, videos: galleryVideos } = parseGallery(
    typeof row.gallery === 'string' ? row.gallery : '',
    typeof row.images === 'string' ? row.images : ''
  );

  // Add topgames logo/banner or bestgameseries background to galleryImages when relevant
  const extraGallery: string[] = [...parsedGalleryImages];
  for (const candidate of [row.banner, row.logo, row.background, row.symbol]) {
    const clean = sanitizeUrl(candidate);
    if (/^https?:\/\//i.test(clean) && !extraGallery.includes(clean)) {
      extraGallery.push(clean);
    }
  }

  const coverImage =
    sanitizeUrl(
      row.coverImage ||
        row.image ||
        row.Logo ||
        row.banner ||
        row.logo ||
        row.background
    ) ||
    extraGallery[0] ||
    '';

  const trailerRaw =
    typeof row.trailer === 'string' && row.trailer.trim()
      ? row.trailer
      : typeof row.trailerUrls === 'string'
      ? row.trailerUrls
      : '';
  const { watchUrl, embedUrl } = extractYouTubeEmbedUrl(trailerRaw);
  const { mirrors, primaryMagnet } = extractMirrors(row, tab);

  const rawDate = String(row.Date || row.date || row.releaseDate || '').trim();
  const parsedDate = rawDate ? Date.parse(rawDate) : NaN;
  const dateTimestamp = Number.isNaN(parsedDate) ? 0 : parsedDate;

  const isPinned = isTruthyFlag(row.pinned);
  const isFree = isTruthyFlag(row.Free ?? row.free);

  const rawFields: Record<string, string> = {};
  for (const [k, v] of Object.entries(row)) {
    if (v !== undefined && v !== null && String(v).trim() !== '') {
      rawFields[k] = String(v).trim();
    }
  }

  const versionStr =
    row.version !== undefined && row.version !== ''
      ? String(row.version).trim()
      : row.rank !== undefined && row.rank !== ''
      ? `Rank #${row.rank}`
      : tab === 'steamtools' && row.gameId
      ? `AppID ${row.gameId}`
      : '';

  return {
    id,
    tab,
    category,
    name,
    version: versionStr,
    repackSize,
    repackSizeMB: parseSizeToMB(repackSize),
    originalSize,
    genreList,
    genresRaw,
    languages: String(row.languages || '').trim(),
    repackBy: String(row.repackBy || row.publishBy || row.developer || '').trim(),
    coverImage,
    galleryImages: extraGallery,
    galleryVideos,
    description: buildFallbackDescription(row, tab),
    parsedRequirements: parseRequirements(
      typeof row.requirements === 'string' ? row.requirements : ''
    ),
    parsedSteps: parseSteps(typeof row.steps === 'string' ? row.steps : ''),
    mirrors,
    primaryMagnet,
    trailerUrl: watchUrl,
    embedTrailerUrl: embedUrl,
    isPinned,
    isFree,
    isNew: false,
    parsedTools: parseTools(typeof row.tools === 'string' ? row.tools : ''),
    dateAdded: rawDate,
    dateTimestamp,
    rawFields,
  };
}

export function markLatestThreeNewGames(games: GameItem[]): GameItem[] {
  if (games.length === 0) return games;
  const topThreeIds = new Set(
    [...games]
      .sort((a, b) => b.dateTimestamp - a.dateTimestamp || Number(b.id) - Number(a.id))
      .slice(0, 3)
      .map((g) => g.id)
  );
  return games.map((g) => ({
    ...g,
    isNew: topThreeIds.has(g.id),
  }));
}

export function getStudioTotalCount(studio: GameItem): number {
  const fields = ['Games ID', 'Hypervisor ID', 'SteamTools ID', 'Tools ID'];
  const tokens = new Set<string>();
  for (const field of fields) {
    const raw = studio.rawFields[field] || '';
    for (const part of raw.split(',')) {
      const clean = part.trim().toLowerCase();
      if (clean) tokens.add(clean);
    }
  }
  return tokens.size;
}

export function sortStudiosByTop(studios: GameItem[]): GameItem[] {
  return [...studios].sort(
    (a, b) =>
      (b.coverImage ? 1 : 0) - (a.coverImage ? 1 : 0) ||
      getStudioTotalCount(b) - getStudioTotalCount(a) ||
      Number(a.id) - Number(b.id)
  );
}

const STUDIO_TAB_PREFIX_MAP: Partial<Record<SheetTabKey, { prefix: string; field: string }>> = {
  game: { prefix: 'g', field: 'Games ID' },
  hypervisor: { prefix: 'h', field: 'Hypervisor ID' },
  steamtools: { prefix: 's', field: 'SteamTools ID' },
  architect: { prefix: 'a', field: 'Tools ID' },
};

const STUDIO_ALL_REF_FIELDS = ['Games ID', 'Hypervisor ID', 'SteamTools ID', 'Tools ID'] as const;

export function buildItemStudiosMap(studios: GameItem[]): Map<string, GameItem[]> {
  const map = new Map<string, GameItem[]>();
  const prefixToTab: Record<string, SheetTabKey> = {
    g: 'game',
    h: 'hypervisor',
    s: 'steamtools',
    a: 'architect',
  };

  for (const studio of studios) {
    for (const field of STUDIO_ALL_REF_FIELDS) {
      const raw = studio.rawFields[field] || '';
      if (!raw) continue;
      for (const part of raw.split(',')) {
        const clean = part.trim().toLowerCase();
        const match = clean.match(/^([ghsa])(\d+)$/);
        if (!match) continue;
        const tab = prefixToTab[match[1]];
        if (!tab) continue;
        const key = `${tab}:${match[2]}`;
        const list = map.get(key);
        if (!list) {
          map.set(key, [studio]);
        } else if (!list.some((s) => s.id === studio.id)) {
          list.push(studio);
        }
      }
    }
  }
  return map;
}

export function resolveStudiosForItem(item: GameItem, studios: GameItem[]): GameItem[] {
  if (!item || !studios || studios.length === 0) return [];
  const meta = STUDIO_TAB_PREFIX_MAP[item.tab];
  if (!meta) return [];
  const targetToken = `${meta.prefix}${item.id.trim().toLowerCase()}`;
  const matched: GameItem[] = [];
  const seenIds = new Set<string>();

  for (const studio of studios) {
    if (seenIds.has(studio.id)) continue;
    for (const field of STUDIO_ALL_REF_FIELDS) {
      const raw = studio.rawFields[field] || '';
      if (!raw) continue;
      const found = raw
        .split(',')
        .some((part) => part.trim().toLowerCase() === targetToken);
      if (found) {
        seenIds.add(studio.id);
        matched.push(studio);
        break;
      }
    }
  }

  return matched;
}

export function toGameSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export const LIBRARY_SECTIONS: { key: import('../types').LibrarySectionTab; label: string }[] = [
  { key: 'game', label: 'Games' },
  { key: 'hypervisor', label: 'Hypervisor' },
  { key: 'steamtools', label: 'SteamTools' },
  { key: 'ps5', label: 'PS5' },
  { key: 'architect', label: 'Tools' },
  { key: 'extra', label: 'Savegame' },
];

const SEARCH_ALIASES: Record<string, string> = {
  gta: 'grand theft auto',
  rdr: 'red dead redemption',
  rdr2: 'red dead redemption 2',
  re: 'resident evil',
  cod: 'call of duty',
  gow: 'god of war',
  ac: 'assassins creed',
  tlou: 'last of us',
  fh: 'forza horizon',
  nfs: 'need for speed',
  mk: 'mortal kombat',
  ff: 'final fantasy',
  dmc: 'devil may cry',
  bg3: 'baldurs gate 3',
  cp2077: 'cyberpunk 2077',
  mc: 'minecraft',
};

function normalizeSearchText(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[™®©:'"`\-_/.,!?()[\]]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function isWithinEditDistanceOne(a: string, b: string): boolean {
  if (Math.abs(a.length - b.length) > 1) return false;
  let i = 0;
  let j = 0;
  let edits = 0;
  while (i < a.length && j < b.length) {
    if (a[i] === b[j]) {
      i++;
      j++;
    } else {
      edits++;
      if (edits > 1) return false;
      if (a.length > b.length) i++;
      else if (b.length > a.length) j++;
      else {
        i++;
        j++;
      }
    }
  }
  if (i < a.length || j < b.length) edits++;
  return edits <= 1;
}

function tokenMatchesText(token: string, haystack: string, words: string[]): boolean {
  if (haystack.includes(token)) return true;
  if (token.length >= 4) {
    return words.some(
      (w) => w.startsWith(token) || (w.length >= 4 && isWithinEditDistanceOne(token, w))
    );
  }
  return false;
}

export function computeSmartSearchScore(item: GameItem, rawQuery: string): number {
  const normQuery = normalizeSearchText(rawQuery);
  if (!normQuery) return 1;

  const title = normalizeSearchText(item.name);
  const titleWords = title.split(' ').filter(Boolean);
  const metaText = normalizeSearchText(
    `${item.genresRaw} ${item.repackBy} ${item.version} ${item.category} ${item.languages}`
  );
  const metaWords = metaText.split(' ').filter(Boolean);
  const descText = normalizeSearchText(`${item.description} ${item.id}`);
  const descWords = descText.split(' ').filter(Boolean);

  const expandedQuery = normQuery
    .split(' ')
    .map((tok) => SEARCH_ALIASES[tok] || tok)
    .join(' ');
  const tokens = expandedQuery.split(' ').filter(Boolean);

  if (title === normQuery || title === expandedQuery) return 1000;
  if (title.startsWith(normQuery) || title.startsWith(expandedQuery)) return 750;
  if (title.includes(normQuery) || title.includes(expandedQuery)) return 550;

  const compactTitle = titleWords.join('');
  const compactQuery = expandedQuery.replace(/\s+/g, '');
  if (compactQuery.length >= 4) {
    if (compactTitle.includes(compactQuery)) return 480;
    const bigrams = titleWords.slice(0, -1).map((w, i) => `${w}${titleWords[i + 1]}`);
    if (bigrams.some((bg) => bg.startsWith(compactQuery) || isWithinEditDistanceOne(compactQuery, bg))) {
      return 390;
    }
  }

  const allTokensInTitle = tokens.every((tok) => tokenMatchesText(tok, title, titleWords));
  if (allTokensInTitle) return 380;

  const combinedMeta = `${title} ${metaText}`;
  const combinedMetaWords = [...titleWords, ...metaWords];
  const allTokensInTitleOrMeta = tokens.every((tok) =>
    tokenMatchesText(tok, combinedMeta, combinedMetaWords)
  );
  if (allTokensInTitleOrMeta) return 210;

  const combinedAll = `${combinedMeta} ${descText}`;
  const combinedAllWords = [...combinedMetaWords, ...descWords];
  const allTokensAnywhere = tokens.every((tok) =>
    tokenMatchesText(tok, combinedAll, combinedAllWords)
  );
  if (allTokensAnywhere) return 95;

  return 0;
}

