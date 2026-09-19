// apps/api/src/modules/carts/carts.controller.ts
import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { CartsService } from './carts.service';
import { Public } from '../../common/decorators/public.decorator';
import type { AddCartItemDto, ApplyCouponDto, UpdateCartItemDto } from '@ecommarce/types';

@ApiTags('orders')
@Controller('carts')
export class CartsController {
  constructor(private readonly carts: CartsService) {}

  @Public()
  @Get('guest')
  async getGuest(@Query('token') token?: string) {
    if (!token) {
      const cart = await this.carts.getOrCreateByGuestToken();
      return this.carts.getCartById(cart.id);
    }
    const existing = await this.carts.getByGuestToken(token);
    if (existing) return existing;
    const cart = await this.carts.getOrCreateByGuestToken(token);
    return this.carts.getCartById(cart.id);
  }

  @Public()
  @Get(':id')
  get(@Param('id') id: string) {
    return this.carts.getCartById(id);
  }

  @Public()
  @Post(':id/items')
  addItem(@Param('id') id: string, @Body() dto: AddCartItemDto) {
    return this.carts.addItem(id, dto);
  }

  @Public()
  @Patch(':id/items/:itemId')
  updateItem(
    @Param('id') id: string,
    @Param('itemId') itemId: string,
    @Body() dto: UpdateCartItemDto,
  ) {
    return this.carts.updateItem(id, itemId, dto);
  }

  @Public()
  @Delete(':id/items/:itemId')
  removeItem(@Param('id') id: string, @Param('itemId') itemId: string) {
    return this.carts.removeItem(id, itemId);
  }

  @Public()
  @Post(':id/coupon')
  applyCoupon(@Param('id') id: string, @Body() dto: ApplyCouponDto) {
    return this.carts.applyCoupon(id, dto);
  }
}