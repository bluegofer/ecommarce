// apps/api/src/modules/cms/media-library.controller.ts
import { Body, Controller, Delete, Get, Param, Post } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { MediaLibraryService } from './media-library.service';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { CreateMediaItemDto } from '@ecommarce/types';

interface RequestUser {
  userId: string;
  roles: string[];
}

@ApiTags('cms')
@Controller('cms/media-library')
export class MediaLibraryController {
  constructor(private readonly svc: MediaLibraryService) {}

  @Roles('SUPER_ADMIN', 'MARKETING_MANAGER', 'CATALOG_MANAGER')
  @Get()
  list() {
    return this.svc.list();
  }

  @Roles('SUPER_ADMIN', 'MARKETING_MANAGER', 'CATALOG_MANAGER')
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.svc.findOne(id);
  }

  @Roles('SUPER_ADMIN', 'MARKETING_MANAGER', 'CATALOG_MANAGER')
  @Post()
  create(@Body() dto: CreateMediaItemDto, @CurrentUser() user: RequestUser | null) {
    return this.svc.create(dto, user?.userId ?? null);
  }

  @Roles('SUPER_ADMIN', 'MARKETING_MANAGER', 'CATALOG_MANAGER')
  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.svc.remove(id);
  }
}