# ⚠️ DEPRECATED - This library is no longer used

## Migration to Microservices Architecture

This shared database library (`@org/db`) has been deprecated in favor of **database-per-service** architecture.

### What Changed?

Each microservice now has its own:
- Prisma schema: `apps/*/prisma/schema.prisma`
- Prisma client: `.prisma/client-*`
- Database: Separate PostgreSQL database

### Migration Path

**Old (Shared Database):**
```typescript
import { PrismaModule, PrismaService } from '@org/db';

@Module({
  imports: [PrismaModule],
})
export class AppModule {}
```

**New (Service-Specific):**
```typescript
// In apps/gateway/src/prisma/prisma.service.ts
import { PrismaClient } from '.prisma/client-gateway';

@Injectable()
export class PrismaService extends PrismaClient { }

// In apps/gateway/src/app/app.module.ts
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
})
export class AppModule {}
```

### For Auth Library Users

The `@org/auth` library now requires you to provide a PrismaService:

```typescript
import { AuthModule } from '@org/auth';
import { PrismaService } from './prisma/prisma.service';

@Module({
  imports: [
    AuthModule.forRoot(PrismaService),
  ],
})
export class AppModule {}
```

## Removal Timeline

- ✅ **Now**: Marked as deprecated
- 🔜 **Next Release**: Will be removed entirely

## See Also

- [MICROSERVICES_ARCHITECTURE.md](../../MICROSERVICES_ARCHITECTURE.md)
- [QUICK_START.md](../../QUICK_START.md)

