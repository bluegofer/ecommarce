// apps/api/src/modules/notifications/back-in-stock.controller.ts
import { Body, Controller, Param, Post } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { BackInStockService } from './back-in-stock.service';
import { Public } from '../../common/decorators/public.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { BackInStockSubscribeDto } from '@ecommarce/types';

interface RequestUser {
  userId: string;
  roles: string[];
}

@ApiTags('notifications')
@Controller('notifications/back-in-stock')
export class BackInStockController {
  constructor(private readonly svc: BackInStockService) {}

  @Public()
  @Post('subscribe')
  async subscribe(
    @Body() dto: BackInStockSubscribeDto,
    @CurrentUser() user: RequestUser | null,
  ) {
    // customerId resolution left to the service caller in Step 6; safe stub:
    const customerId = user?.userId ?? null;
    return this.svc.subscribe(dto, customerId);
  }

  @Roles('SUPER_ADMIN', 'CATALOG_MANAGER')
  @Post('notify/:variantId')
  notify(@Param('variantId') variantId: string) {
    return this.svc.notifyForVariant(variantId);
  }
}