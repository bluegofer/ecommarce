// apps/api/src/modules/catalog/import-export/import-export.controller.ts
import { Body, Controller, Get, Post, Res } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { ImportExportService } from './import-export.service';
import { Roles } from '../../../common/decorators/roles.decorator';
import type { Response } from 'express';

interface ImportCsvDto {
  csv: string;
}

@ApiTags('catalog')
@Controller('catalog/import-export')
export class ImportExportController {
  constructor(private readonly svc: ImportExportService) {}

  @Roles('SUPER_ADMIN', 'CATALOG_MANAGER')
  @Post('import')
  import(@Body() body: ImportCsvDto) {
    return this.svc.importProductsCsv(body.csv ?? '');
  }

  @Roles('SUPER_ADMIN', 'CATALOG_MANAGER', 'FINANCE_READONLY')
  @Get('export')
  async export(@Res() res: Response) {
    const csv = await this.svc.exportProductsCsv();
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename="products.csv"');
    res.send(csv);
  }
}