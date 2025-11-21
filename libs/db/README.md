# @org/db

Database library for the monorepo. Provides Prisma client and database services.

## Structure

```
libs/db/
├── prisma/
│   └── schema.prisma          # Main Prisma schema
├── src/
│   ├── lib/
│   │   ├── prisma.service.ts  # Prisma service
│   │   └── prisma.module.ts   # Prisma module
│   └── index.ts               # Exports
└── package.json
```

## Usage

### Import in your NestJS app

```typescript
import { PrismaModule, PrismaService } from '@org/db';

@Module({
  imports: [PrismaModule],
  // ...
})
export class AppModule {}
```

### Use PrismaService

```typescript
import { PrismaService } from '@org/db';

@Injectable()
export class UserService {
  constructor(private prisma: PrismaService) {}

  async findAll() {
    return this.prisma.user.findMany();
  }
}
```

## Prisma Commands

From the **root** of the workspace:

```bash
# Generate Prisma Client
npm run prisma:generate

# Create migration
npm run prisma:migrate

# Push schema to DB (no migration)
npm run prisma:push

# Open Prisma Studio
npm run prisma:studio
```

Or use Prisma CLI directly:

```bash
npx prisma generate --schema=./libs/db/prisma/schema.prisma
npx prisma migrate dev --schema=./libs/db/prisma/schema.prisma
```

## Database Setup

1. **Set environment variable** in `.env`:
```env
DATABASE_URL="postgresql://user:password@localhost:5432/dbname?schema=public"
```

2. **Generate Prisma Client**:
```bash
npm run prisma:generate
```

3. **Run migrations**:
```bash
npm run prisma:migrate
```

## Schema Organization

The schema includes:
- **Multi-tenancy**: Tenant, TenantUser models
- **Authentication**: User, Session, RefreshToken, PasswordReset
- **OAuth**: OAuthAccount for social login
- **Authorization**: Role-based access control (RBAC)

## Shared Database Architecture

This library uses a **shared database** pattern where all microservices use the same database. This is suitable for:
- ✅ Services that need to share user/tenant data
- ✅ Multi-tenant SaaS applications
- ✅ Maintaining data consistency across domains
- ✅ Simpler infrastructure

If you need **database-per-service** isolation, consider creating separate Prisma schemas in each app.
