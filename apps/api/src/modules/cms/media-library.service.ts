// apps/api/src/modules/cms/media-library.service.ts
import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import type { CreateMediaItemDto, MediaLibraryItemDto } from '@ecommarce/types';

@Injectable()
export class MediaLibraryService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateMediaItemDto, uploadedByUserId: string | null): Promise<MediaLibraryItemDto> {
    const m = await this.prisma.mediaLibraryItem.create({
      data: {
        url: dto.url,
        filename: dto.filename,
        mimeType: dto.mimeType,
        sizeBytes: dto.sizeBytes,
        width: dto.width ?? null,
        height: dto.height ?? null,
        altText: dto.altText ?? null,
        uploadedByUserId,
      },
    });
    return this.toDto(m);
  }

  async list(): Promise<MediaLibraryItemDto[]> {
    const rows = await this.prisma.mediaLibraryItem.findMany({
      orderBy: { createdAt: 'desc' },
    });
    return rows.map((r) => this.toDto(r));
  }

  async findOne(id: string): Promise<MediaLibraryItemDto> {
    const m = await this.prisma.mediaLibraryItem.findUnique({ where: { id } });
    if (!m) throw new NotFoundException('media item not found');
    return this.toDto(m);
  }

  async remove(id: string): Promise<{ ok: true }> {
    const m = await this.prisma.mediaLibraryItem.findUnique({ where: { id } });
    if (!m) throw new NotFoundException('media item not found');
    await this.prisma.mediaLibraryItem.delete({ where: { id } });
    return { ok: true };
  }

  private toDto(r: {
    id: string;
    url: string;
    filename: string;
    mimeType: string;
    sizeBytes: number;
    width: number | null;
    height: number | null;
    altText: string | null;
    createdAt: Date;
  }): MediaLibraryItemDto {
    return {
      id: r.id,
      url: r.url,
      filename: r.filename,
      mimeType: r.mimeType,
      sizeBytes: r.sizeBytes,
      width: r.width,
      height: r.height,
      altText: r.altText,
      createdAt: r.createdAt.toISOString(),
    };
  }
}