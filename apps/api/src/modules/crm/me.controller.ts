// apps/api/src/modules/crm/me.controller.ts
import { Body, Controller, Delete, Get, Param, Patch, Post } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { MeService, type UpsertAddressDto } from './me.service';
import {
  ChangePhoneDto,
  VerifyCurrentPhoneDto,
} from './dto/change-phone.dto';
import { AddWishlistItemDto, MergeWishlistDto } from './dto/wishlist.dto';
import { CurrentUser, type AuthUser } from '../../common/decorators/current-user.decorator';

interface UpdateProfileBody {
  fullName?: string;
  email?: string | null;
}

@ApiTags('me')
@Controller('me')
export class MeController {
  constructor(private readonly me: MeService) {}

  @Get()
  getProfile(@CurrentUser() user: AuthUser) {
    return this.me.getProfile(user.userId);
  }

  @Patch()
  updateProfile(@CurrentUser() user: AuthUser, @Body() body: UpdateProfileBody) {
    return this.me.updateProfile(user.userId, body);
  }

  /**
   * Change phone with OTP verification.
   * Prerequisite: caller must have requested OTP for `newPhone`
   * via POST /auth/otp/request.
   */
  @Post('phone/change')
  changePhone(@CurrentUser() user: AuthUser, @Body() dto: ChangePhoneDto) {
    return this.me.changePhone(user.userId, dto);
  }

  /**
   * Verify the currently-held phone.
   * Prerequisite: caller must have requested OTP for their current phone
   * via POST /auth/otp/request.
   */
  @Post('phone/verify')
  verifyCurrentPhone(
    @CurrentUser() user: AuthUser,
    @Body() dto: VerifyCurrentPhoneDto,
  ) {
    return this.me.verifyCurrentPhone(user.userId, dto.otp);
  }

  @Get('addresses')
  listAddresses(@CurrentUser() user: AuthUser) {
    return this.me.listAddresses(user.userId);
  }

  @Post('addresses')
  createAddress(@CurrentUser() user: AuthUser, @Body() dto: UpsertAddressDto) {
    return this.me.createAddress(user.userId, dto);
  }

  @Patch('addresses/:id')
  updateAddress(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() dto: UpsertAddressDto,
  ) {
    return this.me.updateAddress(user.userId, id, dto);
  }

  @Delete('addresses/:id')
  deleteAddress(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.me.deleteAddress(user.userId, id);
  }

  // ────────────────────────────────────────────────────────────
  // Wishlist (T1-6)
  // ────────────────────────────────────────────────────────────

  @Get('wishlist')
  listWishlist(@CurrentUser() user: AuthUser) {
    return this.me.listWishlist(user.userId);
  }

  @Post('wishlist')
  addWishlist(
    @CurrentUser() user: AuthUser,
    @Body() dto: AddWishlistItemDto,
  ) {
    return this.me.addWishlistItem(user.userId, dto);
  }

  @Delete('wishlist/:productId')
  removeWishlist(
    @CurrentUser() user: AuthUser,
    @Param('productId') productId: string,
  ) {
    return this.me.removeWishlistItem(user.userId, productId);
  }

  @Post('wishlist/merge')
  mergeWishlist(
    @CurrentUser() user: AuthUser,
    @Body() dto: MergeWishlistDto,
  ) {
    return this.me.mergeWishlist(user.userId, dto);
  }
}