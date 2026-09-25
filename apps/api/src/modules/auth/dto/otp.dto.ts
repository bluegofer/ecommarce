import { IsString, Length, Matches } from 'class-validator';

// Inlined (not imported from @ecommarce/types) because the API Docker build
// is tsc-only and cannot resolve workspace .ts packages at runtime.
// E.164: leading '+', 7–15 total digits.
const E164_REGEX = /^\+[1-9]\d{6,14}$/;

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