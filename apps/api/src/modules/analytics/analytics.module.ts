// apps/api/src/modules/analytics/analytics.module.ts
import { Module } from '@nestjs/common';
import { EventsService } from './events.service';
import { EventsController } from './events.controller';
import { ReportsService } from './reports.service';
import { ReportsController } from './reports.controller';
import { DailySummaryService } from './daily-summary.service';
import { SummaryController } from './summary.controller';

@Module({
  controllers: [EventsController, ReportsController, SummaryController],
  providers: [EventsService, ReportsService, DailySummaryService],
  exports: [EventsService, ReportsService, DailySummaryService],
})
export class AnalyticsModule {}