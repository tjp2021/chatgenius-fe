/** @type {import('next').NextConfig} */
const nextConfig = {
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: 'http://localhost:3001/api/:path*' // NestJS backend URL
      }
    ];
  },
  reactStrictMode: true,
  swcMinify: true,
  // Uncomment and configure if you need to handle specific image domains
  // images: {
  //   domains: ['your-domain.com'],
  // },
};

module.exports = nextConfig; 