// apps/api/src/modules/cms/popups.service.ts
import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import type { CreatePopupDto, PopupDto, UpdatePopupDto } from '@ecommarce/types';

@Injectable()
export class PopupsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreatePopupDto): Promise<PopupDto> {
    const p = await this.prisma.popup.create({
      data: {
        titleEn: dto.titleEn,
        titleBn: dto.titleBn,
        bodyEn: dto.bodyEn ?? null,
        bodyBn: dto.bodyBn ?? null,
        imageUrl: dto.imageUrl ?? null,
        ctaLabelEn: dto.ctaLabelEn ?? null,
        ctaLabelBn: dto.ctaLabelBn ?? null,
        ctaUrl: dto.ctaUrl ?? null,
        dismissRule:
          dto.dismissRule !== undefined ? (dto.dismissRule as unknown as object) : undefined,
        startsAt: dto.startsAt ? new Date(dto.startsAt) : null,
        endsAt: dto.endsAt ? new Date(dto.endsAt) : null,
        isActive: dto.isActive ?? true,
      },
    });
    return this.toDto(p);
  }

  async update(id: string, dto: UpdatePopupDto): Promise<PopupDto> {
    const cur = await this.prisma.popup.findUnique({ where: { id } });
    if (!cur) throw new NotFoundException('popup not found');
    const data: Record<string, unknown> = {};
    if (dto.titleEn !== undefined) data.titleEn = dto.titleEn;
    if (dto.titleBn !== undefined) data.titleBn = dto.titleBn;
    if (dto.bodyEn !== undefined) data.bodyEn = dto.bodyEn;
    if (dto.bodyBn !== undefined) data.bodyBn = dto.bodyBn;
    if (dto.imageUrl !== undefined) data.imageUrl = dto.imageUrl;
    if (dto.ctaLabelEn !== undefined) data.ctaLabelEn = dto.ctaLabelEn;
    if (dto.ctaLabelBn !== undefined) data.ctaLabelBn = dto.ctaLabelBn;
    if (dto.ctaUrl !== undefined) data.ctaUrl = dto.ctaUrl;
    if (dto.dismissRule !== undefined) data.dismissRule = dto.dismissRule;
    if (dto.startsAt !== undefined) data.startsAt = dto.startsAt ? new Date(dto.startsAt) : null;
    if (dto.endsAt !== undefined) data.endsAt = dto.endsAt ? new Date(dto.endsAt) : null;
    if (dto.isActive !== undefined) data.isActive = dto.isActive;
    const p = await this.prisma.popup.update({ where: { id }, data });
    return this.toDto(p);
  }

  async list(): Promise<PopupDto[]> {
    const rows = await this.prisma.popup.findMany({ orderBy: { createdAt: 'desc' } });
    return rows.map((p) => this.toDto(p));
  }

  async listActive(now: Date = new Date()): Promise<PopupDto[]> {
    const rows = await this.prisma.popup.findMany({
      where: { isActive: true },
      orderBy: { createdAt: 'desc' },
    });
    return rows
      .filter((p) => {
        if (p.startsAt && now < p.startsAt) return false;
        if (p.endsAt && now > p.endsAt) return false;
        return true;
      })
      .map((p) => this.toDto(p));
  }

  async remove(id: string): Promise<{ ok: true }> {
    const p = await this.prisma.popup.findUnique({ where: { id } });
    if (!p) throw new NotFoundException('popup not found');
    await this.prisma.popup.delete({ where: { id } });
    return { ok: true };
  }

  private toDto(r: {
    id: string;
    titleEn: string;
    titleBn: string;
    bodyEn: string | null;
    bodyBn: string | null;
    imageUrl: string | null;
    ctaLabelEn: string | null;
    ctaLabelBn: string | null;
    ctaUrl: string | null;
    dismissRule: unknown;
    startsAt: Date | null;
    endsAt: Date | null;
    isActive: boolean;
    createdAt: Date;
    updatedAt: Date;
  }): PopupDto {
    return {
      id: r.id,
      titleEn: r.titleEn,
      titleBn: r.titleBn,
      bodyEn: r.bodyEn,
      bodyBn: r.bodyBn,
      imageUrl: r.imageUrl,
      ctaLabelEn: r.ctaLabelEn,
      ctaLabelBn: r.ctaLabelBn,
      ctaUrl: r.ctaUrl,
      dismissRule:
        r.dismissRule && typeof r.dismissRule === 'object'
          ? (r.dismissRule as Record<string, unknown>)
          : null,
      startsAt: r.startsAt ? r.startsAt.toISOString() : null,
      endsAt: r.endsAt ? r.endsAt.toISOString() : null,
      isActive: r.isActive,
      createdAt: r.createdAt.toISOString(),
      updatedAt: r.updatedAt.toISOString(),
    };
  }
}