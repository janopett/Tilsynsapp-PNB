/**
 * Tests for the write-invalidation PNB cache helpers.
 * Uses jsdom localStorage (available by default in the jest test environment).
 */
import { isPnbCacheDirty, markPnbCacheDirty, PNB_CACHE_FALLBACK_TTL } from "@/lib/pnb-cache";

beforeEach(() => {
  localStorage.clear();
  jest.useFakeTimers();
});

afterEach(() => {
  jest.useRealTimers();
});

describe("PNB_CACHE_FALLBACK_TTL", () => {
  it("is 30 minutes in milliseconds", () => {
    expect(PNB_CACHE_FALLBACK_TTL).toBe(30 * 60 * 1000);
  });
});

describe("markPnbCacheDirty", () => {
  it("writes current timestamp to localStorage", () => {
    jest.setSystemTime(new Date("2025-01-01T12:00:00Z"));
    markPnbCacheDirty();
    const stored = localStorage.getItem("pnb_cache_dirty_ts");
    expect(stored).toBe(String(new Date("2025-01-01T12:00:00Z").getTime()));
  });

  it("overwrites a previous dirty timestamp", () => {
    jest.setSystemTime(new Date("2025-01-01T12:00:00Z"));
    markPnbCacheDirty();
    jest.setSystemTime(new Date("2025-01-01T13:00:00Z"));
    markPnbCacheDirty();
    const stored = localStorage.getItem("pnb_cache_dirty_ts");
    expect(stored).toBe(String(new Date("2025-01-01T13:00:00Z").getTime()));
  });
});

describe("isPnbCacheDirty", () => {
  it("returns false when no dirty key exists", () => {
    expect(isPnbCacheDirty(Date.now())).toBe(false);
  });

  it("returns true when dirty timestamp is newer than cache", () => {
    const cacheTs = new Date("2025-01-01T12:00:00Z").getTime();
    jest.setSystemTime(new Date("2025-01-01T12:05:00Z"));
    markPnbCacheDirty(); // dirty at 12:05, cache was saved at 12:00
    expect(isPnbCacheDirty(cacheTs)).toBe(true);
  });

  it("returns false when dirty timestamp is older than cache", () => {
    jest.setSystemTime(new Date("2025-01-01T11:55:00Z"));
    markPnbCacheDirty(); // dirty at 11:55
    const cacheTs = new Date("2025-01-01T12:00:00Z").getTime(); // cache saved at 12:00
    expect(isPnbCacheDirty(cacheTs)).toBe(false);
  });

  it("returns false when dirty timestamp equals cache timestamp", () => {
    const ts = new Date("2025-01-01T12:00:00Z").getTime();
    jest.setSystemTime(ts);
    markPnbCacheDirty();
    expect(isPnbCacheDirty(ts)).toBe(false);
  });
});
