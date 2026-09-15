import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { Request } from 'express';

/**
 * CsrfGuard — double-submit cookie pattern.
 * State-changing browser calls must send X-CSRF-Token matching the csrf cookie.
 * Safe methods (GET/HEAD/OPTIONS) are always allowed.
 */
@Injectable()
export class CsrfGuard implements CanActivate {
  private readonly safeMethods = new Set(['GET', 'HEAD', 'OPTIONS']);

  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest<Request>();
    if (this.safeMethods.has(req.method.toUpperCase())) return true;

    const cookieToken = (req.cookies as Record<string, string> | undefined)?.['csrf_token'];
    if (!cookieToken) return true;

    const headerToken = req.header('x-csrf-token');
    if (!headerToken || headerToken !== cookieToken) {
      throw new ForbiddenException('Invalid CSRF token');
    }
    return true;
  }
}