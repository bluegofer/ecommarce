import { Module } from '@nestjs/common';
import { PosService } from './pos.service';
import { PosReturnsService } from './pos-returns.service';
import { PosReportsService } from './pos-reports.service';
import { PosController } from './pos.controller';
import { AccountingModule } from '../accounting/accounting.module';

// DatabaseModule is @Global() so PrismaService is available without import.
@Module({
  imports: [AccountingModule],
  controllers: [PosController],
  providers: [PosService, PosReturnsService, PosReportsService],
  exports: [PosService, PosReturnsService, PosReportsService],
})
export class PosModule {}