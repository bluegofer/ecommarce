// apps/api/src/modules/analytics/analytics.module.ts
import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { EventsService } from './events.service';
import { EventsController } from './events.controller';
import { ReportsService } from './reports.service';
import { ReportsController } from './reports.controller';
import { DailySummaryService } from './daily-summary.service';
import { SummaryController } from './summary.controller';
import { DashboardController } from './dashboard.controller';
import { AnalyticsAdapterRegistry } from './analytics-adapter.registry';
import { AnalyticsForwarderService } from './analytics-forwarder.service';
import { Ga4Adapter } from './adapters/ga4.adapter';
import { MetaCapiAdapter } from './adapters/meta-capi.adapter';
import { MockAnalyticsAdapter } from './adapters/mock-analytics.adapter';
import { PrismaService } from '../../database/prisma.service';
import type { AnalyticsAdapter } from '@ecommarce/types';

function buildAdapters(): AnalyticsAdapter[] {
  const list: AnalyticsAdapter[] = [];

  const ga4Id = process.env.GA4_MEASUREMENT_ID ?? '';
  const ga4Secret = process.env.GA4_API_SECRET ?? '';
  list.push(
    ga4Id && ga4Secret
      ? new Ga4Adapter({ measurementId: ga4Id, apiSecret: ga4Secret })
      : new MockAnalyticsAdapter('GA4'),
  );

  const metaPixel = process.env.META_PIXEL_ID ?? '';
  const metaToken = process.env.META_CAPI_ACCESS_TOKEN ?? '';
  list.push(
    metaPixel && metaToken
      ? new MetaCapiAdapter({ pixelId: metaPixel, accessToken: metaToken })
      : new MockAnalyticsAdapter('META_CAPI'),
  );

  return list;
}

@Module({
  controllers: [EventsController, ReportsController, SummaryController, DashboardController],
  providers: [
    PrismaService,
    EventsService,
    ReportsService,
    DailySummaryService,
    {
      provide: AnalyticsAdapterRegistry,
      useFactory: (): AnalyticsAdapterRegistry =>
        new AnalyticsAdapterRegistry(buildAdapters()),
    },
    AnalyticsForwarderService,
  ],
  exports: [EventsService, ReportsService, DailySummaryService, AnalyticsForwarderService],
})
export class AnalyticsModule {}