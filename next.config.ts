import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  // These pull in heavy Node-native deps (pdfjs, fontkit, jszip) that must run
  // as externals rather than be bundled, so server-side PDF/PPTX generation and
  // PDF text extraction work in the serverless route. @napi-rs/canvas supplies
  // the DOMMatrix/Path2D/ImageData globals that pdfjs-dist needs in Node.
  serverExternalPackages: ['pdfjs-dist', '@napi-rs/canvas', 'pptxgenjs', '@react-pdf/renderer'],
  // Ship the Thai font files and the native canvas binary into the LINE webhook
  // function (so report PDFs embed fonts and pdfjs can polyfill DOMMatrix).
  outputFileTracingIncludes: {
    '/api/line/webhook': [
      './public/fonts/**',
      './node_modules/@napi-rs/**',
      // pdfjs dynamically imports its worker at runtime; the tracer can't see
      // that, so force the legacy build (incl. pdf.worker.mjs) into the bundle.
      './node_modules/pdfjs-dist/legacy/build/**',
    ],
  },
}

export default nextConfig
