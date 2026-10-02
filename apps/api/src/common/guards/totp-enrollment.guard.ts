// apps/api/src/common/guards/totp-enrollment.guard.ts
import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';

import { AuthUser } from '../decorators/current-user.decorator';
import { ALLOW_DURING_TOTP_ENROLLMENT } from '../decorators/allow-during-totp-enrollment.decorator';

/**
 * F-13 enforcement (step-15.9, hardened step-151).
 *
 * Staff users who have NOT confirmed TOTP enrollment receive an access
 * token with `mustEnrollTotp: true`. This guard blocks every non-whitelisted
 * endpoint until enrollment is completed. Endpoints tagged with
 * @AllowDuringTotpEnrollment() bypass the block (2FA setup + session routes).
 */
@Injectable()
export class TotpEnrollmentGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const allowed = this.reflector.getAllAndOverride<boolean | undefined>(
      ALLOW_DURING_TOTP_ENROLLMENT,
      [context.getHandler(), context.getClass()],
    );
    if (allowed) return true;

    const req = context.switchToHttp().getRequest<{ user?: AuthUser }>();
    const user = req.user;
    if (!user || !user.mustEnrollTotp) return true;

    throw new ForbiddenException(
      'TOTP enrollment required. Complete 2FA setup in settings/profile.',
    );
  }
}