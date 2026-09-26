// apps/api/src/modules/reviews/moderation.controller.ts
import { Body, Controller, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { ModerationService } from './moderation.service';
import { Roles } from '../../common/decorators/roles.decorator';
import type { AdminReplyDto, ModerateReviewDto, ReviewStatus } from '@ecommarce/types';

@ApiTags('reviews')
@Controller('reviews/moderation')
export class ModerationController {
  constructor(private readonly svc: ModerationService) {}

  @Roles('SUPER_ADMIN', 'MARKETING_MANAGER', 'CATALOG_MANAGER')
  @Get('queue')
  queue(@Query('status') status?: string) {
    return this.svc.queue((status as ReviewStatus) ?? 'PENDING');
  }

  @Roles('SUPER_ADMIN', 'MARKETING_MANAGER', 'CATALOG_MANAGER')
  @Patch(':id')
  moderate(@Param('id') id: string, @Body() dto: ModerateReviewDto) {
    return this.svc.moderate(id, dto.status, dto.hiddenReason);
  }

  @Roles('SUPER_ADMIN', 'MARKETING_MANAGER', 'CATALOG_MANAGER')
  @Post(':id/reply')
  reply(@Param('id') id: string, @Body() dto: AdminReplyDto) {
    return this.svc.reply(id, dto.reply);
  }
}