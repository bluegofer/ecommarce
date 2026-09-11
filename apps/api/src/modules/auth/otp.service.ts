import { BadRequestException, Injectable } from '@nestjs/common';
import { randomInt } from 'crypto';

import { RedisService } from '../../database/redis.service';

/**
 * OtpService — issues and verifies 6-digit phone OTPs.
 * In Step 2 the OTP is stored in Redis with a TTL.
 * A real SMS provider is wired in Step 10 behind this same interface.
 */
@Injectable()
export class OtpService {
  private readonly TTL_SECONDS = 300; // 5 minutes
  private readonly RESEND_COOLDOWN = 60; // 60 seconds

  constructor(private readonly redis: RedisService) {}

  private otpKey(phone: string): string {
    return `otp:${phone}`;
  }

  private cooldownKey(phone: string): string {
    return `otp:cooldown:${phone}`;
  }

  async issue(phone: string): Promise<{ sent: true; devCode?: string }> {
    const onCooldown = await this.redis.get(this.cooldownKey(phone));
    if (onCooldown) {
      throw new BadRequestException('Please wait before requesting a new OTP');
    }

    const code = String(randomInt(100000, 999999));
    await this.redis.set(this.otpKey(phone), code, this.TTL_SECONDS);
    await this.redis.set(this.cooldownKey(phone), '1', this.RESEND_COOLDOWN);

    // Step 10 will replace this with the SMS provider call.
    // In dev we log the code so the auth flow can be completed.
    if (process.env.NODE_ENV !== 'production') {
      // eslint-disable-next-line no-console
      console.log(`[OTP] ${phone} => ${code}`);
      return { sent: true, devCode: code };
    }

    return { sent: true };
  }

  async verify(phone: string, code: string): Promise<void> {
    const stored = await this.redis.get(this.otpKey(phone));
    if (!stored || stored !== code) {
      throw new BadRequestException('Invalid or expired OTP');
    }
    await this.redis.del(this.otpKey(phone));
  }
}