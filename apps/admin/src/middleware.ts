import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

/**
 * Admin auth guard (placeholder).
 *
 * Full auth wiring (TOTP + JWT refresh cookie) arrives at the end of Step 12
 * after we port the storefront AuthProvider pattern. For now this middleware:
 *   - allows /login and static assets through
 *   - allows everything else (so dev iteration is not blocked)
 *
 * TODO(Step 12 auth task): replace `false` with real refresh-cookie check.
 */
const AUTH_ENABLED = false;
const PUBLIC_PATHS = ['/login'];

export function middleware(request: NextRequest) {
  if (!AUTH_ENABLED) return NextResponse.next();

  const { pathname } = request.nextUrl;
  const isPublic = PUBLIC_PATHS.some((p) => pathname.startsWith(p));

  if (isPublic) return NextResponse.next();

  const hasSession = request.cookies.has('admin_refresh');
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