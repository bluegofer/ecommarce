import { createParamDecorator, ExecutionContext } from '@nestjs/common';

export interface AuthUser {
  userId: string;
  phone: string;
  roles: string[];
  /** True when the user is staff but has not yet confirmed TOTP enrollment. */
  mustEnrollTotp?: boolean;
}

/**
 * Extract the authenticated user from the request.
 * Populated by JwtAuthGuard after token verification.
 */
export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): AuthUser | undefined => {
    const req = ctx.switchToHttp().getRequest<{ user?: AuthUser }>();
    return req.user;
  },
);
