// apps/api/src/modules/notifications/dispatch.service.ts
// Renders templates in bn+en, logs every send attempt, and (in Step 10)
// routes through real SMS/email/push adapters. For Step 5 it writes to
// notification_log only — the wiring is what AC-82 verifies.
import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { TemplatesService } from './templates.service';
import type { DispatchNotificationDto } from '@ecommarce/types';

@Injectable()
export class DispatchService {
  private readonly logger = new Logger(DispatchService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly templates: TemplatesService,
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

    // Stub: no real transport yet. Record the send as SENT immediately.
    const log = await this.prisma.notificationLog.create({
      data: {
        customerId: dto.customerId ?? null,
        orderId: dto.orderId ?? null,
        templateKey: dto.templateKey,
        channel: dto.channel,
        recipient: dto.recipient,
        renderedSubject: subjectEn ?? subjectBn ?? null,
        renderedBody: `[EN]\n${bodyEn}\n\n[BN]\n${bodyBn}`,
        status: 'SENT',
        sentAt: new Date(),
      },
    });
    return { ok: true, id: log.id };
  }
}