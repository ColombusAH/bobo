# Authentication Usage Examples

## How to Use Auth in Other Microservices

This document provides practical examples of using the authentication system across different microservices in the Bobo monorepo.

---

## Setup in Microservices

### 1. Import AuthModule

```typescript
// apps/payment/src/app/app.module.ts
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { PrismaModule } from '@bobo/shared/prisma';
import { AuthModule, JwtAuthGuard, TenantGuard } from '@bobo/auth';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PrismaModule,
    AuthModule, // Import auth module
  ],
  providers: [
    // Apply JWT guard globally
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },
    // Optionally apply tenant guard globally
    {
      provide: APP_GUARD,
      useClass: TenantGuard,
    },
  ],
})
export class AppModule {}
```

---

## Example 1: Payment Service

### Multi-Tenant Payment Processing

```typescript
// apps/payment/src/app/payments/payments.controller.ts
import { Controller, Get, Post, Body, UseGuards } from '@nestjs/common';
import { JwtAuthGuard, TenantGuard, CurrentUser, Roles, RolesGuard } from '@bobo/auth';

@Controller('payments')
@UseGuards(JwtAuthGuard, TenantGuard)
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  /**
   * Create payment - automatically scoped to user's tenant
   */
  @Post()
  async createPayment(
    @CurrentUser('tenantId') tenantId: string,
    @CurrentUser('sub') userId: string,
    @Body() dto: CreatePaymentDto,
  ) {
    return this.paymentsService.create({
      ...dto,
      tenantId,  // Automatically scoped to tenant
      userId,
    });
  }

  /**
   * Get tenant payments
   */
  @Get()
  async getPayments(@CurrentUser('tenantId') tenantId: string) {
    return this.paymentsService.findAll(tenantId);
  }

  /**
   * Admin-only: View all payments across tenants
   */
  @UseGuards(RolesGuard)
  @Roles('OWNER', 'ADMIN')
  @Get('all')
  async getAllPayments(
    @CurrentUser('tenantId') tenantId: string,
    @CurrentUser('role') role: string,
  ) {
    return this.paymentsService.findAllForTenant(tenantId);
  }
}
```

### Payment Service Implementation

```typescript
// apps/payment/src/app/payments/payments.service.ts
import { Injectable } from '@nestjs/common';
import { PrismaService } from '@bobo/shared/prisma';

@Injectable()
export class PaymentsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: CreatePaymentData) {
    // Tenant ID is already included in data
    return this.prisma.payment.create({
      data: {
        tenantId: data.tenantId,
        userId: data.userId,
        amount: data.amount,
        currency: data.currency,
        status: 'PENDING',
      },
    });
  }

  async findAll(tenantId: string) {
    // All queries scoped to tenant
    return this.prisma.payment.findMany({
      where: { tenantId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string, tenantId: string) {
    // Security: Verify payment belongs to tenant
    return this.prisma.payment.findFirst({
      where: {
        id,
        tenantId, // Critical for security
      },
    });
  }
}
```

---

## Example 2: Notification Service

### Sending Tenant-Scoped Notifications

```typescript
// apps/notification/src/app/notifications/notifications.controller.ts
import { Controller, Get, Post, Body, UseGuards } from '@nestjs/common';
import { JwtAuthGuard, TenantGuard, CurrentUser } from '@bobo/auth';

@Controller('notifications')
@UseGuards(JwtAuthGuard, TenantGuard)
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  /**
   * Get user's notifications (tenant-scoped)
   */
  @Get()
  async getUserNotifications(
    @CurrentUser('sub') userId: string,
    @CurrentUser('tenantId') tenantId: string,
  ) {
    return this.notificationsService.findForUser(userId, tenantId);
  }

  /**
   * Mark notification as read
   */
  @Post(':id/read')
  async markAsRead(
    @Param('id') id: string,
    @CurrentUser('sub') userId: string,
    @CurrentUser('tenantId') tenantId: string,
  ) {
    return this.notificationsService.markAsRead(id, userId, tenantId);
  }
}
```

### Notification Service with Kafka

```typescript
// apps/notification/src/app/notifications/notifications.service.ts
import { Injectable } from '@nestjs/common';
import { EventPattern, Payload } from '@nestjs/microservices';
import { PrismaService } from '@bobo/shared/prisma';
import { KafkaProducerService } from '@bobo/kafka';

@Injectable()
export class NotificationsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly kafka: KafkaProducerService,
  ) {}

  /**
   * Listen to Kafka events - automatically includes tenant context
   */
  @EventPattern('bobo.users.created')
  async handleUserCreated(@Payload() event: UserCreatedEvent) {
    // Event includes tenantId
    await this.prisma.notification.create({
      data: {
        userId: event.userId,
        tenantId: event.tenantId, // From Kafka event
        type: 'WELCOME',
        title: 'Welcome to the platform!',
        message: 'Get started with our quick tour.',
      },
    });
  }

  async findForUser(userId: string, tenantId: string) {
    return this.prisma.notification.findMany({
      where: {
        userId,
        tenantId, // Tenant-scoped
      },
      orderBy: { createdAt: 'desc' },
    });
  }
}
```

