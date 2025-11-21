# Prisma Schema Patterns for Nx Monorepo

## Overview

This guide provides Prisma schema patterns and best practices for use in an Nx monorepo with NestJS backend services.

## Project Structure

```
apps/
  backend/
    prisma/
      schema.prisma
      migrations/
libs/
  shared/
    src/
      prisma/
        prisma.service.ts
        prisma.module.ts
```

## Base Schema Configuration

```prisma
// apps/backend/prisma/schema.prisma
generator client {
  provider = "prisma-client-js"
  output   = "../node_modules/.prisma/client"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}
```

## Common Patterns

### 1. User Management Pattern

```prisma
model User {
  id        String   @id @default(uuid())
  email     String   @unique
  firstName String?  @map("first_name")
  lastName  String?  @map("last_name")
  password  String
  role      UserRole @default(USER)
  
  // Audit fields
  createdAt DateTime @default(now()) @map("created_at")
  updatedAt DateTime @updatedAt @map("updated_at")
  deletedAt DateTime? @map("deleted_at")
  
  // Relations
  profile   UserProfile?
  posts     Post[]
  sessions  Session[]
  
  @@map("users")
  @@index([email])
}

enum UserRole {
  ADMIN
  USER
  GUEST
}

model UserProfile {
  id          String   @id @default(uuid())
  userId      String   @unique @map("user_id")
  bio         String?
  avatarUrl   String?  @map("avatar_url")
  phoneNumber String?  @map("phone_number")
  
  user        User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  
  @@map("user_profiles")
}

model Session {
  id           String   @id @default(uuid())
  userId       String   @map("user_id")
  token        String   @unique
  expiresAt    DateTime @map("expires_at")
  createdAt    DateTime @default(now()) @map("created_at")
  
  user         User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  
  @@map("sessions")
  @@index([userId])
  @@index([token])
}
```

### 2. Multi-Tenancy Pattern

```prisma
model Tenant {
  id          String   @id @default(uuid())
  name        String
  slug        String   @unique
  plan        TenantPlan @default(FREE)
  isActive    Boolean  @default(true) @map("is_active")
  
  createdAt   DateTime @default(now()) @map("created_at")
  updatedAt   DateTime @updatedAt @map("updated_at")
  
  users       TenantUser[]
  projects    Project[]
  
  @@map("tenants")
}

enum TenantPlan {
  FREE
  STARTER
  PROFESSIONAL
  ENTERPRISE
}

model TenantUser {
  id        String   @id @default(uuid())
  tenantId  String   @map("tenant_id")
  userId    String   @map("user_id")
  role      TenantRole @default(MEMBER)
  
  createdAt DateTime @default(now()) @map("created_at")
  
  tenant    Tenant   @relation(fields: [tenantId], references: [id], onDelete: Cascade)
  
  @@unique([tenantId, userId])
  @@map("tenant_users")
  @@index([userId])
}

enum TenantRole {
  OWNER
  ADMIN
  MEMBER
}
```

### 3. Event Sourcing Pattern

```prisma
model Event {
  id            String   @id @default(uuid())
  aggregateId   String   @map("aggregate_id")
  aggregateType String   @map("aggregate_type")
  eventType     String   @map("event_type")
  eventVersion  String   @default("1.0") @map("event_version")
  
  payload       Json
  metadata      Json?
  
  occurredAt    DateTime @default(now()) @map("occurred_at")
  processedAt   DateTime? @map("processed_at")
  
  @@map("events")
  @@index([aggregateId, aggregateType])
  @@index([eventType])
  @@index([occurredAt])
}

model EventSnapshot {
  id            String   @id @default(uuid())
  aggregateId   String   @unique @map("aggregate_id")
  aggregateType String   @map("aggregate_type")
  version       Int
  state         Json
  
  createdAt     DateTime @default(now()) @map("created_at")
  
  @@map("event_snapshots")
}
```

### 4. Soft Delete Pattern

```prisma
model Post {
  id        String    @id @default(uuid())
  title     String
  content   String
  published Boolean   @default(false)
  authorId  String    @map("author_id")
  
  createdAt DateTime  @default(now()) @map("created_at")
  updatedAt DateTime  @updatedAt @map("updated_at")
  deletedAt DateTime? @map("deleted_at")
  
  author    User      @relation(fields: [authorId], references: [id])
  tags      PostTag[]
  
  @@map("posts")
  @@index([authorId])
  @@index([deletedAt]) // For efficient soft-delete queries
}

// In your service, implement soft delete helpers
// prisma.post.update({ where: { id }, data: { deletedAt: new Date() } })
// prisma.post.findMany({ where: { deletedAt: null } }) // Only active records
```

### 5. Many-to-Many with Join Table

