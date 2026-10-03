// apps/api/src/modules/notifications/templates.controller.ts
import { Body, Controller, Delete, Get, Param, Post } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { TemplatesService } from './templates.service';
import { Roles } from '../../common/decorators/roles.decorator';
import type { NotificationChannel, UpsertNotificationTemplateDto } from '@ecommarce/types';

@ApiTags('notifications')
@Controller('notifications/templates')
export class TemplatesController {
  constructor(private readonly svc: TemplatesService) {}

  @Roles('SUPER_ADMIN', 'MARKETING_MANAGER')
  @Get()
  list() {
    return this.svc.list();
  }

  @Roles('SUPER_ADMIN', 'MARKETING_MANAGER')
  @Post()
  upsert(@Body() dto: UpsertNotificationTemplateDto) {
    return this.svc.upsert(dto);
  }

  @Roles('SUPER_ADMIN', 'MARKETING_MANAGER')
  @Delete(':key/:channel')
  remove(@Param('key') key: string, @Param('channel') channel: string) {
    return this.svc.remove(key, channel.toUpperCase() as NotificationChannel);
  }
}