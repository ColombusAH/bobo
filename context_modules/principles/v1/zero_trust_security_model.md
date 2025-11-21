# Security Principles: Zero Trust Security Model

## Overview

This document establishes security principles based on the Zero Trust model for the Bobo monorepo, covering API gateways, Kafka topics, NestJS services, and React frontends.

## Core Zero Trust Principles

### 1. Never Trust, Always Verify

Assume breach and verify every request, regardless of source.

#### Implementation
- Authenticate every request
- Authorize based on least privilege
- Validate all inputs
- Encrypt all communications
- Log all access attempts

### 2. Verify Explicitly

Always authenticate and authorize based on all available data points.

```typescript
// ✅ Multi-factor verification
@Injectable()
export class AuthGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    
    // 1. Verify JWT token
    const token = this.extractToken(request);
    const payload = this.verifyToken(token);
    
    // 2. Verify user still exists and is active
    const user = await this.usersService.findById(payload.sub);
    if (!user || !user.isActive) {
      throw new UnauthorizedException();
    }
    
    // 3. Verify session is valid
    const session = await this.sessionsService.findByToken(token);
    if (!session || session.expiresAt < new Date()) {
      throw new UnauthorizedException();
    }
    
    // 4. Check IP address (optional)
    if (this.config.strictIpCheck) {
      if (request.ip !== session.ipAddress) {
        throw new UnauthorizedException('IP address mismatch');
      }
    }
    
    request.user = user;
    return true;
  }
}
```

### 3. Use Least Privilege Access

Grant minimal permissions necessary for each operation.

```typescript
// Role-based access control with granular permissions
export enum Permission {
  USER_READ = 'user:read',
  USER_WRITE = 'user:write',
  USER_DELETE = 'user:delete',
  ORDER_READ = 'order:read',
  ORDER_WRITE = 'order:write',
  ADMIN_ACCESS = 'admin:*',
}

@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
  ) {}
  
  canActivate(context: ExecutionContext): boolean {
    const requiredPermissions = this.reflector.get<Permission[]>(
      'permissions',
      context.getHandler(),
    );
    
    if (!requiredPermissions) {
      return true;
    }
    
    const { user } = context.switchToHttp().getRequest();
    
    return requiredPermissions.every(permission =>
      user.permissions.includes(permission)
    );
  }
}

// Usage
@Get(':id')
@RequirePermissions(Permission.USER_READ)
async findOne(@Param('id') id: string) {
  return this.usersService.findOne(id);
}

@Delete(':id')
@RequirePermissions(Permission.USER_DELETE)
async remove(@Param('id') id: string) {
  return this.usersService.remove(id);
}
```

## Authentication & Authorization

### JWT Token Strategy

```typescript
// JWT payload structure
interface JwtPayload {
  sub: string;           // User ID
  email: string;
  role: string;
  permissions: string[];
  iat: number;          // Issued at
  exp: number;          // Expiration
  jti: string;          // JWT ID for revocation
}

@Injectable()
export class AuthService {
  constructor(
    private jwtService: JwtService,
    private config: ConfigService,
  ) {}
  
  async generateTokens(user: User) {
    const payload: JwtPayload = {
      sub: user.id,
      email: user.email,
      role: user.role,
      permissions: user.permissions,
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + 3600, // 1 hour
      jti: uuidv4(),
    };
    
    const accessToken = this.jwtService.sign(payload, {
      secret: this.config.get('JWT_SECRET'),
      expiresIn: '1h',
    });
    
    const refreshToken = this.jwtService.sign(
      { sub: user.id, jti: uuidv4() },
      {
        secret: this.config.get('JWT_REFRESH_SECRET'),
        expiresIn: '7d',
      }
    );
    
    // Store tokens in database for revocation capability
    await this.sessionsService.create({
      userId: user.id,
      accessToken,
      refreshToken,
      expiresAt: new Date(Date.now() + 3600000),
    });
    
    return { accessToken, refreshToken };
  }
  
  async revokeToken(token: string) {
    await this.sessionsService.delete({ token });
  }
}
```

