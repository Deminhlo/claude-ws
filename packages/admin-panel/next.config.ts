import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  reactStrictMode: true,
  serverExternalPackages: ['better-sqlite3', 'dockerode'],
  env: {
    ADMIN_PORT: '3001',
  },
};

export default nextConfig;
