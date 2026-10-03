// apps/api/src/modules/promotions/reports.controller.ts
import { Controller, Get, Param } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { ReportsService } from './reports.service';
import { Roles } from '../../common/decorators/roles.decorator';

@ApiTags('promotions')
@Controller('promotions/reports')
export class ReportsController {
  constructor(private readonly reports: ReportsService) {}

  @Roles('SUPER_ADMIN', 'MARKETING_MANAGER', 'FINANCE_READONLY')
  @Get('coupons')
  allCoupons() {
    return this.reports.allCouponPerformance();
  }

  @Roles('SUPER_ADMIN', 'MARKETING_MANAGER', 'FINANCE_READONLY')
  @Get('coupons/:id')
  oneCoupon(@Param('id') id: string) {
    return this.reports.couponPerformance(id);
  }
}