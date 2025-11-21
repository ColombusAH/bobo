// Authentication Interfaces

export interface JwtPayload {
  sub: string;              // User ID
  email: string;
  tenantId?: string;        // Current tenant context
  role?: string;            // Role in current tenant
  permissions?: string[];   // Permissions in current tenant
  sessionId: string;        // Session ID for revocation
  type: 'access' | 'refresh';
  iat: number;
  exp: number;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  tokenType: 'Bearer';
}

export interface AuthUser {
  id: string;
  email: string;
  firstName?: string;
  lastName?: string;
  avatarUrl?: string;
  isActive: boolean;
  isVerified: boolean;
  emailVerified: boolean;
  defaultTenantId?: string;
  tenants: UserTenant[];
}

export interface UserTenant {
  tenantId: string;
  tenantName: string;
  tenantSlug: string;
  role: string;
  permissions: string[];
  isActive: boolean;
}

export interface LoginResponse {
  user: AuthUser;
  tokens: AuthTokens;
  tenant?: {
    id: string;
    name: string;
    slug: string;
  };
}

export interface GoogleProfile {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  picture?: string;
  emailVerified: boolean;
}

export interface RequestWithUser extends Request {
  user: JwtPayload;
}

export interface SessionData {
  userId: string;
  tenantId?: string;
  sessionId: string;
  ipAddress?: string;
  userAgent?: string;
  expiresAt: Date;
}

