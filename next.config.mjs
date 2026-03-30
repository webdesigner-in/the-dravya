/** @type {import('next').NextConfig} */
const nextConfig = {
  // Disable static optimization for dynamic routes
  experimental: {
    serverActions: {
      bodySizeLimit: '2mb',
    },
  },
  
  // Security and cache headers
  async headers() {
    return [
      {
        // Apply security headers to all routes
        source: '/:path*',
        headers: [
          // Prevent clickjacking attacks
          { 
            key: 'X-Frame-Options', 
            value: 'DENY' 
          },
          // Prevent MIME type sniffing
          { 
            key: 'X-Content-Type-Options', 
            value: 'nosniff' 
          },
          // Enable XSS protection
          { 
            key: 'X-XSS-Protection', 
            value: '1; mode=block' 
          },
          // Enforce HTTPS (only in production)
          ...(process.env.NODE_ENV === 'production' ? [{
            key: 'Strict-Transport-Security',
            value: 'max-age=31536000; includeSubDomains; preload'
          }] : []),
          // Control referrer information
          { 
            key: 'Referrer-Policy', 
            value: 'strict-origin-when-cross-origin' 
          },
          // Restrict feature access
          { 
            key: 'Permissions-Policy', 
            value: 'camera=(), microphone=(), geolocation=(), interest-cohort=()' 
          },
        ],
      },
      {
        // API-specific headers
        source: '/api/:path*',
        headers: [
          // Prevent caching of API responses
          { 
            key: 'Cache-Control', 
            value: 'no-store, must-revalidate' 
          },
          { 
            key: 'CDN-Cache-Control', 
            value: 'no-store' 
          },
          { 
            key: 'Vercel-CDN-Cache-Control', 
            value: 'no-store' 
          },
          // CORS configuration
          { 
            key: 'Access-Control-Allow-Origin', 
            value: process.env.NODE_ENV === 'production' 
              ? process.env.NEXT_PUBLIC_APP_URL || 'https://yourdomain.com'
              : 'http://localhost:3000'
          },
          { 
            key: 'Access-Control-Allow-Methods', 
            value: 'GET, POST, PUT, DELETE, OPTIONS' 
          },
          { 
            key: 'Access-Control-Allow-Headers', 
            value: 'Content-Type, Authorization' 
          },
          { 
            key: 'Access-Control-Allow-Credentials', 
            value: 'true' 
          },
        ],
      },
    ];
  },
};

export default nextConfig;
