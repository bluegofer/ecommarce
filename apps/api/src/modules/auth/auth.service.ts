// apps/api/src/modules/auth/auth.service.ts
import {
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { createHash, randomBytes } from 'crypto';

import { PrismaService } from '../../database/prisma.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { TotpService } from './totp.service';
import { parseTtlSeconds } from '../../common/util/ttl';

const MAX_FAILED_LOGINS = 5;
const LOCK_MINUTES = 15;
const TEMP_TOKEN_TTL = 300; // 5 minutes — F-13 (step-15.9)

// Roles that require the 2FA challenge on login. Any user with at least one
// of these is treated as "staff" and is subject to TOTP enforcement
// (F-07 from step-15.9; TDD section 6.13).
const STAFF_ROLE_CODES = new Set<string>([
  'SUPER_ADMIN',
  'CATALOG_MANAGER',
  'ORDER_SUPPORT',
  'MARKETING',
  'FINANCE_READONLY',
  'FINANCE',
  'PURCHASE_MANAGER',
  'STORE_POS_STAFF',
  'HR_MANAGER',
  'RESTAURANT_STAFF',
  'DELIVERY_STAFF',
]);

export interface AccessTokens {
  accessToken: string;
  expiresIn: number;
  refreshToken: string;
  refreshExpiresIn: number;
}

export type LoginResult =
  | ({ kind: 'access' } & AccessTokens)
  | ({ kind: 'staff-must-enroll-totp' } & AccessTokens)
  | { kind: 'totp-required'; tempToken: string; expiresIn: number };

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
    private readonly totp: TotpService,
  ) {}

  private hashToken(token: string): string {
    return createHash('sha256').update(token).digest('hex');
  }

  private accessSecret(): string {
    return this.config.get<string>('JWT_ACCESS_SECRET') ?? 'dev-access-secret';
  }

  private refreshSecret(): string {
    return this.config.get<string>('JWT_REFRESH_SECRET') ?? 'dev-refresh-secret';
  }

  async register(dto: RegisterDto): Promise<{ userId: string }> {
    const existing = await this.prisma.user.findUnique({
      where: { phone: dto.phone },
    });
    if (existing) throw new ConflictException('Phone already registered');

    if (dto.email) {
      const byEmail = await this.prisma.user.findUnique({
        where: { email: dto.email },
      });
      if (byEmail) throw new ConflictException('Email already registered');
    }

    const cost = Number(this.config.get<number | string>('BCRYPT_COST') ?? 12);
    const passwordHash = await bcrypt.hash(dto.password, cost);

    const user = await this.prisma.user.create({
      data: {
        phone: dto.phone,
        email: dto.email ?? null,
        fullName: dto.fullName,
        passwordHash,
        notificationPrefs: { create: {} },
      },
    });

    return { userId: user.id };
  }

  async markPhoneVerified(phone: string): Promise<void> {
    await this.prisma.user.update({
      where: { phone },
      data: { phoneVerifiedAt: new Date() },
    });
  }

  async login(
    dto: LoginDto,
    userAgent?: string,
    ipAddress?: string,
  ): Promise<LoginResult> {
    const user = await this.prisma.user.findFirst({
      where: {
        OR: [{ phone: dto.identifier }, { email: dto.identifier }],
      },
      include: { userRoles: { include: { role: true } } },
    });

    if (!user) throw new UnauthorizedException('Invalid credentials');

    if (user.lockedUntil && user.lockedUntil > new Date()) {
      throw new UnauthorizedException(
        `Account locked until ${user.lockedUntil.toISOString()}`,
      );
    }

    // Google-only users have no password — they must sign in via Google.
    if (!user.passwordHash) {
      throw new UnauthorizedException(
        'This account uses Google sign-in. Please continue with Google.',
      );
    }

    const passwordOk = await bcrypt.compare(dto.password, user.passwordHash);
    if (!passwordOk) {
      const failed = user.failedLoginCount + 1;
      const locked =
        failed >= MAX_FAILED_LOGINS
          ? new Date(Date.now() + LOCK_MINUTES * 60 * 1000)
          : null;
      await this.prisma.user.update({
        where: { id: user.id },
        data: { failedLoginCount: failed, lockedUntil: locked },
      });
      throw new UnauthorizedException('Invalid credentials');
    }

    if (!user.phoneVerifiedAt) {
      throw new UnauthorizedException('Phone not verified');
    }

    await this.prisma.user.update({
      where: { id: user.id },
      data: { failedLoginCount: 0, lockedUntil: null, lastLoginAt: new Date() },
    });

    const roleCodes = user.userRoles.map((ur) => ur.role.code);
    const isStaff = roleCodes.some((r) => STAFF_ROLE_CODES.has(r));

    if (isStaff) {
      const enrolled = await this.totp.isEnrolled(user.id);

      if (enrolled) {
        const tempToken = await this.jwt.signAsync(
          { sub: user.id, phone: user.phone, scope: 'totp' },
          { secret: this.accessSecret(), expiresIn: TEMP_TOKEN_TTL },
        );
        return {
          kind: 'totp-required',
          tempToken,
          expiresIn: TEMP_TOKEN_TTL,
        };
      }

      // Staff without TOTP: allow login but flag mustEnrollTotp.
      // Callers (admin middleware + UI) redirect to enrollment.
      const tokens = await this.issueTokens(
        user.id,
        user.phone,
        userAgent,
        ipAddress,
      );
      return { kind: 'staff-must-enroll-totp', ...tokens };
    }

    const tokens = await this.issueTokens(
      user.id,
      user.phone,
      userAgent,
      ipAddress,
    );
    return { kind: 'access', ...tokens };
  }

  /**
   * F-13 (step-15.9): completes the 2FA challenge.
   * Called by POST /auth/totp/verify after the client presents the tempToken
   * as a Bearer and the 6-digit TOTP code in the body.
   */
  async verifyTotpLogin(
    tempToken: string,
    code: string,
    userAgent?: string,
    ipAddress?: string,
  ): Promise<AccessTokens> {
    let payload: { sub: string; phone: string; scope?: string };
    try {
      payload = await this.jwt.verifyAsync(tempToken, {
        secret: this.accessSecret(),
      });
    } catch {
      throw new UnauthorizedException('Invalid or expired temp token');
    }
    if (payload.scope !== 'totp') {
      throw new UnauthorizedException('Token is not a TOTP challenge token');
    }

    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
    });
    if (!user || user.status !== 'ACTIVE') {
      throw new UnauthorizedException('User not found or inactive');
    }

    const valid = await this.totp.verify(user.id, code);
    if (!valid) {
      throw new UnauthorizedException('Invalid TOTP code');
    }

    await this.prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });

    return this.issueTokens(user.id, user.phone, userAgent, ipAddress);
  }

  async disableTotp(userId: string): Promise<void> {
    await this.prisma.totpSecret.deleteMany({ where: { userId } });
  }

  /**
   * Returns the user with roles — used by GET /auth/me so the storefront
   * can populate the AuthProvider after a Google OAuth callback.
   */
  async getUserProfile(userId: string) {
    return this.prisma.user.findUniqueOrThrow({
      where: { id: userId },
      include: { userRoles: { include: { role: true } } },
    });
  }

  /**
   * Google OAuth — TDD Appendix C §C.3.
   *
   * Flow:
   *  1. If the Google account is already linked → return the linked user.
   *  2. Else if a User row exists with the same email → link Google to it.
   *  3. Else → create a new User (passwordHash = null) + OAuthAccount link.
   *
   * The new Google user has NO phone and NO phoneVerifiedAt — the storefront
   * prompts for phone post-signup (TDD §C.3 "still require phone number
   * post-signup for delivery"). Until then, `phone` is a stable placeholder
   * (`google:<providerAccountId>`) that satisfies the unique constraint.
   *
   * Returns freshly-issued access + refresh tokens (same shape as login).
   */
  async findOrCreateOAuthUser(
    profile: {
      provider: 'google';
      providerAccountId: string;
      email: string | null;
      fullName: string;
      avatarUrl: string | null;
    },
    userAgent?: string,
    ipAddress?: string,
  ): Promise<{ isNew: boolean; needsPhone: boolean } & AccessTokens> {
    // 1) Already linked?
    const existingLink = await this.prisma.oAuthAccount.findUnique({
      where: {
        provider_providerAccountId: {
          provider: profile.provider,
          providerAccountId: profile.providerAccountId,
        },
      },
      include: { user: true },
    });

    if (existingLink) {
      await this.prisma.user.update({
        where: { id: existingLink.userId },
        data: { lastLoginAt: new Date() },
      });
      const tokens = await this.issueTokens(
        existingLink.userId,
        existingLink.user.phone,
        userAgent,
        ipAddress,
      );
      return {
        ...tokens,
        isNew: false,
        needsPhone: !existingLink.user.phoneVerifiedAt,
      };
    }

    // 2) Existing user by email → link.
    if (profile.email) {
      const byEmail = await this.prisma.user.findUnique({
        where: { email: profile.email },
      });

      if (byEmail) {
        await this.prisma.oAuthAccount.create({
          data: {
            userId: byEmail.id,
            provider: profile.provider,
            providerAccountId: profile.providerAccountId,
            email: profile.email,
          },
        });
        await this.prisma.user.update({
          where: { id: byEmail.id },
          data: {
            lastLoginAt: new Date(),
            emailVerifiedAt: byEmail.emailVerifiedAt ?? new Date(),
          },
        });
        const tokens = await this.issueTokens(
          byEmail.id,
          byEmail.phone,
          userAgent,
          ipAddress,
        );
        return {
          ...tokens,
          isNew: false,
          needsPhone: !byEmail.phoneVerifiedAt,
        };
      }
    }

    // 3) Brand new Google user.
    const placeholderPhone = `google:${profile.providerAccountId}`;

    const created = await this.prisma.user.create({
      data: {
        phone: placeholderPhone,
        email: profile.email,
        fullName: profile.fullName,
        passwordHash: null,
        phoneVerifiedAt: null,
        emailVerifiedAt: profile.email ? new Date() : null,
        status: 'ACTIVE',
        notificationPrefs: { create: {} },
        oauthAccounts: {
          create: {
            provider: profile.provider,
            providerAccountId: profile.providerAccountId,
            email: profile.email,
          },
        },
      },
    });

    const tokens = await this.issueTokens(
      created.id,
      created.phone,
      userAgent,
      ipAddress,
    );
    return {
      ...tokens,
      isNew: true,
      needsPhone: true,
    };
  }

  private async issueTokens(
    userId: string,
    phone: string,
    userAgent?: string,
    ipAddress?: string,
  ): Promise<AccessTokens> {
    // Parse TTL from env — accepts seconds ("900") or timespan ("15m", "7d").
    // Previously we used Number() which returns NaN for "15m" and jsonwebtoken
    // then throws 'expiresIn should be a number of seconds'.
    const accessTtl = parseTtlSeconds(
      this.config.get<number | string>('JWT_ACCESS_TTL'),
      900,
    );
    const refreshTtl = parseTtlSeconds(
      this.config.get<number | string>('JWT_REFRESH_TTL'),
      2592000,
    );

    const accessToken = await this.jwt.signAsync(
      { sub: userId, phone },
      { secret: this.accessSecret(), expiresIn: accessTtl },
    );

    const familyId = randomBytes(16).toString('hex');
    const refreshToken = await this.jwt.signAsync(
      { sub: userId, fid: familyId },
      { secret: this.refreshSecret(), expiresIn: refreshTtl },
    );

    await this.prisma.refreshToken.create({
      data: {
        userId,
        tokenHash: this.hashToken(refreshToken),
        familyId,
        expiresAt: new Date(Date.now() + refreshTtl * 1000),
        userAgent: userAgent ?? null,
        ipAddress: ipAddress ?? null,
      },
    });

    return {
      accessToken,
      expiresIn: accessTtl,
      refreshToken,
      refreshExpiresIn: refreshTtl,
    };
  }

  async refresh(
    refreshToken: string,
    userAgent?: string,
    ipAddress?: string,
  ): Promise<AccessTokens> {
    let payload: { sub: string; fid: string };
    try {
      payload = await this.jwt.verifyAsync(refreshToken, {
        secret: this.refreshSecret(),
      });
    } catch {
      throw new UnauthorizedException('Invalid refresh token');
    }

    const tokenHash = this.hashToken(refreshToken);
    const stored = await this.prisma.refreshToken.findUnique({
      where: { tokenHash },
    });

    if (!stored || stored.revokedAt || stored.expiresAt < new Date()) {
      await this.prisma.refreshToken.updateMany({
        where: { familyId: payload.fid, revokedAt: null },
        data: { revokedAt: new Date() },
      });
      throw new UnauthorizedException('Refresh token invalid or already used');
    }

    await this.prisma.refreshToken.update({
      where: { id: stored.id },
      data: { revokedAt: new Date() },
    });

    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
    });
    if (!user || user.status !== 'ACTIVE') {
      throw new UnauthorizedException('User not found or inactive');
    }

    return this.issueTokens(user.id, user.phone, userAgent, ipAddress);
  }

  async logout(refreshToken: string): Promise<void> {
    const tokenHash = this.hashToken(refreshToken);
    await this.prisma.refreshToken.updateMany({
      where: { tokenHash, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }

  async revokeAllSessions(userId: string): Promise<void> {
    await this.prisma.refreshToken.updateMany({
      where: { userId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }
}