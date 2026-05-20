/** @type {import('next').NextConfig} */
const nextConfig = {
  images: { domains: ['api.dicebear.com', 'avatars.githubusercontent.com'] },
  async rewrites() {
    return [{ source: '/api/:path*', destination: 'http://localhost:3001/api/:path*' }]
  }
}
module.exports = nextConfig
