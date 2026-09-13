// apps/api/src/modules/orders/orders.module.ts
import { Module } from '@nestjs/common';
import { OrdersService } from './orders.service';
import { OrdersController } from './orders.controller';
import { CheckoutService } from './checkout.service';
import { CheckoutController } from './checkout.controller';
import { InvoiceService } from './invoice.service';
import { MeOrdersService } from './me-orders.service';
import { MeOrdersController } from './me-orders.controller';
import { InventoryModule } from '../inventory/inventory.module';
import { PromotionsModule } from '../promotions/promotions.module';
import { CrmModule } from '../crm/crm.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { CartsModule } from '../carts/carts.module';
import { CourierModule } from '../courier/courier.module';
import { LedgerService } from '../accounting/services/ledger.service';

@Module({
  imports: [
    InventoryModule,
    PromotionsModule,
    CrmModule,
    NotificationsModule,
    CartsModule,
    CourierModule,
  ],
  controllers: [OrdersController, CheckoutController, MeOrdersController],
  providers: [OrdersService, CheckoutService, InvoiceService, MeOrdersService, LedgerService],
  exports: [OrdersService, CheckoutService, InvoiceService, MeOrdersService],
})
export class OrdersModule {}