// packages/api/src/modules/accounting/accounting.module.ts
import { Module } from '@nestjs/common';
import { ChartOfAccountsService } from './services/chart-of-accounts.service';
import { LedgerService } from './services/ledger.service';
import { ReportsService } from './services/reports.service';
import { AccountingController } from './controllers/accounting.controller';
import { PrismaService } from '../../database/prisma.service';

@Module({
  controllers: [AccountingController],
  providers: [PrismaService, ChartOfAccountsService, LedgerService, ReportsService],
  exports: [ChartOfAccountsService, LedgerService, ReportsService],
})
export class AccountingModule {}