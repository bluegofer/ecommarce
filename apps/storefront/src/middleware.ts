// apps/storefront/src/middleware.ts
//
// Guest-checkout removal (step-157): cart, checkout, wishlist, and account
// pages require authentication. Unauthenticated users are redirected to
// /signin with ?next= preserving the original path.
//
// Enforcement boundary: HTTP-level cookie check (refresh_token). Full
// authorization is enforced by the API on every /me/* call.
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const PROTECTED_PATTERNS = [
  /^\/(bn|en)\/cart(\/|$)/,
  /^\/(bn|en)\/checkout(\/|$)/,
  /^\/(bn|en)\/wishlist(\/|$)/,
  /^\/(bn|en)\/account(\/|$)/,
];

const SESSION_COOKIE = 'refresh_token';

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const isProtected = PROTECTED_PATTERNS.some((re) => re.test(pathname));
  if (!isProtected) return NextResponse.next();

  const hasSession = request.cookies.has(SESSION_COOKIE);
  if (hasSession) return NextResponse.next();

  const locale = pathname.startsWith('/en') ? 'en' : 'bn';
  const url = request.nextUrl.clone();
  url.pathname = `/${locale}/signin`;
  url.searchParams.set('next', pathname);
  return NextResponse.redirect(url);
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|api).*)'],
};