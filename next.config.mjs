/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    optimizePackageImports: ['lucide-react', 'recharts'],
  },
  allowedDevOrigins: ['192.168.1.29'],
  devIndicators: false,
  async headers() {
    return [
      {
        source: '/downloads/:path*',
        headers: [
          { key: 'Content-Disposition', value: 'attachment' },
          { key: 'Cache-Control', value: 'no-store, max-age=0' }
        ]
      }
    ];
  },
};

export default nextConfig;
