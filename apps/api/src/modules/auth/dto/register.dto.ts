import { IsEmail, IsOptional, IsString, Length, Matches } from 'class-validator';
import { E164_REGEX } from '@ecommarce/types';

export class RegisterDto {
  /**
   * Full international phone in E.164 format (`+8801712345678`, `+14155551234`).
   * Frontend composes from country selector + PhoneInput.
   */
  @IsString()
  @Matches(E164_REGEX, {
    message: 'Phone must be in E.164 format (e.g. +8801712345678)',
  })
  phone!: string;

  @IsOptional()
  @IsEmail()
  email?: string;

  @IsString()
  @Length(2, 120)
  fullName!: string;

  @IsString()
  @Length(8, 72, { message: 'Password must be 8-72 characters' })
  password!: string;
}