```prisma
model Post {
  id        String    @id @default(uuid())
  title     String
  content   String
  
  tags      PostTag[]
  
  @@map("posts")
}

model Tag {
  id        String    @id @default(uuid())
  name      String    @unique
  slug      String    @unique
  
  posts     PostTag[]
  
  @@map("tags")
}

model PostTag {
  postId    String    @map("post_id")
  tagId     String    @map("tag_id")
  
  assignedAt DateTime @default(now()) @map("assigned_at")
  assignedBy String?  @map("assigned_by")
  
  post      Post      @relation(fields: [postId], references: [id], onDelete: Cascade)
  tag       Tag       @relation(fields: [tagId], references: [id], onDelete: Cascade)
  
  @@id([postId, tagId])
  @@map("post_tags")
}
```

### 6. Hierarchical Data (Adjacency List)

```prisma
model Category {
  id          String     @id @default(uuid())
  name        String
  slug        String     @unique
  parentId    String?    @map("parent_id")
  
  parent      Category?  @relation("CategoryHierarchy", fields: [parentId], references: [id])
  children    Category[] @relation("CategoryHierarchy")
  
  @@map("categories")
  @@index([parentId])
}
```

### 7. Polymorphic Relations Pattern

```prisma
// Using discriminated union pattern
model Comment {
  id            String   @id @default(uuid())
  content       String
  authorId      String   @map("author_id")
  
  // Polymorphic fields
  commentableType String  @map("commentable_type") // "Post", "Photo", etc.
  commentableId   String  @map("commentable_id")
  
  createdAt     DateTime @default(now()) @map("created_at")
  
  @@map("comments")
  @@index([commentableType, commentableId])
}

// Alternative: Explicit relations (preferred)
model Comment {
  id        String   @id @default(uuid())
  content   String
  authorId  String   @map("author_id")
  
  postId    String?  @map("post_id")
  photoId   String?  @map("photo_id")
  
  post      Post?    @relation(fields: [postId], references: [id])
  photo     Photo?   @relation(fields: [photoId], references: [id])
  
  createdAt DateTime @default(now()) @map("created_at")
  
  @@map("comments")
}
```

## Prisma Service in Shared Library

```typescript
// libs/shared/src/prisma/prisma.service.ts
import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  constructor() {
    super({
      log: process.env.NODE_ENV === 'development' 
        ? ['query', 'error', 'warn'] 
        : ['error'],
    });
  }

  async onModuleInit() {
    await this.$connect();
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }

  // Soft delete helper
  async softDelete<T>(model: any, where: any): Promise<T> {
    return model.update({
      where,
      data: { deletedAt: new Date() },
    });
  }

  // Find excluding soft-deleted
  excludeDeleted = {
    deletedAt: null,
  };
}
```

```typescript
// libs/shared/src/prisma/prisma.module.ts
import { Module, Global } from '@nestjs/common';
import { PrismaService } from './prisma.service';

@Global()
@Module({
  providers: [PrismaService],
  exports: [PrismaService],
})
export class PrismaModule {}
```

## Best Practices

### 1. Naming Conventions
- Use `camelCase` for field names in schema
- Use `@map()` to map to `snake_case` in database
- Use plural table names: `@@map("users")`

### 2. Indexing Strategy
- Index foreign keys
- Index frequently queried fields
- Use compound indexes for complex queries
- Monitor query performance in production

### 3. Migrations
```bash
# Create migration
npx prisma migrate dev --name add_user_profile

# Apply migrations in production
npx prisma migrate deploy

# Reset database (dev only)
npx prisma migrate reset
```

### 4. Seed Data
```typescript
// apps/backend/prisma/seed.ts
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const user = await prisma.user.upsert({
    where: { email: 'admin@example.com' },
    update: {},
    create: {
      email: 'admin@example.com',
      firstName: 'Admin',
      lastName: 'User',
      role: 'ADMIN',
      password: 'hashed_password',
    },
  });

  console.log({ user });
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
```

### 5. Type Safety
```typescript
// Use generated types
import { User, Prisma } from '@prisma/client';

// Type-safe queries
const createUser = async (data: Prisma.UserCreateInput): Promise<User> => {
  return prisma.user.create({ data });
};

// Include relations with type safety
type UserWithProfile = Prisma.UserGetPayload<{
  include: { profile: true }
}>;
```

## Testing with Prisma

```typescript
// test setup
import { Test } from '@nestjs/testing';
import { PrismaService } from '@bobo/shared/prisma';

describe('UsersService', () => {
  let prisma: PrismaService;

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      providers: [PrismaService],
    }).compile();

    prisma = module.get<PrismaService>(PrismaService);
  });

  beforeEach(async () => {
    // Clean up database between tests
    await prisma.$transaction([
      prisma.user.deleteMany(),
    ]);
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });
});
```

## Additional Resources

- [Prisma Documentation](https://www.prisma.io/docs)
- [Prisma Schema Reference](https://www.prisma.io/docs/reference/api-reference/prisma-schema-reference)
- [NestJS + Prisma Guide](https://docs.nestjs.com/recipes/prisma)

