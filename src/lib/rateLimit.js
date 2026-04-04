/**
 * MongoDB-backed rate limiter — works correctly across all serverless instances.
 *
 * Uses a fixed-window strategy backed by a MongoDB collection with a TTL index
 * so old documents are automatically removed.  The upsert+$inc pattern is
 * atomic and avoids race conditions between concurrent requests.
 */
import connectDB from './mongodb';
import RateLimit from '@/models/RateLimit';

/**
 * Check (and record) a rate-limit hit for the given key.
 *
 * @param {string} key       - Identifier, e.g. an IP address or "login:1.2.3.4"
 * @param {number} limit     - Max requests allowed per window (default 100)
 * @param {number} windowMs  - Window duration in ms (default 60 000 = 1 min)
 * @returns {{ allowed: boolean, remaining: number, resetAt: Date }}
 */
export async function checkRateLimit(key, limit = 100, windowMs = 60_000) {
  try {
    await connectDB();

    const now = Date.now();
    const windowStart = new Date(Math.floor(now / windowMs) * windowMs);
    // Keep the document alive for two full windows so TTL cleanup isn't aggressive
    const expireAt = new Date(windowStart.getTime() + windowMs * 2);
    const resetAt  = new Date(windowStart.getTime() + windowMs);

    const doc = await RateLimit.findOneAndUpdate(
      { key, windowStart },
      {
        $inc:         { count: 1 },
        $setOnInsert: { expireAt },
      },
      { upsert: true, returnDocument: 'after' }
    );

    return {
      allowed:   doc.count <= limit,
      remaining: Math.max(0, limit - doc.count),
      resetAt,
    };
  } catch (err) {
    console.error('[RateLimit] check failed:', err.message);
    const resetAt = new Date(Date.now() + windowMs);
    return { allowed: false, remaining: 0, resetAt };
  }
}

/**
 * Higher-order function that wraps an API route handler with rate limiting.
 *
 * @param {Function} handler  - Next.js route handler
 * @param {{ limit?: number, window?: number }} options
 */
export function withRateLimit(handler, options = {}) {
  const { limit = 100, window: windowMs = 60_000 } = options;

  return async (request, context) => {
    const ip =
      request.headers.get('x-forwarded-for')?.split(',')[0].trim() ||
      request.headers.get('x-real-ip') ||
      'unknown';

    const result = await checkRateLimit(ip, limit, windowMs);

    if (!result.allowed) {
      const retryAfter = Math.ceil((result.resetAt.getTime() - Date.now()) / 1000);
      return new Response(
        JSON.stringify({ error: 'Too many requests', retryAfter }),
        {
          status: 429,
          headers: {
            'Content-Type':        'application/json',
            'X-RateLimit-Limit':   String(limit),
            'X-RateLimit-Remaining': '0',
            'X-RateLimit-Reset':   String(result.resetAt.getTime()),
            'Retry-After':         String(retryAfter),
          },
        }
      );
    }

    const response = await handler(request, context);
    response.headers.set('X-RateLimit-Limit',     String(limit));
    response.headers.set('X-RateLimit-Remaining', String(result.remaining));
    response.headers.set('X-RateLimit-Reset',     String(result.resetAt.getTime()));
    return response;
  };
}

export default { checkRateLimit };
