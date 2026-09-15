// apps/api/src/modules/rma/returns.controller.ts
import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { ReturnsService } from './returns.service';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type {
  ApproveReturnDto,
  CreateReturnRequestDto,
  MarkReturnPickedUpDto,
  RejectReturnDto,
  ReturnStatus,
} from '@ecommarce/types';

interface RequestUser {
  userId: string;
  roles: string[];
}

@ApiTags('rma')
@Controller('returns')
export class ReturnsController {
  constructor(private readonly svc: ReturnsService) {}

  @Get('me')
  listMine(@CurrentUser() user: RequestUser) {
    return this.svc.listMine(user.userId);
  }

  @Post()
  create(@Body() dto: CreateReturnRequestDto, @CurrentUser() user: RequestUser) {
    return this.svc.create(user.userId, dto);
  }

  @Roles('SUPER_ADMIN', 'ORDER_SUPPORT')
  @Get()
  list(@Query('status') status?: string) {
    return this.svc.list(status as ReturnStatus | undefined);
  }

  @Roles('SUPER_ADMIN', 'ORDER_SUPPORT')
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.svc.findOne(id);
  }

  @Roles('SUPER_ADMIN', 'ORDER_SUPPORT')
  @Post(':id/approve')
  approve(
    @Param('id') id: string,
    @Body() dto: ApproveReturnDto,
    @CurrentUser() user: RequestUser | null,
  ) {
    return this.svc.approve(id, dto, user?.userId ?? null);
  }

  @Roles('SUPER_ADMIN', 'ORDER_SUPPORT')
  @Post(':id/reject')
  reject(
    @Param('id') id: string,
    @Body() dto: RejectReturnDto,
    @CurrentUser() user: RequestUser | null,
  ) {
    return this.svc.reject(id, dto, user?.userId ?? null);
  }

  @Roles('SUPER_ADMIN', 'ORDER_SUPPORT')
  @Post(':id/picked-up')
  markPickedUp(
    @Param('id') id: string,
    @Body() dto: MarkReturnPickedUpDto,
    @CurrentUser() user: RequestUser | null,
  ) {
    return this.svc.markPickedUp(id, dto, user?.userId ?? null);
  }

  @Roles('SUPER_ADMIN', 'ORDER_SUPPORT')
  @Post(':id/received')
  markReceived(@Param('id') id: string, @CurrentUser() user: RequestUser | null) {
    return this.svc.markReceived(id, user?.userId ?? null);
  }

  @Roles('SUPER_ADMIN', 'ORDER_SUPPORT')
  @Post(':id/resolve')
  resolve(@Param('id') id: string, @CurrentUser() user: RequestUser | null) {
    return this.svc.resolve(id, user?.userId ?? null);
  }
}