// apps/api/src/modules/reviews/reviews.controller.ts
import { Body, Controller, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { ReviewsService } from './reviews.service';
import { Public } from '../../common/decorators/public.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { CreateReviewDto, ReviewListQueryDto, UpdateReviewDto } from '@ecommarce/types';

interface RequestUser {
  userId: string;
  roles: string[];
}

@ApiTags('reviews')
@Controller('reviews')
export class ReviewsController {
  constructor(private readonly reviews: ReviewsService) {}

  @Public()
  @Get()
  list(@Query() query: ReviewListQueryDto) {
    return this.reviews.listByProduct({ ...query, status: 'PUBLISHED' });
  }

  @Public()
  @Get('summary/:productId')
  summary(@Param('productId') productId: string) {
    return this.reviews.summary(productId);
  }

  @Public()
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.reviews.findOne(id);
  }

  @Post()
  async create(@Body() dto: CreateReviewDto, @CurrentUser() user: RequestUser) {
    return this.reviews.create(user.userId, dto);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() dto: UpdateReviewDto,
    @CurrentUser() user: RequestUser,
  ) {
    return this.reviews.updateOwn(user.userId, id, dto);
  }

  @Post(':id/helpful')
  voteHelpful(@Param('id') id: string, @CurrentUser() user: RequestUser) {
    return this.reviews.voteHelpful(user.userId, id);
  }

  @Get('me/all')
  myReviews(@CurrentUser() user: RequestUser) {
    return this.reviews.listByCustomer(user.userId);
  }
}