/**
 * Client IP for rate limiting. Only trust proxy headers when TRUST_PROXY=true
 * (set behind a reverse proxy you control, e.g. nginx, Cloudflare, Vercel).
 */
export function getClientIp(request) {
  if (process.env.TRUST_PROXY === 'true') {
    const xff = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim();
    if (xff) return xff;
    const xri = request.headers.get('x-real-ip');
    if (xri) return xri;
  }
  return 'untrusted';
}
