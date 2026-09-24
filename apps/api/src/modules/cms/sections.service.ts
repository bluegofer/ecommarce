// apps/api/src/modules/cms/sections.service.ts
import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import type {
  CmsSectionDto,
  CreateCmsSectionDto,
  ReorderSectionsDto,
  UpdateCmsSectionDto,
} from '@ecommarce/types';

@Injectable()
export class SectionsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateCmsSectionDto): Promise<CmsSectionDto> {
    const existing = await this.prisma.cmsSection.findUnique({ where: { key: dto.key } });
    if (existing) throw new BadRequestException(`section key exists: ${dto.key}`);

    const created = await this.prisma.cmsSection.create({
      data: {
        key: dto.key,
        sectionType: dto.sectionType,
        titleEn: dto.titleEn ?? null,
        titleBn: dto.titleBn ?? null,
        position: dto.position ?? 0,
        config: dto.config !== undefined ? (dto.config as unknown as object) : undefined,
        isVisible: dto.isVisible ?? true,
        startsAt: dto.startsAt ? new Date(dto.startsAt) : null,
        endsAt: dto.endsAt ? new Date(dto.endsAt) : null,
      },
    });
    return this.toDto(created);
  }

  async update(id: string, dto: UpdateCmsSectionDto): Promise<CmsSectionDto> {
    const cur = await this.prisma.cmsSection.findUnique({ where: { id } });
    if (!cur) throw new NotFoundException('section not found');
    const data: Record<string, unknown> = {};
    if (dto.sectionType !== undefined) data.sectionType = dto.sectionType;
    if (dto.titleEn !== undefined) data.titleEn = dto.titleEn;
    if (dto.titleBn !== undefined) data.titleBn = dto.titleBn;
    if (dto.position !== undefined) data.position = dto.position;
    if (dto.config !== undefined) data.config = dto.config;
    if (dto.isVisible !== undefined) data.isVisible = dto.isVisible;
    if (dto.startsAt !== undefined) data.startsAt = dto.startsAt ? new Date(dto.startsAt) : null;
    if (dto.endsAt !== undefined) data.endsAt = dto.endsAt ? new Date(dto.endsAt) : null;

    const updated = await this.prisma.cmsSection.update({ where: { id }, data });
    return this.toDto(updated);
  }

  async findOne(id: string): Promise<CmsSectionDto> {
    const s = await this.prisma.cmsSection.findUnique({ where: { id } });
    if (!s) throw new NotFoundException('section not found');
    return this.toDto(s);
  }

  async list(): Promise<CmsSectionDto[]> {
    const rows = await this.prisma.cmsSection.findMany({
      orderBy: [{ position: 'asc' }, { createdAt: 'asc' }],
    });
    return rows.map((r) => this.toDto(r));
  }

  /**
   * Visible + within schedule window (for the public home feed).
   */
  async listVisible(now: Date = new Date()): Promise<CmsSectionDto[]> {
    const rows = await this.prisma.cmsSection.findMany({
      where: { isVisible: true },
      orderBy: [{ position: 'asc' }],
    });
    return rows
      .filter((r) => {
        if (r.startsAt && now < r.startsAt) return false;
        if (r.endsAt && now > r.endsAt) return false;
        return true;
      })
      .map((r) => this.toDto(r));
  }

  /**
   * Bulk reorder — single transaction. orderedIds must be a permutation of the
   * current section ids (or a subset; unknown ids are ignored to be forgiving).
   *
   * Empty array is treated as a no-op: return the current order unchanged
   * instead of erroring. This lets the admin UI safely send an empty array
   * without surfacing a confusing 400.
   */
  async reorder(dto: ReorderSectionsDto): Promise<CmsSectionDto[]> {
    if (!Array.isArray(dto.orderedIds)) {
      throw new BadRequestException('orderedIds must be an array');
    }
    if (dto.orderedIds.length === 0) {
      // No-op — nothing to reorder.
      return this.list();
    }
    const all = await this.prisma.cmsSection.findMany();
    const known = new Set(all.map((s) => s.id));

    await this.prisma.$transaction(
      dto.orderedIds
        .filter((id) => known.has(id))
        .map((id, index) =>
          this.prisma.cmsSection.update({
            where: { id },
            data: { position: index },
          }),
        ),
    );
    return this.list();
  }

  async remove(id: string): Promise<{ ok: true }> {
    const s = await this.prisma.cmsSection.findUnique({ where: { id } });
    if (!s) throw new NotFoundException('section not found');
    await this.prisma.cmsSection.delete({ where: { id } });
    return { ok: true };
  }

  private toDto(r: {
    id: string;
    key: string;
    sectionType: string;
    titleEn: string | null;
    titleBn: string | null;
    position: number;
    config: unknown;
    isVisible: boolean;
    startsAt: Date | null;
    endsAt: Date | null;
    createdAt: Date;
    updatedAt: Date;
  }): CmsSectionDto {
    return {
      id: r.id,
      key: r.key,
      sectionType: r.sectionType,
      titleEn: r.titleEn,
      titleBn: r.titleBn,
      position: r.position,
      config:
        r.config && typeof r.config === 'object'
          ? (r.config as Record<string, unknown>)
          : null,
      isVisible: r.isVisible,
      startsAt: r.startsAt ? r.startsAt.toISOString() : null,
      endsAt: r.endsAt ? r.endsAt.toISOString() : null,
      createdAt: r.createdAt.toISOString(),
      updatedAt: r.updatedAt.toISOString(),
    };
  }
}