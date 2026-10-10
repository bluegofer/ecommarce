// apps/api/src/modules/analytics/events.controller.ts
import { Body, Controller, Post } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { EventsService } from './events.service';
import { Public } from '../../common/decorators/public.decorator';
import type { TrackEventDto } from '@ecommarce/types';

@ApiTags('analytics')
@Controller('analytics/events')
export class EventsController {
  constructor(private readonly svc: EventsService) {}

  @Public()
  @Post()
  track(@Body() dto: TrackEventDto) {
    return this.svc.track(dto);
  }
}