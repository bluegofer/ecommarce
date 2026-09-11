// apps/api/src/modules/crm/crm.module.ts
import { Module } from '@nestjs/common';
import { CustomersService } from './customers.service';
import { CustomersController } from './customers.controller';
import { SegmentsService } from './segments.service';
import { SegmentsController } from './segments.controller';

@Module({
  controllers: [CustomersController, SegmentsController],
  providers: [CustomersService, SegmentsService],
  exports: [CustomersService, SegmentsService],
})
export class CrmModule {}