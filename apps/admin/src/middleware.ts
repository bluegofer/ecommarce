// apps/admin/src/middleware.ts
//
// F-11 (step-15.9): the admin middleware previously had AUTH_ENABLED = false,
// which allowed unauthenticated users to reach the dashboard shell (only API
// calls were blocked). Now enforced at the HTTP level: any non-public route
// without a session cookie redirects to /login with ?next= preserved.
//
// The session cookie is the SAME rotating refresh cookie the storefront uses
// (refresh_token), because both apps share the parent domain and the API
// only issues one refresh cookie. Full authorization (roles, TOTP-enrolled)
// is enforced server-side by API guards; this middleware is the shell gate.
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const PUBLIC_PATHS = ['/login'];
const SESSION_COOKIE = 'refresh_token';

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const isPublic = PUBLIC_PATHS.some((p) => pathname.startsWith(p));
  if (isPublic) return NextResponse.next();

  const hasSession = request.cookies.has(SESSION_COOKIE);
  if (!hasSession) {
    const url = request.nextUrl.clone();
    url.pathname = '/login';
    url.searchParams.set('next', pathname);
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};