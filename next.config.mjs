import { fileURLToPath } from 'url';

/** @type {import('next').NextConfig} */
const nextConfig = {
  typescript: {
    ignoreBuildErrors: false,
  },
  eslint: {
    ignoreDuringBuilds: false,
  },
  webpack: (config) => {
    config.resolve.alias = {
      ...config.resolve.alias,
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    };
    return config;
  },
};

export default nextConfig; 