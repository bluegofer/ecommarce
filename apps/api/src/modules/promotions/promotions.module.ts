// apps/api/src/modules/promotions/promotions.module.ts
import { Module } from '@nestjs/common';
import { CouponsService } from './coupons.service';
import { CouponsController } from './coupons.controller';
import { AutoDiscountsService } from './auto-discounts.service';
import { RulesEngineService } from './rules-engine.service';
import { RulesEngineController } from './rules-engine.controller';
import { FlashSalesService } from './flash-sales.service';
import { FlashSalesController } from './flash-sales.controller';
import { FlashSaleSchedulerService } from './flash-sale-scheduler.service';
import { ReportsService } from './reports.service';
import { ReportsController } from './reports.controller';

@Module({
  controllers: [
    CouponsController,
    RulesEngineController,
    FlashSalesController,
    ReportsController,
  ],
  providers: [
    CouponsService,
    AutoDiscountsService,
    RulesEngineService,
    FlashSalesService,
    FlashSaleSchedulerService,
    ReportsService,
  ],
  exports: [
    CouponsService,
    AutoDiscountsService,
    RulesEngineService,
    FlashSalesService,
    ReportsService,
  ],
})
export class PromotionsModule {}