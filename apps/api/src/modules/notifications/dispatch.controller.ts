// apps/api/src/modules/notifications/dispatch.controller.ts
import { Body, Controller, Get, Post, Query } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { DispatchService } from './dispatch.service';
import { Roles } from '../../common/decorators/roles.decorator';
import { Public } from '../../common/decorators/public.decorator';
import { PrismaService } from '../../database/prisma.service';
import type { DispatchNotificationDto } from '@ecommarce/types';

@ApiTags('notifications')
@Controller('notifications')
export class DispatchController {
  constructor(
    private readonly svc: DispatchService,
    private readonly prisma: PrismaService,
  ) {}

  @Roles('SUPER_ADMIN', 'MARKETING_MANAGER')
  @Post('dispatch')
  dispatch(@Body() dto: DispatchNotificationDto) {
    return this.svc.dispatch(dto);
  }

  @Roles('SUPER_ADMIN', 'MARKETING_MANAGER', 'ORDER_SUPPORT')
  @Get('log')
  async log(@Query('orderId') orderId?: string) {
    return this.prisma.notificationLog.findMany({
      where: orderId ? { orderId } : undefined,
      orderBy: { createdAt: 'desc' },
      take: 200,
    });
  }
}