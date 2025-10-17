import './globals.css'
import type { Metadata } from 'next'
import Toaster from '@/components/Toaster'

export const metadata: Metadata = {
  title: 'RUSARFI | Catálogo de Ropa',
  description: 'Explora el catálogo de RUSARFI y encuentra tus prendas favoritas al mejor precio.',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="es" suppressHydrationWarning>
      <body className="min-h-screen bg-grid-slate-900/5 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-slate-950 via-slate-900 to-slate-950 text-slate-100 antialiased">
        {children}
        <Toaster />
      </body>
    </html>
  )
}
