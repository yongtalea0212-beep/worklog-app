import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  // These pull in heavy Node-native deps (pdfjs, fontkit, jszip) that must run
  // as externals rather than be bundled, so server-side PDF/PPTX generation and
  // PDF text extraction work in the serverless route.
  serverExternalPackages: ['pdfjs-dist', 'pptxgenjs', '@react-pdf/renderer'],
  // Ship the Thai font files into the LINE webhook function so server-side
  // report PDFs can embed them from the filesystem.
  outputFileTracingIncludes: {
    '/api/line/webhook': ['./public/fonts/**'],
  },
}

export default nextConfig
