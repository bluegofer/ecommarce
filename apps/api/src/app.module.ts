import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_FILTER, APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';

import { default as configuration } from './config/configuration';
import { DatabaseModule } from './database/database.module';
import { HealthController } from './common/health.controller';
import { GlobalExceptionFilter } from './common/filters/http-exception.filter';
import { JwtAuthGuard } from './common/guards/jwt-auth.guard';
import { AuditInterceptor } from './common/interceptors/audit.interceptor';
import { IdempotencyInterceptor } from './common/interceptors/idempotency.interceptor';
import { AuthModule } from './modules/auth/auth.module';
import { JobsModule } from './modules/jobs/jobs.module';
import { CatalogModule } from './modules/catalog/catalog.module';
import { InventoryModule } from './modules/inventory/inventory.module';
import { SearchModule } from './modules/search/search.module';
import { PromotionsModule } from './modules/promotions/promotions.module';
import { CmsModule } from './modules/cms/cms.module';
import { CartsModule } from './modules/carts/carts.module';
import { CrmModule } from './modules/crm/crm.module';
import { NotificationsModule } from './modules/notifications/notifications.module';
import { MessagingModule } from './modules/messaging/messaging.module';
import { OrdersModule } from './modules/orders/orders.module';
import { ReviewsModule } from './modules/reviews/reviews.module';
import { RmaModule } from './modules/rma/rma.module';
import { AnalyticsModule } from './modules/analytics/analytics.module';
import { AccountingModule } from './modules/accounting/accounting.module';
import { SuppliersModule } from './modules/suppliers/suppliers.module';
import { PurchaseModule } from './modules/purchase/purchase.module';
import { HrModule } from './modules/hr/hr.module';
import { PosModule } from './modules/pos/pos.module';
import { PaymentsModule } from './modules/payments/payments.module';
import { CourierModule } from './modules/courier/courier.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env', '../../.env'],
      load: [configuration],
    }),
    // F-04 (Step 15.8.4): global rate limiting per TDD section 10.3.
    // Default 100 req/min per IP; sensitive endpoints override via @Throttle().
    // Note: no `name` key -- v6 auto-assigns 'default' which is what
    // @Throttle({ default: {...} }) keys against. Explicitly setting
    // `name: 'default'` caused per-route overrides to silently skip.
    ThrottlerModule.forRoot([
      {
        ttl: 60_000,
        limit: 100,
      },
    ]),
    DatabaseModule,
    AuthModule,
    JobsModule,
    CatalogModule,
    InventoryModule,
    SearchModule,
    PromotionsModule,
    CmsModule,
    NotificationsModule,
    MessagingModule,
    CrmModule,
    CartsModule,
    OrdersModule,
    ReviewsModule,
    RmaModule,
    AnalyticsModule,
    AccountingModule,
    SuppliersModule,
    PurchaseModule,
    HrModule,
    PosModule,
    PaymentsModule,
    CourierModule,
  ],
  controllers: [HealthController],
  providers: [
    // F-04 (Step 15.8.4): ThrottlerGuard runs first -- rejects floods before JWT parsing.
    { provide: APP_GUARD, useClass: ThrottlerGuard },
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_INTERCEPTOR, useClass: AuditInterceptor },
    { provide: APP_INTERCEPTOR, useClass: IdempotencyInterceptor },
    { provide: APP_FILTER, useClass: GlobalExceptionFilter },
  ],
})
export class AppModule {}