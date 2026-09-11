import { IsString, Length, Matches } from 'class-validator';

const PHONE_REGEX = /^\+8801[3-9]\d{8}$/;

export class RequestOtpDto {
  @IsString()
  @Matches(PHONE_REGEX, { message: 'Phone must be +8801XXXXXXXXX' })
  phone!: string;
}

export class VerifyOtpDto {
  @IsString()
  @Matches(PHONE_REGEX, { message: 'Phone must be +8801XXXXXXXXX' })
  phone!: string;

  @IsString()
  @Length(6, 6)
  @Matches(/^\d{6}$/, { message: 'OTP must be 6 digits' })
  code!: string;
}