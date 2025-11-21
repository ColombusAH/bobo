# Microservices Architecture Guide

This document describes the microservices architecture implemented in this monorepo.

## 🏗️ Architecture Overview

We follow a **true microservices architecture** with **database-per-service** pattern:

- Each service owns its data domain
- Services are independently deployable
- Services communicate via APIs (not shared database)
- Each service has its own Prisma schema and database

## 📁 Structure

```
apps/
├── gateway/          # API Gateway + Auth Service
│   ├── prisma/
│   │   └── schema.prisma  # Users, Tenants, Sessions, OAuth
│   └── src/
│       ├── prisma/
│       │   ├── prisma.service.ts
│       │   └── prisma.module.ts
│       └── app/
│
├── analytics/        # Analytics & Reporting Service
│   ├── prisma/
│   │   └── schema.prisma  # Events, Metrics, Dashboards, Reports
│   └── src/
│
├── assignment/       # Assignment & Routing Service
│   ├── prisma/
│   │   └── schema.prisma  # Rules, Assignments, Workload
│   └── src/
│
├── commission/       # Commission Calculation Service
│   ├── prisma/
│   │   └── schema.prisma  # Plans, Calculations, Payouts
│   └── src/
│
├── leadIngest/       # Lead Management Service
│   ├── prisma/
│   │   └── schema.prisma  # Leads, Activities
│   └── src/
│
├── notification/     # Notification Service
│   ├── prisma/
│   │   └── schema.prisma  # Notifications, Templates, Preferences
│   └── src/
│
├── payment/          # Payment Processing Service
│   ├── prisma/
│   │   └── schema.prisma  # Transactions, PaymentMethods, Invoices
│   └── src/
│
├── scheduler/        # Job Scheduling Service
│   ├── prisma/
│   │   └── schema.prisma  # ScheduledJobs, Executions, Tasks
│   └── src/
│
└── worker/           # Background Job Processing Service
    ├── prisma/
    │   └── schema.prisma  # BackgroundJobs, Workers, DeadLetterQueue
    └── src/
```

## 🗄️ Database Architecture

### Gateway/Auth Database (`gateway_db`)
**Owner:** Gateway Service
**Purpose:** Authentication, Authorization, User Management

**Models:**
- User - User accounts and profiles
- Tenant - Multi-tenant organizations
- TenantUser - User-tenant relationships with roles
- Session - Active user sessions
- RefreshToken - JWT refresh tokens
- PasswordReset - Password reset tokens
- OAuthAccount - OAuth provider accounts

**Environment Variable:** `GATEWAY_DATABASE_URL`

### Lead Ingest Database (`lead_ingest_db`)
**Owner:** Lead Ingest Service
**Purpose:** Lead capture and management

**Models:**
- Lead - Lead information
- LeadActivity - Lead interaction tracking

**Environment Variable:** `LEAD_INGEST_DATABASE_URL`

### Assignment Database (`assignment_db`)
**Owner:** Assignment Service
**Purpose:** Lead/task assignment and routing

**Models:**
- AssignmentRule - Assignment rules engine
- Assignment - Assignment records
- WorkloadMetric - Agent workload tracking

**Environment Variable:** `ASSIGNMENT_DATABASE_URL`

### Commission Database (`commission_db`)
**Owner:** Commission Service
**Purpose:** Commission calculation and payout

**Models:**
- CommissionPlan - Commission structures
- CommissionAssignment - User-plan assignments
- CommissionCalculation - Calculated commissions
- Payout - Commission payouts

**Environment Variable:** `COMMISSION_DATABASE_URL`

### Payment Database (`payment_db`)
**Owner:** Payment Service
**Purpose:** Payment processing

**Models:**
- PaymentMethod - Payment methods
- Transaction - Payment transactions
- Refund - Refund records
- Invoice - Invoice management

**Environment Variable:** `PAYMENT_DATABASE_URL`

### Analytics Database (`analytics_db`)
**Owner:** Analytics Service
**Purpose:** Event tracking and reporting

**Models:**
- Event - Event tracking
- Metric - Aggregated metrics
- Dashboard - Dashboard configurations
- Report - Report definitions

**Environment Variable:** `ANALYTICS_DATABASE_URL`

### Notification Database (`notification_db`)
**Owner:** Notification Service
**Purpose:** Notification delivery

