import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { Redis } from 'ioredis';
import { InjectRedis } from '@nestjs-modules/ioredis';
import * as crypto from 'crypto';
import { JwtPayload, AuthTokens, SessionData } from '../interfaces/auth.interface';

@Injectable()
export class TokenService {
  private readonly accessTokenExpiry = 3600; // 1 hour
  private readonly refreshTokenExpiry = 604800; // 7 days
  private readonly sessionPrefix = 'session:';
  private readonly refreshTokenPrefix = 'refresh:';

  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    @InjectRedis() private readonly redis: Redis,
  ) {}

  /**
   * Generate access and refresh tokens
   */
  async generateTokens(
    userId: string,
    email: string,
    tenantId?: string,
    role?: string,
    permissions?: string[],
  ): Promise<AuthTokens> {
    const sessionId = crypto.randomUUID();

    // Access token payload
    const accessPayload: Omit<JwtPayload, 'iat' | 'exp'> = {
      sub: userId,
      email,
      tenantId,
      role,
      permissions,
      sessionId,
      type: 'access',
    };

    // Refresh token payload
    const refreshPayload: Omit<JwtPayload, 'iat' | 'exp'> = {
      sub: userId,
      email,
      tenantId,
      role,
      permissions,
      sessionId,
      type: 'refresh',
    };

    // Generate tokens
    const accessToken = this.jwtService.sign(accessPayload, {
      secret: this.configService.get('JWT_SECRET'),
      expiresIn: this.accessTokenExpiry,
    });

    const refreshToken = this.jwtService.sign(refreshPayload, {
      secret: this.configService.get('JWT_REFRESH_SECRET'),
      expiresIn: this.refreshTokenExpiry,
    });

    // Store session in Redis
    await this.storeSession(sessionId, {
      userId,
      tenantId,
      sessionId,
      expiresAt: new Date(Date.now() + this.refreshTokenExpiry * 1000),
    });

    // Store refresh token hash in Redis
    await this.storeRefreshToken(refreshToken, userId, sessionId);

    return {
      accessToken,
      refreshToken,
      expiresIn: this.accessTokenExpiry,
      tokenType: 'Bearer',
    };
  }

  /**
   * Verify access token
   */
  async verifyAccessToken(token: string): Promise<JwtPayload> {
    try {
      const payload = this.jwtService.verify<JwtPayload>(token, {
        secret: this.configService.get('JWT_SECRET'),
      });

      // Check if session is valid
      const isValid = await this.isSessionValid(payload.sessionId);
      if (!isValid) {
        throw new Error('Session is invalid or expired');
      }

      return payload;
    } catch (error: any) {
      throw new Error(`Invalid access token: ${error.message}`);
    }
  }

  /**
   * Verify refresh token
   */
  async verifyRefreshToken(token: string): Promise<JwtPayload> {
    try {
      const payload = this.jwtService.verify<JwtPayload>(token, {
        secret: this.configService.get('JWT_REFRESH_SECRET'),
      });

      // Check if refresh token exists in Redis
      const isValid = await this.isRefreshTokenValid(token);
      if (!isValid) {
        throw new Error('Refresh token is invalid or revoked');
      }

      return payload;
    } catch (error: any) {
      throw new Error(`Invalid refresh token: ${error.message}`);
    }
  }

  /**
   * Revoke session (logout)
   */
  async revokeSession(sessionId: string): Promise<void> {
    const sessionKey = `${this.sessionPrefix}${sessionId}`;
    await this.redis.del(sessionKey);
  }

  /**
   * Revoke refresh token
   */
  async revokeRefreshToken(token: string): Promise<void> {
    const tokenHash = this.hashToken(token);
    const tokenKey = `${this.refreshTokenPrefix}${tokenHash}`;
    await this.redis.del(tokenKey);
  }

  /**
   * Revoke all user sessions
   */
  async revokeAllUserSessions(userId: string): Promise<void> {
    const pattern = `${this.sessionPrefix}*`;
    const keys = await this.redis.keys(pattern);

    for (const key of keys) {
      const session = await this.redis.get(key);
      if (session) {
        const sessionData = JSON.parse(session) as SessionData;
        if (sessionData.userId === userId) {
          await this.redis.del(key);
        }
      }
    }
  }

  /**
   * Store session in Redis
   */
  private async storeSession(
    sessionId: string,
    sessionData: SessionData,
  ): Promise<void> {
    const key = `${this.sessionPrefix}${sessionId}`;
    await this.redis.setex(
      key,
      this.refreshTokenExpiry,
      JSON.stringify(sessionData),
    );
  }

  /**
   * Store refresh token in Redis
   */
  private async storeRefreshToken(
    token: string,
    userId: string,
    sessionId: string,
  ): Promise<void> {
    const tokenHash = this.hashToken(token);
    const key = `${this.refreshTokenPrefix}${tokenHash}`;
    const data = { userId, sessionId };
    await this.redis.setex(key, this.refreshTokenExpiry, JSON.stringify(data));
  }

  /**
   * Check if session is valid
   */
  private async isSessionValid(sessionId: string): Promise<boolean> {
    const key = `${this.sessionPrefix}${sessionId}`;
    const session = await this.redis.get(key);
    return !!session;
  }

  /**
   * Check if refresh token is valid
   */
  private async isRefreshTokenValid(token: string): Promise<boolean> {
    const tokenHash = this.hashToken(token);
    const key = `${this.refreshTokenPrefix}${tokenHash}`;
    const data = await this.redis.get(key);
    return !!data;
  }

  /**
   * Hash token for storage
   */
  private hashToken(token: string): string {
    return crypto.createHash('sha256').update(token).digest('hex');
  }

  /**
   * Get session data
   */
  async getSessionData(sessionId: string): Promise<SessionData | null> {
    const key = `${this.sessionPrefix}${sessionId}`;
    const data = await this.redis.get(key);
    return data ? JSON.parse(data) : null;
  }

  /**
   * Update session last used
   */
  async updateSessionLastUsed(sessionId: string): Promise<void> {
    const sessionData = await this.getSessionData(sessionId);
    if (sessionData) {
      await this.storeSession(sessionId, {
        ...sessionData,
      });
    }
  }
}

