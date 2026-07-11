import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    serverActions: {
      bodySizeLimit: '50mb'
    }
  },
  async rewrites() {
    return [
      {
        source: '/favicon.ico',
        destination: '/api/icon',
      },
    ]
  }
};

export default nextConfig;
