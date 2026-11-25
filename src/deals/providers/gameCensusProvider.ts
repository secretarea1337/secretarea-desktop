import { fetchCachedProviderJson, sanitizeExternalHttpUrl } from '../httpClient';
import type {
  CensusMoverEntry,
  GameHealthTier,
  PlayerHistoryPoint,
  SteamReviewSummary,
} from '../types';

const GAME_CENSUS_BASE = 'https://thegamecensus.com/v1';
// Respect The Game Census 1-hour edge cache and never represent snapshot data as real-time
const CENSUS_TTL_MS = 60 * 60 * 1000;

interface RawCensusGameResponse {
  app_id?: number;
  name?: string;
  health?: {
    tier?: string;
    updated_at?: string;
  };
  reviews?: {
    positive?: number;
    negative?: number;
    steam_review_score?: number;
    steam_review_desc?: string;
    recorded_at?: string;
  };
  ccu?: {
    latest?: number;
    latest_at?: string;
    peak_30d?: number;
    avg_30d?: number;
  };
  url?: string;
}

interface RawCensusCcuResponse {
  app_id?: number;
  series?: Array<{
    date?: string;
    max?: number;
    avg?: number;
    samples?: number;
  }>;
  days?: Array<{
    date?: string;
    max?: number;
    avg?: number;
  }>;
}

interface RawCensusReviewsResponse {
  app_id?: number;
  series?: Array<{
    date?: string;
    positive?: number;
    negative?: number;
    steam_review_score?: number;
  }>;
}

interface RawCensusMoverItem {
  rank?: number;
  app_id?: number;
  name?: string;
  slug?: string;
  positive_delta?: number;
  negative_delta?: number;
  positive_velocity?: number;
  negative_velocity?: number;
  positive_ratio?: number;
  recent_reviews?: number;
  baseline_reviews?: number;
  delta_pct?: number;
  recent_period_start?: string;
  health_tier?: string;
  ccu_latest?: number;
  recorded_at?: string;
  url?: string;
}

interface RawCensusMoversResponse {
  method?: string;
  computed_at?: string;
  rising?: RawCensusMoverItem[];
  falling?: RawCensusMoverItem[];
  movers?: RawCensusMoverItem[];
}

export interface GameCensusSnapshot {
  appId: string;
  name: string;
  healthTier: GameHealthTier;
  healthUpdatedAt: number | null;
  ccuLatest: number | null;
  ccuLatestAt: number | null;
  peak30d: number | null;
  positiveReviews: number | null;
  negativeReviews: number | null;
  reviewScoreTier: number | null;
  reviewScoreDesc: string | null;
  reviewsRecordedAt: number | null;
  sourceUrl: string;
}

function normalizeHealthTier(raw?: string): GameHealthTier {
  const v = (raw || '').toLowerCase().trim();
  if (v === 'thriving') return 'thriving';
  if (v === 'healthy') return 'healthy';
  if (v === 'cooling') return 'cooling';
  if (v === 'quiet') return 'quiet';
  if (v === 'dormant') return 'dormant';
  return 'unknown';
}

function parseIsoOrNull(raw?: string): number | null {
  if (!raw) return null;
  const ts = Date.parse(raw);
  return Number.isFinite(ts) ? ts : null;
}

class GameCensusProviderImpl {
  readonly attributionText = 'The Game Census (thegamecensus.com) · CC BY 4.0';
  readonly attributionUrl = 'https://thegamecensus.com/data';

  async fetchGameOverview(appId: string, forceRefresh = false): Promise<GameCensusSnapshot | null> {
    const cleanId = appId.trim();
    if (!cleanId) return null;
    try {
      const { data } = await fetchCachedProviderJson<RawCensusGameResponse>({
        provider: 'game_census',
        providerName: 'The Game Census',
        url: `${GAME_CENSUS_BASE}/game/${encodeURIComponent(cleanId)}`,
        cacheKey: `census:game:${cleanId}`,
        ttlMs: CENSUS_TTL_MS,
        forceRefresh,
      });

      if (!data || !data.app_id) return null;
      return {
        appId: String(data.app_id),
        name: data.name || `Steam App #${cleanId}`,
        healthTier: normalizeHealthTier(data.health?.tier),
        healthUpdatedAt: parseIsoOrNull(data.health?.updated_at),
        ccuLatest: typeof data.ccu?.latest === 'number' ? data.ccu.latest : null,
        ccuLatestAt: parseIsoOrNull(data.ccu?.latest_at),
        peak30d: typeof data.ccu?.peak_30d === 'number' ? data.ccu.peak_30d : null,
        positiveReviews: typeof data.reviews?.positive === 'number' ? data.reviews.positive : null,
        negativeReviews: typeof data.reviews?.negative === 'number' ? data.reviews.negative : null,
        reviewScoreTier:
          typeof data.reviews?.steam_review_score === 'number'
            ? data.reviews.steam_review_score
            : null,
        reviewScoreDesc: data.reviews?.steam_review_desc || null,
        reviewsRecordedAt: parseIsoOrNull(data.reviews?.recorded_at),
        sourceUrl:
          sanitizeExternalHttpUrl(data.url) || `https://thegamecensus.com/game/${encodeURIComponent(cleanId)}`,
      };
    } catch {
      return null;
    }
  }

