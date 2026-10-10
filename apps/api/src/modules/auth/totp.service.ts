import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { authenticator } from 'otplib';
import * as QRCode from 'qrcode';

import { PrismaService } from '../../database/prisma.service';

/**
 * TotpService - staff 2FA enrolment and verification (TDD section 6.13).
 * Uses TOTP (RFC 6238) with the app name as issuer.
 * QR generated as a data URL for display in the admin app.
 */
@Injectable()
export class TotpService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {}

  private issuer(): string {
    return this.config.get<string>('TOTP_ISSUER') ?? 'Ecommarce';
  }

  async enrol(userId: string, email: string): Promise<{ secret: string; qrDataUrl: string }> {
    const secret = authenticator.generateSecret();
    const otpauth = authenticator.keyuri(email, this.issuer(), secret);

    // qrcode types are written for the browser; cast to any to use the Node path.
    const toDataURL = (QRCode as unknown as {
      toDataURL: (text: string) => Promise<string>;
    }).toDataURL;
    const qrDataUrl = await toDataURL(otpauth);

    await this.prisma.totpSecret.upsert({
      where: { userId },
      update: { secret, enrolledAt: null, lastUsedAt: null, recoveryCodes: [] },
      create: { userId, secret, recoveryCodes: [] },
    });

    return { secret, qrDataUrl };
  }

  async verify(userId: string, token: string): Promise<boolean> {
    const record = await this.prisma.totpSecret.findUnique({ where: { userId } });
    if (!record) return false;
    // step-158: window=1 accepts codes from +/- one 30s window (phone/server skew).
    const prevWindow = authenticator.options.window;
    authenticator.options = { ...authenticator.options, window: 1 };
    const ok = authenticator.verify({ token, secret: record.secret });
    authenticator.options = { ...authenticator.options, window: prevWindow };
    // step-158: log for diagnosis (fails silently otherwise)
    if (!ok) {
      // eslint-disable-next-line no-console
      console.warn('[TOTP] verify failed', { userId, enrolledAt: record.enrolledAt });
    }
    if (ok) {
      await this.prisma.totpSecret.update({
        where: { userId },
        data: {
          lastUsedAt: new Date(),
          enrolledAt: record.enrolledAt ?? new Date(),
        },
      });
    }
    return ok;
  }

  async isEnrolled(userId: string): Promise<boolean> {
    const record = await this.prisma.totpSecret.findUnique({ where: { userId } });
    return Boolean(record?.enrolledAt);
  }
}
