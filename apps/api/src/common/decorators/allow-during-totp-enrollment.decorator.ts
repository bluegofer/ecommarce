// apps/api/src/common/decorators/allow-during-totp-enrollment.decorator.ts
import { SetMetadata } from '@nestjs/common';

export const ALLOW_DURING_TOTP_ENROLLMENT = 'allowDuringTotpEnrollment';

/**
 * Marks an endpoint as accessible even when the caller holds a
 * mustEnrollTotp-scoped access token. Used only on 2FA enrollment
 * endpoints and session maintenance routes (me / logout / refresh).
 */
export const AllowDuringTotpEnrollment = () =>
  SetMetadata(ALLOW_DURING_TOTP_ENROLLMENT, true);