import type { Metadata } from 'next'
import './globals.css'
import { Providers } from '@/components/Providers'

export const metadata: Metadata = {
  title: 'ELITE OS | Your Personal Command Center',
  description: 'Cyberpunk personal growth system. Track gym, nutrition, learning, habits, and dominate your goals.',
  keywords: ['personal growth', 'habit tracker', 'gym tracker', 'productivity'],
  icons: { icon: '/favicon.ico' },
  manifest: '/manifest.json',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&family=Space+Grotesk:wght@300;400;500;600;700&display=swap"
          rel="stylesheet"
        />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <meta name="theme-color" content="#DC143C" />
      </head>
      <body className="bg-[#0A0A0A] text-white antialiased">
        <Providers>{children}</Providers>
      </body>
    </html>
  )
}
