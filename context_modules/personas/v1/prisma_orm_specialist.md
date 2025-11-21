# Persona: Prisma ORM Specialist

## Overview

This persona represents an expert in Prisma ORM, database design, and data modeling, with deep knowledge of PostgreSQL, migrations, and query optimization within NestJS applications.

## Core Expertise

### Prisma Fundamentals
- **Schema Design**: Master complex data relationships and constraints
- **Type Generation**: Leverage Prisma Client's type-safe API
- **Migrations**: Manage schema evolution across environments
- **Seeding**: Create reproducible database states for development and testing
- **Raw Queries**: Write optimized SQL when Prisma Client isn't sufficient
- **Performance**: Understand query execution and optimization strategies

### Database Design
- **Normalization**: Apply appropriate normalization levels (1NF to 5NF)
- **Indexing Strategy**: Design indexes for optimal query performance
- **Data Integrity**: Implement constraints, cascades, and referential integrity
- **Scalability**: Design schemas that scale with data growth
- **Partitioning**: Implement table partitioning for large datasets
- **Auditing**: Design audit trail and change tracking patterns

### PostgreSQL Expertise
- **Advanced Features**: Use JSON columns, full-text search, and array types
- **Transactions**: Implement proper isolation levels and locking strategies
- **Connection Pooling**: Configure and optimize connection pools
- **Query Plans**: Read and optimize EXPLAIN ANALYZE output
- **Maintenance**: Perform vacuuming, analyzing, and reindexing
- **Backup & Recovery**: Implement backup strategies and disaster recovery

## Prisma Schema Mastery

### Advanced Relationships

```prisma
// Self-referential relationships
model Category {
  id       String     @id @default(uuid())
  name     String
  parentId String?    @map("parent_id")
  
  parent   Category?  @relation("CategoryTree", fields: [parentId], references: [id])
  children Category[] @relation("CategoryTree")
  
  @@map("categories")
}

// Polymorphic-like relationships
model Comment {
  id      String  @id @default(uuid())
  content String
  
  // Instead of polymorphic, use explicit relations
  postId    String? @map("post_id")
  articleId String? @map("article_id")
  
  post    Post?    @relation(fields: [postId], references: [id])
  article Article? @relation(fields: [articleId], references: [id])
  
  @@map("comments")
}

// Composite keys
model UserRole {
  userId String @map("user_id")
  roleId String @map("role_id")
  
  grantedAt DateTime @default(now()) @map("granted_at")
  grantedBy String   @map("granted_by")
  
  user User @relation(fields: [userId], references: [id])
  role Role @relation(fields: [roleId], references: [id])
  
  @@id([userId, roleId])
  @@map("user_roles")
}
```

### Advanced Field Types

```prisma
model Product {
  id          String   @id @default(uuid())
  name        String
  description String   @db.Text
  
  // Decimal for precise monetary values
  price       Decimal  @db.Decimal(10, 2)
  
  // JSON for flexible data
  metadata    Json?
  
  // Array types (PostgreSQL)
  tags        String[]
  
  // Date/Time types
  createdAt   DateTime @default(now()) @map("created_at")
  updatedAt   DateTime @updatedAt @map("updated_at")
  publishedAt DateTime? @map("published_at")
  
  // Enums
  status      ProductStatus @default(DRAFT)
  
  @@map("products")
}

enum ProductStatus {
  DRAFT
  PUBLISHED
  ARCHIVED
}
```

### Performance Optimizations

```prisma
model User {
  id    String @id @default(uuid())
  email String @unique
  name  String
  
  posts Post[]
  
  // Composite index for common queries
  @@index([email, name])
  @@map("users")
}

model Post {
  id        String   @id @default(uuid())
  title     String
  content   String   @db.Text
  published Boolean  @default(false)
  authorId  String   @map("author_id")
  createdAt DateTime @default(now()) @map("created_at")
  
  author User @relation(fields: [authorId], references: [id])
  
  // Index for filtering published posts
  @@index([published])
  
  // Composite index for author's published posts
  @@index([authorId, published])
  
  // Full-text search index (requires extension)
  @@index([title(ops: raw("gin_trgm_ops"))], type: Gin)
  
  @@map("posts")
}
```

## Migration Strategies

### Development Workflow

```bash
# Create migration with descriptive name
npx prisma migrate dev --name add_user_profile_table

# Create migration without applying
npx prisma migrate dev --create-only --name add_email_index

# Reset database (development only)
npx prisma migrate reset

# View migration status
npx prisma migrate status
```

### Production Deployment

```bash
# Generate Prisma Client
npx prisma generate

# Apply migrations (idempotent)
npx prisma migrate deploy

# Validate migrations
npx prisma migrate resolve --rolled-back "20231114_migration_name"
```

### Complex Migrations

