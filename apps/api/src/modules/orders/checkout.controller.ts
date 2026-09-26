// apps/api/src/modules/orders/checkout.controller.ts
import { Body, Controller, Post } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { CheckoutService } from './checkout.service';
import { Public } from '../../common/decorators/public.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { PlaceOrderDto } from '@ecommarce/types';

interface RequestUser {
  userId: string;
  roles: string[];
}

@ApiTags('orders')
@Controller('checkout')
export class CheckoutController {
  constructor(private readonly checkout: CheckoutService) {}

  @Public()
  @Throttle({ default: { limit: 10, ttl: 60_000 } }) // F-04: order spam / inventory DoS protection
  @Post('place-order')
  place(@Body() dto: PlaceOrderDto, @CurrentUser() user: RequestUser | null) {
    return this.checkout.placeOrder(dto, user?.userId ?? null);
  }
}