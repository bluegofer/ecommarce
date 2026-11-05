// apps/api/src/modules/audit/audit.controller.ts
import { Controller, Get, Query } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { AuditService } from './audit.service';
import { Roles } from '../../common/decorators/roles.decorator';

@ApiTags('audit')
@Controller('audit')
export class AuditController {
  constructor(private readonly audit: AuditService) {}

  @Roles('SUPER_ADMIN')
  @Get()
  list(@Query('q') q?: string) {
    return this.audit.list(q);
  }
}