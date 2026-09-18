// apps/api/src/modules/orders/dto/lookup-order.dto.ts
//
// Query DTO for GET /api/v1/orders/lookup
//
// Fixes BLUEGOFER-API-1 (Step 15.8): previously this endpoint accepted raw
// `@Query('orderNumber')` / `@Query('phone')` strings. When either was missing,
// `undefined` reached PrismaService.order.findUnique(), raising a
// PrismaClientValidationError -> global filter mapped it to HTTP 500.
// With this DTO + the global ValidationPipe (whitelist + forbidNonWhitelisted +
// transform), missing/empty params are rejected with HTTP 400 before any
// service logic runs. TDD §10.1 compliance.
//
// Reference: docs/security-check-report.md, Sentry issue BLUEGOFER-API-1.

import { IsNotEmpty, IsString, Length } from 'class-validator';

export class LookupOrderQueryDto {
  @IsString()
  @IsNotEmpty()
  @Length(3, 64)
  orderNumber!: string;

  @IsString()
  @IsNotEmpty()
  @Length(6, 20)
  phone!: string;
}