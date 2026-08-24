/** @type {import('next').NextConfig} */
const defaultRuntimeCaching = require('next-pwa/cache');
const runtimeCaching = [
  {
    urlPattern: /^https:\/\/api\.sancan\.ru\/api\/seller\/promotion(?:\?|$)/i,
    handler: 'NetworkOnly',
    method: 'GET',
  },
  ...defaultRuntimeCaching,
];
const { i18n } = require('./next-i18next.config');
const withPWA = require('next-pwa')({
  disable: process.env.NODE_ENV === 'development',
  dest: 'public',
  skipWaiting: true,
  clientsClaim: true,
  runtimeCaching,
});

module.exports = withPWA({
  reactStrictMode: true,
  i18n,
  images: {
    // Allow displaying images from any external host by disabling optimization
    // This prevents runtime errors when imported products reference remote URLs
    unoptimized: true,
    domains: [
      'via.placeholder.com',
      'res.cloudinary.com',
      's3.amazonaws.com',
      '127.0.0.1',
      'localhost', 
      '91.198.220.110',
      'sancan.ru', 
      'picsum.photos',
      'pixarlaravel.s3.ap-southeast-1.amazonaws.com',
      'pickbazarlaravel.s3.ap-southeast-1.amazonaws.com',
      'lh3.googleusercontent.com',
      's3.twcstorage.ru', // Timeweb S3 (legacy URLs in DB)
      'img.sancan.ru', // CDN custom domain (optional)
      'nqx1cwsokx.cdn.twcstorage.ru', // Timeweb CDN
      'svetlanashtefan.com', // временно для импортированных товаров
    ],
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 's3.twcstorage.ru',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'img.sancan.ru',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'nqx1cwsokx.cdn.twcstorage.ru',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'svetlanashtefan.com',
        pathname: '/**',
      },
    ],
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
});
