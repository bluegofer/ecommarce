// apps/api/src/common/guards/temp-token.guard.ts
//
// F-07 + F-13 (step-15.9): the login flow for staff with TOTP enrolled
// returns a short-lived "temp token" (scope=totp) instead of an access token.
// That token is only accepted by POST /auth/totp/verify, which is decorated
// with @UseGuards(TempTokenGuard). Any other endpoint rejects it because the
// standard JwtAuthGuard rejects tokens whose payload contains `scope`.
//
// The guard reuses the JWT_ACCESS_SECRET (same signing key as access tokens);
// the `scope` claim differentiates the two token types, and the token TTL is
// 5 minutes so a stolen temp token expires quickly.

import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { Request } from 'express';

interface TempTokenPayload {
  sub: string;
  phone: string;
  scope: 'totp';
}

export interface TempAuthUser {
  userId: string;
  phone: string;
}

@Injectable()
export class TempTokenGuard implements CanActivate {
  constructor(
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context
      .switchToHttp()
      .getRequest<Request & { tempUser?: TempAuthUser }>();

    const header = req.header('authorization');
    const token = header?.startsWith('Bearer ') ? header.slice(7) : undefined;
    if (!token) throw new UnauthorizedException('Missing temp token');

    try {
      const payload = await this.jwt.verifyAsync<TempTokenPayload>(token, {
        secret: this.config.get<string>('JWT_ACCESS_SECRET') ?? 'dev-access-secret',
      });
      if (payload.scope !== 'totp') {
        throw new UnauthorizedException('Token is not a TOTP challenge token');
      }
      req.tempUser = { userId: payload.sub, phone: payload.phone };
      return true;
    } catch {
      throw new UnauthorizedException('Invalid or expired temp token');
    }
  }
}