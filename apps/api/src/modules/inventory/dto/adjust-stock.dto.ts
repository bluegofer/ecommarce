// apps/api/src/modules/inventory/dto/adjust-stock.dto.ts
// B-2 fix — class-validator DTO so the global ValidationPipe
// (whitelist:true, forbidNonWhitelisted:true) accepts the body.
import { IsInt, IsIn, IsOptional, IsString } from 'class-validator';

const VALID_REASONS = [
  'RESTOCK',
  'DAMAGE',
  'RETURN',
  'CORRECTION',
  'SALE',
  'RESERVATION_RELEASE',
] as const;

export class AdjustStockInputDto {
  @IsString()
  variantId!: string;

  @IsInt()
  delta!: number;

  @IsIn(VALID_REASONS as unknown as string[])
  reason!: string;

  @IsOptional()
  @IsString()
  reasonNote?: string;

  @IsOptional()
  @IsString()
  referenceId?: string;

  @IsOptional()
  @IsString()
  warehouseId?: string;
}