### API Gateway Security

```typescript
// apps/gateway/src/guards/rate-limit.guard.ts
import { RateLimiterMemory } from 'rate-limiter-flexible';

@Injectable()
export class RateLimitGuard implements CanActivate {
  private rateLimiter = new RateLimiterMemory({
    points: 100,        // Number of requests
    duration: 60,       // Per 60 seconds
    blockDuration: 60,  // Block for 60 seconds if exceeded
  });
  
  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const identifier = request.user?.id || request.ip;
    
    try {
      await this.rateLimiter.consume(identifier);
      return true;
    } catch (error) {
      throw new TooManyRequestsException('Rate limit exceeded');
    }
  }
}

// Apply globally or per route
@UseGuards(RateLimitGuard)
@Controller('api')
export class ApiController {}
```

### CORS Configuration

```typescript
// main.ts
app.enableCors({
  origin: (origin, callback) => {
    const allowedOrigins = [
      'https://app.example.com',
      'https://admin.example.com',
    ];
    
    if (process.env.NODE_ENV === 'development') {
      allowedOrigins.push('http://localhost:4200');
    }
    
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  exposedHeaders: ['X-Total-Count'],
  maxAge: 3600,
});
```

## Input Validation & Sanitization

### DTO Validation

```typescript
import { IsEmail, IsString, MinLength, MaxLength, Matches } from 'class-validator';
import { Transform } from 'class-transformer';
import { sanitize } from 'class-sanitizer';

export class CreateUserDto {
  @IsEmail()
  @Transform(({ value }) => value.toLowerCase().trim())
  email: string;
  
  @IsString()
  @MinLength(8)
  @MaxLength(128)
  @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/, {
    message: 'Password must contain uppercase, lowercase, number, and special character',
  })
  password: string;
  
  @IsString()
  @MinLength(2)
  @MaxLength(50)
  @Transform(({ value }) => value.trim())
  @sanitize()
  firstName: string;
  
  @IsString()
  @MinLength(2)
  @MaxLength(50)
  @Transform(({ value }) => value.trim())
  @sanitize()
  lastName: string;
}

// Enable validation globally
app.useGlobalPipes(
  new ValidationPipe({
    whitelist: true,           // Strip unknown properties
    forbidNonWhitelisted: true, // Throw error on unknown properties
    transform: true,            // Transform payloads to DTO instances
    transformOptions: {
      enableImplicitConversion: false, // Explicit type conversion only
    },
  }),
);
```

### SQL Injection Prevention

```typescript
// ✅ Prisma automatically parameterizes queries
await prisma.user.findMany({
  where: {
    email: userInput, // Safe: parameterized
  },
});

// ✅ Raw queries with parameterization
await prisma.$queryRaw`
  SELECT * FROM users 
  WHERE email = ${userInput}
`; // Safe: parameterized

// ❌ Never concatenate user input
// await prisma.$queryRawUnsafe(`
//   SELECT * FROM users 
//   WHERE email = '${userInput}'
// `); // DANGEROUS: SQL injection risk
```

### XSS Prevention

```typescript
// Backend: Sanitize HTML content
import * as DOMPurify from 'isomorphic-dompurify';

@Injectable()
export class ContentService {
  sanitizeHtml(html: string): string {
    return DOMPurify.sanitize(html, {
      ALLOWED_TAGS: ['p', 'b', 'i', 'u', 'strong', 'em', 'br'],
      ALLOWED_ATTR: [],
    });
  }
}

// Frontend: Use React's built-in XSS protection
// ✅ Safe: React escapes by default
<div>{userContent}</div>

