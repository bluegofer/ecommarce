// apps/api/src/modules/reviews/reviews.module.ts
import { Module } from '@nestjs/common';
import { ReviewsService } from './reviews.service';
import { ReviewsController } from './reviews.controller';
import { ModerationService } from './moderation.service';
import { ModerationController } from './moderation.controller';

@Module({
  controllers: [ReviewsController, ModerationController],
  providers: [ReviewsService, ModerationService],
  exports: [ReviewsService, ModerationService],
})
export class ReviewsModule {}