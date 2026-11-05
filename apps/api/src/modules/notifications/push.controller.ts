// apps/api/src/modules/notifications/push.controller.ts
// Public endpoints for the storefront to register / revoke push subscriptions.
// No PushService — reads Prisma directly; the actual send goes through
// MessagingService → VapidPushAdapter.
import { Body, Controller, Delete, Get, Post } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { PrismaService } from '../../database/prisma.service';
import { MessagingService } from '../messaging/messaging.service';
import { Public } from '../../common/decorators/public.decorator';
import { Roles } from '../../common/decorators/roles.decorator';

@ApiTags('push')
@Controller('notifications/push')
export class PushController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly messaging: MessagingService,
  ) {}

  @Public()
  @Get('vapid-public-key')
  getPublicKey() {
    return {
      publicKey: process.env.VAPID_PUBLIC_KEY ?? '',
      enabled: Boolean(process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY),
    };
  }

  @Public()
  @Post('subscribe')
  async subscribe(
    @Body() body: {
      endpoint: string;
      keys: { p256dh: string; auth: string };
      userAgent?: string;
    },
  ) {
    const existing = await this.prisma.pushSubscription.findUnique({
      where: { endpoint: body.endpoint },
    });
    if (existing) {
      return this.prisma.pushSubscription.update({
        where: { endpoint: body.endpoint },
        data: {
          p256dh: body.keys.p256dh,
          auth: body.keys.auth,
          isActive: true,
          userAgent: body.userAgent ?? existing.userAgent,
        },
      });
    }
    return this.prisma.pushSubscription.create({
      data: {
        endpoint: body.endpoint,
        p256dh: body.keys.p256dh,
        auth: body.keys.auth,
        userAgent: body.userAgent ?? null,
        isActive: true,
      },
    });
  }

  @Public()
  @Delete('unsubscribe')
  async unsubscribe(@Body() body: { endpoint: string }) {
    const existing = await this.prisma.pushSubscription.findUnique({
      where: { endpoint: body.endpoint },
    });
    if (!existing) return { ok: true };
    await this.prisma.pushSubscription.update({
      where: { endpoint: body.endpoint },
      data: { isActive: false },
    });
    return { ok: true };
  }

  @Roles('SUPER_ADMIN', 'ADMIN')
  @Get('count')
  async count() {
    const active = await this.prisma.pushSubscription.count({ where: { isActive: true } });
    return { active };
  }

  @Roles('SUPER_ADMIN', 'ADMIN')
  @Post('test')
  async test(@Body() body: { title?: string; body?: string; url?: string }) {
    const subs = await this.prisma.pushSubscription.findMany({ where: { isActive: true } });
    let sent = 0;
    let failed = 0;
    for (const s of subs) {
      const res = await this.messaging.sendPush({
        subscriptionEndpoint: s.endpoint,
        subscriptionKeysP256dh: s.p256dh,
        subscriptionKeysAuth: s.auth,
        title: body.title ?? 'NoLimitShopping test',
        body: body.body ?? 'Push notifications are working!',
        url: body.url ?? '/',
        idempotencyKey: `test-push-${s.id}-${Date.now()}`,
      });
      if (res.ok) sent++; else failed++;
    }
    return { sent, failed, total: subs.length };
  }
}