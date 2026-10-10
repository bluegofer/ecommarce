// apps/api/src/modules/crm/segments.controller.ts
import { Body, Controller, Delete, Get, Param, Patch, Post } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { SegmentsService } from './segments.service';
import { Roles } from '../../common/decorators/roles.decorator';
import type { CreateSegmentDto, UpdateSegmentDto } from '@ecommarce/types';

@ApiTags('crm')
@Controller('crm/segments')
export class SegmentsController {
  constructor(private readonly svc: SegmentsService) {}

  @Roles('SUPER_ADMIN', 'MARKETING_MANAGER', 'ORDER_SUPPORT')
  @Get()
  list() {
    return this.svc.list();
  }

  @Roles('SUPER_ADMIN', 'MARKETING_MANAGER', 'ORDER_SUPPORT')
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.svc.findOne(id);
  }

  @Roles('SUPER_ADMIN', 'MARKETING_MANAGER', 'ORDER_SUPPORT')
  @Get(':id/members')
  members(@Param('id') id: string) {
    return this.svc.members(id);
  }

  @Roles('SUPER_ADMIN', 'MARKETING_MANAGER')
  @Post()
  create(@Body() dto: CreateSegmentDto) {
    return this.svc.create(dto);
  }

  @Roles('SUPER_ADMIN', 'MARKETING_MANAGER')
  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateSegmentDto) {
    return this.svc.update(id, dto);
  }

  @Roles('SUPER_ADMIN', 'MARKETING_MANAGER')
  @Post(':id/refresh')
  refresh(@Param('id') id: string) {
    return this.svc.refresh(id);
  }

  @Roles('SUPER_ADMIN', 'MARKETING_MANAGER')
  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.svc.remove(id);
  }
}