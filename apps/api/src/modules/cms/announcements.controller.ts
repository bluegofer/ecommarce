// apps/api/src/modules/cms/announcements.controller.ts
import { Body, Controller, Delete, Get, Param, Patch, Post } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { AnnouncementsService } from './announcements.service';
import { Public } from '../../common/decorators/public.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import type { CreateAnnouncementDto, UpdateAnnouncementDto } from '@ecommarce/types';

@ApiTags('cms')
@Controller('cms/announcements')
export class AnnouncementsController {
  constructor(private readonly svc: AnnouncementsService) {}

  @Public()
  @Get('active')
  listActive() {
    return this.svc.listActive();
  }

  @Roles('SUPER_ADMIN', 'MARKETING_MANAGER')
  @Get()
  list() {
    return this.svc.list();
  }

  @Roles('SUPER_ADMIN', 'MARKETING_MANAGER')
  @Post()
  create(@Body() dto: CreateAnnouncementDto) {
    return this.svc.create(dto);
  }

  @Roles('SUPER_ADMIN', 'MARKETING_MANAGER')
  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateAnnouncementDto) {
    return this.svc.update(id, dto);
  }

  @Roles('SUPER_ADMIN', 'MARKETING_MANAGER')
  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.svc.remove(id);
  }
}