// apps/api/src/modules/notifications/notifications.module.ts
import { Module } from '@nestjs/common';
import { TemplatesService } from './templates.service';
import { TemplatesController } from './templates.controller';
import { DispatchService } from './dispatch.service';
import { DispatchController } from './dispatch.controller';
import { BackInStockService } from './back-in-stock.service';
import { BackInStockController } from './back-in-stock.controller';
import { SchedulersService } from './schedulers.service';
import { MessagingModule } from '../messaging/messaging.module';

@Module({
  imports: [MessagingModule],
  controllers: [TemplatesController, DispatchController, BackInStockController],
  providers: [TemplatesService, DispatchService, BackInStockService, SchedulersService],
  exports: [TemplatesService, DispatchService, BackInStockService],
})
export class NotificationsModule {}