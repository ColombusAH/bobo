// Auth DTOs matching backend @org/auth contracts
export interface RegisterDto {
  email: string;
  password: string;
  firstName?: string;
  lastName?: string;
}

export interface LoginDto {
  email: string;
  password: string;
}

export interface ForgotPasswordDto {
  email: string;
}

export interface ResetPasswordDto {
  token: string;
  newPassword: string;
}

export interface RefreshTokenDto {
  refreshToken: string;
}

export interface GoogleAuthDto {
  // Assuming this contains the Google OAuth token/id_token
  token: string;
}

// User and tenant types
export interface TenantMembership {
  tenantId: string;
  tenantName: string;
  tenantSlug: string;
  role: string;
  permissions: string[];
  isActive: boolean;
}

export interface User {
  id: string;
  email: string;
  firstName?: string | null;
  lastName?: string | null;
  avatarUrl?: string | null;
  isActive: boolean;
  isVerified: boolean;
  emailVerified: boolean;
  defaultTenantId: string;
  tenants: TenantMembership[];
}

export interface Tenant {
  id: string;
  name: string;
  slug: string;
}

export interface Tokens {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  tokenType: string;
}

// Auth responses
export interface LoginResponse {
  user: User;
  tokens: Tokens;
  tenant: Tenant;
}

// JWT payload (for decoded token, not the user object)
export interface JwtPayload {
  sub: string; // user id
  email: string;
  tenantId?: string;
  role?: string;
  permissions?: string[];
  sessionId?: string;
  type?: string; // 'access' | 'refresh'
  iat?: number;
  exp?: number;
}
