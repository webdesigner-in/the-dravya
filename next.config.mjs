if (process.env.NODE_ENV === 'production') {
  const origin = process.env.NEXT_PUBLIC_APP_URL?.trim();
  if (!origin) {
    throw new Error(
      'NEXT_PUBLIC_APP_URL is required in production (your exact public origin, e.g. https://app.example.com)'
    );
  }
}

const corsOrigin =
  process.env.NODE_ENV === 'production'
    ? process.env.NEXT_PUBLIC_APP_URL.trim()
    : 'http://localhost:3000';

/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverActions: {
      bodySizeLimit: '2mb',
    },
  },

  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          {
            key: 'X-XSS-Protection',
            value: '1; mode=block',
          },
          ...(process.env.NODE_ENV === 'production'
            ? [
                {
                  key: 'Strict-Transport-Security',
                  value: 'max-age=31536000; includeSubDomains; preload',
                },
              ]
            : []),
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin',
          },
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(), geolocation=(), interest-cohort=()',
          },
        ],
      },
      {
        source: '/api/:path*',
        headers: [
          { key: 'Cache-Control', value: 'no-store, must-revalidate' },
          { key: 'CDN-Cache-Control', value: 'no-store' },
          { key: 'Vercel-CDN-Cache-Control', value: 'no-store' },
          { key: 'Access-Control-Allow-Origin', value: corsOrigin },
          {
            key: 'Access-Control-Allow-Methods',
            value: 'GET, POST, PUT, DELETE, OPTIONS',
          },
          {
            key: 'Access-Control-Allow-Headers',
            value: 'Content-Type, Authorization',
          },
          { key: 'Access-Control-Allow-Credentials', value: 'true' },
        ],
      },
    ];
  },
};

export default nextConfig;