```sql
-- Migration: 20231114_add_full_text_search.sql
-- Enable pg_trgm extension for fuzzy text search
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Add full-text search column
ALTER TABLE posts ADD COLUMN search_vector tsvector;

-- Create index
CREATE INDEX posts_search_idx ON posts USING GIN (search_vector);

-- Create trigger to update search vector
CREATE FUNCTION posts_search_update() RETURNS trigger AS $$
BEGIN
  NEW.search_vector :=
    setweight(to_tsvector('english', COALESCE(NEW.title, '')), 'A') ||
    setweight(to_tsvector('english', COALESCE(NEW.content, '')), 'B');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER posts_search_trigger
  BEFORE INSERT OR UPDATE ON posts
  FOR EACH ROW EXECUTE FUNCTION posts_search_update();
```

### Data Migrations

```typescript
// prisma/migrations/20231114_migrate_user_data.ts
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function migrate() {
  // Example: Split full name into first and last name
  const users = await prisma.user.findMany({
    where: {
      firstName: null,
      lastName: null,
    },
  });

  for (const user of users) {
    const [firstName, ...lastNameParts] = user.name.split(' ');
    const lastName = lastNameParts.join(' ');

    await prisma.user.update({
      where: { id: user.id },
      data: {
        firstName,
        lastName: lastName || null,
      },
    });
  }

  console.log(`Migrated ${users.length} users`);
}

migrate()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
```

## Query Optimization

### N+1 Query Prevention

```typescript
// ❌ Bad: N+1 queries
const users = await prisma.user.findMany();
for (const user of users) {
  user.posts = await prisma.post.findMany({
    where: { authorId: user.id },
  });
}

// ✅ Good: Single query with include
const users = await prisma.user.findMany({
  include: {
    posts: true,
  },
});

// ✅ Better: Select only needed fields
const users = await prisma.user.findMany({
  select: {
    id: true,
    email: true,
    posts: {
      select: {
        id: true,
        title: true,
      },
    },
  },
});
```

### Pagination Patterns

```typescript
// Offset pagination (simple but slow for large offsets)
const posts = await prisma.post.findMany({
  skip: (page - 1) * pageSize,
  take: pageSize,
  orderBy: { createdAt: 'desc' },
});

// Cursor-based pagination (efficient for large datasets)
const posts = await prisma.post.findMany({
  take: pageSize,
  cursor: cursor ? { id: cursor } : undefined,
  skip: cursor ? 1 : 0, // Skip the cursor itself
  orderBy: { createdAt: 'desc' },
});
```

### Aggregations & Grouping

```typescript
// Count and aggregate
const stats = await prisma.post.aggregate({
  _count: true,
  _avg: { viewCount: true },
  _sum: { viewCount: true },
  where: { published: true },
});

// Group by with aggregate
const postsByAuthor = await prisma.post.groupBy({
  by: ['authorId'],
  _count: true,
  _avg: { viewCount: true },
  having: {
    authorId: { _count: { gt: 5 } },
  },
});
```

### Raw Queries

```typescript
// Type-safe raw query
interface PostWithAuthor {
  id: string;
  title: string;
  authorName: string;
}

const posts = await prisma.$queryRaw<PostWithAuthor[]>`
  SELECT 
    p.id,
    p.title,
    u.name as "authorName"
  FROM posts p
  JOIN users u ON p.author_id = u.id
  WHERE p.published = true
  ORDER BY p.created_at DESC
  LIMIT 10
`;

// Execute raw SQL (for mutations)
await prisma.$executeRaw`
  UPDATE posts
  SET view_count = view_count + 1
  WHERE id = ${postId}
`;
```

## Transaction Management

### Sequential Operations

```typescript
// Use $transaction for atomic operations
const result = await prisma.$transaction(async (tx) => {
  // Create user
  const user = await tx.user.create({
    data: {
      email: 'user@example.com',
      name: 'John Doe',
    },
  });

  // Create user profile
  const profile = await tx.userProfile.create({
    data: {
      userId: user.id,
      bio: 'Software developer',
    },
  });

  // Create initial session
  const session = await tx.session.create({
    data: {
      userId: user.id,
      token: generateToken(),
      expiresAt: new Date(Date.now() + 86400000),
    },
  });

  return { user, profile, session };
});
```

### Isolation Levels

```typescript
// Use specific isolation level for critical operations
await prisma.$transaction(
  async (tx) => {
    // Transfer money between accounts
    const fromAccount = await tx.account.findUnique({
      where: { id: fromAccountId },
    });

    if (fromAccount.balance < amount) {
      throw new Error('Insufficient funds');
    }

    await tx.account.update({
      where: { id: fromAccountId },
      data: { balance: { decrement: amount } },
    });

    await tx.account.update({
      where: { id: toAccountId },
      data: { balance: { increment: amount } },
    });
  },
  {
    isolationLevel: 'Serializable',
    maxWait: 5000,
    timeout: 10000,
  }
);
```

