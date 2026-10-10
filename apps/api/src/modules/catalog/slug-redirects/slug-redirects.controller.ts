// apps/api/src/modules/catalog/slug-redirects/slug-redirects.controller.ts
import { Body, Controller, Delete, Get, Param, Post } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { IsInt, IsOptional, IsString, MaxLength, Min } from 'class-validator';
import { SlugRedirectsService } from './slug-redirects.service';
import { Roles } from '../../../common/decorators/roles.decorator';

class CreateSlugRedirectDto {
  @IsString()
  @MaxLength(200)
  fromSlug!: string;

  @IsString()
  @MaxLength(200)
  toSlug!: string;

  @IsOptional()
  @IsString()
  @MaxLength(40)
  entityType?: string;

  @IsOptional()
  @IsInt()
  @Min(301)
  statusCode?: number;
}

@ApiTags('catalog')
@Controller('catalog/slug-redirects')
export class SlugRedirectsController {
  constructor(private readonly svc: SlugRedirectsService) {}

  @Roles('SUPER_ADMIN', 'CATALOG_MANAGER')
  @Get()
  list() {
    return this.svc.list();
  }

  @Roles('SUPER_ADMIN', 'CATALOG_MANAGER')
  @Post()
  async create(@Body() dto: CreateSlugRedirectDto) {
    await this.svc.record(dto.fromSlug, dto.toSlug, dto.entityType ?? 'manual');
    return { ok: true };
  }

  @Roles('SUPER_ADMIN', 'CATALOG_MANAGER')
  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.svc.remove(id);
  }
}