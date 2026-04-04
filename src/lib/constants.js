/**
 * Application-wide constants
 * Centralized configuration for timeouts, limits, and other magic numbers
 */

// Database Query Limits
export const QUERY_LIMITS = {
  DEFAULT_PAGE_SIZE: 20,        // Default pagination size
  SEARCH_RESULTS: 50,            // Search result limit
  DROPDOWN_OPTIONS: 100,         // Dropdown/select options limit
  DASHBOARD_RECENT: 10,          // Recent items on dashboard
  DASHBOARD_PENDING: 20,         // Pending items on dashboard
  DASHBOARD_OVERDUE: 20,         // Overdue items on dashboard
};

// Database Query Timeouts (in milliseconds)
export const QUERY_TIMEOUTS = {
  FAST: 3000,           // Simple queries (counts, single document)
  NORMAL: 5000,         // Standard queries with basic joins
  MODERATE: 8000,       // Queries with multiple joins
  SLOW: 10000,          // Complex queries with aggregations
  COMPLEX: 20000,       // Very complex aggregations
  AGGREGATION: 25000,   // Heavy aggregation pipelines
};

// UI Debounce Delays (in milliseconds)
export const DEBOUNCE_DELAYS = {
  SEARCH: 500,          // Search input debounce
  AUTOCOMPLETE: 300,    // Autocomplete debounce
  RESIZE: 150,          // Window resize debounce
};

// Rate Limiting
export const RATE_LIMITS = {
  LOGIN_ATTEMPTS: 10,
  LOGIN_WINDOW_MS: 60 * 1000,
  REGISTER_ATTEMPTS: 5,
  REGISTER_WINDOW_MS: 60 * 1000,
  /** Global API requests per IP per window (proxy layer) */
  API_GLOBAL_ATTEMPTS: 200,
  API_GLOBAL_WINDOW_MS: 60 * 1000,
};

// Token Expiration
export const TOKEN_EXPIRY = {
  ACCESS_TOKEN_HOURS: 24,       // 24 hours
  ACCESS_TOKEN_MS: 24 * 60 * 60 * 1000,
};

// Scroll Restoration
export const SCROLL_CONFIG = {
  DEBOUNCE_MS: 150,             // Debounce scroll position save
  RESTORE_DELAY_MS: 100,        // Delay before restoring scroll
};

// File Upload
export const UPLOAD_LIMITS = {
  MAX_FILE_SIZE_MB: 10,         // Maximum file size in MB
  MAX_FILE_SIZE_BYTES: 10 * 1024 * 1024,
};

// Pagination
export const PAGINATION = {
  SCROLL_THRESHOLD: 200,        // Pixels from bottom to trigger load more
};
