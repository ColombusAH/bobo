# Authentication Implementation Guide

## Overview

This is a comprehensive, production-ready authentication system for a multi-tenant SaaS application using NestJS, Prisma, PostgreSQL, and Redis.

### Key Features
- ✅ **Email/Password Authentication** with bcrypt hashing
- ✅ **Google OAuth Integration** 
- ✅ **Multi-Tenant Support** with tenant switching
- ✅ **JWT Tokens** with Redis-backed session management
- ✅ **Refresh Tokens** for long-lived sessions
- ✅ **Role-Based Access Control (RBAC)**
- ✅ **Permission-Based Authorization**
- ✅ **Password Reset** flow
- ✅ **Session Management** (logout, logout all devices)
- ✅ **Security Best Practices** (Zero Trust, strict TypeScript)

---

## Architecture

### 1. **Database Schema (Prisma)**

Located at: `libs/db/src/prisma/schema-auth.prisma`

**Key Models:**
- **Tenant**: Multi-tenant workspaces
- **User**: User accounts (supports both email/password and OAuth)
- **TenantUser**: Many-to-many relationship with roles and permissions
- **OAuthAccount**: OAuth provider linkage (Google, GitHub, etc.)
- **Session**: Active sessions tracked in DB + Redis
- **RefreshToken**: Long-lived refresh tokens
- **PasswordReset**: Password reset tokens

**Multi-Tenancy Design:**
```
User 1:N TenantUser N:1 Tenant
```
- Users can belong to multiple tenants
- Each user-tenant relationship has a role (OWNER, ADMIN, MEMBER, GUEST)
- Each user-tenant relationship can have custom permissions

### 2. **Token Service** (`TokenService`)

Located at: `libs/auth/src/lib/services/token.service.ts`

**Responsibilities:**
- Generate JWT access tokens (1 hour expiry)
- Generate JWT refresh tokens (7 days expiry)
- Store sessions in Redis for fast validation
- Revoke sessions (logout)
- Verify token validity

**Redis Keys:**
```
auth:session:{sessionId}  → SessionData
auth:refresh:{tokenHash}  → { userId, sessionId }
```

**Token Payload:**
```typescript
{
  sub: string;           // User ID
  email: string;
  tenantId?: string;     // Current tenant context
  role?: string;         // Role in current tenant
  permissions?: string[]; // Permissions array
  sessionId: string;     // For revocation
  type: 'access' | 'refresh';
  iat: number;
  exp: number;
}
```

### 3. **Auth Service** (`AuthService`)

Located at: `libs/auth/src/lib/services/auth.service.ts`

**Key Methods:**

#### `register(dto: RegisterDto)`
- Creates new user with email/password
- Creates default tenant for the user
- Assigns user as OWNER of their tenant
- Returns user data + tokens

#### `login(dto: LoginDto)`
- Validates email/password
- Loads user's tenant memberships
- Generates tokens with tenant context
- Updates last login timestamp

#### `googleAuth(dto: GoogleAuthDto)`
- Verifies Google ID token
- Creates user if doesn't exist (with default tenant)
- Links Google account to existing user
- Returns user data + tokens

#### `refreshToken(dto: RefreshTokenDto)`
- Validates refresh token
- Revokes old session
- Issues new access + refresh tokens
- Maintains or switches tenant context

#### `switchTenant(userId, dto: SwitchTenantDto)`
- Verifies user has access to target tenant
- Issues new tokens with new tenant context
- Returns updated user data + tokens

### 4. **Guards**

#### `JwtAuthGuard`
Located at: `libs/auth/src/lib/guards/jwt-auth.guard.ts`

- Applied globally to all routes
- Validates JWT access token
- Checks session validity in Redis
- Populates `request.user` with JWT payload
- Respects `@Public()` decorator

#### `TenantGuard`
Located at: `libs/auth/src/lib/guards/tenant.guard.ts`

- Ensures user has tenant context
- Throws error if `tenantId` is missing
- Attaches `tenantId` to request

#### `RolesGuard`
Located at: `libs/auth/src/lib/guards/roles.guard.ts`

- Checks if user has required role(s)
- Use with `@Roles('ADMIN', 'OWNER')` decorator

#### `PermissionsGuard`
Located at: `libs/auth/src/lib/guards/permissions.guard.ts`

- Checks if user has required permission(s)
- Use with `@RequirePermissions('user:delete')` decorator

### 5. **Strategies**

#### `JwtStrategy`
- Extracts JWT from Authorization header
- Validates token signature
- Checks session validity in Redis
- Updates session last used timestamp

#### `GoogleStrategy`
- Handles Google OAuth callback
- Extracts user profile from Google
- Returns profile data for further processing

---

## Usage Examples

### 1. Public Route (No Authentication)

