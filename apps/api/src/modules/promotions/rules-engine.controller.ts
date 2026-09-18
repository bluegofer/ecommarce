// apps/api/src/modules/promotions/rules-engine.controller.ts
import { Body, Controller, Post } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { RulesEngineService } from './rules-engine.service';
import { Public } from '../../common/decorators/public.decorator';
import type { EvaluateCartDto } from '@ecommarce/types';

@ApiTags('promotions')
@Controller('promotions')
export class RulesEngineController {
  constructor(private readonly rules: RulesEngineService) {}

  @Public()
  @Throttle({ default: { limit: 30, ttl: 60_000 } }) // F-04: coupon enumeration protection
  @Post('evaluate-cart')
  evaluate(@Body() dto: EvaluateCartDto) {
    return this.rules.evaluateCart(dto);
  }
}