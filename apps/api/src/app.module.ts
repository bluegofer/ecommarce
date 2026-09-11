import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_FILTER, APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';

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

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env', '../../.env'],
      load: [configuration],
    }),
    DatabaseModule,
    AuthModule,
    JobsModule,
    CatalogModule,
    InventoryModule,
    SearchModule,
  ],
  controllers: [HealthController],
  providers: [
    // Global guards
    { provide: APP_GUARD, useClass: JwtAuthGuard },

    // Global interceptors (order matters: audit → idempotency)
    { provide: APP_INTERCEPTOR, useClass: AuditInterceptor },
    { provide: APP_INTERCEPTOR, useClass: IdempotencyInterceptor },

    // Global filters
    { provide: APP_FILTER, useClass: GlobalExceptionFilter },
  ],
})
export class AppModule {}