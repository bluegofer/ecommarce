// apps/api/src/modules/cms/home-feed.controller.ts
import { Controller, Get } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { HomeFeedService } from './home-feed.service';
import { Public } from '../../common/decorators/public.decorator';

@ApiTags('cms')
@Controller('cms/home-feed')
export class HomeFeedController {
  constructor(private readonly svc: HomeFeedService) {}

  @Public()
  @Get()
  get() {
    return this.svc.getHomeFeed();
  }
}