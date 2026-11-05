// apps/api/src/modules/notifications/templates.service.ts
import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import type {
  NotificationChannel,
  NotificationTemplateDto,
  UpsertNotificationTemplateDto,
} from '@ecommarce/types';

@Injectable()
export class TemplatesService {
  constructor(private readonly prisma: PrismaService) {}

  async upsert(dto: UpsertNotificationTemplateDto): Promise<NotificationTemplateDto> {
    const t = await this.prisma.notificationTemplate.upsert({
      where: { key_channel: { key: dto.key, channel: dto.channel } },
      create: {
        key: dto.key,
        channel: dto.channel,
        subjectEn: dto.subjectEn ?? null,
        subjectBn: dto.subjectBn ?? null,
        bodyEn: dto.bodyEn,
        bodyBn: dto.bodyBn,
        isActive: dto.isActive ?? true,
      },
      update: {
        subjectEn: dto.subjectEn ?? null,
        subjectBn: dto.subjectBn ?? null,
        bodyEn: dto.bodyEn,
        bodyBn: dto.bodyBn,
        isActive: dto.isActive ?? true,
      },
    });
    return this.toDto(t);
  }

  async findOne(key: string, channel: NotificationChannel): Promise<NotificationTemplateDto | null> {
    const t = await this.prisma.notificationTemplate.findUnique({
      where: { key_channel: { key, channel } },
    });
    return t ? this.toDto(t) : null;
  }

  async list(): Promise<NotificationTemplateDto[]> {
    const rows = await this.prisma.notificationTemplate.findMany({ orderBy: { key: 'asc' } });
    return rows.map((t) => this.toDto(t));
  }

  async remove(key: string, channel: NotificationChannel): Promise<{ ok: true }> {
    const t = await this.prisma.notificationTemplate.findUnique({
      where: { key_channel: { key, channel } },
    });
    if (!t) throw new NotFoundException('template not found');
    await this.prisma.notificationTemplate.delete({
      where: { key_channel: { key, channel } },
    });
    return { ok: true };
  }

  render(body: string, vars: Record<string, string>): string {
    return body.replace(/\{\{(\w+)\}\}/g, (_m, name) => vars[name] ?? '');
  }

  private toDto(t: {
    id: string;
    key: string;
    channel: string;
    subjectEn: string | null;
    subjectBn: string | null;
    bodyEn: string;
    bodyBn: string;
    isActive: boolean;
    createdAt: Date;
    updatedAt: Date;
  }): NotificationTemplateDto {
    return {
      id: t.id,
      key: t.key,
      channel: t.channel as NotificationChannel,
      subjectEn: t.subjectEn,
      subjectBn: t.subjectBn,
      bodyEn: t.bodyEn,
      bodyBn: t.bodyBn,
      isActive: t.isActive,
      createdAt: t.createdAt.toISOString(),
      updatedAt: t.updatedAt.toISOString(),
    };
  }
}