```typescript
@Controller('public')
export class PublicController {
  @Public()
  @Get('hello')
  getHello(): string {
    return 'Hello World';
  }
}
```

### 2. Protected Route (Requires Authentication)

```typescript
@Controller('users')
@UseGuards(JwtAuthGuard)
export class UsersController {
  @Get('me')
  getProfile(@CurrentUser() user: JwtPayload) {
    return user;
  }
}
```

### 3. Tenant-Scoped Route

```typescript
@Controller('orders')
@UseGuards(JwtAuthGuard, TenantGuard)
export class OrdersController {
  @Get()
  async getOrders(
    @CurrentUser('tenantId') tenantId: string,
    @CurrentUser('sub') userId: string,
  ) {
    // All queries automatically scoped to tenant
    return this.prisma.order.findMany({
      where: { tenantId },
    });
  }
}
```

### 4. Role-Based Access

```typescript
@Controller('admin')
@UseGuards(JwtAuthGuard, TenantGuard, RolesGuard)
export class AdminController {
  @Roles('ADMIN', 'OWNER')
  @Delete('users/:id')
  async deleteUser(@Param('id') id: string) {
    // Only ADMIN or OWNER can access
  }
}
```

### 5. Permission-Based Access

```typescript
@Controller('billing')
@UseGuards(JwtAuthGuard, TenantGuard, PermissionsGuard)
export class BillingController {
  @RequirePermissions('billing:read', 'billing:write')
  @Post('invoice')
  async createInvoice() {
    // Requires both permissions
  }
}
```

---

## API Endpoints

### Authentication

#### Register
```http
POST /auth/register
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "SecurePass123!",
  "firstName": "John",
  "lastName": "Doe",
  "tenantSlug": "johns-workspace", // optional
  "tenantName": "John's Company"   // optional
}
```

#### Login
```http
POST /auth/login
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "SecurePass123!",
  "tenantId": "uuid" // optional
}
```

#### Google Auth
```http
POST /auth/google
Content-Type: application/json

{
  "idToken": "google-id-token-here",
  "tenantId": "uuid" // optional
}
```

#### Refresh Token
```http
POST /auth/refresh
Content-Type: application/json

{
  "refreshToken": "refresh-token-here",
  "tenantId": "uuid" // optional for switching context
}
```

#### Get Current User
```http
GET /auth/me
Authorization: Bearer {access-token}
```

#### Switch Tenant
```http
POST /auth/switch-tenant
Authorization: Bearer {access-token}
Content-Type: application/json

{
  "tenantId": "uuid"
}
```

#### Logout
```http
POST /auth/logout
Authorization: Bearer {access-token}
```

#### Logout All Devices
```http
POST /auth/logout-all
Authorization: Bearer {access-token}
```

#### Change Password
```http
POST /auth/change-password
Authorization: Bearer {access-token}
Content-Type: application/json

{
  "currentPassword": "OldPass123!",
  "newPassword": "NewPass123!"
}
```

#### Forgot Password
```http
POST /auth/forgot-password
Content-Type: application/json

{
  "email": "user@example.com"
}
```

#### Reset Password
```http
POST /auth/reset-password
Content-Type: application/json

{
  "token": "reset-token-from-email",
  "newPassword": "NewPass123!"
}
```

---

## Security Features

### 1. Password Security
- **bcrypt hashing** with 12 salt rounds
- Strict password requirements (8+ chars, uppercase, lowercase, number, special char)
- Password reset tokens expire in 1 hour
- Single-use reset tokens
- All sessions revoked on password change

### 2. Token Security
- Access tokens expire in 1 hour
- Refresh tokens expire in 7 days
- Tokens stored as SHA-256 hashes in Redis
- Session validation on every request
- Immediate revocation capability

### 3. Multi-Tenancy Security
- Tenant ID in JWT payload
- All queries automatically scoped to tenant
- Cross-tenant access prevented
- User must be member of tenant to access

### 4. Session Management
- Redis-backed session storage
- Automatic session cleanup on expiry
- Logout invalidates specific session
- Logout-all revokes all user sessions

### 5. OAuth Security
- Google ID token verification
- Email verification from OAuth provider
- OAuth accounts linked to existing emails
- Multiple OAuth providers per user supported

---

## Database Migrations

### Run Migrations
```bash
# Generate migration
npx prisma migrate dev --name add_auth_tables

# Apply migrations (production)
npx prisma migrate deploy

# Generate Prisma Client
npx prisma generate
```

### Seed Data (Optional)
```bash
npx prisma db seed
```

---

## Environment Variables

Create `.env` file:

