# 🚀 Quick Start Guide - Microservices Architecture

This monorepo now follows a **true microservices architecture** with database-per-service.

## ✅ What's Been Set Up

- ✅ 9 independent Prisma schemas (one per service)
- ✅ 9 separate Prisma clients generated
- ✅ Service-specific database configurations
- ✅ NPM scripts for managing all services
- ✅ Migration and setup scripts
- ✅ Comprehensive documentation

## 🏗️ Architecture

Each service has its own:
- **Database**: Isolated data store
- **Prisma Schema**: Independent schema definition
- **Prisma Client**: Type-safe database client

### Services:
1. **Gateway** - Auth, Users, Tenants
2. **Lead Ingest** - Lead management
3. **Assignment** - Lead/task routing
4. **Commission** - Commission calculations
5. **Payment** - Payment processing
6. **Analytics** - Event tracking & reporting
7. **Notification** - Multi-channel notifications
8. **Scheduler** - Job scheduling
9. **Worker** - Background job processing

## 🛠️ Setup (First Time)

### 1. Create Environment File

```bash
cp .env.example .env
```

Then update `.env` with your database URLs:

```env
# Gateway Service
GATEWAY_DATABASE_URL="postgresql://postgres:password@localhost:5432/gateway_db?schema=public"

# Lead Ingest Service
LEAD_INGEST_DATABASE_URL="postgresql://postgres:password@localhost:5432/lead_ingest_db?schema=public"

# Assignment Service
ASSIGNMENT_DATABASE_URL="postgresql://postgres:password@localhost:5432/assignment_db?schema=public"

# Commission Service
COMMISSION_DATABASE_URL="postgresql://postgres:password@localhost:5432/commission_db?schema=public"

# Payment Service
PAYMENT_DATABASE_URL="postgresql://postgres:password@localhost:5432/payment_db?schema=public"

# Analytics Service
ANALYTICS_DATABASE_URL="postgresql://postgres:password@localhost:5432/analytics_db?schema=public"

# Notification Service
NOTIFICATION_DATABASE_URL="postgresql://postgres:password@localhost:5432/notification_db?schema=public"

# Scheduler Service
SCHEDULER_DATABASE_URL="postgresql://postgres:password@localhost:5432/scheduler_db?schema=public"

# Worker Service
WORKER_DATABASE_URL="postgresql://postgres:password@localhost:5432/worker_db?schema=public"

# JWT & Redis
JWT_SECRET="your-super-secret-key-change-in-production"
JWT_REFRESH_SECRET="your-refresh-secret-key"
REDIS_HOST="localhost"
REDIS_PORT=6379
```

### 2. Create Databases

**Automatically:**
```bash
./scripts/setup-databases.sh
```

**Or manually:**
```bash
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
npm run prisma:generate
```

This generates type-safe clients for all 9 services.

### 4. Run Migrations

**All at once:**
```bash
./scripts/migrate-all.sh
```

**Or individually:**
```bash
npm run prisma:migrate:gateway
npm run prisma:migrate:leadIngest
npm run prisma:migrate:assignment
# ... etc
```

### 5. Start Services

**Individual service:**
```bash
nx serve gateway
nx serve leadIngest
```

**Multiple services:**
```bash
nx run-many --target=serve --projects=gateway,leadIngest,analytics
```

## 📊 Managing Databases

### Prisma Studio (Database GUI)

Each service has its own Prisma Studio on a different port:

```bash
# Gateway (port 5555)
npm run prisma:studio:gateway

# Analytics (port 5556)
npm run prisma:studio:analytics

# Lead Ingest (port 5559)
npm run prisma:studio:leadIngest
```

### Generating Clients

After schema changes:

```bash
# All services
npm run prisma:generate

# Single service
npm run prisma:generate:gateway
```

### Running Migrations

```bash
# All services
./scripts/migrate-all.sh

# Single service
npm run prisma:migrate:gateway
```

## 🔄 Daily Development Workflow

### Making Schema Changes

1. **Edit schema:**
```bash
code apps/gateway/prisma/schema.prisma
```

2. **Generate client:**
```bash
npm run prisma:generate:gateway
```

3. **Create migration:**
```bash
npm run prisma:migrate:gateway
```

4. **Restart service:**
```bash
nx serve gateway
```

### Adding New Models

1. Add model to appropriate service's schema
2. Generate Prisma client
3. Create migration
4. Use in your service code

```typescript
// In your service
import { PrismaClient } from '.prisma/client-gateway';

// Use the client
const prisma = new PrismaClient();
const users = await prisma.user.findMany();
```

## 🏭 Production Deployment

### Environment Variables

Each service needs its database URL:

```env
GATEWAY_DATABASE_URL=postgres://...
LEAD_INGEST_DATABASE_URL=postgres://...
# ... etc
```

### Database Setup

1. **Create production databases** (one per service)
2. **Run migrations** on production DBs
3. **Deploy services** with correct env vars

### Docker Deployment

Each service can be containerized independently:

```yaml
# docker-compose.yml example
services:
  gateway-db:
    image: postgres:15
    environment:
      POSTGRES_DB: gateway_db

  gateway:
    build: ./apps/gateway
    environment:
      GATEWAY_DATABASE_URL: postgresql://...
    depends_on:
      - gateway-db

  leadingest-db:
    image: postgres:15
    environment:
      POSTGRES_DB: lead_ingest_db

  leadingest:
    build: ./apps/leadIngest
    environment:
      LEAD_INGEST_DATABASE_URL: postgresql://...
    depends_on:
      - leadingest-db
```

## 📚 Additional Documentation

- **[MICROSERVICES_ARCHITECTURE.md](./MICROSERVICES_ARCHITECTURE.md)** - Detailed architecture guide
- **[docs/AUTH_IMPLEMENTATION_GUIDE.md](./docs/AUTH_IMPLEMENTATION_GUIDE.md)** - Auth setup
- **[CONTRIBUTING.md](./CONTRIBUTING.md)** - Contribution guidelines

## 🐛 Troubleshooting

### "Can't reach database server"
- Check database is running: `psql -U postgres -l`
- Verify DATABASE_URL in `.env`
- Check port and credentials

### "Prisma Client is not generated"
- Run: `npm run prisma:generate:SERVICE_NAME`
- Check schema syntax is valid

### "Migration failed"
- Check database exists
- Verify DATABASE_URL points to correct DB
- Review migration conflicts

### "Module not found: .prisma/client-*"
- Generate clients: `npm run prisma:generate`
- Restart your IDE/TypeScript server

## 🎯 Next Steps

1. ✅ Set up environment variables
2. ✅ Create databases
3. ✅ Generate Prisma clients
4. ✅ Run migrations
5. ⏳ Implement inter-service communication (Kafka/gRPC)
6. ⏳ Add distributed tracing
7. ⏳ Set up monitoring (Prometheus/Grafana)
8. ⏳ Implement circuit breakers
9. ⏳ Add API documentation (Swagger)
10. ⏳ Write integration tests

## 💡 Tips

- Use Prisma Studio for quick database inspection
- Each service is independently deployable
- Services communicate via APIs (not shared DB)
- Keep services focused on single domains
- Use events for cross-service communication

## 🤝 Need Help?

- Check the [MICROSERVICES_ARCHITECTURE.md](./MICROSERVICES_ARCHITECTURE.md)
- Review Prisma docs: https://prisma.io/docs
- Check service-specific README files

Happy coding! 🚀

