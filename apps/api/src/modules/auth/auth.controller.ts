import {
  Body,
  Controller,
  HttpCode,
  Post,
  Req,
  UnauthorizedException,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Request } from 'express';

import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { RequestOtpDto, VerifyOtpDto } from './dto/otp.dto';
import { AuthService } from './auth.service';
import { OtpService } from './otp.service';
import { Public } from '../../common/decorators/public.decorator';

const REFRESH_COOKIE = 'refresh_token';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(
    private readonly auth: AuthService,
    private readonly otp: OtpService,
  ) {}

  @Public()
  @Post('register')
  async register(@Body() dto: RegisterDto): Promise<{ ok: true; userId: string; devCode: string | null }> {
    const { userId } = await this.auth.register(dto);
    const otpRes = await this.otp.issue(dto.phone);
    return { ok: true, userId, devCode: otpRes.devCode ?? null };
  }

  @Public()
  @Post('otp/request')
  @HttpCode(200)
  async requestOtp(@Body() dto: RequestOtpDto): Promise<{ ok: true; devCode: string | null }> {
    const res = await this.otp.issue(dto.phone);
    return { ok: true, devCode: res.devCode ?? null };
  }

  @Public()
  @Post('otp/verify')
  @HttpCode(200)
  async verifyOtp(@Body() dto: VerifyOtpDto): Promise<{ ok: true }> {
    await this.otp.verify(dto.phone, dto.code);
    await this.auth.markPhoneVerified(dto.phone);
    return { ok: true };
  }

  @Public()
  @Post('login')
  @HttpCode(200)
  async login(
    @Body() dto: LoginDto,
    @Req() req: Request,
  ): Promise<{ ok: true; accessToken: string; expiresIn: number }> {
    const tokens = await this.auth.login(dto, req.header('user-agent') ?? undefined, req.ip);
    req.res?.cookie?.(REFRESH_COOKIE, tokens.refreshToken, {
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      maxAge: tokens.refreshExpiresIn * 1000,
      path: '/',
    });
    return { ok: true, accessToken: tokens.accessToken, expiresIn: tokens.expiresIn };
  }

  @Public()
  @Post('refresh')
  @HttpCode(200)
  async refresh(@Req() req: Request): Promise<{ ok: true; accessToken: string; expiresIn: number }> {
    const token = (req.cookies as Record<string, string> | undefined)?.[REFRESH_COOKIE];
    if (!token) throw new UnauthorizedException('No refresh token');
    const tokens = await this.auth.refresh(token, req.header('user-agent') ?? undefined, req.ip);
    req.res?.cookie?.(REFRESH_COOKIE, tokens.refreshToken, {
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      maxAge: tokens.refreshExpiresIn * 1000,
      path: '/',
    });
    return { ok: true, accessToken: tokens.accessToken, expiresIn: tokens.expiresIn };
  }

  @Public()
  @Post('logout')
  @HttpCode(200)
  async logout(@Req() req: Request): Promise<{ ok: true }> {
    const token = (req.cookies as Record<string, string> | undefined)?.[REFRESH_COOKIE];
    if (token) await this.auth.logout(token);
    req.res?.clearCookie?.(REFRESH_COOKIE, { path: '/' });
    return { ok: true };
  }
}