/** @type {import('next').NextConfig} */
const nextConfig = {
  // Disable static optimization for dynamic routes
  experimental: {
    serverActions: {
      bodySizeLimit: '2mb',
    },
  },
  
  // Add headers to prevent caching issues
  async headers() {
    return [
      {
        source: '/api/:path*',
        headers: [
          { key: 'Cache-Control', value: 'no-store, must-revalidate' },
          { key: 'CDN-Cache-Control', value: 'no-store' },
          { key: 'Vercel-CDN-Cache-Control', value: 'no-store' },
        ],
      },
    ];
  },
};

export default nextConfig;
