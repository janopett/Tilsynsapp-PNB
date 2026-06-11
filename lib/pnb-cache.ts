// Shared write-invalidation helpers for client-side PNB caches.
//
// Pattern: caches have a long fallback TTL (30 min) for external changes,
// but are invalidated immediately when the app performs a write (e.g. archival).
// DashboardClient and PnbCaseDetailPage both check the dirty timestamp on read.

export const PNB_CACHE_FALLBACK_TTL = 30 * 60 * 1000; // 30 min safety-net

const DIRTY_KEY = "pnb_cache_dirty_ts";

/** Call after any write that changes PNB data visible in the app (e.g. archival). */
export function markPnbCacheDirty(): void {
  try {
    localStorage.setItem(DIRTY_KEY, String(Date.now()));
  } catch {
    /* storage unavailable */
  }
}

/** Returns true if a write happened after the cache was saved. */
export function isPnbCacheDirty(cacheTs: number): boolean {
  try {
    const raw = localStorage.getItem(DIRTY_KEY);
    return raw !== null && Number(raw) > cacheTs;
  } catch {
    return false;
  }
}
