/** @type {import('next').NextConfig} */
const nextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'ngrok-skip-browser-warning',
            value: 'true',
          },
        ],
      },
    ]
  },
  experimental: {
    serverActions: {
      allowedOrigins: ['localhost:3000', '*.ngrok-free.app', '*.loca.lt'],
    },
  },
}

export default nextConfig
