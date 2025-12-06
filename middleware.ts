import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Rediriger les requêtes vers /uploads/ vers l'API
  if (pathname.startsWith('/uploads/')) {
    const uploadPath = pathname.replace('/uploads/', '')
    return NextResponse.rewrite(
      new URL(`/api/uploads/${uploadPath}`, request.url)
    )
  }

  // Rediriger les requêtes vers /data/ vers l'API
  if (pathname.startsWith('/data/')) {
    const dataPath = pathname.replace('/data/', '')
    return NextResponse.rewrite(
      new URL(`/api/data/${dataPath}`, request.url)
    )
  }

  // Rediriger les requêtes vers /icons/ vers l'API
  if (pathname.startsWith('/icons/')) {
    const iconPath = pathname.replace('/icons/', '')
    return NextResponse.rewrite(
      new URL(`/api/icons/${iconPath}`, request.url)
    )
  }

  // Rediriger /manifest.json vers l'API
  if (pathname === '/manifest.json') {
    return NextResponse.rewrite(
      new URL('/api/manifest.json', request.url)
    )
  }

  // Rediriger /sw.js vers l'API
  if (pathname === '/sw.js') {
    return NextResponse.rewrite(
      new URL('/api/sw.js', request.url)
    )
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/uploads/:path*', '/data/:path*', '/icons/:path*', '/manifest.json', '/sw.js'],
}

