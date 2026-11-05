// apps/api/src/modules/auth/dto/totp.dto.ts
import { IsNotEmpty, IsString, Length } from 'class-validator';

export class TotpVerifyDto {
  @IsString()
  @IsNotEmpty()
  @Length(6, 6, { message: 'code must be exactly 6 digits' })
  code!: string;
}

export class TotpConfirmDto {
  @IsString()
  @IsNotEmpty()
  @Length(6, 6, { message: 'code must be exactly 6 digits' })
  code!: string;
}

export class TotpDisableDto {
  @IsString()
  @IsNotEmpty()
  @Length(6, 6, { message: 'code must be exactly 6 digits' })
  code!: string;
}