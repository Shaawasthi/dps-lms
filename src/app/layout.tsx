import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'DPS LMS',
  description: 'Delhi Public School Learning Management System',
  icons: {
    icon: '/dps-logo.png',
    shortcut: '/dps-logo.png',
    apple: '/dps-logo.png',
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className="bg-gray-50 text-gray-900">{children}</body>
    </html>
  )
}
