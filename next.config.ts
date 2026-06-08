import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  // pdf-parse pulls in pdfjs-dist (legacy) which must run as a Node external,
  // not be bundled, so PDF text extraction works in the serverless route.
  serverExternalPackages: ['pdf-parse'],
}

export default nextConfig
