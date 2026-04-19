import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'NullIsland',
  description: "AI-powered mymizu coverage gap analysis for Tokyo's 23 wards",
  icons: { icon: '💧' },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="h-full">
      <body className="h-full bg-bg-base text-text-primary">{children}</body>
    </html>
  )
}
