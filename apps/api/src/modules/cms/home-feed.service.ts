// apps/api/src/modules/cms/home-feed.service.ts
// Aggregates everything the storefront home page (UI Spec C1) needs in one call.
import { Injectable } from '@nestjs/common';
import { AnnouncementsService } from './announcements.service';
import { SectionsService } from './sections.service';
import { PopupsService } from './popups.service';
import { PrismaService } from '../../database/prisma.service';
import type { HomeFeedDto } from '@ecommarce/types';

@Injectable()
export class HomeFeedService {
  constructor(
    private readonly announcements: AnnouncementsService,
    private readonly sections: SectionsService,
    private readonly popups: PopupsService,
    private readonly prisma: PrismaService,
  ) {}

  async getHomeFeed(): Promise<HomeFeedDto> {
    const now = new Date();
    const [announcements, sections, popups] = await Promise.all([
      this.announcements.listActive(now),
      this.sections.listVisible(now),
      this.popups.listActive(now),
    ]);

    const flashSales = await this.prisma.flashSale.findMany({
      where: { isActive: true, startsAt: { lte: now }, endsAt: { gte: now } },
      orderBy: { endsAt: 'asc' },
      include: { items: true },
    });

    return {
      announcements,
      sections,
      activeFlashSales: flashSales.map((f) => ({
        id: f.id,
        name: f.name,
        startsAt: f.startsAt.toISOString(),
        endsAt: f.endsAt.toISOString(),
        itemCount: f.items.length,
      })),
      activePopups: popups,
    };
  }
}