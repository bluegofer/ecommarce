// apps/api/src/modules/promotions/coupons.controller.ts
import { Body, Controller, Delete, Get, Param, Patch, Post } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { CouponsService } from './coupons.service';
import { Roles } from '../../common/decorators/roles.decorator';
import { Public } from '../../common/decorators/public.decorator';
import type { CreateCouponDto, UpdateCouponDto } from '@ecommarce/types';

@ApiTags('promotions')
@Controller('coupons')
export class CouponsController {
  constructor(private readonly coupons: CouponsService) {}

  @Roles('SUPER_ADMIN', 'MARKETING_MANAGER')
  @Get()
  list() {
    return this.coupons.list();
  }

  @Public()
  @Get('code/:code')
  findByCode(@Param('code') code: string) {
    return this.coupons.findByCode(code);
  }

  @Roles('SUPER_ADMIN', 'MARKETING_MANAGER')
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.coupons.findOne(id);
  }

  @Roles('SUPER_ADMIN', 'MARKETING_MANAGER')
  @Post()
  create(@Body() dto: CreateCouponDto) {
    return this.coupons.create(dto);
  }

  @Roles('SUPER_ADMIN', 'MARKETING_MANAGER')
  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateCouponDto) {
    return this.coupons.update(id, dto);
  }

  @Roles('SUPER_ADMIN', 'MARKETING_MANAGER')
  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.coupons.remove(id);
  }
}