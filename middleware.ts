import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl

  // Public paths that don't require auth
  const PUBLIC_PATHS = [
    '/',
    '/panel', // login/landing del panel
    '/api/login',
    '/api/logout',
    '/favicon.ico',
    '/checkout',
  ]

  const isPublic =
    PUBLIC_PATHS.includes(pathname) ||
    pathname.startsWith('/products') ||
    pathname.startsWith('/_next') ||
    pathname.startsWith('/public') ||
    pathname.startsWith('/.well-known') ||
    pathname.startsWith('/api/') || // allow API; secure sensitive ones separately if needed
    /\.[^/]+$/.test(pathname) // allow static assets like .png, .jpg, .svg, .css, .js, fonts, etc.

  // Proteger rutas de panel excepto la raíz '/panel'
  const needsAuth = (!isPublic) || (pathname.startsWith('/panel') && pathname !== '/panel')
  if (needsAuth) {
    const session = req.cookies.get('session')?.value
    if (!session) {
      const url = req.nextUrl.clone()
      url.pathname = '/panel'
      return NextResponse.redirect(url)
    }
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/:path*'],
}
