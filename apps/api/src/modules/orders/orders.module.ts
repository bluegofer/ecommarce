// apps/api/src/modules/orders/orders.module.ts
import { Module } from '@nestjs/common';
import { OrdersService } from './orders.service';
import { OrdersController } from './orders.controller';
import { CheckoutService } from './checkout.service';
import { CheckoutController } from './checkout.controller';
import { InvoiceService } from './invoice.service';
import { InventoryModule } from '../inventory/inventory.module';
import { PromotionsModule } from '../promotions/promotions.module';
import { CrmModule } from '../crm/crm.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { CartsModule } from '../carts/carts.module';

@Module({
  imports: [
    InventoryModule,
    PromotionsModule,
    CrmModule,
    NotificationsModule,
    CartsModule,
  ],
  controllers: [OrdersController, CheckoutController],
  providers: [OrdersService, CheckoutService, InvoiceService],
  exports: [OrdersService, CheckoutService, InvoiceService],
})
export class OrdersModule {}