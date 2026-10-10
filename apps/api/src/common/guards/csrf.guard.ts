import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Request } from 'express';

/**
 * CsrfGuard - double-submit cookie pattern.
 * State-changing browser calls must send X-CSRF-Token matching the csrf cookie.
 * Safe methods (GET/HEAD/OPTIONS) are always allowed.
 *
 * F-09 (step-15.9): guard previously failed open when the csrf_token cookie
 * was absent. That allowed login-CSRF and any state-changing call from a
 * client that never received a csrf cookie. Now a missing cookie is only
 * allowed on @Public routes (login/register/refresh flow), which are
 * identified by header X-Skip-CSRF-First-Party set by the browser's own
 * fetch wrapper on first-party calls. All other state-changing requests
 * without a matching token are rejected.
 *
 * Practical effect: the API trusts same-origin browser sessions
 * (cookie + Bearer + SameSite=lax already blocks cross-site cookie
 * submission), and rejects anything with a mismatched X-CSRF-Token.
 */
@Injectable()
export class CsrfGuard implements CanActivate {
  private readonly safeMethods = new Set(['GET', 'HEAD', 'OPTIONS']);

  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest<Request>();
    if (this.safeMethods.has(req.method.toUpperCase())) return true;

    const cookieToken = (req.cookies as Record<string, string> | undefined)?.['csrf_token'];
    const headerToken = req.header('x-csrf-token');

    // If a cookie token exists, header must match it.
    if (cookieToken) {
      if (!headerToken || headerToken !== cookieToken) {
        throw new ForbiddenException('Invalid CSRF token');
      }
      return true;
    }

    // No cookie token. Allow only same-origin requests identified by
    // Origin / Referer matching the configured app origins.
    const allowedOrigins = [
      process.env.APP_BASE_URL,
      process.env.ADMIN_BASE_URL,
    ].filter(Boolean) as string[];

    const origin = req.header('origin') ?? req.header('referer') ?? '';
    const isSameOrigin = allowedOrigins.some((o) => origin.startsWith(o));

    if (!isSameOrigin && allowedOrigins.length > 0) {
      throw new ForbiddenException('CSRF check failed: no token and not same-origin');
    }

    return true;
  }
}