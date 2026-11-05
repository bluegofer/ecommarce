// apps/api/src/modules/cms/contact.controller.ts
import { Body, Controller, Get, Param, Patch, Post } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { ContactService } from './contact.service';
import { Public } from '../../common/decorators/public.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import type { ContactMessageStatus, CreateContactMessageDto } from '@ecommarce/types';

@ApiTags('cms')
@Controller('cms/contact')
export class ContactController {
  constructor(private readonly svc: ContactService) {}

  @Public()
  @Post()
  submit(@Body() dto: CreateContactMessageDto) {
    return this.svc.submit(dto);
  }

  @Roles('SUPER_ADMIN', 'MARKETING_MANAGER', 'ORDER_SUPPORT')
  @Get()
  list() {
    return this.svc.list();
  }

  @Roles('SUPER_ADMIN', 'MARKETING_MANAGER', 'ORDER_SUPPORT')
  @Patch(':id/status')
  updateStatus(@Param('id') id: string, @Body() body: { status: ContactMessageStatus }) {
    return this.svc.updateStatus(id, body.status);
  }

  @Roles('SUPER_ADMIN', 'MARKETING_MANAGER', 'ORDER_SUPPORT')
  @Post(':id/reply')
  reply(@Param('id') id: string, @Body() body: { replyBody: string }) {
    return this.svc.reply(id, body.replyBody);
  }
}