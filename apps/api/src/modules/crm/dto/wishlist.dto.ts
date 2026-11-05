import { IsArray, IsString, MaxLength, MinLength, ValidateNested, IsOptional } from 'class-validator';
import { Type } from 'class-transformer';

// T1-6 — wishlist DTOs.
// Note: API Docker build is tsc-only (Step 15.11 lesson) — no workspace
// types import; keep these self-contained.

export class AddWishlistItemDto {
  @IsString()
  @MinLength(1)
  @MaxLength(64)
  productId!: string;
}

export class MergeWishlistItemDto {
  @IsString()
  @MinLength(1)
  @MaxLength(64)
  productId!: string;

  /** ISO string; used only for ordering merged entries. */
  @IsOptional()
  @IsString()
  addedAt?: string;
}

export class MergeWishlistDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => MergeWishlistItemDto)
  items!: MergeWishlistItemDto[];
}