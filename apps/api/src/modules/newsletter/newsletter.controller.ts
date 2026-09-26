// apps/api/src/modules/newsletter/newsletter.controller.ts
import { Body, Controller, Delete, Get, Param, Post } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { NewsletterService } from './newsletter.service';
import { Roles } from '../../common/decorators/roles.decorator';
import { Public } from '../../common/decorators/public.decorator';

@ApiTags('newsletter')
@Controller('newsletter')
export class NewsletterController {
  constructor(private readonly svc: NewsletterService) {}

  @Public()
  @Post('subscribe')
  subscribe(@Body() body: { email: string; name?: string; source?: string; locale?: string }) {
    return this.svc.subscribe(body);
  }

  @Roles('SUPER_ADMIN', 'ADMIN', 'MARKETING_MANAGER')
  @Get('subscribers')
  list() {
    return this.svc.list();
  }

  @Roles('SUPER_ADMIN', 'ADMIN', 'MARKETING_MANAGER')
  @Get('count')
  async count() {
    return { count: await this.svc.count() };
  }

  @Public()
  @Delete('unsubscribe/:email')
  unsubscribe(@Param('email') email: string) {
    return this.svc.unsubscribe(email);
  }
}