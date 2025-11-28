import {
  IsEmail,
  IsString,
  IsUUID,
  IsEnum,
  IsOptional,
  IsArray,
  MinLength,
} from 'class-validator';
import { Transform } from 'class-transformer';

// Tenant role enum (matches Prisma schema)
export enum TenantRole {
  OWNER = 'OWNER',
  ADMIN = 'ADMIN',
  MEMBER = 'MEMBER',
  GUEST = 'GUEST',
}

// ============================================
// INVITE USER DTO
// ============================================
export class InviteUserDto {
  @IsEmail()
  @Transform(({ value }) => value.toLowerCase().trim())
  email: string;

  @IsEnum(TenantRole)
  role: TenantRole;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  permissions?: string[];
}

// ============================================
// UPDATE MEMBER DTO
// ============================================
export class UpdateMemberDto {
  @IsUUID()
  userId: string;

  @IsOptional()
  @IsEnum(TenantRole)
  role?: TenantRole;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  permissions?: string[];

  @IsOptional()
  isActive?: boolean;
}

// ============================================
// ACCEPT INVITATION DTO
// ============================================
export class AcceptInvitationDto {
  @IsString()
  @MinLength(1)
  token: string;
}

// ============================================
// REMOVE MEMBER DTO
// ============================================
export class RemoveMemberDto {
  @IsUUID()
  userId: string;
}

// ============================================
// TRANSFER OWNERSHIP DTO
// ============================================
export class TransferOwnershipDto {
  @IsUUID()
  newOwnerId: string;
}

