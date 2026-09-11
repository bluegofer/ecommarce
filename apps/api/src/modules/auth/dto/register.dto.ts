import { IsEmail, IsOptional, IsString, Length, Matches } from 'class-validator';

const PHONE_REGEX = /^\+8801[3-9]\d{8}$/;

export class RegisterDto {
  @IsString()
  @Matches(PHONE_REGEX, {
    message: 'Phone must be in +8801XXXXXXXXX format',
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