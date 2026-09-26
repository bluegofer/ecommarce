import {
  IsString, IsInt, IsOptional, IsUUID, IsEnum, IsArray,
  ValidateNested, Min, IsBoolean, IsNumber,
} from 'class-validator';
import { Type } from 'class-transformer';

export enum PosPaymentMethodDto {
  CASH = 'CASH',
  CARD = 'CARD',
  MFS_BKASH = 'MFS_BKASH',
  MFS_NAGAD = 'MFS_NAGAD',
  MFS_ROCKET = 'MFS_ROCKET',
}

// ---------- SESSION ----------

export class OpenSessionDto {
  @IsString()
  registerId!: string;

  @IsInt()
  @Min(0)
  openingBalance!: number;
}

export class CloseSessionDto {
  @IsInt()
  @Min(0)
  countedBalance!: number;

  @IsOptional()
  @IsString()
  varianceNote?: string;

  @IsOptional()
  @IsString()
  varianceApprovedById?: string;
}

export class CashEventDto {
  @IsEnum({ CASH_IN: 'CASH_IN', CASH_OUT: 'CASH_OUT' })
  type!: 'CASH_IN' | 'CASH_OUT';

  @IsInt()
  @Min(1)
  amount!: number;

  @IsOptional()
  @IsString()
  reason?: string;
}

// ---------- SALE ----------

export class PosSaleItemDto {
  @IsString()
  variantId!: string;

  @IsInt()
  @Min(1)
  quantity!: number;

  @IsInt()
  @Min(0)
  unitPrice!: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  discount?: number;
}

export class PosPaymentDto {
  @IsEnum(PosPaymentMethodDto)
  method!: PosPaymentMethodDto;

  @IsInt()
  @Min(1)
  amount!: number;

  @IsOptional()
  @IsString()
  reference?: string;
}

export class CreatePosSaleDto {
  @IsString()
  registerId!: string;

  @IsOptional()
  @IsString()
  customerId?: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PosSaleItemDto)
  items!: PosSaleItemDto[];

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PosPaymentDto)
  payments!: PosPaymentDto[];

  @IsInt()
  @Min(0)
  discount!: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  tax?: number;

  @IsOptional()
  @IsString()
  notes?: string;
}

// ---------- STOCK TRANSFER ----------

export class StockTransferItemDto {
  @IsString()
  variantId!: string;

  @IsInt()
  @Min(1)
  quantity!: number;
}

export class CreateStockTransferDto {
  @IsString()
  fromBranchId!: string;

  @IsString()
  toBranchId!: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => StockTransferItemDto)
  items!: StockTransferItemDto[];

  @IsOptional()
  @IsString()
  notes?: string;
}