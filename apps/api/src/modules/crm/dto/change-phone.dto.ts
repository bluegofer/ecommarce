import { IsString, Length, Matches } from 'class-validator';

// Inlined (not imported from @ecommarce/types) because the API Docker build
// is tsc-only and cannot resolve workspace .ts packages at runtime.
// E.164: leading '+', 7–15 total digits.
const E164_REGEX = /^\+[1-9]\d{6,14}$/;

/**
 * Change phone number for the currently-authenticated user.
 * Prerequisites: caller must have already requested an OTP for `newPhone`
 * via POST /auth/otp/request.
 */
export class ChangePhoneDto {
  @IsString()
  @Matches(E164_REGEX, {
    message: 'newPhone must be in E.164 format (e.g. +8801712345678)',
  })
  newPhone!: string;

  @IsString()
  @Length(6, 6)
  @Matches(/^\d{6}$/, { message: 'OTP must be 6 digits' })
  otp!: string;
}

/**
 * Verify the currently-held phone for the authenticated user.
 * Prerequisites: caller must have already requested an OTP for their
 * current phone via POST /auth/otp/request.
 */
export class VerifyCurrentPhoneDto {
  @IsString()
  @Length(6, 6)
  @Matches(/^\d{6}$/, { message: 'OTP must be 6 digits' })
  otp!: string;
}