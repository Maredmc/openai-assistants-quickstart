import type { Metadata } from 'next'
import { Montserrat } from 'next/font/google'
import './globals.css'
import { Analytics } from '@vercel/analytics/next'

const montserrat = Montserrat({ 
  subsets: ['latin'],
  display: 'swap',
  weight: ['300', '400', '500', '600', '700']
})

export const metadata: Metadata = {
  title: 'Assistente Letti AI - Il tuo consulente per il riposo perfetto',
  description: 'Trova il letto perfetto con l\'aiuto del nostro assistente AI. Consigli personalizzati su misure, materassi, stili e molto altro.',
  keywords: ['letti', 'materassi', 'arredamento', 'camera da letto', 'consulenza letti', 'AI'],
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="it">
      <body className={montserrat.className}>
        {children}
        <Analytics />
      </body>
    </html>
  )
}
