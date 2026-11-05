// apps/api/src/modules/cms/sections.controller.ts
import { Body, Controller, Delete, Get, Param, Patch, Post } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { SectionsService } from './sections.service';
import { Public } from '../../common/decorators/public.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import type {
  CreateCmsSectionDto,
  ReorderSectionsDto,
  UpdateCmsSectionDto,
} from '@ecommarce/types';

@ApiTags('cms')
@Controller('cms/sections')
export class SectionsController {
  constructor(private readonly sections: SectionsService) {}

  @Public()
  @Get('visible')
  listVisible() {
    return this.sections.listVisible();
  }

  @Roles('SUPER_ADMIN', 'MARKETING_MANAGER')
  @Get()
  list() {
    return this.sections.list();
  }

  @Roles('SUPER_ADMIN', 'MARKETING_MANAGER')
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.sections.findOne(id);
  }

  @Roles('SUPER_ADMIN', 'MARKETING_MANAGER')
  @Post()
  create(@Body() dto: CreateCmsSectionDto) {
    return this.sections.create(dto);
  }

  @Roles('SUPER_ADMIN', 'MARKETING_MANAGER')
  @Post('reorder')
  reorder(@Body() dto: ReorderSectionsDto) {
    return this.sections.reorder(dto);
  }

  @Roles('SUPER_ADMIN', 'MARKETING_MANAGER')
  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateCmsSectionDto) {
    return this.sections.update(id, dto);
  }

  @Roles('SUPER_ADMIN', 'MARKETING_MANAGER')
  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.sections.remove(id);
  }
}