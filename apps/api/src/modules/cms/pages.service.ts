// apps/api/src/modules/cms/pages.service.ts
import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { slugify } from '../../common/utils/slugify';
import type {
  CmsPageDto,
  CmsPageRevisionDto,
  CmsPageStatus,
  CreateCmsPageDto,
  UpdateCmsPageDto,
} from '@ecommarce/types';

@Injectable()
export class PagesService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateCmsPageDto): Promise<CmsPageDto> {
    const slug = slugify(dto.slug);
    const existing = await this.prisma.cmsPage.findUnique({ where: { slug } });
    if (existing) throw new BadRequestException(`slug exists: ${slug}`);

    const status: CmsPageStatus = dto.status ?? 'DRAFT';
    const created = await this.prisma.cmsPage.create({
      data: {
        slug,
        titleEn: dto.titleEn,
        titleBn: dto.titleBn,
        bodyEn: dto.bodyEn ?? null,
        bodyBn: dto.bodyBn ?? null,
        status,
        publishedAt: status === 'PUBLISHED' ? new Date() : null,
        metaTitle: dto.metaTitle ?? null,
        metaDescription: dto.metaDescription ?? null,
        currentRevision: 1,
        revisions: {
          create: {
            revisionNumber: 1,
            titleEn: dto.titleEn,
            titleBn: dto.titleBn,
            bodyEn: dto.bodyEn ?? null,
            bodyBn: dto.bodyBn ?? null,
          },
        },
      },
    });
    return this.toDto(created);
  }

  /**
   * Every update writes a new CmsPageRevision row and bumps currentRevision.
   */
  async update(id: string, dto: UpdateCmsPageDto): Promise<CmsPageDto> {
    const current = await this.prisma.cmsPage.findUnique({ where: { id } });
    if (!current) throw new NotFoundException('page not found');

    const data: Record<string, unknown> = {};
    if (dto.titleEn !== undefined) data.titleEn = dto.titleEn;
    if (dto.titleBn !== undefined) data.titleBn = dto.titleBn;
    if (dto.bodyEn !== undefined) data.bodyEn = dto.bodyEn;
    if (dto.bodyBn !== undefined) data.bodyBn = dto.bodyBn;
    if (dto.metaTitle !== undefined) data.metaTitle = dto.metaTitle;
    if (dto.metaDescription !== undefined) data.metaDescription = dto.metaDescription;
    if (dto.slug !== undefined) {
      const newSlug = slugify(dto.slug);
      if (newSlug !== current.slug) {
        const collide = await this.prisma.cmsPage.findUnique({ where: { slug: newSlug } });
        if (collide) throw new BadRequestException(`slug exists: ${newSlug}`);
        data.slug = newSlug;
      }
    }
    if (dto.status !== undefined) {
      data.status = dto.status;
      if (dto.status === 'PUBLISHED' && !current.publishedAt) {
        data.publishedAt = new Date();
      }
    }

    const nextRevision = current.currentRevision + 1;
    data.currentRevision = nextRevision;

    const updated = await this.prisma.cmsPage.update({
      where: { id },
      data: {
        ...data,
        revisions: {
          create: {
            revisionNumber: nextRevision,
            titleEn: (data.titleEn as string) ?? current.titleEn,
            titleBn: (data.titleBn as string) ?? current.titleBn,
            bodyEn: (data.bodyEn as string | null | undefined) ?? current.bodyEn,
            bodyBn: (data.bodyBn as string | null | undefined) ?? current.bodyBn,
          },
        },
      },
    });
    return this.toDto(updated);
  }

  async findOne(id: string): Promise<CmsPageDto> {
    const p = await this.prisma.cmsPage.findUnique({ where: { id } });
    if (!p) throw new NotFoundException('page not found');
    return this.toDto(p);
  }

  async findBySlug(slug: string): Promise<CmsPageDto | null> {
    const p = await this.prisma.cmsPage.findUnique({ where: { slug } });
    return p ? this.toDto(p) : null;
  }

  async list(): Promise<CmsPageDto[]> {
    const rows = await this.prisma.cmsPage.findMany({ orderBy: { updatedAt: 'desc' } });
    return rows.map((p) => this.toDto(p));
  }

  async listRevisions(pageId: string): Promise<CmsPageRevisionDto[]> {
    const rows = await this.prisma.cmsPageRevision.findMany({
      where: { pageId },
      orderBy: { revisionNumber: 'desc' },
    });
    return rows.map((r) => ({
      id: r.id,
      pageId: r.pageId,
      revisionNumber: r.revisionNumber,
      titleEn: r.titleEn,
      titleBn: r.titleBn,
      bodyEn: r.bodyEn,
      bodyBn: r.bodyBn,
      createdAt: r.createdAt.toISOString(),
    }));
  }

  /**
   * Restore a previous revision: creates a NEW revision with the old content
   * (never rewrites history).
   */
  async restoreRevision(pageId: string, revisionNumber: number): Promise<CmsPageDto> {
    const page = await this.prisma.cmsPage.findUnique({ where: { id: pageId } });
    if (!page) throw new NotFoundException('page not found');
    const rev = await this.prisma.cmsPageRevision.findUnique({
      where: { pageId_revisionNumber: { pageId, revisionNumber } },
    });
    if (!rev) throw new NotFoundException('revision not found');

    const nextRevision = page.currentRevision + 1;
    const restored = await this.prisma.cmsPage.update({
      where: { id: pageId },
      data: {
        titleEn: rev.titleEn,
        titleBn: rev.titleBn,
        bodyEn: rev.bodyEn,
        bodyBn: rev.bodyBn,
        currentRevision: nextRevision,
        revisions: {
          create: {
            revisionNumber: nextRevision,
            titleEn: rev.titleEn,
            titleBn: rev.titleBn,
            bodyEn: rev.bodyEn,
            bodyBn: rev.bodyBn,
          },
        },
      },
    });
    return this.toDto(restored);
  }

  async remove(id: string): Promise<{ ok: true }> {
    const p = await this.prisma.cmsPage.findUnique({ where: { id } });
    if (!p) throw new NotFoundException('page not found');
    await this.prisma.cmsPage.delete({ where: { id } });
    return { ok: true };
  }

  private toDto(p: {
    id: string;
    slug: string;
    titleEn: string;
    titleBn: string;
    bodyEn: string | null;
    bodyBn: string | null;
    status: string;
    publishedAt: Date | null;
    metaTitle: string | null;
    metaDescription: string | null;
    currentRevision: number;
    createdAt: Date;
    updatedAt: Date;
  }): CmsPageDto {
    return {
      id: p.id,
      slug: p.slug,
      titleEn: p.titleEn,
      titleBn: p.titleBn,
      bodyEn: p.bodyEn,
      bodyBn: p.bodyBn,
      status: p.status as CmsPageStatus,
      publishedAt: p.publishedAt ? p.publishedAt.toISOString() : null,
      metaTitle: p.metaTitle,
      metaDescription: p.metaDescription,
      currentRevision: p.currentRevision,
      createdAt: p.createdAt.toISOString(),
      updatedAt: p.updatedAt.toISOString(),
    };
  }
}