// apps/api/src/modules/promotions/flash-sales.controller.ts
import { Body, Controller, Delete, Get, Param, Patch, Post } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { FlashSalesService } from './flash-sales.service';
import { Roles } from '../../common/decorators/roles.decorator';
import { Public } from '../../common/decorators/public.decorator';
import type { CreateFlashSaleDto, UpdateFlashSaleDto } from '@ecommarce/types';

@ApiTags('promotions')
@Controller('flash-sales')
export class FlashSalesController {
  constructor(private readonly svc: FlashSalesService) {}

  @Public()
  @Get('active')
  listActive() {
    return this.svc.listActive();
  }

  @Roles('SUPER_ADMIN', 'MARKETING_MANAGER')
  @Get()
  list() {
    return this.svc.list();
  }

  @Public()
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.svc.findOne(id);
  }

  @Roles('SUPER_ADMIN', 'MARKETING_MANAGER')
  @Post()
  create(@Body() dto: CreateFlashSaleDto) {
    return this.svc.create(dto);
  }

  @Roles('SUPER_ADMIN', 'MARKETING_MANAGER')
  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateFlashSaleDto) {
    return this.svc.update(id, dto);
  }

  @Roles('SUPER_ADMIN', 'MARKETING_MANAGER')
  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.svc.remove(id);
  }

  /**
   * Server-synced countdown source for the deals page.
   * Returns serverNow plus every active sale window so clients can compute a
   * clock offset and avoid trusting the local clock.
   */
  @Public()
  @Get('sync/now')
  sync() {
    return { serverNow: new Date().toISOString() };
  }
}