---

## Example 3: Analytics Service

### Permission-Based Analytics Access

```typescript
// apps/analytics/src/app/analytics/analytics.controller.ts
import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import {
  JwtAuthGuard,
  TenantGuard,
  PermissionsGuard,
  CurrentUser,
  RequirePermissions,
} from '@bobo/auth';

@Controller('analytics')
@UseGuards(JwtAuthGuard, TenantGuard, PermissionsGuard)
export class AnalyticsController {
  constructor(private readonly analyticsService: AnalyticsService) {}

  /**
   * Basic metrics - all authenticated users
   */
  @Get('metrics')
  async getBasicMetrics(@CurrentUser('tenantId') tenantId: string) {
    return this.analyticsService.getBasicMetrics(tenantId);
  }

  /**
   * Advanced analytics - requires permission
   */
  @RequirePermissions('analytics:advanced')
  @Get('advanced')
  async getAdvancedAnalytics(
    @CurrentUser('tenantId') tenantId: string,
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
  ) {
    return this.analyticsService.getAdvancedAnalytics(
      tenantId,
      new Date(startDate),
      new Date(endDate),
    );
  }

  /**
   * Financial reports - requires multiple permissions
   */
  @RequirePermissions('analytics:financial', 'reports:read')
  @Get('financial')
  async getFinancialReports(@CurrentUser('tenantId') tenantId: string) {
    return this.analyticsService.getFinancialReports(tenantId);
  }
}
```

---

## Example 4: Commission Service

### Role-Based Commission Management

```typescript
// apps/commission/src/app/commissions/commissions.controller.ts
import { Controller, Get, Post, Put, UseGuards } from '@nestjs/common';
import {
  JwtAuthGuard,
  TenantGuard,
  RolesGuard,
  CurrentUser,
  Roles,
} from '@bobo/auth';

@Controller('commissions')
@UseGuards(JwtAuthGuard, TenantGuard, RolesGuard)
export class CommissionsController {
  constructor(private readonly commissionsService: CommissionsService) {}

  /**
   * View own commissions - all members
   */
  @Get('mine')
  async getMyCommissions(
    @CurrentUser('sub') userId: string,
    @CurrentUser('tenantId') tenantId: string,
  ) {
    return this.commissionsService.findUserCommissions(userId, tenantId);
  }

  /**
   * View all commissions - admins only
   */
  @Roles('ADMIN', 'OWNER')
  @Get('all')
  async getAllCommissions(@CurrentUser('tenantId') tenantId: string) {
    return this.commissionsService.findAllCommissions(tenantId);
  }

  /**
   * Approve commission - admins only
   */
  @Roles('ADMIN', 'OWNER')
  @Put(':id/approve')
  async approveCommission(
    @Param('id') id: string,
    @CurrentUser('sub') approvedBy: string,
    @CurrentUser('tenantId') tenantId: string,
  ) {
    return this.commissionsService.approve(id, approvedBy, tenantId);
  }

  /**
   * Update commission rules - owners only
   */
  @Roles('OWNER')
  @Put('rules')
  async updateCommissionRules(
    @CurrentUser('tenantId') tenantId: string,
    @Body() rules: UpdateCommissionRulesDto,
  ) {
    return this.commissionsService.updateRules(tenantId, rules);
  }
}
```

---

## Example 5: Lead Ingest Service

### Public API with Optional Authentication

```typescript
// apps/leadIngest/src/app/leads/leads.controller.ts
import { Controller, Post, Body, UseGuards } from '@nestjs/common';
import { JwtAuthGuard, CurrentUser, Public } from '@bobo/auth';

@Controller('leads')
export class LeadsController {
  constructor(private readonly leadsService: LeadsService) {}

  /**
   * Public lead submission (no auth required)
   */
  @Public()
  @Post('submit')
  async submitPublicLead(@Body() dto: SubmitLeadDto) {
    return this.leadsService.createPublicLead(dto);
  }

  /**
   * Authenticated lead creation (with tenant context)
   */
  @UseGuards(JwtAuthGuard)
  @Post()
  async createLead(
    @CurrentUser('tenantId') tenantId: string,
    @CurrentUser('sub') createdBy: string,
    @Body() dto: CreateLeadDto,
  ) {
    return this.leadsService.createLead({
      ...dto,
      tenantId,
      createdBy,
    });
  }

  /**
   * Get tenant leads
   */
  @UseGuards(JwtAuthGuard)
  @Get()
  async getLeads(@CurrentUser('tenantId') tenantId: string) {
    return this.leadsService.findAll(tenantId);
  }
}
```

