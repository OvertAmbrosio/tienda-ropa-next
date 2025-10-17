import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl

  // Public paths that don't require auth
  const PUBLIC_PATHS = [
    '/',
    '/admin',
    '/api/login',
    '/api/logout',
    '/favicon.ico',
    '/checkout',
  ]

  const isPublic =
    PUBLIC_PATHS.includes(pathname) ||
    pathname.startsWith('/_next') ||
    pathname.startsWith('/public') ||
    pathname.startsWith('/.well-known') ||
    pathname.startsWith('/api/') || // allow API; secure sensitive ones separately if needed
    /\.[^/]+$/.test(pathname) // allow static assets like .png, .jpg, .svg, .css, .js, fonts, etc.

  if (!isPublic) {
    const session = req.cookies.get('session')?.value
    if (!session) {
      const url = req.nextUrl.clone()
      url.pathname = '/admin'
      return NextResponse.redirect(url)
    }
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/:path*'],
}
