// apps/api/src/modules/promotions/rules-engine.controller.ts
import { Body, Controller, Post } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { RulesEngineService } from './rules-engine.service';
import { Public } from '../../common/decorators/public.decorator';
import type { EvaluateCartDto } from '@ecommarce/types';

@ApiTags('promotions')
@Controller('promotions')
export class RulesEngineController {
  constructor(private readonly rules: RulesEngineService) {}

  @Public()
  @Post('evaluate-cart')
  evaluate(@Body() dto: EvaluateCartDto) {
    return this.rules.evaluateCart(dto);
  }
}