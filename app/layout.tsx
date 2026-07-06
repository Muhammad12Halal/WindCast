import type { Metadata, Viewport } from 'next'
import { Inter, Space_Mono } from 'next/font/google'
import Navbar from './components/Navbar'
import './globals.css'

const inter = Inter({
  variable: '--font-inter',
  subsets: ['latin'],
})

const spaceMono = Space_Mono({
  variable: '--font-space-mono',
  subsets: ['latin'],
  weight: ['400', '700'],
})

export const metadata: Metadata = {
  title: 'Wind Profile - Melaka State',
  description: 'Real-time wind monitoring dashboard for Melaka State sensor network',
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: '#0a0e27',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" className={`${inter.variable} ${spaceMono.variable} h-full`}>
      <body className="min-h-full flex flex-col bg-background text-foreground antialiased">
        <Navbar />
        <main className="flex-1 w-full px-4 py-8">{children}</main>
      </body>
    </html>
  )
}
