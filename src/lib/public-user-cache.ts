// ============================================================================
// Module-level in-memory cache for GET /api/users/{id} (AllowAnonymous).
//
// Keyed by userId, TTL-based (10 min) so stale names/avatars expire without a
// page reload. Shared across all components in the same browser session.
// Not persisted to localStorage — intentionally ephemeral.
// ============================================================================

const TTL_MS = 10 * 60 * 1000; // 10 minutes

interface CacheEntry {
  name: string;
  avatarUrl?: string;
  expiresAt: number;
}

const _cache = new Map<string, CacheEntry>();

export function getPublicUserCached(
  id: string,
): { name: string; avatarUrl?: string } | undefined {
  const entry = _cache.get(id);
  if (!entry) return undefined;
  if (Date.now() > entry.expiresAt) {
    _cache.delete(id);
    return undefined;
  }
  return { name: entry.name, avatarUrl: entry.avatarUrl };
}

export function setPublicUserCached(
  id: string,
  data: { name: string; avatarUrl?: string },
): void {
  _cache.set(id, { ...data, expiresAt: Date.now() + TTL_MS });
}

/** Pre-fill the cache from any source (e.g. after fetching the public coaches
 *  list) to avoid redundant GET /api/users/{id} calls for known coaches. */
export function seedPublicUserCache(
  entries: Array<{ id: string; name: string; avatarUrl?: string }>,
): void {
  const exp = Date.now() + TTL_MS;
  for (const e of entries) {
    if (!_cache.has(e.id)) {
      _cache.set(e.id, { name: e.name, avatarUrl: e.avatarUrl, expiresAt: exp });
    }
  }
}
