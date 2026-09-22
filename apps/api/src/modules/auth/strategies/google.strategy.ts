import { Injectable, Logger } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy, VerifyCallback, Profile } from 'passport-google-oauth20';

/**
 * Google OAuth 2.0 strategy — TDD Appendix C §C.5.
 *
 * When env vars are missing, the strategy is registered with dummy
 * values; GoogleOAuthGuard refuses requests with 503 so the API stays
 * bootable in local dev / CI.
 */
export interface GoogleProfileNormalized {
  provider: 'google';
  providerAccountId: string;
  email: string | null;
  fullName: string;
  avatarUrl: string | null;
}

export function isGoogleOAuthConfigured(): boolean {
  return Boolean(
    process.env.GOOGLE_CLIENT_ID &&
      process.env.GOOGLE_CLIENT_SECRET &&
      process.env.GOOGLE_REDIRECT_URI,
  );
}

@Injectable()
export class GoogleStrategy extends PassportStrategy(Strategy, 'google') {
  private readonly logger = new Logger(GoogleStrategy.name);

  constructor() {
    const configured = isGoogleOAuthConfigured();

    super({
      clientID: process.env.GOOGLE_CLIENT_ID ?? 'not-configured',
      clientSecret: process.env.GOOGLE_CLIENT_SECRET ?? 'not-configured',
      callbackURL:
        process.env.GOOGLE_REDIRECT_URI ?? 'http://localhost/not-configured',
      scope: ['email', 'profile'],
      passReqToCallback: false,
    });

    if (!configured) {
      this.logger.warn(
        'Google OAuth NOT configured. Set GOOGLE_CLIENT_ID/SECRET/REDIRECT_URI to enable.',
      );
    } else {
      this.logger.log('Google OAuth strategy initialized.');
    }
  }

  async validate(
    _accessToken: string,
    _refreshToken: string,
    profile: Profile,
    done: VerifyCallback,
  ): Promise<void> {
    const emails = profile.emails ?? [];
    const primaryEmail =
      emails.find((e) => e.verified)?.value ?? emails[0]?.value ?? null;

    const photos = profile.photos ?? [];
    const avatarUrl = photos[0]?.value ?? null;

    const normalized: GoogleProfileNormalized = {
      provider: 'google',
      providerAccountId: profile.id,
      email: primaryEmail ? primaryEmail.toLowerCase() : null,
      fullName: profile.displayName || primaryEmail || 'Google User',
      avatarUrl,
    };

    done(null, normalized);
  }
}