**Models:**
- Notification - Notification records
- NotificationTemplate - Notification templates
- NotificationPreference - User preferences
- PushSubscription - Web push subscriptions

**Environment Variable:** `NOTIFICATION_DATABASE_URL`

### Scheduler Database (`scheduler_db`)
**Owner:** Scheduler Service
**Purpose:** Job scheduling

**Models:**
- ScheduledJob - Recurring jobs
- JobExecution - Execution history
- ScheduledTask - One-time tasks

**Environment Variable:** `SCHEDULER_DATABASE_URL`

### Worker Database (`worker_db`)
**Owner:** Worker Service
**Purpose:** Background job processing

**Models:**
- BackgroundJob - Queue-based jobs
- Worker - Worker instances
- JobLog - Job execution logs
- DeadLetterJob - Failed jobs

**Environment Variable:** `WORKER_DATABASE_URL`

## 🚀 Setup Instructions

### 1. Configure Environment Variables

Create a `.env` file with all database URLs:

```env
# Gateway/Auth Service
GATEWAY_DATABASE_URL="postgresql://user:password@localhost:5432/gateway_db?schema=public"

# Lead Ingest Service
LEAD_INGEST_DATABASE_URL="postgresql://user:password@localhost:5432/lead_ingest_db?schema=public"

# Assignment Service
ASSIGNMENT_DATABASE_URL="postgresql://user:password@localhost:5432/assignment_db?schema=public"

# Commission Service
COMMISSION_DATABASE_URL="postgresql://user:password@localhost:5432/commission_db?schema=public"

# Payment Service
PAYMENT_DATABASE_URL="postgresql://user:password@localhost:5432/payment_db?schema=public"

# Analytics Service
ANALYTICS_DATABASE_URL="postgresql://user:password@localhost:5432/analytics_db?schema=public"

# Notification Service
NOTIFICATION_DATABASE_URL="postgresql://user:password@localhost:5432/notification_db?schema=public"

# Scheduler Service
SCHEDULER_DATABASE_URL="postgresql://user:password@localhost:5432/scheduler_db?schema=public"

# Worker Service
WORKER_DATABASE_URL="postgresql://user:password@localhost:5432/worker_db?schema=public"

# JWT Configuration
JWT_SECRET="your-super-secret-jwt-key"
JWT_EXPIRES_IN="15m"
JWT_REFRESH_SECRET="your-refresh-secret"
JWT_REFRESH_EXPIRES_IN="7d"

# Redis
REDIS_HOST="localhost"
REDIS_PORT=6379
```

### 2. Create Databases

```bash
# Create all databases
psql -U postgres -c "CREATE DATABASE gateway_db;"
psql -U postgres -c "CREATE DATABASE lead_ingest_db;"
psql -U postgres -c "CREATE DATABASE assignment_db;"
psql -U postgres -c "CREATE DATABASE commission_db;"
psql -U postgres -c "CREATE DATABASE payment_db;"
psql -U postgres -c "CREATE DATABASE analytics_db;"
psql -U postgres -c "CREATE DATABASE notification_db;"
psql -U postgres -c "CREATE DATABASE scheduler_db;"
psql -U postgres -c "CREATE DATABASE worker_db;"
```

### 3. Generate Prisma Clients

```bash
# Generate all clients at once
npm run prisma:generate

# Or generate individually
npm run prisma:generate:gateway
npm run prisma:generate:leadIngest
npm run prisma:generate:analytics
# ... etc
```

### 4. Run Migrations

```bash
# Migrate each service
npm run prisma:migrate:gateway
npm run prisma:migrate:leadIngest
npm run prisma:migrate:assignment
npm run prisma:migrate:commission
npm run prisma:migrate:payment
npm run prisma:migrate:analytics
npm run prisma:migrate:notification
npm run prisma:migrate:scheduler
npm run prisma:migrate:worker
```

### 5. Start Services

```bash
# Start individual services
nx serve gateway
nx serve leadIngest
nx serve analytics
# ... etc

# Or run all in parallel (development)
nx run-many --target=serve --projects=gateway,leadIngest,analytics,assignment,commission,payment,notification,scheduler,worker
```

## 📊 Using Prisma Studio

Each service has its own Prisma Studio on a different port:

