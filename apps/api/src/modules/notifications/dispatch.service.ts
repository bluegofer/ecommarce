// apps/api/src/modules/notifications/dispatch.service.ts
// Renders templates in bn+en, logs every send attempt, and routes through
// the MessagingService (SMS / SES / push) via the outbox-friendly interface.
// Step 13.5: real transports wired.
import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { TemplatesService } from './templates.service';
import { MessagingService } from '../messaging/messaging.service';
import type { DispatchNotificationDto } from '@ecommarce/types';

@Injectable()
export class DispatchService {
  private readonly logger = new Logger(DispatchService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly templates: TemplatesService,
    private readonly messaging: MessagingService,
  ) {}

  async dispatch(dto: DispatchNotificationDto): Promise<{ ok: boolean; id: string | null }> {
    const tpl = await this.templates.findOne(dto.templateKey, dto.channel);
    if (!tpl) {
      this.logger.warn(`No template for ${dto.templateKey}/${dto.channel}`);
      const log = await this.prisma.notificationLog.create({
        data: {
          customerId: dto.customerId ?? null,
          orderId: dto.orderId ?? null,
          templateKey: dto.templateKey,
          channel: dto.channel,
          recipient: dto.recipient,
          renderedBody: '(missing template)',
          status: 'FAILED',
          errorMessage: 'template not found',
        },
      });
      return { ok: false, id: log.id };
    }
    if (!tpl.isActive) {
      const log = await this.prisma.notificationLog.create({
        data: {
          customerId: dto.customerId ?? null,
          orderId: dto.orderId ?? null,
          templateKey: dto.templateKey,
          channel: dto.channel,
          recipient: dto.recipient,
          renderedBody: '(template inactive)',
          status: 'SUPPRESSED',
        },
      });
      return { ok: false, id: log.id };
    }

    const bodyBn = this.templates.render(tpl.bodyBn, dto.variables);
    const bodyEn = this.templates.render(tpl.bodyEn, dto.variables);
    const subjectEn = tpl.subjectEn ? this.templates.render(tpl.subjectEn, dto.variables) : null;
    const subjectBn = tpl.subjectBn ? this.templates.render(tpl.subjectBn, dto.variables) : null;

    // Localized body: choose based on recipient locale hint (default bn).
    const localeHint = (dto.variables['locale'] as string | undefined) ?? 'bn';
    const body = localeHint === 'en' ? bodyEn : bodyBn;
    const subject = localeHint === 'en' ? (subjectEn ?? subjectBn) : (subjectBn ?? subjectEn);

    // Transport first, then log with the real outcome (enum: SENT|FAILED).
    const idempotencyKey = `notification-${dto.templateKey}-${dto.recipient}-${Date.now()}`;
    let result;
    try {
      if (dto.channel === 'SMS') {
        result = await this.messaging.sendSms({
          to: dto.recipient,
          body,
          idempotencyKey,
        });
      } else if (dto.channel === 'EMAIL') {
        result = await this.messaging.sendEmail({
          to: dto.recipient,
          subject: subject ?? 'Notification',
          html: `<div>${body.replace(/\n/g, '<br/>')}</div>`,
          text: body,
          idempotencyKey,
        });
      } else if (dto.channel === 'PUSH') {
        result = await this.messaging.sendPush({
          subscriptionEndpoint: dto.recipient,
          subscriptionKeysP256dh: '',
          subscriptionKeysAuth: '',
          title: subject ?? 'Notification',
          body,
          url: undefined,
          idempotencyKey,
        });
      } else {
        result = { ok: false, providerMessageId: undefined, error: `unknown channel ${dto.channel}`, raw: {} };
      }
    } catch (err) {
      result = { ok: false, providerMessageId: undefined, error: (err as Error).message, raw: {} };
    }

    const log = await this.prisma.notificationLog.create({
      data: {
        customerId: dto.customerId ?? null,
        orderId: dto.orderId ?? null,
        templateKey: dto.templateKey,
        channel: dto.channel,
        recipient: dto.recipient,
        renderedSubject: subject ?? null,
        renderedBody: `[EN]\n${bodyEn}\n\n[BN]\n${bodyBn}`,
        status: result.ok ? 'SENT' : 'FAILED',
        sentAt: result.ok ? new Date() : null,
        errorMessage: result.ok ? null : (result.error ?? 'send failed'),
      },
    });

    return { ok: result.ok, id: log.id };
  }
}