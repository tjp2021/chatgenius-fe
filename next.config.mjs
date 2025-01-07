import { fileURLToPath } from 'url';

/** @type {import('next').NextConfig} */
const nextConfig = {
  // ... your other config
  webpack: (config) => {
    config.resolve.alias = {
      ...config.resolve.alias,
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    };
    return config;
  },
};

export default nextConfig; 