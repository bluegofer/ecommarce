// apps/api/src/modules/rma/tickets.controller.ts
import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { TicketsService } from './tickets.service';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { CreateTicketDto, ReplyTicketDto, TicketStatus } from '@ecommarce/types';

interface RequestUser {
  userId: string;
  roles: string[];
}

@ApiTags('rma')
@Controller('tickets')
export class TicketsController {
  constructor(private readonly svc: TicketsService) {}

  @Post()
  create(@Body() dto: CreateTicketDto, @CurrentUser() user: RequestUser | null) {
    return this.svc.create(dto, user?.userId ?? null);
  }

  @Roles('SUPER_ADMIN', 'ORDER_SUPPORT')
  @Get()
  list(@Query('status') status?: string) {
    return this.svc.list(status as TicketStatus | undefined);
  }

  @Roles('SUPER_ADMIN', 'ORDER_SUPPORT')
  @Get('aging')
  aging() {
    return this.svc.aging();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.svc.findOne(id);
  }

  @Post(':id/reply')
  reply(
    @Param('id') id: string,
    @Body() dto: ReplyTicketDto,
    @CurrentUser() user: RequestUser | null,
  ) {
    return this.svc.reply(id, dto, user?.userId ?? null);
  }

  @Roles('SUPER_ADMIN', 'ORDER_SUPPORT')
  @Post(':id/resolve')
  resolve(@Param('id') id: string) {
    return this.svc.resolve(id);
  }
}