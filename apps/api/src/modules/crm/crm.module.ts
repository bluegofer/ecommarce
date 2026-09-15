// apps/api/src/modules/crm/crm.module.ts
import { Module } from '@nestjs/common';
import { CustomersService } from './customers.service';
import { CustomersController } from './customers.controller';
import { SegmentsService } from './segments.service';
import { SegmentsController } from './segments.controller';
import { MeService } from './me.service';
import { MeController } from './me.controller';

@Module({
  controllers: [CustomersController, SegmentsController, MeController],
  providers: [CustomersService, SegmentsService, MeService],
  exports: [CustomersService, SegmentsService, MeService],
})
export class CrmModule {}