// ⚠️ Dangerous: Only use with sanitized content
<div dangerouslySetInnerHTML={{ __html: sanitizedHtml }} />
```

## Kafka Security

### Authentication & Authorization

```typescript
// Kafka configuration with SASL/SSL
export const getKafkaConfig = (): KafkaOptions => ({
  transport: Transport.KAFKA,
  options: {
    client: {
      clientId: process.env.KAFKA_CLIENT_ID,
      brokers: process.env.KAFKA_BROKERS.split(','),
      ssl: process.env.NODE_ENV === 'production',
      sasl: process.env.NODE_ENV === 'production' ? {
        mechanism: 'scram-sha-512',
        username: process.env.KAFKA_USERNAME,
        password: process.env.KAFKA_PASSWORD,
      } : undefined,
    },
    consumer: {
      groupId: process.env.KAFKA_CONSUMER_GROUP,
    },
  },
});
```

### Topic Access Control

```typescript
// Define topic permissions per service
const TOPIC_PERMISSIONS = {
  'user-service': {
    produce: ['bobo.users.*'],
    consume: ['bobo.auth.*', 'bobo.notifications.*'],
  },
  'order-service': {
    produce: ['bobo.orders.*'],
    consume: ['bobo.users.updated', 'bobo.inventory.*', 'bobo.payment.*'],
  },
};

// Validate before producing
@Injectable()
export class KafkaProducerService {
  async publishEvent(topic: string, event: any) {
    const serviceName = process.env.SERVICE_NAME;
    const allowedTopics = TOPIC_PERMISSIONS[serviceName]?.produce || [];
    
    const isAllowed = allowedTopics.some(pattern => 
      new RegExp(pattern.replace('*', '.*')).test(topic)
    );
    
    if (!isAllowed) {
      throw new ForbiddenException(`Service not allowed to produce to ${topic}`);
    }
    
    await this.kafka.emit(topic, event);
  }
}
```

### Event Signing

```typescript
import * as crypto from 'crypto';

@Injectable()
export class EventSigningService {
  private secret = process.env.EVENT_SIGNING_SECRET;
  
  signEvent(event: any): string {
    const payload = JSON.stringify(event);
    return crypto
      .createHmac('sha256', this.secret)
      .update(payload)
      .digest('hex');
  }
  
  verifyEvent(event: any, signature: string): boolean {
    const expectedSignature = this.signEvent(event);
    return crypto.timingSafeEqual(
      Buffer.from(signature),
      Buffer.from(expectedSignature)
    );
  }
}

// Producer: Sign events
const event = { /* event data */ };
const signature = this.signingService.signEvent(event);

await this.kafka.publish('topic', {
  ...event,
  _signature: signature,
});

// Consumer: Verify events
@EventPattern('bobo.orders.created')
async handleOrderCreated(@Payload() event: OrderCreatedEvent) {
  const { _signature, ...eventData } = event;
  
  if (!this.signingService.verifyEvent(eventData, _signature)) {
    throw new Error('Invalid event signature');
  }
  
  await this.processOrder(eventData);
}
```

## Secrets Management

### Environment Variables

```typescript
// .env (never commit to git)
DATABASE_URL=postgresql://user:password@localhost:5432/bobo
JWT_SECRET=your-super-secret-jwt-key-change-in-production
JWT_REFRESH_SECRET=your-refresh-token-secret
KAFKA_USERNAME=kafka-user
KAFKA_PASSWORD=kafka-password
ENCRYPTION_KEY=your-encryption-key-32-characters

// Use ConfigService for type-safe access
@Injectable()
export class ConfigService {
  get<T = string>(key: string): T {
    const value = process.env[key];
    if (value === undefined) {
      throw new Error(`Config key ${key} is not defined`);
    }
    return value as unknown as T;
  }
  
  getOrDefault<T = string>(key: string, defaultValue: T): T {
    return (process.env[key] as unknown as T) || defaultValue;
  }
}
```

### Encryption at Rest

```typescript
import * as crypto from 'crypto';

@Injectable()
export class EncryptionService {
  private algorithm = 'aes-256-gcm';
  private key = Buffer.from(process.env.ENCRYPTION_KEY, 'hex');
  
