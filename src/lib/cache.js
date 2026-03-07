/**
 * Simple in-memory cache for API responses
 * Reduces database load by caching frequently accessed data
 */

class SimpleCache {
  constructor() {
    this.cache = new Map();
    this.timers = new Map();
  }

  /**
   * Get cached data if it exists and is not expired
   * @param {string} key - Cache key
   * @returns {any|null} - Cached data or null if not found/expired
   */
  get(key) {
    const cached = this.cache.get(key);
    if (!cached) return null;

    const now = Date.now();
    if (now - cached.timestamp > cached.ttl) {
      // Expired - remove from cache
      this.delete(key);
      return null;
    }

    return cached.data;
  }

  /**
   * Set data in cache with TTL
   * @param {string} key - Cache key
   * @param {any} data - Data to cache
   * @param {number} ttl - Time to live in milliseconds
   */
  set(key, data, ttl) {
    // Clear existing timer if any
    if (this.timers.has(key)) {
      clearTimeout(this.timers.get(key));
    }

    // Store data
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl,
    });

    // Set auto-cleanup timer
    const timer = setTimeout(() => {
      this.delete(key);
    }, ttl);

    this.timers.set(key, timer);
  }

  /**
   * Delete cached data
   * @param {string} key - Cache key
   */
  delete(key) {
    this.cache.delete(key);
    
    if (this.timers.has(key)) {
      clearTimeout(this.timers.get(key));
      this.timers.delete(key);
    }
  }

  /**
   * Clear all cached data
   */
  clear() {
    // Clear all timers
    for (const timer of this.timers.values()) {
      clearTimeout(timer);
    }
    
    this.cache.clear();
    this.timers.clear();
  }

  /**
   * Get cache statistics
   */
  getStats() {
    return {
      size: this.cache.size,
      keys: Array.from(this.cache.keys()),
    };
  }
}

// Create singleton instance
const cache = new SimpleCache();

// Cache TTL constants (in milliseconds)
export const CACHE_TTL = {
  DASHBOARD: 5 * 60 * 1000,      // 5 minutes
  PRODUCTS: 10 * 60 * 1000,      // 10 minutes
  CUSTOMERS: 5 * 60 * 1000,      // 5 minutes
  ANALYTICS: 15 * 60 * 1000,     // 15 minutes
  REPORTS: 10 * 60 * 1000,       // 10 minutes
  SHORT: 2 * 60 * 1000,          // 2 minutes
  MEDIUM: 5 * 60 * 1000,         // 5 minutes
  LONG: 15 * 60 * 1000,          // 15 minutes
};

export default cache;
