/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  output: 'standalone',
  images: {
    domains: ['mt1.google.com'],
  },
};

module.exports = nextConfig;
