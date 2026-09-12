// apps/api/src/modules/purchase/purchase.module.ts
import { Module } from '@nestjs/common';
import { RequisitionsService } from './requisitions.service';
import { PurchaseOrdersService } from './purchase-orders.service';
import { PurchaseInvoicesService } from './purchase-invoices.service';
import { GRNService } from './grn.service';
import { PrismaService } from '../../database/prisma.service';
import { LedgerService } from '../accounting/services/ledger.service';

@Module({
  providers: [
    PrismaService,
    LedgerService,
    RequisitionsService,
    PurchaseOrdersService,
    PurchaseInvoicesService,
    GRNService,
  ],
  exports: [RequisitionsService, PurchaseOrdersService, PurchaseInvoicesService, GRNService],
})
export class PurchaseModule {}