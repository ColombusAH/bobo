import { Module, DynamicModule } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { RedisModule } from '@nestjs-modules/ioredis';

// Services
import { AuthService, PRISMA_SERVICE } from './services/auth.service';
import { TokenService } from './services/token.service';

// Strategies
import { JwtStrategy } from './strategies/jwt.strategy';
import { GoogleStrategy } from './strategies/google.strategy';

// Guards
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { TenantGuard } from './guards/tenant.guard';
import { RolesGuard } from './guards/roles.guard';
import { PermissionsGuard } from './guards/permissions.guard';

@Module({})
export class AuthModule {
  static forRoot(prismaServiceClass: any): DynamicModule {
    return {
      module: AuthModule,
      imports: [
        PassportModule.register({ defaultStrategy: 'jwt' }),
        JwtModule.registerAsync({
          imports: [ConfigModule],
          inject: [ConfigService],
          useFactory: (configService: ConfigService) => ({
            secret: configService.get('JWT_SECRET'),
            signOptions: {
              expiresIn: '1h',
            },
          }),
        }),
        RedisModule.forRootAsync({
          imports: [ConfigModule],
          inject: [ConfigService],
          useFactory: (configService: ConfigService) => ({
            type: 'single',
            options: {
              host: configService.get('REDIS_HOST', 'localhost'),
              port: configService.get('REDIS_PORT', 6379),
              password: configService.get('REDIS_PASSWORD'),
              db: configService.get('REDIS_DB', 0),
              keyPrefix: 'auth:',
            },
          }),
        }),
      ],
      providers: [
        {
          provide: PRISMA_SERVICE,
          useExisting: prismaServiceClass,
        },
        // Services
        AuthService,
        TokenService,
        
        // Strategies
        JwtStrategy,
        GoogleStrategy,
        
        // Guards
        JwtAuthGuard,
        TenantGuard,
        RolesGuard,
        PermissionsGuard,
      ],
      exports: [
        AuthService,
        TokenService,
        JwtAuthGuard,
        TenantGuard,
        RolesGuard,
        PermissionsGuard,
      ],
    };
  }
}
