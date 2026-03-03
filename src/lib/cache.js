/**
 * Simple in-memory cache for API responses
 * In production, consider using Redis or similar
 */

class Cache {
  constructor() {
    this.cache = new Map();
    this.timestamps = new Map();
  }

  set(key, value, ttl = 300000) { // Default 5 minutes
    this.cache.set(key, value);
    this.timestamps.set(key, Date.now() + ttl);
  }

  get(key) {
    const timestamp = this.timestamps.get(key);
    
    if (!timestamp || Date.now() > timestamp) {
      this.delete(key);
      return null;
    }
    
    return this.cache.get(key);
  }

  delete(key) {
    this.cache.delete(key);
    this.timestamps.delete(key);
  }

  clear() {
    this.cache.clear();
    this.timestamps.clear();
  }

  has(key) {
    const timestamp = this.timestamps.get(key);
    
    if (!timestamp || Date.now() > timestamp) {
      this.delete(key);
      return false;
    }
    
    return this.cache.has(key);
  }
}

// Global cache instance
const cache = new Cache();

export default cache;

/**
 * Cache decorator for API routes
 */
export function withCache(handler, options = {}) {
  const { ttl = 300000, keyGenerator } = options;

  return async (request, context) => {
    const cacheKey = keyGenerator 
      ? keyGenerator(request, context)
      : request.url;

    // Check cache
    const cached = cache.get(cacheKey);
    if (cached) {
      return new Response(JSON.stringify(cached), {
        headers: {
          'Content-Type': 'application/json',
          'X-Cache': 'HIT',
        },
      });
    }

    // Execute handler
    const response = await handler(request, context);
    
    // Cache successful responses
    if (response.ok) {
      const data = await response.clone().json();
      cache.set(cacheKey, data, ttl);
    }

    return response;
  };
}

/**
 * Invalidate cache by pattern
 */
export function invalidateCache(pattern) {
  const keys = Array.from(cache.cache.keys());
  
  keys.forEach(key => {
    if (key.includes(pattern)) {
      cache.delete(key);
    }
  });
}
