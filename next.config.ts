import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  devIndicators: false,
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**',
      },
      {
        protocol: 'http',
        hostname: '**',
      },
    ],
    // Don't optimize external favicon URLs
    unoptimized: process.env.NODE_ENV === 'development',
  },
  // Suppress favicon fetch errors in development
  onDemandEntries: {
    maxInactiveAge: 60 * 1000, // Increased to 60 seconds to prevent page disposal when switching tabs
    pagesBufferLength: 5, // Increased buffer to keep more pages in memory
  },
};

export default nextConfig;