---

## Example 6: Worker Service (Background Jobs)

### Processing Tenant-Scoped Jobs

```typescript
// apps/worker/src/app/workers/email-worker.service.ts
import { Injectable } from '@nestjs/common';
import { EventPattern, Payload } from '@nestjs/microservices';
import { PrismaService } from '@bobo/shared/prisma';

@Injectable()
export class EmailWorkerService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Process email job - tenant context from Kafka event
   */
  @EventPattern('bobo.emails.send')
  async processEmailJob(@Payload() job: EmailJob) {
    // Job includes tenantId
    const tenant = await this.prisma.tenant.findUnique({
      where: { id: job.tenantId },
    });

    // Use tenant-specific email settings
    await this.sendEmail({
      to: job.recipientEmail,
      subject: job.subject,
      body: job.body,
      fromName: tenant.name, // Tenant branding
    });

    // Log activity (tenant-scoped)
    await this.prisma.emailLog.create({
      data: {
        tenantId: job.tenantId,
        recipientEmail: job.recipientEmail,
        status: 'SENT',
      },
    });
  }
}
```

---

## Example 7: Scheduler Service

### Tenant-Aware Scheduled Tasks

```typescript
// apps/scheduler/src/app/schedulers/reports.scheduler.ts
import { Injectable } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '@bobo/shared/prisma';
import { KafkaProducerService } from '@bobo/kafka';

@Injectable()
export class ReportsScheduler {
  constructor(
    private readonly prisma: PrismaService,
    private readonly kafka: KafkaProducerService,
  ) {}

  /**
   * Generate daily reports for all active tenants
   */
  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async generateDailyReports() {
    // Get all active tenants
    const tenants = await this.prisma.tenant.findMany({
      where: { isActive: true },
    });

    for (const tenant of tenants) {
      // Generate report for each tenant
      await this.kafka.publish('bobo.reports.generate', {
        tenantId: tenant.id,
        reportType: 'DAILY',
        date: new Date(),
      });
    }
  }

  /**
   * Process report generation (tenant-scoped)
   */
  @EventPattern('bobo.reports.generate')
  async processReportGeneration(@Payload() event: GenerateReportEvent) {
    const { tenantId, reportType, date } = event;

    // Fetch tenant-scoped data
    const data = await this.prisma.payment.aggregate({
      where: {
        tenantId,
        createdAt: {
          gte: date,
          lt: new Date(date.getTime() + 86400000),
        },
      },
      _sum: { amount: true },
      _count: true,
    });

    // Store report (tenant-scoped)
    await this.prisma.report.create({
      data: {
        tenantId,
        type: reportType,
        date,
        data: data,
      },
    });
  }
}
```

---

## Example 8: Assignment Service

### Complex Authorization with Custom Permissions

```typescript
// apps/assignment/src/app/assignments/assignments.controller.ts
import { Controller, Get, Post, Put, UseGuards } from '@nestjs/common';
import {
  JwtAuthGuard,
  TenantGuard,
  PermissionsGuard,
  CurrentUser,
  RequirePermissions,
} from '@bobo/auth';

@Controller('assignments')
@UseGuards(JwtAuthGuard, TenantGuard)
export class AssignmentsController {
  constructor(private readonly assignmentsService: AssignmentsService) {}

  /**
   * View assignments - any user
   */
  @Get()
  async getAssignments(
    @CurrentUser('sub') userId: string,
    @CurrentUser('tenantId') tenantId: string,
    @CurrentUser('role') role: string,
  ) {
    // Users see only their assignments, admins see all
    if (['ADMIN', 'OWNER'].includes(role)) {
      return this.assignmentsService.findAll(tenantId);
    }
    return this.assignmentsService.findUserAssignments(userId, tenantId);
  }

  /**
   * Create assignment - requires permission
   */
  @UseGuards(PermissionsGuard)
  @RequirePermissions('assignments:create')
  @Post()
  async createAssignment(
    @CurrentUser('tenantId') tenantId: string,
    @CurrentUser('sub') createdBy: string,
    @Body() dto: CreateAssignmentDto,
  ) {
    return this.assignmentsService.create({
      ...dto,
      tenantId,
      createdBy,
    });
  }

  /**
   * Reassign - requires specific permission
   */
  @UseGuards(PermissionsGuard)
  @RequirePermissions('assignments:reassign')
  @Put(':id/reassign')
  async reassignAssignment(
    @Param('id') id: string,
    @CurrentUser('tenantId') tenantId: string,
    @Body() dto: ReassignDto,
  ) {
    return this.assignmentsService.reassign(id, dto.newUserId, tenantId);
  }
}
```

---

## Inter-Service Communication with Kafka

### Publishing Events with Tenant Context

