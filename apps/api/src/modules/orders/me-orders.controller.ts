// apps/api/src/modules/orders/me-orders.controller.ts
import { Controller, Get, Param } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { MeOrdersService } from './me-orders.service';
import { CurrentUser, type AuthUser } from '../../common/decorators/current-user.decorator';

@ApiTags('me-orders')
@Controller('me/orders')
export class MeOrdersController {
  constructor(private readonly meOrders: MeOrdersService) {}

  @Get()
  list(@CurrentUser() user: AuthUser) {
    return this.meOrders.list(user.userId);
  }

  @Get(':id')
  findOne(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.meOrders.findOne(user.userId, id);
  }
}