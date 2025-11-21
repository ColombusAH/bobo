import {
  Injectable,
  UnauthorizedException,
  ConflictException,
  BadRequestException,
  Inject,
} from '@nestjs/common';
import { Prisma } from '.prisma/client-gateway';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';
import {
  RegisterDto,
  LoginDto,
  RefreshTokenDto,
  ForgotPasswordDto,
  ResetPasswordDto,
  ChangePasswordDto,
  SwitchTenantDto,
  GoogleAuthDto,
} from '../dto/auth.dto';
import { TokenService } from './token.service';
import {
  AuthUser,
  LoginResponse,
  GoogleProfile,
  UserTenant,
} from '../interfaces/auth.interface';

// Token for PrismaService injection
export const PRISMA_SERVICE = 'PRISMA_SERVICE';

@Injectable()
export class AuthService {
  constructor(
    @Inject(PRISMA_SERVICE) private readonly prisma: any,
    private readonly tokenService: TokenService,
  ) {}

  /**
   * Register new user with email/password
   */
  async register(dto: RegisterDto): Promise<LoginResponse> {
    // Check if user exists
    const existingUser = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });

    if (existingUser) {
      throw new ConflictException('User with this email already exists');
    }

    // Generate salt and hash password
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(dto.password, salt);

    // Create tenant slug if not provided
    const tenantSlug =
      dto.tenantSlug ||
      `${dto.firstName.toLowerCase()}-${crypto.randomBytes(4).toString('hex')}`;

    // Create user and tenant in transaction
    const result = await this.prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      // Create tenant
      const tenant = await tx.tenant.create({
        data: {
          name: dto.tenantName || `${dto.firstName}'s Workspace`,
          slug: tenantSlug,
          plan: 'FREE',
          isActive: true,
        },
      });

      // Create user
      const user = await tx.user.create({
        data: {
          email: dto.email,
          passwordHash,
          salt,
          firstName: dto.firstName,
          lastName: dto.lastName,
          isActive: true,
          isVerified: false,
          emailVerified: false,
          defaultTenantId: tenant.id,
        },
      });

      // Create tenant-user relationship (as OWNER)
      await tx.tenantUser.create({
        data: {
          userId: user.id,
          tenantId: tenant.id,
          role: 'OWNER',
          isActive: true,
        },
      });

      return { user, tenant };
    });

    // Generate tokens
    const tokens = await this.tokenService.generateTokens(
      result.user.id,
      result.user.email,
      result.tenant.id,
      'OWNER',
      [],
    );

    // Get full user data
    const authUser = await this.getAuthUser(result.user.id);

    return {
      user: authUser,
      tokens,
      tenant: {
        id: result.tenant.id,
        name: result.tenant.name,
        slug: result.tenant.slug,
      },
    };
  }

  /**
   * Login with email/password
   */
  async login(dto: LoginDto): Promise<LoginResponse> {
    // Find user
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email },
      include: {
        tenantUsers: {
          where: { isActive: true },
          include: {
            tenant: true,
          },
        },
      },
    });

    if (!user || !user.isActive) {
      throw new UnauthorizedException('Invalid credentials');
    }

    // Verify password
    if (!user.passwordHash) {
      throw new UnauthorizedException(
        'This account uses OAuth. Please login with your OAuth provider.',
      );
    }

    const isPasswordValid = await bcrypt.compare(
      dto.password,
      user.passwordHash,
    );

    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    // Determine tenant
    let tenantId = dto.tenantId || user.defaultTenantId;
    let role = 'MEMBER';
    let permissions: string[] = [];

    if (tenantId) {
      const tenantUser = user.tenantUsers.find(
        (tu: { tenantId: string; role: string; permissions: unknown }) => tu.tenantId === tenantId,
      );
      if (tenantUser) {
        role = tenantUser.role;
        permissions = (tenantUser.permissions as string[]) || [];
      }
    } else if (user.tenantUsers.length > 0) {
      // Use first available tenant
      tenantId = user.tenantUsers[0].tenantId;
      role = user.tenantUsers[0].role;
      permissions = (user.tenantUsers[0].permissions as string[]) || [];
    }

    // Update last login
    await this.prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });

    // Generate tokens
    const tokens = await this.tokenService.generateTokens(
      user.id,
      user.email,
      tenantId,
      role,
      permissions,
    );

    // Get full user data
    const authUser = await this.getAuthUser(user.id);

    const tenant = tenantId
      ? user.tenantUsers.find((tu: { tenantId: string }) => tu.tenantId === tenantId)?.tenant
      : undefined;

    return {
      user: authUser,
      tokens,
      tenant: tenant
        ? {
            id: tenant.id,
            name: tenant.name,
            slug: tenant.slug,
          }
        : undefined,
    };
  }

  /**
   * Login/Register with Google
   */
  async googleAuth(dto: GoogleAuthDto): Promise<LoginResponse> {
    // Verify Google ID token and get profile
    const profile = await this.verifyGoogleToken(dto.idToken);

    // Find or create user
    let user = await this.prisma.user.findUnique({
      where: { email: profile.email },
      include: {
        oauthAccounts: true,
        tenantUsers: {
          where: { isActive: true },
          include: { tenant: true },
        },
      },
    });

    if (!user) {
      // Create new user with Google account
      const result = await this.prisma.$transaction(async (tx: Prisma.TransactionClient) => {
        // Create default tenant
        const tenant = await tx.tenant.create({
          data: {
            name: `${profile.firstName}'s Workspace`,
            slug: `${profile.firstName.toLowerCase()}-${crypto.randomBytes(4).toString('hex')}`,
            plan: 'FREE',
            isActive: true,
          },
        });

        // Create user
        const newUser = await tx.user.create({
          data: {
            email: profile.email,
            firstName: profile.firstName,
            lastName: profile.lastName,
            avatarUrl: profile.picture,
            emailVerified: profile.emailVerified,
            isActive: true,
            isVerified: profile.emailVerified,
            defaultTenantId: tenant.id,
          },
        });

        // Create OAuth account
        await tx.oAuthAccount.create({
          data: {
            userId: newUser.id,
            provider: 'GOOGLE',
            providerAccountId: profile.id,
          },
        });

        // Create tenant-user relationship
        await tx.tenantUser.create({
          data: {
            userId: newUser.id,
            tenantId: tenant.id,
            role: 'OWNER',
            isActive: true,
          },
        });

        return { user: newUser, tenant };
      });

      user = await this.prisma.user.findUnique({
        where: { id: result.user.id },
        include: {
          oauthAccounts: true,
          tenantUsers: {
            where: { isActive: true },
            include: { tenant: true },
          },
        },
      });
    } else {
      // Check if Google account is linked
      const googleAccount = user.oauthAccounts.find(
        (acc: { provider: string }) => acc.provider === 'GOOGLE',
      );

      if (!googleAccount) {
        // Link Google account
        await this.prisma.oAuthAccount.create({
          data: {
            userId: user.id,
            provider: 'GOOGLE',
            providerAccountId: profile.id,
          },
        });
      }

      // Update last login
      await this.prisma.user.update({
        where: { id: user.id },
        data: { lastLoginAt: new Date() },
      });
    }

    // Determine tenant
    let tenantId = dto.tenantId || user.defaultTenantId;
    let role = 'MEMBER';
    let permissions: string[] = [];

    if (tenantId) {
      const tenantUser = user.tenantUsers.find(
        (tu: { tenantId: string; role: string; permissions: unknown }) => tu.tenantId === tenantId,
      );
      if (tenantUser) {
        role = tenantUser.role;
        permissions = (tenantUser.permissions as string[]) || [];
      }
    } else if (user.tenantUsers.length > 0) {
      tenantId = user.tenantUsers[0].tenantId;
      role = user.tenantUsers[0].role;
      permissions = (user.tenantUsers[0].permissions as string[]) || [];
    }

    // Generate tokens
    const tokens = await this.tokenService.generateTokens(
      user.id,
      user.email,
      tenantId,
      role,
      permissions,
    );

    // Get full user data
    const authUser = await this.getAuthUser(user.id);

    const tenant = tenantId
      ? user.tenantUsers.find((tu: { tenantId: string }) => tu.tenantId === tenantId)?.tenant
      : undefined;

    return {
      user: authUser,
      tokens,
      tenant: tenant
        ? {
            id: tenant.id,
            name: tenant.name,
            slug: tenant.slug,
          }
        : undefined,
    };
  }

  /**
   * Refresh access token
   */
  async refreshToken(dto: RefreshTokenDto): Promise<LoginResponse> {
    // Verify refresh token
    const payload = await this.tokenService.verifyRefreshToken(
      dto.refreshToken,
    );

    // Get user
    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
      include: {
        tenantUsers: {
          where: { isActive: true },
          include: { tenant: true },
        },
      },
    });

    if (!user || !user.isActive) {
      throw new UnauthorizedException('User not found or inactive');
    }

    // Determine tenant
    let tenantId = dto.tenantId || payload.tenantId || user.defaultTenantId;
    let role = 'MEMBER';
    let permissions: string[] = [];

    if (tenantId) {
      const tenantUser = user.tenantUsers.find(
        (tu: { tenantId: string; role: string; permissions: unknown }) => tu.tenantId === tenantId,
      );
      if (tenantUser) {
        role = tenantUser.role;
        permissions = (tenantUser.permissions as string[]) || [];
      }
    }

    // Revoke old tokens
    await this.tokenService.revokeSession(payload.sessionId);
    await this.tokenService.revokeRefreshToken(dto.refreshToken);

    // Generate new tokens
    const tokens = await this.tokenService.generateTokens(
      user.id,
      user.email,
      tenantId,
      role,
      permissions,
    );

    // Get full user data
    const authUser = await this.getAuthUser(user.id);

    const tenant = tenantId
      ? user.tenantUsers.find((tu: { tenantId: string }) => tu.tenantId === tenantId)?.tenant
      : undefined;

    return {
      user: authUser,
      tokens,
      tenant: tenant
        ? {
            id: tenant.id,
            name: tenant.name,
            slug: tenant.slug,
          }
        : undefined,
    };
  }

  /**
   * Logout (revoke session)
   */
  async logout(userId: string, sessionId: string): Promise<void> {
    await this.tokenService.revokeSession(sessionId);
  }

  /**
   * Logout from all devices
   */
  async logoutAll(userId: string): Promise<void> {
    await this.tokenService.revokeAllUserSessions(userId);
  }

  /**
   * Switch tenant context
   */
  async switchTenant(
    userId: string,
    dto: SwitchTenantDto,
  ): Promise<LoginResponse> {
    // Verify user has access to tenant
    const tenantUser = await this.prisma.tenantUser.findUnique({
      where: {
        tenantId_userId: {
          tenantId: dto.tenantId,
          userId,
        },
      },
      include: {
        tenant: true,
      },
    });

    if (!tenantUser || !tenantUser.isActive) {
      throw new UnauthorizedException('Access to this tenant is denied');
    }

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    // Generate new tokens with new tenant context
    const tokens = await this.tokenService.generateTokens(
      userId,
      user.email,
      dto.tenantId,
      tenantUser.role,
      (tenantUser.permissions as string[]) || [],
    );

    // Get full user data
    const authUser = await this.getAuthUser(userId);

    return {
      user: authUser,
      tokens,
      tenant: {
        id: tenantUser.tenant.id,
        name: tenantUser.tenant.name,
        slug: tenantUser.tenant.slug,
      },
    };
  }

  /**
   * Change password
   */
  async changePassword(
    userId: string,
    dto: ChangePasswordDto,
  ): Promise<void> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user.passwordHash) {
      throw new BadRequestException(
        'This account uses OAuth and does not have a password',
      );
    }

    // Verify current password
    const isValid = await bcrypt.compare(dto.currentPassword, user.passwordHash);
    if (!isValid) {
      throw new UnauthorizedException('Current password is incorrect');
    }

    // Generate new salt and hash new password
    const newSalt = await bcrypt.genSalt(10);
    const newPasswordHash = await bcrypt.hash(dto.newPassword, newSalt);

    // Update password and salt
    await this.prisma.user.update({
      where: { id: userId },
      data: { 
        passwordHash: newPasswordHash,
        salt: newSalt,
      },
    });

    // Revoke all sessions (force re-login)
    await this.tokenService.revokeAllUserSessions(userId);
  }

  /**
   * Request password reset
   */
  async forgotPassword(dto: ForgotPasswordDto): Promise<void> {
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });

    // Don't reveal if user exists
    if (!user) {
      return;
    }

    // Generate reset token
    const resetToken = crypto.randomBytes(32).toString('hex');
    const tokenHash = crypto
      .createHash('sha256')
      .update(resetToken)
      .digest('hex');

    // Store reset token
    await this.prisma.passwordReset.create({
      data: {
        userId: user.id,
        tokenHash,
        expiresAt: new Date(Date.now() + 3600000), // 1 hour
      },
    });

    // TODO: Send email with reset link
    // await this.emailService.sendPasswordReset(user.email, resetToken);
  }

  /**
   * Reset password with token
   */
  async resetPassword(dto: ResetPasswordDto): Promise<void> {
    const tokenHash = crypto
      .createHash('sha256')
      .update(dto.token)
      .digest('hex');

    const resetToken = await this.prisma.passwordReset.findUnique({
      where: { tokenHash },
      include: { user: true },
    });

    if (!resetToken || resetToken.isUsed || resetToken.expiresAt < new Date()) {
      throw new BadRequestException('Invalid or expired reset token');
    }

    // Generate new salt and hash new password
    const newSalt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(dto.newPassword, newSalt);

    // Update password, salt, and mark token as used
    await this.prisma.$transaction([
      this.prisma.user.update({
        where: { id: resetToken.userId },
        data: { 
          passwordHash,
          salt: newSalt,
        },
      }),
      this.prisma.passwordReset.update({
        where: { id: resetToken.id },
        data: { isUsed: true, usedAt: new Date() },
      }),
    ]);

    // Revoke all sessions
    await this.tokenService.revokeAllUserSessions(resetToken.userId);
  }

  /**
   * Get authenticated user data
   */
  private async getAuthUser(userId: string): Promise<AuthUser> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        tenantUsers: {
          where: { isActive: true },
          include: {
            tenant: true,
          },
        },
      },
    });

    const tenants: UserTenant[] = user.tenantUsers.map((tu: {
      tenantId: string;
      tenant: { name: string; slug: string };
      role: string;
      permissions: unknown;
      isActive: boolean;
    }) => ({
      tenantId: tu.tenantId,
      tenantName: tu.tenant.name,
      tenantSlug: tu.tenant.slug,
      role: tu.role,
      permissions: (tu.permissions as string[]) || [],
      isActive: tu.isActive,
    }));

    return {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      avatarUrl: user.avatarUrl,
      isActive: user.isActive,
      isVerified: user.isVerified,
      emailVerified: user.emailVerified,
      defaultTenantId: user.defaultTenantId,
      tenants,
    };
  }

  /**
   * Verify Google ID token
   */
  private async verifyGoogleToken(idToken: string): Promise<GoogleProfile> {
    // TODO: Implement actual Google token verification
    // Use google-auth-library package
    // const { OAuth2Client } = require('google-auth-library');
    // const client = new OAuth2Client(clientId);
    // const ticket = await client.verifyIdToken({ idToken, audience: clientId });
    // const payload = ticket.getPayload();

    // Mock implementation for now
    throw new Error('Google token verification not implemented');
  }
}

