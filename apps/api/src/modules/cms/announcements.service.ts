// apps/api/src/modules/cms/announcements.service.ts
import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import type {
  AnnouncementDto,
  CreateAnnouncementDto,
  UpdateAnnouncementDto,
} from '@ecommarce/types';

@Injectable()
export class AnnouncementsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateAnnouncementDto): Promise<AnnouncementDto> {
    const a = await this.prisma.announcement.create({
      data: {
        textEn: dto.textEn,
        textBn: dto.textBn,
        bgColor: dto.bgColor ?? '#164561',
        textColor: dto.textColor ?? '#FFFFFF',
        linkUrl: dto.linkUrl ?? null,
        startsAt: dto.startsAt ? new Date(dto.startsAt) : null,
        endsAt: dto.endsAt ? new Date(dto.endsAt) : null,
        isActive: dto.isActive ?? true,
      },
    });
    return this.toDto(a);
  }

  async update(id: string, dto: UpdateAnnouncementDto): Promise<AnnouncementDto> {
    const cur = await this.prisma.announcement.findUnique({ where: { id } });
    if (!cur) throw new NotFoundException('announcement not found');
    const data: Record<string, unknown> = {};
    if (dto.textEn !== undefined) data.textEn = dto.textEn;
    if (dto.textBn !== undefined) data.textBn = dto.textBn;
    if (dto.bgColor !== undefined) data.bgColor = dto.bgColor;
    if (dto.textColor !== undefined) data.textColor = dto.textColor;
    if (dto.linkUrl !== undefined) data.linkUrl = dto.linkUrl;
    if (dto.startsAt !== undefined) data.startsAt = dto.startsAt ? new Date(dto.startsAt) : null;
    if (dto.endsAt !== undefined) data.endsAt = dto.endsAt ? new Date(dto.endsAt) : null;
    if (dto.isActive !== undefined) data.isActive = dto.isActive;
    const a = await this.prisma.announcement.update({ where: { id }, data });
    return this.toDto(a);
  }

  async list(): Promise<AnnouncementDto[]> {
    const rows = await this.prisma.announcement.findMany({
      orderBy: { createdAt: 'desc' },
    });
    return rows.map((a) => this.toDto(a));
  }

  async listActive(now: Date = new Date()): Promise<AnnouncementDto[]> {
    const rows = await this.prisma.announcement.findMany({
      where: { isActive: true },
      orderBy: { createdAt: 'desc' },
    });
    return rows
      .filter((a) => {
        if (a.startsAt && now < a.startsAt) return false;
        if (a.endsAt && now > a.endsAt) return false;
        return true;
      })
      .map((a) => this.toDto(a));
  }

  async remove(id: string): Promise<{ ok: true }> {
    const a = await this.prisma.announcement.findUnique({ where: { id } });
    if (!a) throw new NotFoundException('announcement not found');
    await this.prisma.announcement.delete({ where: { id } });
    return { ok: true };
  }

  private toDto(r: {
    id: string;
    textEn: string;
    textBn: string;
    bgColor: string;
    textColor: string;
    linkUrl: string | null;
    startsAt: Date | null;
    endsAt: Date | null;
    isActive: boolean;
    createdAt: Date;
    updatedAt: Date;
  }): AnnouncementDto {
    return {
      id: r.id,
      textEn: r.textEn,
      textBn: r.textBn,
      bgColor: r.bgColor,
      textColor: r.textColor,
      linkUrl: r.linkUrl,
      startsAt: r.startsAt ? r.startsAt.toISOString() : null,
      endsAt: r.endsAt ? r.endsAt.toISOString() : null,
      isActive: r.isActive,
      createdAt: r.createdAt.toISOString(),
      updatedAt: r.updatedAt.toISOString(),
    };
  }
}