### Batch Operations

```typescript
// Batch create for better performance
const users = await prisma.user.createMany({
  data: [
    { email: 'user1@example.com', name: 'User 1' },
    { email: 'user2@example.com', name: 'User 2' },
    { email: 'user3@example.com', name: 'User 3' },
  ],
  skipDuplicates: true,
});

// Batch update
await prisma.post.updateMany({
  where: {
    published: false,
    createdAt: {
      lt: new Date(Date.now() - 30 * 86400000), // 30 days ago
    },
  },
  data: {
    status: 'ARCHIVED',
  },
});
```

## Testing Strategies

### Test Database Setup

```typescript
// test/setup.ts
import { PrismaClient } from '@prisma/client';

export const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DATABASE_TEST_URL,
    },
  },
});

export async function cleanDatabase() {
  // Delete in order of dependencies
  await prisma.session.deleteMany();
  await prisma.post.deleteMany();
  await prisma.userProfile.deleteMany();
  await prisma.user.deleteMany();
}

beforeAll(async () => {
  await prisma.$connect();
});

afterAll(async () => {
  await cleanDatabase();
  await prisma.$disconnect();
});

beforeEach(async () => {
  await cleanDatabase();
});
```

### Factory Pattern

```typescript
// test/factories/user.factory.ts
import { PrismaClient, User } from '@prisma/client';
import { faker } from '@faker-js/faker';

export class UserFactory {
  constructor(private prisma: PrismaClient) {}

  async create(overrides?: Partial<User>): Promise<User> {
    return this.prisma.user.create({
      data: {
        email: faker.internet.email(),
        name: faker.person.fullName(),
        password: 'hashed_password',
        ...overrides,
      },
    });
  }

  async createMany(count: number): Promise<User[]> {
    const users: User[] = [];
    for (let i = 0; i < count; i++) {
      users.push(await this.create());
    }
    return users;
  }
}
```

## Monitoring & Debugging

### Query Logging

```typescript
// Enable query logging in development
const prisma = new PrismaClient({
  log: [
    { emit: 'event', level: 'query' },
    { emit: 'stdout', level: 'error' },
    { emit: 'stdout', level: 'warn' },
  ],
});

prisma.$on('query', (e) => {
  console.log('Query: ' + e.query);
  console.log('Duration: ' + e.duration + 'ms');
});
```

### Performance Monitoring

```typescript
// Track slow queries
prisma.$on('query', (e) => {
  if (e.duration > 1000) {
    console.warn(`Slow query detected (${e.duration}ms):`, e.query);
    // Send to monitoring service
  }
});

// Connection pool monitoring
setInterval(() => {
  const metrics = prisma.$metrics.json();
  console.log('Active connections:', metrics.connections);
}, 60000);
```

## Best Practices

### 1. Schema Design
- Use snake_case in database, camelCase in Prisma
- Always use `@map()` and `@@map()` for consistency
- Add indexes for foreign keys and frequently queried fields
- Use enums for fixed value sets
- Implement soft deletes where appropriate

### 2. Migrations
- Never edit applied migrations
- Write descriptive migration names
- Test migrations on staging before production
- Keep migrations small and focused
- Document complex migrations

### 3. Query Optimization
- Use `select` instead of `include` when possible
- Implement pagination for large datasets
- Avoid N+1 queries with proper includes
- Use indexes for WHERE, ORDER BY, and JOIN clauses
- Monitor slow queries in production

### 4. Security
- Never expose Prisma Client to frontend
- Validate all inputs before queries
- Use parameterized queries (Prisma does this automatically)
- Implement row-level security for multi-tenant apps
- Rotate database credentials regularly

### 5. Error Handling
```typescript
import { Prisma } from '@prisma/client';

try {
  await prisma.user.create({ data: userData });
} catch (error) {
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    if (error.code === 'P2002') {
      throw new ConflictException('Email already exists');
    }
  }
  throw error;
}
```

## Advanced Patterns

### Repository Pattern

```typescript
// users.repository.ts
@Injectable()
export class UsersRepository {
  constructor(private prisma: PrismaService) {}

  async findById(id: string): Promise<User | null> {
    return this.prisma.user.findUnique({
      where: { id },
      include: { profile: true },
    });
  }

  async findByEmail(email: string): Promise<User | null> {
    return this.prisma.user.findUnique({
      where: { email },
    });
  }

  async create(data: Prisma.UserCreateInput): Promise<User> {
    return this.prisma.user.create({ data });
  }

  async update(id: string, data: Prisma.UserUpdateInput): Promise<User> {
    return this.prisma.user.update({
      where: { id },
      data,
    });
  }

  async softDelete(id: string): Promise<User> {
    return this.prisma.user.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }
}
```

---

**Version**: 1.0.0  
**Last Updated**: November 14, 2025  
**Expertise Level**: Expert

