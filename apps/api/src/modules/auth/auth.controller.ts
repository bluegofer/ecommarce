// apps/api/src/modules/auth/auth.controller.ts
import {
  Body,
  Controller,
  Get,
  Headers,
  HttpCode,
  Post,
  Req,
  Res,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { Request, Response } from 'express';

import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { RequestOtpDto, VerifyOtpDto } from './dto/otp.dto';
import { TotpConfirmDto, TotpVerifyDto, TotpDisableDto } from './dto/totp.dto';
import { AuthService } from './auth.service';
import { OtpService } from './otp.service';
import { TotpService } from './totp.service';
import { Public } from '../../common/decorators/public.decorator';
import {
  CurrentUser,
  type AuthUser,
} from '../../common/decorators/current-user.decorator';
import { TempTokenGuard } from '../../common/guards/temp-token.guard';
import { GoogleOAuthGuard } from './guards/google-oauth.guard';
import type { GoogleProfileNormalized } from './strategies/google.strategy';

const REFRESH_COOKIE = 'refresh_token';
// Same refresh cookie is used by both storefront and admin (same parent domain
// nolimitshopping.com). The admin middleware (apps/admin/src/middleware.ts)
// checks for this exact cookie name. F-11 from step-15.9.
const REFRESH_COOKIE_MAX_AGE_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

// Cookie domain — leading dot makes it visible to ALL subdomains
// (nolimitshopping.com, admin.nolimitshopping.com, api.nolimitshopping.com).
// Without this, the cookie defaults to the host that set it (api.nolimitshopping.com)
// and the admin middleware can never see it → infinite redirect to /login.
const COOKIE_DOMAIN =
  process.env.NODE_ENV === 'production' ? '.nolimitshopping.com' : undefined;

// SameSite policy for the refresh cookie.
// - 'none' is required because admin.nolimitshopping.com (frontend) and
//   api.nolimitshopping.com (API) are DIFFERENT origins from the browser's
//   perspective, even though they share the same parent domain. 'lax' blocks
//   the cookie on cross-origin XHR/fetch calls like POST /auth/refresh, which
//   caused every admin page to bounce with 401 after login.
// - 'none' is only valid with Secure=true, which we set in production.
// - HttpOnly + Domain=.nolimitshopping.com + Path=/ keep the cookie scoped
//   to our own subdomains only.
const COOKIE_SAME_SITE: 'lax' | 'none' | 'strict' =
  process.env.NODE_ENV === 'production' ? 'none' : 'lax';

// Refresh + logout throttles (F-10 from step-15.9): previously unlimited,
// which allowed slow-loris style refresh flooding. Now bounded per IP.
const REFRESH_THROTTLE = { default: { limit: 30, ttl: 60_000 } };
const LOGOUT_THROTTLE = { default: { limit: 10, ttl: 60_000 } };
const TOTP_VERIFY_THROTTLE = { default: { limit: 10, ttl: 60_000 } };

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(
    private readonly auth: AuthService,
    private readonly otp: OtpService,
    private readonly totp: TotpService,
  ) {}

  @Public()
  @Throttle({ default: { limit: 5, ttl: 60_000 } }) // F-04: prevent bulk account creation
  @Post('register')
  async register(
    @Body() dto: RegisterDto,
  ): Promise<{ ok: true; userId: string; devCode: string | null }> {
    const { userId } = await this.auth.register(dto);
    const otpRes = await this.otp.issue(dto.phone);
    return { ok: true, userId, devCode: otpRes.devCode ?? null };
  }

  @Public()
  @Throttle({ default: { limit: 3, ttl: 60_000 } }) // F-04: prevent SMS bombing (real per-SMS cost)
  @Post('otp/request')
  @HttpCode(200)
  async requestOtp(
    @Body() dto: RequestOtpDto,
  ): Promise<{ ok: true; devCode: string | null }> {
    const res = await this.otp.issue(dto.phone);
    return { ok: true, devCode: res.devCode ?? null };
  }

  @Public()
  @Throttle({ default: { limit: 10, ttl: 60_000 } }) // F-04: OTP brute-force protection
  @Post('otp/verify')
  @HttpCode(200)
  async verifyOtp(@Body() dto: VerifyOtpDto): Promise<{ ok: true }> {
    await this.otp.verify(dto.phone, dto.code);
    await this.auth.markPhoneVerified(dto.phone);
    return { ok: true };
  }

  @Public()
  @Throttle({ default: { limit: 5, ttl: 60_000 } }) // F-04: brute-force protection
  @Post('login')
  @HttpCode(200)
  async login(
    @Body() dto: LoginDto,
    @Req() req: Request,
  ): Promise<
    | { ok: true; accessToken: string; expiresIn: number }
    | { ok: true; requireTotp: true; tempToken: string; expiresIn: number }
    | { ok: true; mustEnrollTotp: true; accessToken: string; expiresIn: number }
  > {
    const result = await this.auth.login(
      dto,
      req.header('user-agent') ?? undefined,
      req.ip,
    );

    // F-07 + F-13 (step-15.9): staff accounts are challenged for TOTP.
    if (result.kind === 'totp-required') {
      return {
        ok: true,
        requireTotp: true,
        tempToken: result.tempToken,
        expiresIn: result.expiresIn,
      };
    }

    // Any successful full login (customer or staff-must-enroll) issues the
    // rotating refresh cookie. Cookie flags are the current safe defaults.
    req.res?.cookie?.(REFRESH_COOKIE, result.refreshToken, {
      httpOnly: true,
      sameSite: COOKIE_SAME_SITE,
      secure: process.env.NODE_ENV === 'production',
      maxAge: result.refreshExpiresIn * 1000,
      path: '/',
      domain: COOKIE_DOMAIN,
    });

    if (result.kind === 'staff-must-enroll-totp') {
      return {
        ok: true,
        mustEnrollTotp: true,
        accessToken: result.accessToken,
        expiresIn: result.expiresIn,
      };
    }

    return {
      ok: true,
      accessToken: result.accessToken,
      expiresIn: result.expiresIn,
    };
  }

  /**
   * F-13 (step-15.9): completes the staff 2FA challenge.
   * The temp token from POST /auth/login is provided as a Bearer; the 6-digit
   * TOTP code is in the body. On success we issue the normal access + rotating
   * refresh pair and set the same refresh cookie the storefront uses, so the
   * admin middleware sees a valid session on the next request.
   */
  @Public()
  @UseGuards(TempTokenGuard)
  @Throttle(TOTP_VERIFY_THROTTLE)
  @Post('totp/verify')
  @HttpCode(200)
  async totpVerify(
    @Body() dto: TotpVerifyDto,
    @Headers('authorization') authHeader: string | undefined,
    @Req() req: Request,
  ): Promise<{ ok: true; accessToken: string; expiresIn: number }> {
    const bearer = authHeader?.startsWith('Bearer ')
      ? authHeader.slice(7)
      : undefined;
    if (!bearer) throw new UnauthorizedException('Missing temp token');

    const tokens = await this.auth.verifyTotpLogin(
      bearer,
      dto.code,
      req.header('user-agent') ?? undefined,
      req.ip,
    );

    req.res?.cookie?.(REFRESH_COOKIE, tokens.refreshToken, {
      httpOnly: true,
      sameSite: COOKIE_SAME_SITE,
      secure: process.env.NODE_ENV === 'production',
      maxAge: REFRESH_COOKIE_MAX_AGE_MS,
      path: '/',
      domain: COOKIE_DOMAIN,
    });

    return {
      ok: true,
      accessToken: tokens.accessToken,
      expiresIn: tokens.expiresIn,
    };
  }

  /**
   * Enrolls TOTP for the currently logged-in staff member.
   * Returns the otpauth URL QR (data URL) + raw secret so the admin UI can
   * display it. The secret is not active until /auth/totp/confirm succeeds
   * with a live 6-digit code (prevents locking the user out on a bad scan).
   */
  @Post('totp/enroll')
  @HttpCode(200)
  async totpEnroll(
    @CurrentUser() user: AuthUser,
  ): Promise<{ ok: true; qrDataUrl: string; secret: string }> {
    const result = await this.totp.enrol(user.userId, user.phone);
    return { ok: true, qrDataUrl: result.qrDataUrl, secret: result.secret };
  }

  @Post('totp/confirm')
  @HttpCode(200)
  async totpConfirm(
    @CurrentUser() user: AuthUser,
    @Body() dto: TotpConfirmDto,
  ): Promise<{ ok: true }> {
    const valid = await this.totp.verify(user.userId, dto.code);
    if (!valid) throw new UnauthorizedException('Invalid TOTP code');
    return { ok: true };
  }

  @Post('totp/disable')
  @HttpCode(200)
  async totpDisable(
    @CurrentUser() user: AuthUser,
    @Body() dto: TotpDisableDto,
  ): Promise<{ ok: true }> {
    const valid = await this.totp.verify(user.userId, dto.code);
    if (!valid) throw new UnauthorizedException('Invalid TOTP code');
    await this.auth.disableTotp(user.userId);
    return { ok: true };
  }

  @Public()
  @Throttle(REFRESH_THROTTLE) // F-10 (step-15.9)
  @Post('refresh')
  @HttpCode(200)
  async refresh(
    @Req() req: Request,
  ): Promise<{ ok: true; accessToken: string; expiresIn: number }> {
    const token = (req.cookies as Record<string, string> | undefined)?.[
      REFRESH_COOKIE
    ];
    if (!token) throw new UnauthorizedException('No refresh token');
    const tokens = await this.auth.refresh(
      token,
      req.header('user-agent') ?? undefined,
      req.ip,
    );
    req.res?.cookie?.(REFRESH_COOKIE, tokens.refreshToken, {
      httpOnly: true,
      sameSite: COOKIE_SAME_SITE,
      secure: process.env.NODE_ENV === 'production',
      maxAge: tokens.refreshExpiresIn * 1000,
      path: '/',
      domain: COOKIE_DOMAIN,
    });
    return {
      ok: true,
      accessToken: tokens.accessToken,
      expiresIn: tokens.expiresIn,
    };
  }

  @Public()
  @Throttle(LOGOUT_THROTTLE) // F-10 (step-15.9)
  @Post('logout')
  @HttpCode(200)
  async logout(@Req() req: Request): Promise<{ ok: true }> {
    const token = (req.cookies as Record<string, string> | undefined)?.[
      REFRESH_COOKIE
    ];
    if (token) await this.auth.logout(token);
    req.res?.clearCookie?.(REFRESH_COOKIE, {
      path: '/',
      domain: COOKIE_DOMAIN,
    });
    return { ok: true };
  }

  @Get('me')
  async me(@CurrentUser() user: AuthUser) {
    const u = await this.auth.getUserProfile(user.userId);
    return {
      id: u.id,
      phone: u.phone,
      email: u.email,
      fullName: u.fullName,
      roles: u.userRoles.map((ur) => ur.role.code),
    };
  }

  // ============================================================
  // Google OAuth — TDD Appendix C §C.5
  // ============================================================

  /**
   * Step 1: redirect the browser to Google's consent screen.
   * Passport owns the redirect; no body is returned by NestJS.
   */
  @Public()
  @UseGuards(GoogleOAuthGuard)
  @Get('google')
  async googleAuth(): Promise<void> {
    // Passport handles the redirect to Google.
  }

  /**
   * Step 2: Google redirects back with ?code=&state=. Passport exchanges
   * the code for a profile; we then issue the same access + rotating refresh
   * tokens as a normal login, set the refresh cookie, and redirect the browser
   * to the storefront callback route.
   *
   * TDD §C.3: new Google users must fill in a phone number post-signup
   * (`needs_phone=1` tells the storefront to prompt).
   */
  @Public()
  @UseGuards(GoogleOAuthGuard)
  @Get('google/callback')
  async googleCallback(
    @Req() req: Request,
    @Res() res: Response,
  ): Promise<void> {
    const profile = req.user as GoogleProfileNormalized;

    const result = await this.auth.findOrCreateOAuthUser(
      profile,
      req.header('user-agent') ?? undefined,
      req.ip,
    );

    res.cookie(REFRESH_COOKIE, result.refreshToken, {
      httpOnly: true,
      sameSite: COOKIE_SAME_SITE,
      secure: process.env.NODE_ENV === 'production',
      maxAge: result.refreshExpiresIn * 1000,
      path: '/',
      domain: COOKIE_DOMAIN,
    });

    const storefrontBase =
      process.env.APP_BASE_URL ?? 'http://localhost:3000';

    const params = new URLSearchParams({
      access_token: result.accessToken,
      needs_phone: result.needsPhone ? '1' : '0',
      is_new: result.isNew ? '1' : '0',
    });

    const redirectUrl = `${storefrontBase}/bn/auth/google-callback?${params.toString()}`;
    res.redirect(redirectUrl);
  }
}