  encrypt(text: string): string {
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv(this.algorithm, this.key, iv);
    
    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    
    const authTag = cipher.getAuthTag();
    
    return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted}`;
  }
  
  decrypt(encryptedText: string): string {
    const [ivHex, authTagHex, encrypted] = encryptedText.split(':');
    
    const iv = Buffer.from(ivHex, 'hex');
    const authTag = Buffer.from(authTagHex, 'hex');
    const decipher = crypto.createDecipheriv(this.algorithm, this.key, iv);
    
    decipher.setAuthTag(authTag);
    
    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    
    return decrypted;
  }
}

// Encrypt sensitive fields in database
@Injectable()
export class UsersService {
  async create(dto: CreateUserDto) {
    return this.prisma.user.create({
      data: {
        email: dto.email,
        password: await bcrypt.hash(dto.password, 10),
        ssn: this.encryption.encrypt(dto.ssn), // Encrypt PII
      },
    });
  }
}
```

## Frontend Security

### Secure Storage

```typescript
// Use httpOnly cookies for tokens (set by backend)
// Backend sets cookie
response.cookie('accessToken', token, {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'strict',
  maxAge: 3600000, // 1 hour
});

// Frontend automatically sends cookie
// No need to manually handle tokens in localStorage
```

### Content Security Policy

```typescript
// Apply CSP headers
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"], // Allow styled-components
      imgSrc: ["'self'", 'data:', 'https:'],
      connectSrc: ["'self'", 'https://api.example.com'],
      fontSrc: ["'self'"],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'"],
      frameSrc: ["'none'"],
    },
  },
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true,
  },
}));
```

### Secure API Calls

```typescript
// Frontend API client with CSRF protection
export class ApiClient {
  private baseUrl = process.env.REACT_APP_API_URL;
  
  async request<T>(
    method: string,
    endpoint: string,
    data?: any
  ): Promise<T> {
    const response = await fetch(`${this.baseUrl}${endpoint}`, {
      method,
      headers: {
        'Content-Type': 'application/json',
        'X-CSRF-Token': this.getCsrfToken(),
      },
      credentials: 'include', // Send cookies
      body: data ? JSON.stringify(data) : undefined,
    });
    
    if (!response.ok) {
      throw new Error(`API error: ${response.statusText}`);
    }
    
    return response.json();
  }
  
  private getCsrfToken(): string {
    return document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') || '';
  }
}
```

## Audit Logging

```typescript
@Injectable()
export class AuditLogService {
  constructor(private prisma: PrismaService) {}
  
  async log(event: AuditEvent) {
    await this.prisma.auditLog.create({
      data: {
        userId: event.userId,
        action: event.action,
        resource: event.resource,
        resourceId: event.resourceId,
        ipAddress: event.ipAddress,
        userAgent: event.userAgent,
        timestamp: new Date(),
        metadata: event.metadata,
      },
    });
  }
}

// Use interceptor for automatic audit logging
@Injectable()
export class AuditInterceptor implements NestInterceptor {
  constructor(private auditLog: AuditLogService) {}
  
  intercept(context: ExecutionContext, next: CallHandler) {
    const request = context.switchToHttp().getRequest();
    const { user, method, url, ip, headers } = request;
    
    return next.handle().pipe(
      tap(() => {
        this.auditLog.log({
          userId: user?.id,
          action: method,
          resource: url,
          ipAddress: ip,
          userAgent: headers['user-agent'],
        });
      }),
    );
  }
}
```

## Security Checklist

- [ ] All endpoints require authentication
- [ ] Authorization checks on all operations
- [ ] Input validation on all DTOs
- [ ] SQL injection prevention (Prisma)
- [ ] XSS prevention (sanitization)
- [ ] CSRF protection enabled
- [ ] Rate limiting implemented
- [ ] CORS properly configured
- [ ] Secrets stored securely (not in code)
- [ ] Sensitive data encrypted at rest
- [ ] HTTPS enforced in production
- [ ] Security headers configured (Helmet)
- [ ] Audit logging enabled
- [ ] Regular security updates
- [ ] Dependency vulnerability scanning

---

**Version**: 1.0.0  
**Last Updated**: November 14, 2025  
**Security Review**: Quarterly

