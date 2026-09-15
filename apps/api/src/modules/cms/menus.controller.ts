// apps/api/src/modules/cms/menus.controller.ts
import { Body, Controller, Delete, Get, Param, Patch, Post } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { MenusService } from './menus.service';
import { Public } from '../../common/decorators/public.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import type { CmsMenuLocation, UpsertMenuItemDto } from '@ecommarce/types';

@ApiTags('cms')
@Controller('cms/menus')
export class MenusController {
  constructor(private readonly menus: MenusService) {}

  @Public()
  @Get(':location')
  get(@Param('location') location: string) {
    return this.menus.getByLocation(location.toUpperCase() as CmsMenuLocation);
  }

  @Roles('SUPER_ADMIN', 'MARKETING_MANAGER')
  @Post(':location')
  upsert(@Param('location') location: string, @Body() body: { name: string }) {
    return this.menus.upsertMenu(location.toUpperCase() as CmsMenuLocation, body.name);
  }

  @Roles('SUPER_ADMIN', 'MARKETING_MANAGER')
  @Post(':location/items')
  addItem(@Param('location') location: string, @Body() dto: UpsertMenuItemDto) {
    return this.menus.addItem(location.toUpperCase() as CmsMenuLocation, dto);
  }

  @Roles('SUPER_ADMIN', 'MARKETING_MANAGER')
  @Patch('items/:id')
  updateItem(@Param('id') id: string, @Body() dto: Partial<UpsertMenuItemDto>) {
    return this.menus.updateItem(id, dto);
  }

  @Roles('SUPER_ADMIN', 'MARKETING_MANAGER')
  @Delete('items/:id')
  removeItem(@Param('id') id: string) {
    return this.menus.removeItem(id);
  }
}