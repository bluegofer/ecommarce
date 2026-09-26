// apps/api/src/modules/cms/pages.controller.ts
import { Body, Controller, Delete, Get, Param, ParseIntPipe, Patch, Post } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { PagesService } from './pages.service';
import { Public } from '../../common/decorators/public.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import type { CreateCmsPageDto, UpdateCmsPageDto } from '@ecommarce/types';

@ApiTags('cms')
@Controller('cms/pages')
export class PagesController {
  constructor(private readonly pages: PagesService) {}

  @Public()
  @Get('slug/:slug')
  findBySlug(@Param('slug') slug: string) {
    return this.pages.findBySlug(slug);
  }

  @Roles('SUPER_ADMIN', 'MARKETING_MANAGER')
  @Get()
  list() {
    return this.pages.list();
  }

  @Roles('SUPER_ADMIN', 'MARKETING_MANAGER')
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.pages.findOne(id);
  }

  @Roles('SUPER_ADMIN', 'MARKETING_MANAGER')
  @Get(':id/revisions')
  listRevisions(@Param('id') id: string) {
    return this.pages.listRevisions(id);
  }

  @Roles('SUPER_ADMIN', 'MARKETING_MANAGER')
  @Post(':id/revisions/:revisionNumber/restore')
  restore(
    @Param('id') id: string,
    @Param('revisionNumber', ParseIntPipe) revisionNumber: number,
  ) {
    return this.pages.restoreRevision(id, revisionNumber);
  }

  @Roles('SUPER_ADMIN', 'MARKETING_MANAGER')
  @Post()
  create(@Body() dto: CreateCmsPageDto) {
    return this.pages.create(dto);
  }

  @Roles('SUPER_ADMIN', 'MARKETING_MANAGER')
  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateCmsPageDto) {
    return this.pages.update(id, dto);
  }

  @Roles('SUPER_ADMIN', 'MARKETING_MANAGER')
  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.pages.remove(id);
  }
}