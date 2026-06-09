import { Geist, Geist_Mono } from "next/font/google"
import "./globals.css"

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] })
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] })

const SITE_URL = process.env.NEXT_PUBLIC_APP_URL || "https://worklog-app-virid.vercel.app"
const SITE_NAME = "StayScape"
const SITE_DESC = "AI Work Management Platform"

export const metadata = {
  metadataBase: new URL(SITE_URL),
  title: { default: SITE_NAME, template: `%s · ${SITE_NAME}` },
  description: SITE_DESC,
  applicationName: SITE_NAME,
  manifest: "/manifest.json",
  keywords: [
    "StayScape", "AI work management", "worklog", "productivity",
    "task management", "work journal", "บันทึกงาน", "จัดการงาน", "freelance",
  ],
  authors: [{ name: SITE_NAME }],
  creator: SITE_NAME,
  publisher: SITE_NAME,
  alternates: { canonical: "/" },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
      "max-video-preview": -1,
    },
  },
  // App Router file conventions (app/favicon.ico, app/icon.png, app/apple-icon.png)
  // auto-generate the icon <link> tags — no manual icons map needed.
  openGraph: {
    type: "website",
    siteName: SITE_NAME,
    title: SITE_NAME,
    description: SITE_DESC,
    url: SITE_URL,
    locale: "th_TH",
    images: [
      { url: "/og-image.jpg?v=2", width: 1200, height: 630, alt: `${SITE_NAME} — ${SITE_DESC}`, type: "image/jpeg" },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: SITE_NAME,
    description: SITE_DESC,
    images: ["/og-image.jpg?v=2"],
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: SITE_NAME,
  },
}

export const viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  viewportFit: "cover",
  themeColor: "#6C63FF",
}

export default function RootLayout({ children }) {
  return (
    <html lang="th">
      <body className={`${geistSans.variable} ${geistMono.variable}`} style={{ overflowX: "hidden", maxWidth: "100vw" }}>
        {children}
      </body>
    </html>
  )
}
