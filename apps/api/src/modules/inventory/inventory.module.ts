// apps/api/src/modules/inventory/inventory.module.ts
import { Module } from '@nestjs/common';
import { StockService } from './stock.service';
import { ReservationsService } from './reservations.service';
import { AdjustmentsService } from './adjustments.service';
import { InventoryController } from './inventory.controller';

@Module({
  controllers: [InventoryController],
  providers: [StockService, ReservationsService, AdjustmentsService],
  exports: [StockService, ReservationsService, AdjustmentsService],
})
export class InventoryModule {}