  async fetchDailyPlayerHistory(
    appId: string,
    forceRefresh = false
  ): Promise<PlayerHistoryPoint[]> {
    const cleanId = appId.trim();
    if (!cleanId) return [];
    try {
      const { data } = await fetchCachedProviderJson<RawCensusCcuResponse>({
        provider: 'game_census',
        providerName: 'The Game Census',
        url: `${GAME_CENSUS_BASE}/ccu/${encodeURIComponent(cleanId)}`,
        cacheKey: `census:ccu:${cleanId}`,
        ttlMs: CENSUS_TTL_MS,
        forceRefresh,
      });

      const list = Array.isArray(data?.series)
        ? data.series
        : Array.isArray(data?.days)
        ? data.days
        : [];
      return list
        .map((pt) => {
          const ts = parseIsoOrNull(pt.date);
          const val = typeof pt.max === 'number' ? pt.max : pt.avg;
          if (!ts || typeof val !== 'number') return null;
          return { timestamp: ts, playerCount: val };
        })
        .filter((x): x is PlayerHistoryPoint => x !== null)
        .sort((a, b) => a.timestamp - b.timestamp);
    } catch {
      return [];
    }
  }

  async fetchReviewTrend(
    appId: string,
    forceRefresh = false
  ): Promise<SteamReviewSummary['dailyTrend']> {
    const cleanId = appId.trim();
    if (!cleanId) return [];
    try {
      const { data } = await fetchCachedProviderJson<RawCensusReviewsResponse>({
        provider: 'game_census',
        providerName: 'The Game Census',
        url: `${GAME_CENSUS_BASE}/reviews/${encodeURIComponent(cleanId)}`,
        cacheKey: `census:reviews:${cleanId}`,
        ttlMs: CENSUS_TTL_MS,
        forceRefresh,
      });

      if (!Array.isArray(data?.series)) return [];
      return data.series
        .map((pt) => {
          const ts = parseIsoOrNull(pt.date);
          if (!ts) return null;
          return {
            timestamp: ts,
            positive: Number(pt.positive || 0),
            negative: Number(pt.negative || 0),
          };
        })
        .filter((x): x is { timestamp: number; positive: number; negative: number } => x !== null)
        .sort((a, b) => a.timestamp - b.timestamp);
    } catch {
      return [];
    }
  }

  async fetchMovers(
    direction: 'rising' | 'falling',
    limit = 16,
    forceRefresh = false
  ): Promise<CensusMoverEntry[]> {
    try {
      const { data } = await fetchCachedProviderJson<RawCensusMoversResponse | RawCensusMoverItem[]>({
        provider: 'game_census',
        providerName: 'The Game Census',
        url: `${GAME_CENSUS_BASE}/movers`,
        cacheKey: 'census:movers:all',
        ttlMs: CENSUS_TTL_MS,
        forceRefresh,
      });

      let list: RawCensusMoverItem[] = [];
      let computedAt: number | null = null;
      if (Array.isArray(data)) {
        list = data;
      } else if (data && typeof data === 'object') {
        computedAt = parseIsoOrNull(data.computed_at);
        const dirList = direction === 'rising' ? data.rising : data.falling;
        if (Array.isArray(dirList)) {
          list = dirList;
        } else if (Array.isArray(data.movers)) {
          list = data.movers;
        }
      }

      return list
        .filter((m) => m && m.app_id)
        .slice(0, Math.min(25, Math.max(1, limit)))
        .map((m) => ({
          appId: String(m.app_id),
          title: m.name || `Steam App #${m.app_id}`,
          direction,
          positiveVelocity: Number(m.positive_velocity ?? m.positive_delta ?? m.recent_reviews ?? 0),
          negativeVelocity: Number(m.negative_velocity ?? m.negative_delta ?? 0),
          positiveRatio: typeof m.positive_ratio === 'number' ? m.positive_ratio : null,
          recentReviews: typeof m.recent_reviews === 'number' ? m.recent_reviews : null,
          baselineReviews: typeof m.baseline_reviews === 'number' ? m.baseline_reviews : null,
          deltaPct: typeof m.delta_pct === 'number' ? m.delta_pct : null,
          healthTier: normalizeHealthTier(m.health_tier),
          ccuLatest: typeof m.ccu_latest === 'number' ? m.ccu_latest : null,
          recordedAt: parseIsoOrNull(m.recorded_at || m.recent_period_start) ?? computedAt,
          sourceUrl:
            sanitizeExternalHttpUrl(m.url) ||
            `https://thegamecensus.com/game/${encodeURIComponent(String(m.app_id))}`,
        }));
    } catch {
      return [];
    }
  }
}

export const GameCensusProvider = new GameCensusProviderImpl();
