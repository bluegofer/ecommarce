import {
  IsOptional,
  IsIn,
  IsInt,
  IsString,
  Min,
  Max,
  MaxLength,
} from 'class-validator';
import { Type } from 'class-transformer';

/**
 * Runtime-enforced list of OrderStatus values.
 * Must be kept in sync with:
 *   - apps/api/prisma/schema.prisma  (enum OrderStatus)
 *   - packages/types/src/orders.ts   (OrderStatus union)
 */
export const ORDER_STATUS_VALUES = [
  'PLACED',
  'CONFIRMED',
  'PROCESSING',
  'SHIPPED',
  'DELIVERED',
  'CANCELLED',
  'RETURN_REQUESTED',
  'RETURNED',
] as const;

export type OrderStatusValue = (typeof ORDER_STATUS_VALUES)[number];

export class ListOrdersQueryDto {
  @IsOptional()
  @IsIn(ORDER_STATUS_VALUES, {
    message: `status must be one of: ${ORDER_STATUS_VALUES.join(', ')}`,
  })
  status?: OrderStatusValue;

  @IsOptional()
  @IsString()
  @MaxLength(64)
  customerId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  phone?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  q?: string;

  @IsOptional()
  @IsString()
  @MaxLength(40)
  fromDate?: string;

  @IsOptional()
  @IsString()
  @MaxLength(40)
  toDate?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  pageSize?: number;
}