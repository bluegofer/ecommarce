// apps/api/src/modules/carts/carts.module.ts
import { Module } from '@nestjs/common';
import { CartsService } from './carts.service';
import { CartsController } from './carts.controller';
import { PromotionsModule } from '../promotions/promotions.module';

@Module({
  imports: [PromotionsModule],
  controllers: [CartsController],
  providers: [CartsService],
  exports: [CartsService],
})
export class CartsModule {}