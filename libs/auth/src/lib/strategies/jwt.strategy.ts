import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { TokenService } from '../services/token.service';
import { JwtPayload } from '../interfaces/auth.interface';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
  constructor(
    configService: ConfigService,
    private readonly tokenService: TokenService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      secretOrKey: configService.getOrThrow<string>('JWT_SECRET'),
      ignoreExpiration: false,
    });
  }

  async validate(payload: JwtPayload): Promise<JwtPayload> {
    // Verify session is still valid in Redis
    const isValid = await this.tokenService
      .getSessionData(payload.sessionId)
      .then((data) => !!data)
      .catch(() => false);

    if (!isValid) {
      throw new UnauthorizedException('Session expired or invalid');
    }

    // Update session last used
    await this.tokenService.updateSessionLastUsed(payload.sessionId);

    return payload;
  }
}

