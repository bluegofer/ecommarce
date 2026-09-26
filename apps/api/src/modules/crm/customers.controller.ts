// apps/api/src/modules/crm/customers.controller.ts
import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { CustomersService } from './customers.service';
import { Roles } from '../../common/decorators/roles.decorator';
import { Public } from '../../common/decorators/public.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { AddCustomerNoteDto } from '@ecommarce/types';

interface RequestUser {
  userId: string;
  roles: string[];
}

@ApiTags('crm')
@Controller('crm/customers')
export class CustomersController {
  constructor(private readonly customers: CustomersService) {}

  @Public()
  @Get('lookup')
  lookupByPhone(@Query('phone') phone: string) {
    return this.customers.lookupByPhone(phone);
  }

  @Roles('SUPER_ADMIN', 'ORDER_SUPPORT', 'FINANCE_READONLY')
  @Get()
  list(
    @Query('q') q?: string,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
  ) {
    const p = page ? Math.max(1, parseInt(page, 10) || 1) : 1;
    const ps = pageSize ? Math.min(100, Math.max(1, parseInt(pageSize, 10) || 20)) : 20;
    return this.customers.list(q, p, ps);
  }

  @Roles('SUPER_ADMIN', 'ORDER_SUPPORT', 'FINANCE_READONLY')
  @Get(':id/profile')
  profile(@Param('id') id: string) {
    return this.customers.profile(id);
  }

  @Roles('SUPER_ADMIN', 'ORDER_SUPPORT', 'FINANCE_READONLY')
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.customers.findOne(id);
  }

  @Roles('SUPER_ADMIN', 'ORDER_SUPPORT')
  @Post(':id/notes')
  addNote(
    @Param('id') id: string,
    @Body() dto: AddCustomerNoteDto,
    @CurrentUser() user: RequestUser | null,
  ) {
    return this.customers.addNote(id, dto, user?.userId ?? null);
  }
}