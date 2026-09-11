// apps/api/src/modules/inventory/inventory.controller.ts
import { Body, Controller, Get, Param, Post, Res } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { StockService } from './stock.service';
import { ReservationsService } from './reservations.service';
import { AdjustmentsService } from './adjustments.service';
import { Public } from '../../common/decorators/public.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { AdjustStockDto, ReserveStockDto } from '@ecommarce/types';
import type { Response } from 'express';

interface RequestUser {
  userId: string;
  roles: string[];
}

@ApiTags('inventory')
@Controller('inventory')
export class InventoryController {
  constructor(
    private readonly stock: StockService,
    private readonly reservations: ReservationsService,
    private readonly adjustments: AdjustmentsService,
  ) {}

  @Public()
  @Get('variants/:id/stock')
  async getStock(@Param('id') id: string) {
    const stock = await this.stock.getStock(id);
    const available = await this.reservations.getAvailable(id);
    return { variantId: id, stock, available };
  }

  @Roles('SUPER_ADMIN', 'CATALOG_MANAGER', 'ORDER_SUPPORT')
  @Get('low-stock')
  lowStock() {
    return this.stock.lowStockList();
  }

  @Roles('SUPER_ADMIN', 'CATALOG_MANAGER')
  @Post('adjust')
  adjust(@Body() dto: AdjustStockDto, @CurrentUser() user: RequestUser | null) {
    return this.adjustments.adjust(dto, user?.userId ?? null);
  }

  @Roles('SUPER_ADMIN', 'CATALOG_MANAGER', 'ORDER_SUPPORT')
  @Get('adjustments/:variantId')
  listAdjustments(@Param('variantId') variantId: string) {
    return this.adjustments.listByVariant(variantId);
  }

  @Roles('SUPER_ADMIN', 'CATALOG_MANAGER', 'FINANCE_READONLY')
  @Get('valuation.csv')
  async valuation(@Res() res: Response) {
    const csv = await this.adjustments.valuationCsv();
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename="inventory-valuation.csv"');
    res.send(csv);
  }

  @Public()
  @Post('reserve')
  reserve(@Body() dto: ReserveStockDto) {
    return this.reservations.reserve(dto.variantId, dto.quantity, dto.ttlSeconds);
  }

  @Public()
  @Post('release/:variantId/:reservationId')
  release(
    @Param('variantId') variantId: string,
    @Param('reservationId') reservationId: string,
  ) {
    return this.reservations.release(variantId, reservationId);
  }
}