```bash
# Gateway (port 5555)
npm run prisma:studio:gateway

# Analytics (port 5556)
npm run prisma:studio:analytics

# Assignment (port 5557)
npm run prisma:studio:assignment

# ... etc
```

## 🔄 Inter-Service Communication

Services communicate via:

1. **REST APIs** - HTTP/HTTPS requests
2. **Message Queue** (Kafka) - Async events
3. **gRPC** - High-performance RPC (optional)

### Data Denormalization

Since each service owns its database, some data is denormalized:

**Example:** Lead Ingest Service doesn't have full user data
```typescript
model Lead {
  // ... other fields
  assignedTo  String?  // userId from Gateway
  createdBy   String?  // userId from Gateway
}
```

Services query the Gateway API when they need full user details.

### Event-Driven Architecture

Services emit events for important actions:

```typescript
// In Lead Ingest Service
await this.kafkaClient.emit('lead.created', {
  leadId: lead.id,
  tenantId: lead.tenantId,
  assignedTo: lead.assignedTo,
});
```

## 🛠️ Adding a New Service

1. **Create service structure:**
```bash
mkdir -p apps/new-service/prisma
mkdir -p apps/new-service/src
```

2. **Create Prisma schema:**
```prisma
// apps/new-service/prisma/schema.prisma
generator client {
  provider = "prisma-client-js"
  output   = "../../../node_modules/.prisma/client-new-service"
}

datasource db {
  provider = "postgresql"
  url      = env("NEW_SERVICE_DATABASE_URL")
}

model YourModel {
  id        String   @id @default(uuid())
  tenantId  String   @map("tenant_id")
  // ... fields
}
```

3. **Create Prisma service:**
```typescript
// apps/new-service/src/prisma/prisma.service.ts
import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaClient } from '.prisma/client-new-service';

@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  async onModuleInit() {
    await this.$connect();
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }
}
```

4. **Add npm scripts:**
```json
{
  "scripts": {
    "prisma:generate:new-service": "prisma generate --schema=./apps/new-service/prisma/schema.prisma",
    "prisma:migrate:new-service": "prisma migrate dev --schema=./apps/new-service/prisma/schema.prisma",
    "prisma:studio:new-service": "prisma studio --schema=./apps/new-service/prisma/schema.prisma --port 5564"
  }
}
```

5. **Update environment:**
```env
NEW_SERVICE_DATABASE_URL="postgresql://user:password@localhost:5432/new_service_db?schema=public"
```

## 🔐 Security Considerations

1. **Service-to-Service Auth:** Use service tokens or mTLS
2. **Database Isolation:** Each service database has separate credentials
3. **API Gateway:** All external requests go through Gateway
4. **Rate Limiting:** Implement per-service rate limits
5. **Network Policies:** Restrict inter-service communication

## 📈 Monitoring & Observability

1. **Distributed Tracing:** OpenTelemetry/Jaeger
2. **Centralized Logging:** ELK Stack or similar
3. **Metrics:** Prometheus + Grafana
4. **Health Checks:** Each service exposes `/health` endpoint

## 🚨 Important Notes

### Migration from Shared Database

If migrating from a shared database:

1. **Backup everything**
2. **Export data** from shared database
3. **Import data** to service-specific databases
4. **Update service code** to use new Prisma clients
5. **Test thoroughly** before production deployment

### Auth Library Note

The `@org/auth` library currently uses `@org/db` (shared database). For true microservices:

**Option 1:** Keep auth in Gateway service only
**Option 2:** Make auth service independent with its own database
**Option 3:** Each service validates JWTs locally (no DB needed)

We recommend **Option 3** for most use cases - services validate JWT tokens without database calls.

## 📚 Additional Resources

- [Microservices Patterns](https://microservices.io/patterns/index.html)
- [Database per Service](https://microservices.io/patterns/data/database-per-service.html)
- [Saga Pattern](https://microservices.io/patterns/data/saga.html)
- [API Gateway Pattern](https://microservices.io/patterns/apigateway.html)

## 🎯 Next Steps

1. ✅ Prisma schemas created
2. ✅ Prisma clients generated
3. ⏳ Create migrations for each service
4. ⏳ Update service code to use local Prisma clients
5. ⏳ Implement inter-service communication
6. ⏳ Add message queue (Kafka)
7. ⏳ Implement distributed tracing
8. ⏳ Add monitoring and alerting

