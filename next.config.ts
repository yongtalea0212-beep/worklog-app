/** @type {import('next').NextConfig} */
const nextConfig = {
  // Disable Turbopack — use Webpack instead (more stable)
  experimental: {
    turbo: false,
  },
}

module.exports = nextConfig
