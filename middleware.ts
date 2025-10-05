import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl

  // Public paths that don't require auth
  const PUBLIC_PATHS = [
    '/',
    '/api/login',
    '/api/logout',
    '/favicon.ico',
  ]

  const isPublic =
    PUBLIC_PATHS.includes(pathname) ||
    pathname.startsWith('/_next') ||
    pathname.startsWith('/public') ||
    pathname.startsWith('/.well-known') ||
    pathname.startsWith('/api/') // allow API; secure sensitive ones separately if needed

  if (!isPublic) {
    const session = req.cookies.get('session')?.value
    if (!session) {
      const url = req.nextUrl.clone()
      url.pathname = '/'
      return NextResponse.redirect(url)
    }
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/:path*'],
}
