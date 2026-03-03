/**
 * Simple in-memory rate limiter
 * In production, use Redis-based rate limiting
 */

class RateLimiter {
  constructor() {
    this.requests = new Map();
  }

  check(identifier, limit = 100, window = 60000) { // 100 requests per minute by default
    const now = Date.now();
    const userRequests = this.requests.get(identifier) || [];
    
    // Remove old requests outside the window
    const validRequests = userRequests.filter(timestamp => now - timestamp < window);
    
    if (validRequests.length >= limit) {
      return {
        allowed: false,
        remaining: 0,
        resetAt: validRequests[0] + window,
      };
    }
    
    // Add current request
    validRequests.push(now);
    this.requests.set(identifier, validRequests);
    
    return {
      allowed: true,
      remaining: limit - validRequests.length,
      resetAt: now + window,
    };
  }

  reset(identifier) {
    this.requests.delete(identifier);
  }

  clear() {
    this.requests.clear();
  }
}

const rateLimiter = new RateLimiter();

export default rateLimiter;

/**
 * Rate limit middleware for API routes
 */
export function withRateLimit(handler, options = {}) {
  const { limit = 100, window = 60000 } = options;

  return async (request, context) => {
    // Use IP address as identifier
    const identifier = request.headers.get('x-forwarded-for') || 
                      request.headers.get('x-real-ip') || 
                      'unknown';

    const result = rateLimiter.check(identifier, limit, window);

    if (!result.allowed) {
      return new Response(
        JSON.stringify({
          error: 'Too many requests',
          retryAfter: Math.ceil((result.resetAt - Date.now()) / 1000),
        }),
        {
          status: 429,
          headers: {
            'Content-Type': 'application/json',
            'X-RateLimit-Limit': limit.toString(),
            'X-RateLimit-Remaining': '0',
            'X-RateLimit-Reset': result.resetAt.toString(),
            'Retry-After': Math.ceil((result.resetAt - Date.now()) / 1000).toString(),
          },
        }
      );
    }

    const response = await handler(request, context);

    // Add rate limit headers to response
    response.headers.set('X-RateLimit-Limit', limit.toString());
    response.headers.set('X-RateLimit-Remaining', result.remaining.toString());
    response.headers.set('X-RateLimit-Reset', result.resetAt.toString());

    return response;
  };
}
