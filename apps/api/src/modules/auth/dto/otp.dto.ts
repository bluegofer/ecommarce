import { IsString, Length, Matches } from 'class-validator';
import { E164_REGEX } from '@ecommarce/types';

export class RequestOtpDto {
  @IsString()
  @Matches(E164_REGEX, {
    message: 'Phone must be in E.164 format (e.g. +8801712345678)',
  })
  phone!: string;
}

export class VerifyOtpDto {
  @IsString()
  @Matches(E164_REGEX, {
    message: 'Phone must be in E.164 format (e.g. +8801712345678)',
  })
  phone!: string;

  @IsString()
  @Length(6, 6)
  @Matches(/^\d{6}$/, { message: 'OTP must be 6 digits' })
  code!: string;
}