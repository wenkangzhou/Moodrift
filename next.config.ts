import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
      },
      {
        protocol: 'http',
        hostname: '*.music.126.net',
      },
      {
        protocol: 'https',
        hostname: '*.music.126.net',
      },
    ],
  },
};

export default nextConfig;
