import { Geist, Geist_Mono } from "next/font/google"
import "./globals.css"

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] })
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] })

export const metadata = {
  title: "StayScape — Work · Life · Balance",
  description: "บันทึกงาน วิเคราะห์ด้วย AI จัดการชีวิตการทำงานอย่างสมดุล",
  keywords: "worklog, AI, productivity, stayscape, freelance",
  openGraph: {
    title: "StayScape",
    description: "Work · Life · Balance — AI-powered work journal",
    type: "website",
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
      <head>
        <link rel="icon" href="/favicon.svg" type="image/svg+xml"/>
        <meta name="apple-mobile-web-app-capable" content="yes"/>
        <meta name="apple-mobile-web-app-status-bar-style" content="default"/>
        <meta name="apple-mobile-web-app-title" content="StayScape"/>
      </head>
      <body className={`${geistSans.variable} ${geistMono.variable}`} style={{ overflowX:'hidden', maxWidth:'100vw' }}>
        {children}
      </body>
    </html>
  )
}
