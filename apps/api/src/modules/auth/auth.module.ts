// apps/api/src/modules/auth/auth.module.ts
import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';

import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { OtpService } from './otp.service';
import { TotpService } from './totp.service';
import { JwtStrategy } from './strategies/jwt.strategy';
import { TempTokenGuard } from '../../common/guards/temp-token.guard';

@Module({
  imports: [
    PassportModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        secret: config.get<string>('JWT_ACCESS_SECRET') ?? 'dev-access-secret',
        signOptions: { expiresIn: config.get<number>('JWT_ACCESS_TTL') ?? 900 },
      }),
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService, OtpService, TotpService, JwtStrategy, TempTokenGuard],
  exports: [AuthService, OtpService, TotpService],
})
export class AuthModule {}