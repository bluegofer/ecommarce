// apps/api/src/modules/rma/rma.module.ts
import { Module } from '@nestjs/common';
import { ReturnsService } from './returns.service';
import { ReturnsController } from './returns.controller';
import { TicketsService } from './tickets.service';
import { TicketsController } from './tickets.controller';
import { InventoryModule } from '../inventory/inventory.module';

@Module({
  imports: [InventoryModule],
  controllers: [ReturnsController, TicketsController],
  providers: [ReturnsService, TicketsService],
  exports: [ReturnsService, TicketsService],
})
export class RmaModule {}