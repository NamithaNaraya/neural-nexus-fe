/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: false,
  // Enable experimental features for performance
  experimental: {
    optimizePackageImports: ['lucide-react', '@radix-ui/react-icons'],
  },
  transpilePackages: ['three', '@react-three/fiber', '@react-three/drei', '@react-three/postprocessing', 'postprocessing'],
  // Environment variables exposed to the browser
  env: {
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000',
    NEXT_PUBLIC_WS_URL: process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:8000',
  },
  // Image optimization
  images: {
    domains: ['localhost'],
  },
  // Webpack configuration for Three.js
  webpack: (config) => {
    config.externals = [...(config.externals || []), { canvas: 'canvas' }];
    return config;
  },
  // Proxy API requests to backend
  async rewrites() {
      return [
          {
              source: '/api/v1/:path*',
              destination: 'http://127.0.0.1:8000/api/v1/:path*',
          },
      ];
  },
};

module.exports = nextConfig;
