import { IsString, Length } from 'class-validator';

/**
 * Change password for the currently-authenticated user.
 * Requires the current password (proof of possession).
 */
export class ChangePasswordDto {
  @IsString()
  @Length(1, 128)
  currentPassword!: string;

  @IsString()
  @Length(8, 72, { message: 'Password must be 8-72 characters' })
  newPassword!: string;
}