import {
  IsEmail,
  IsString,
  MinLength,
  MaxLength,
  Matches,
  IsOptional,
  IsUUID,
} from 'class-validator';
import { Transform } from 'class-transformer';

// ============================================
// REGISTER DTO
// ============================================
export class RegisterDto {
  @IsEmail()
  @Transform(({ value }) => value.toLowerCase().trim())
  email: string;

  @IsString()
  @MinLength(8)
  @MaxLength(128)
  @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/, {
    message:
      'Password must contain uppercase, lowercase, number, and special character',
  })
  password: string;

  @IsString()
  @MinLength(2)
  @MaxLength(50)
  @Transform(({ value }) => value.trim())
  firstName: string;

  @IsString()
  @MinLength(2)
  @MaxLength(50)
  @Transform(({ value }) => value.trim())
  lastName: string;

  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(50)
  @Matches(/^[a-z0-9-]+$/, {
    message: 'Tenant slug must contain only lowercase letters, numbers, and hyphens',
  })
  tenantSlug?: string;

  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  tenantName?: string;
}

// ============================================
// LOGIN DTO
// ============================================
export class LoginDto {
  @IsEmail()
  @Transform(({ value }) => value.toLowerCase().trim())
  email: string;

  @IsString()
  @MinLength(1)
  password: string;

  @IsOptional()
  @IsUUID()
  tenantId?: string;
}

// ============================================
// REFRESH TOKEN DTO
// ============================================
export class RefreshTokenDto {
  @IsString()
  refreshToken: string;

  @IsOptional()
  @IsUUID()
  tenantId?: string;
}

// ============================================
// SWITCH TENANT DTO
// ============================================
export class SwitchTenantDto {
  @IsUUID()
  tenantId: string;
}

// ============================================
// FORGOT PASSWORD DTO
// ============================================
export class ForgotPasswordDto {
  @IsEmail()
  @Transform(({ value }) => value.toLowerCase().trim())
  email: string;
}

// ============================================
// RESET PASSWORD DTO
// ============================================
export class ResetPasswordDto {
  @IsString()
  token: string;

  @IsString()
  @MinLength(8)
  @MaxLength(128)
  @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/, {
    message:
      'Password must contain uppercase, lowercase, number, and special character',
  })
  newPassword: string;
}

// ============================================
// CHANGE PASSWORD DTO
// ============================================
export class ChangePasswordDto {
  @IsString()
  currentPassword: string;

  @IsString()
  @MinLength(8)
  @MaxLength(128)
  @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/, {
    message:
      'Password must contain uppercase, lowercase, number, and special character',
  })
  newPassword: string;
}

// ============================================
// VERIFY EMAIL DTO
// ============================================
export class VerifyEmailDto {
  @IsString()
  token: string;
}

// ============================================
// GOOGLE AUTH DTO
// ============================================
export class GoogleAuthDto {
  @IsString()
  idToken: string;

  @IsOptional()
  @IsUUID()
  tenantId?: string;
}

