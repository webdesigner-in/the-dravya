/**
 * Cache module — serverless-safe no-op implementation.
 *
 * The previous Map-based in-memory cache was silently broken on Vercel and any
 * other multi-instance serverless platform: every cold-started function got its
 * own isolated heap, so every instance was a cache miss and rate-limit counts
 * were per-instance rather than global.
 *
 * This no-op shim keeps the same interface so every call site continues to
 * compile.  All get() calls return null (always fetch fresh from MongoDB) and
 * set()/delete()/clear() are harmless no-ops.
 *
 * To add real cross-instance caching later, swap this out for a Redis client
 * (e.g. ioredis / @upstash/redis) — every caller already uses this interface.
 */

const cache = {
  get: () => null,
  set: () => undefined,
  delete: () => undefined,
  clear: () => undefined,
  getStats: () => ({ size: 0, keys: [] }),
};

/** TTL constants kept for backward-compat; unused by the no-op but may be
 *  referenced by callers for documentation purposes. */
export const CACHE_TTL = {
  DASHBOARD: 5 * 60 * 1000,
  PRODUCTS: 10 * 60 * 1000,
  CUSTOMERS: 5 * 60 * 1000,
  ANALYTICS: 15 * 60 * 1000,
  REPORTS: 10 * 60 * 1000,
  SHORT: 2 * 60 * 1000,
  MEDIUM: 5 * 60 * 1000,
  LONG: 15 * 60 * 1000,
};

export default cache;
