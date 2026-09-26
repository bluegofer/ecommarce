// apps/api/src/modules/suppliers/suppliers.controller.ts
import { Body, Controller, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { SuppliersService } from './suppliers.service';
import type { CreateSupplierInput, UpdateSupplierInput, RecordSupplierPaymentInput } from '@ecommarce/types';

@Controller('suppliers')
@UseGuards(JwtAuthGuard, RolesGuard)
export class SuppliersController {
  constructor(private readonly svc: SuppliersService) {}

  @Get()
  @Roles('SUPER_ADMIN', 'PURCHASE_MANAGER', 'FINANCE_MANAGER', 'FINANCE_READONLY')
  list(
    @Query('status') status?: string,
    @Query('q') q?: string,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
  ) {
    return this.svc.list({
      status, q,
      limit: limit ? parseInt(limit, 10) : undefined,
      offset: offset ? parseInt(offset, 10) : undefined,
    });
  }

  @Get(':id')
  @Roles('SUPER_ADMIN', 'PURCHASE_MANAGER', 'FINANCE_MANAGER', 'FINANCE_READONLY')
  findOne(@Param('id') id: string) { return this.svc.findById(id); }

  @Post()
  @Roles('SUPER_ADMIN', 'PURCHASE_MANAGER')
  create(@Body() body: CreateSupplierInput) { return this.svc.create(body); }

  @Patch(':id')
  @Roles('SUPER_ADMIN', 'PURCHASE_MANAGER')
  update(@Param('id') id: string, @Body() body: UpdateSupplierInput) {
    return this.svc.update(id, body);
  }

  @Post('payments')
  @Roles('SUPER_ADMIN', 'FINANCE_MANAGER', 'PURCHASE_MANAGER')
  recordPayment(@Body() body: RecordSupplierPaymentInput) { return this.svc.recordPayment(body); }

  @Get(':id/payments')
  @Roles('SUPER_ADMIN', 'PURCHASE_MANAGER', 'FINANCE_MANAGER', 'FINANCE_READONLY')
  payments(@Param('id') id: string) { return this.svc.paymentHistory(id); }

  @Get(':id/performance')
  @Roles('SUPER_ADMIN', 'PURCHASE_MANAGER', 'FINANCE_MANAGER', 'FINANCE_READONLY')
  performance(@Param('id') id: string) { return this.svc.performance(id); }
}