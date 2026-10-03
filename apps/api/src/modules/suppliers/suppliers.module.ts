// apps/api/src/modules/suppliers/suppliers.module.ts
import { Module } from '@nestjs/common';
import { SuppliersService } from './suppliers.service';
import { SuppliersController } from './suppliers.controller';
import { PrismaService } from '../../database/prisma.service';
import { LedgerService } from '../accounting/services/ledger.service';
import { MessagingModule } from '../messaging/messaging.module';

@Module({
  imports: [MessagingModule],
  controllers: [SuppliersController],
  providers: [PrismaService, LedgerService, SuppliersService],
  exports: [SuppliersService],
})
export class SuppliersModule {}
