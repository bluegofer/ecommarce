// apps/api/src/modules/crm/me.controller.ts
import { Body, Controller, Delete, Get, Param, Patch, Post } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { MeService, type UpsertAddressDto } from './me.service';
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
}