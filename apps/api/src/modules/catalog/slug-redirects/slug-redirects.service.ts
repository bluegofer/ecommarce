// apps/api/src/modules/catalog/slug-redirects/slug-redirects.service.ts
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../database/prisma.service';

@Injectable()
export class SlugRedirectsService {
  constructor(private readonly prisma: PrismaService) {}

  async record(fromSlug: string, toSlug: string, entityType: string): Promise<void> {
    if (fromSlug === toSlug) return;
    await this.prisma.slugRedirect.upsert({
      where: { fromSlug },
      create: { fromSlug, toSlug, entityType, statusCode: 301 },
      update: { toSlug, entityType },
    });
  }

  async resolve(slug: string): Promise<string | null> {
    const hit = await this.prisma.slugRedirect.findUnique({
      where: { fromSlug: slug },
      select: { toSlug: true },
    });
    return hit?.toSlug ?? null;
  }

  async list(): Promise<
    Array<{
      id: string;
      fromSlug: string;
      toSlug: string;
      entityType: string;
      statusCode: number;
      createdAt: Date;
    }>
  > {
    return this.prisma.slugRedirect.findMany({ orderBy: { createdAt: 'desc' } });
  }
}