```env
# Database
DATABASE_URL="postgresql://user:password@localhost:5432/bobo?schema=public"

# JWT Secrets (Generate with: openssl rand -base64 32)
JWT_SECRET="your-super-secret-jwt-key"
JWT_REFRESH_SECRET="your-super-secret-refresh-token-key"

# Redis
REDIS_HOST="localhost"
REDIS_PORT=6379
REDIS_PASSWORD=""
REDIS_DB=0

# Google OAuth
GOOGLE_CLIENT_ID="your-google-client-id.apps.googleusercontent.com"
GOOGLE_CLIENT_SECRET="your-google-client-secret"
GOOGLE_CALLBACK_URL="http://localhost:3000/auth/google/callback"

# Application
NODE_ENV="development"
PORT=3000
```

---

## Installation & Setup

### 1. Install Dependencies
```bash
npm install @nestjs/jwt @nestjs/passport passport passport-jwt passport-google-oauth20
npm install @nestjs-modules/ioredis ioredis
npm install bcrypt class-validator class-transformer
npm install @types/bcrypt @types/passport-jwt @types/passport-google-oauth20 --save-dev
```

### 2. Setup Database
```bash
# Run migrations
npx prisma migrate dev

# Generate Prisma Client
npx prisma generate
```

### 3. Setup Redis
```bash
# Using Docker
docker run -d -p 6379:6379 redis:alpine

# Or using docker-compose (recommended)
docker-compose up -d redis
```

### 4. Setup Google OAuth
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create new project
3. Enable Google+ API
4. Create OAuth 2.0 credentials
5. Add authorized redirect URI: `http://localhost:3000/auth/google/callback`
6. Copy Client ID and Client Secret to `.env`

### 5. Run Application
```bash
# Development
nx serve gateway

# Production
nx build gateway --prod
node dist/apps/gateway/main.js
```

---

## Testing

### Unit Tests
```bash
nx test auth
```

### Integration Tests
```bash
nx test gateway
```

### E2E Tests
```bash
nx e2e gateway-e2e
```

---

## Best Practices

### 1. Always Use Guards
```typescript
// ✅ Good: Protected route
@UseGuards(JwtAuthGuard, TenantGuard)
@Get('data')
getData() { }

// ❌ Bad: No protection
@Get('data')
getData() { }
```

### 2. Validate Tenant Scope
```typescript
// ✅ Good: Tenant-scoped query
async getOrders(@CurrentUser('tenantId') tenantId: string) {
  return this.prisma.order.findMany({
    where: { tenantId },
  });
}

// ❌ Bad: Not tenant-scoped (security risk!)
async getOrders() {
  return this.prisma.order.findMany();
}
```

### 3. Handle Token Expiry
```typescript
// Frontend implementation
async function makeAuthenticatedRequest(url: string) {
  try {
    return await fetch(url, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });
  } catch (error) {
    if (error.status === 401) {
      // Refresh token
      const newTokens = await refreshAccessToken();
      // Retry request
      return await fetch(url, {
        headers: {
          Authorization: `Bearer ${newTokens.accessToken}`,
        },
      });
    }
    throw error;
  }
}
```

### 4. Implement Rate Limiting
```typescript
// Add rate limiting guard
@UseGuards(ThrottlerGuard)
@Post('login')
async login() { }
```

---

## Troubleshooting

### Issue: "Session expired or invalid"
**Cause**: Redis session expired or Redis connection issue  
**Solution**: Check Redis connection, increase session TTL

### Issue: "Invalid credentials"
**Cause**: Wrong email/password or OAuth-only account  
**Solution**: Check if user has password set, guide to correct login method

### Issue: "No tenant context"
**Cause**: User has no tenant memberships  
**Solution**: Create tenant for user or add them to existing tenant

### Issue: "Access to this tenant is denied"
**Cause**: User trying to access tenant they're not member of  
**Solution**: Verify tenant membership, check TenantUser records

---

## Production Checklist

- [ ] Change JWT secrets to strong random values
- [ ] Enable HTTPS (SSL/TLS)
- [ ] Configure CORS properly
- [ ] Enable rate limiting
- [ ] Set up monitoring (sessions, login attempts)
- [ ] Configure Redis persistence
- [ ] Set up backup for PostgreSQL
- [ ] Enable audit logging
- [ ] Test password reset emails
- [ ] Configure Google OAuth production credentials
- [ ] Set secure cookie flags (httpOnly, secure, sameSite)
- [ ] Implement CSRF protection
- [ ] Add request logging
- [ ] Set up error tracking (Sentry, etc.)

---

## Additional Resources

- [NestJS Authentication Docs](https://docs.nestjs.com/security/authentication)
- [Prisma Best Practices](https://www.prisma.io/docs/guides/performance-and-optimization)
- [JWT Best Practices](https://datatracker.ietf.org/doc/html/rfc8725)
- [OAuth 2.0 Security](https://oauth.net/2/)

---

**Created**: November 15, 2025  
**Version**: 1.0.0  
**Maintainer**: Bobo Development Team

