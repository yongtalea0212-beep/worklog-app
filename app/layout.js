import MobileNav from '@/app/components/MobileNav'

export default function RootLayout({ children }) {
  return (
    <html lang="th">
      <body>
        <div className="app-layout">
          {/* Sidebar — ซ่อนบน mobile */}
          <aside className="sidebar desktop-only">
            {/* sidebar เดิม */}
          </aside>

          {/* Main content */}
          <main className="main-content">
            {children}
          </main>
        </div>

        {/* Mobile nav — แสดงเฉพาะ mobile */}
        <div className="mobile-only">
          <MobileNav />
        </div>
      </body>
    </html>
  )
}