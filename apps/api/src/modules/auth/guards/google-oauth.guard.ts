import {
  ExecutionContext,
  Injectable,
  ServiceUnavailableException,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { isGoogleOAuthConfigured } from '../strategies/google.strategy';

/**
 * Guard for GET /auth/google and GET /auth/google/callback.
 * Returns 503 when Google env vars are not set.
 */
@Injectable()
export class GoogleOAuthGuard extends AuthGuard('google') {
  override canActivate(context: ExecutionContext) {
    if (!isGoogleOAuthConfigured()) {
      throw new ServiceUnavailableException(
        'Google sign-in is not configured on this environment.',
      );
    }
    return super.canActivate(context);
  }
}