```typescript
// Any service - publishing tenant-scoped events
import { Injectable } from '@nestjs/common';
import { KafkaProducerService } from '@bobo/kafka';

@Injectable()
export class OrdersService {
  constructor(private readonly kafka: KafkaProducerService) {}

  async createOrder(data: CreateOrderData, tenantId: string, userId: string) {
    const order = await this.prisma.order.create({
      data: {
        ...data,
        tenantId,
        userId,
      },
    });

    // Publish event with tenant context
    await this.kafka.publish('bobo.orders.created', {
      eventId: uuidv4(),
      timestamp: new Date().toISOString(),
      version: '1.0',
      tenantId,        // Include tenant ID
      userId,          // Include user ID
      orderId: order.id,
      amount: order.amount,
    });

    return order;
  }
}
```

### Consuming Events with Tenant Validation

```typescript
// Consuming service - validate tenant context
@Injectable()
export class NotificationsService {
  @EventPattern('bobo.orders.created')
  async handleOrderCreated(@Payload() event: OrderCreatedEvent) {
    // Verify tenant exists and is active
    const tenant = await this.prisma.tenant.findFirst({
      where: {
        id: event.tenantId,
        isActive: true,
      },
    });

    if (!tenant) {
      console.warn(`Skipping event for inactive tenant: ${event.tenantId}`);
      return;
    }

    // Process notification (tenant-scoped)
    await this.prisma.notification.create({
      data: {
        tenantId: event.tenantId,
        userId: event.userId,
        type: 'ORDER_CREATED',
        title: 'Order Created',
        message: `Your order #${event.orderId} has been created`,
      },
    });
  }
}
```

---

## Testing with Authentication

### Unit Tests

```typescript
// Example unit test with mocked auth
describe('PaymentsController', () => {
  let controller: PaymentsController;
  let service: PaymentsService;

  const mockUser: JwtPayload = {
    sub: 'user-123',
    email: 'test@example.com',
    tenantId: 'tenant-123',
    role: 'MEMBER',
    permissions: [],
    sessionId: 'session-123',
    type: 'access',
    iat: Date.now(),
    exp: Date.now() + 3600,
  };

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      controllers: [PaymentsController],
      providers: [
        {
          provide: PaymentsService,
          useValue: {
            create: jest.fn(),
            findAll: jest.fn(),
          },
        },
      ],
    }).compile();

    controller = module.get<PaymentsController>(PaymentsController);
    service = module.get<PaymentsService>(PaymentsService);
  });

  it('should create payment with tenant context', async () => {
    const dto = { amount: 100, currency: 'USD' };
    const expected = { id: '1', ...dto, tenantId: mockUser.tenantId };

    jest.spyOn(service, 'create').mockResolvedValue(expected);

    const result = await controller.createPayment(
      mockUser.tenantId,
      mockUser.sub,
      dto,
    );

    expect(result).toEqual(expected);
    expect(service.create).toHaveBeenCalledWith({
      ...dto,
      tenantId: mockUser.tenantId,
      userId: mockUser.sub,
    });
  });
});
```

### Integration Tests

```typescript
// Integration test with real auth
describe('Payments API (e2e)', () => {
  let app: INestApplication;
  let accessToken: string;
  let tenantId: string;

  beforeAll(async () => {
    // Setup test app
    const module = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = module.createNestApplication();
    await app.init();

    // Login to get token
    const loginResponse = await request(app.getHttpServer())
      .post('/auth/login')
      .send({
        email: 'test@example.com',
        password: 'TestPass123!',
      });

    accessToken = loginResponse.body.tokens.accessToken;
    tenantId = loginResponse.body.tenant.id;
  });

  it('should create payment with valid auth', async () => {
    const response = await request(app.getHttpServer())
      .post('/payments')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        amount: 100,
        currency: 'USD',
      })
      .expect(201);

    expect(response.body).toHaveProperty('id');
    expect(response.body.tenantId).toBe(tenantId);
  });

  it('should reject without auth', async () => {
    await request(app.getHttpServer())
      .post('/payments')
      .send({
        amount: 100,
        currency: 'USD',
      })
      .expect(401);
  });
});
```

---

## Common Patterns Summary

### 1. **Always Include Tenant Context**
```typescript
@CurrentUser('tenantId') tenantId: string
```

### 2. **Validate Tenant in Queries**
```typescript
where: { id, tenantId } // Never query without tenant check
```

### 3. **Use Appropriate Guards**
```typescript
@UseGuards(JwtAuthGuard, TenantGuard, RolesGuard)
```

### 4. **Include Context in Kafka Events**
```typescript
{ tenantId, userId, ...eventData }
```

### 5. **Scope All Database Operations**
```typescript
prisma.model.findMany({ where: { tenantId } })
```

---

**This ensures complete tenant isolation and security across your entire microservices architecture!** 🔒


