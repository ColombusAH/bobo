# Security Rule: Prevent SQL Injection

## Rule Overview

**Severity**: CRITICAL  
**Category**: Security  
**Applies To**: All database queries across NestJS services

## Rule Statement

All database queries MUST use parameterized queries or ORM methods that automatically prevent SQL injection. Direct string concatenation or interpolation of user input into SQL queries is STRICTLY FORBIDDEN.

## Rationale

SQL injection is one of the most dangerous web application vulnerabilities, allowing attackers to:
- Access unauthorized data
- Modify or delete database records
- Execute administrative operations
- Potentially compromise the entire system

By enforcing parameterized queries and using Prisma ORM correctly, we eliminate this attack vector.

## Enforcement

### ✅ ALLOWED: Prisma ORM Methods

Prisma automatically parameterizes all queries:

```typescript
// ✅ SAFE: Prisma findUnique with where clause
const user = await prisma.user.findUnique({
  where: {
    email: userInput, // Automatically parameterized
  },
});

// ✅ SAFE: Prisma findMany with complex filters
const posts = await prisma.post.findMany({
  where: {
    title: {
      contains: searchTerm, // Automatically parameterized
    },
    authorId: userId,
    published: true,
  },
  orderBy: {
    createdAt: 'desc',
  },
});

// ✅ SAFE: Prisma create
const user = await prisma.user.create({
  data: {
    email: userInput.email,
    name: userInput.name,
  },
});

// ✅ SAFE: Prisma update
const user = await prisma.user.update({
  where: { id: userId },
  data: {
    email: newEmail, // Automatically parameterized
  },
});

// ✅ SAFE: Prisma delete
await prisma.user.delete({
  where: { id: userId },
});
```

### ✅ ALLOWED: Prisma Raw Queries with Tagged Templates

When you need raw SQL, use Prisma's tagged template literals:

```typescript
// ✅ SAFE: $queryRaw with tagged template
import { Prisma } from '@prisma/client';

const users = await prisma.$queryRaw<User[]>`
  SELECT * FROM users
  WHERE email = ${userEmail}
  AND created_at > ${startDate}
`;

// ✅ SAFE: $executeRaw with tagged template
await prisma.$executeRaw`
  UPDATE posts
  SET view_count = view_count + 1
  WHERE id = ${postId}
`;

// ✅ SAFE: Complex query with multiple parameters
const results = await prisma.$queryRaw`
  SELECT 
    u.id,
    u.name,
    COUNT(p.id) as post_count
  FROM users u
  LEFT JOIN posts p ON p.author_id = u.id
  WHERE u.role = ${role}
    AND u.created_at >= ${startDate}
    AND u.created_at <= ${endDate}
  GROUP BY u.id, u.name
  HAVING COUNT(p.id) > ${minPosts}
  ORDER BY post_count DESC
  LIMIT ${limit}
`;
```

### ✅ ALLOWED: Prisma.sql Helper

For dynamic SQL construction:

```typescript
// ✅ SAFE: Using Prisma.sql
import { Prisma } from '@prisma/client';

const userFilter = Prisma.sql`email = ${email}`;
const dateFilter = Prisma.sql`created_at > ${date}`;

const users = await prisma.$queryRaw<User[]>`
  SELECT * FROM users
  WHERE ${userFilter}
  AND ${dateFilter}
`;
```

### ❌ FORBIDDEN: String Concatenation

Never concatenate user input into SQL queries:

```typescript
// ❌ DANGEROUS: String concatenation
const query = `SELECT * FROM users WHERE email = '${userInput}'`;
await prisma.$queryRawUnsafe(query);

// ❌ DANGEROUS: String interpolation
const email = req.body.email;
await prisma.$queryRawUnsafe(`
  SELECT * FROM users 
  WHERE email = '${email}'
`);

// ❌ DANGEROUS: Template literal without tagged template
await prisma.$queryRawUnsafe(`
  DELETE FROM users 
  WHERE id = ${userId}
`);

// ❌ DANGEROUS: Building query string
let query = "SELECT * FROM posts WHERE 1=1";
if (searchTerm) {
  query += ` AND title LIKE '%${searchTerm}%'`;
}
await prisma.$queryRawUnsafe(query);
```

### ❌ FORBIDDEN: $queryRawUnsafe

The `$queryRawUnsafe` method should NEVER be used unless absolutely necessary and with extreme caution:

```typescript
// ❌ AVOID: $queryRawUnsafe is inherently dangerous
await prisma.$queryRawUnsafe(sqlString);

// If you absolutely must use it, validate and sanitize heavily:
// ⚠️ USE WITH EXTREME CAUTION
const allowedTables = ['users', 'posts', 'comments'];
const tableName = req.query.table;

if (!allowedTables.includes(tableName)) {
  throw new BadRequestException('Invalid table name');
}

// Even better: Use a whitelist approach with mapped values
const tableMapping = {
  users: 'users',
  posts: 'posts',
};

const safeTable = tableMapping[tableName];
if (!safeTable) {
  throw new BadRequestException('Invalid table name');
}

await prisma.$queryRawUnsafe(`SELECT * FROM ${safeTable}`);
```

## Dynamic Query Building

### ✅ CORRECT: Build Prisma where clauses dynamically

```typescript
// ✅ SAFE: Dynamic filters with Prisma
interface SearchFilters {
  email?: string;
  role?: string;
  isActive?: boolean;
  createdAfter?: Date;
}

async function searchUsers(filters: SearchFilters) {
  const where: Prisma.UserWhereInput = {};

  if (filters.email) {
    where.email = { contains: filters.email };
  }

  if (filters.role) {
    where.role = filters.role;
  }

  if (filters.isActive !== undefined) {
    where.isActive = filters.isActive;
  }

  if (filters.createdAfter) {
    where.createdAt = { gte: filters.createdAfter };
  }

  return prisma.user.findMany({ where });
}
```

### ✅ CORRECT: Dynamic ordering

```typescript
// ✅ SAFE: Dynamic sorting
type SortField = 'createdAt' | 'name' | 'email';
type SortOrder = 'asc' | 'desc';

async function getUsers(sortBy: SortField, order: SortOrder) {
  // Validate sort field against allowed fields
  const allowedFields: SortField[] = ['createdAt', 'name', 'email'];
  if (!allowedFields.includes(sortBy)) {
    throw new BadRequestException('Invalid sort field');
  }

  // Validate order
  if (!['asc', 'desc'].includes(order)) {
    throw new BadRequestException('Invalid sort order');
  }

  return prisma.user.findMany({
    orderBy: {
      [sortBy]: order,
    },
  });
}
```

## Input Validation

Always validate and sanitize inputs before using them in queries:

```typescript
import { IsEmail, IsString, IsUUID, Matches } from 'class-validator';

// ✅ GOOD: Validate inputs with DTOs
export class SearchUsersDto {
  @IsEmail()
  @IsOptional()
  email?: string;

  @IsString()
  @Matches(/^(ADMIN|USER|GUEST)$/)
  @IsOptional()
  role?: string;

  @IsUUID()
  @IsOptional()
  id?: string;
}

@Get('search')
async searchUsers(@Query() dto: SearchUsersDto) {
  // Inputs are validated before reaching this point
  return this.usersService.search(dto);
}
```

## Testing for SQL Injection

### Unit Tests

```typescript
describe('UsersService - SQL Injection Prevention', () => {
  it('should handle malicious email input safely', async () => {
    const maliciousInput = "admin' OR '1'='1";
    
    // Should not find user or throw error, not execute malicious SQL
    const result = await service.findByEmail(maliciousInput);
    
    expect(result).toBeNull();
  });

  it('should handle SQL comment injection', async () => {
    const maliciousInput = "admin'--";
    
    const result = await service.findByEmail(maliciousInput);
    
    expect(result).toBeNull();
  });

  it('should handle union-based injection', async () => {
    const maliciousInput = "admin' UNION SELECT * FROM passwords--";
    
    const result = await service.findByEmail(maliciousInput);
    
    expect(result).toBeNull();
  });

  it('should handle time-based blind injection', async () => {
    const maliciousInput = "admin'; WAITFOR DELAY '00:00:05'--";
    
    const startTime = Date.now();
    await service.findByEmail(maliciousInput);
    const duration = Date.now() - startTime;
    
    // Should not cause delay
    expect(duration).toBeLessThan(1000);
  });
});
```

### Security Testing

```typescript
// Integration test for SQL injection
describe('API Security - SQL Injection', () => {
  const sqlInjectionPayloads = [
    "' OR '1'='1",
    "admin'--",
    "' OR '1'='1' --",
    "' OR '1'='1' /*",
    "'; DROP TABLE users--",
    "' UNION SELECT NULL--",
    "1' AND '1'='1",
  ];

  sqlInjectionPayloads.forEach(payload => {
    it(`should safely handle payload: ${payload}`, async () => {
      const response = await request(app.getHttpServer())
        .get('/users')
        .query({ email: payload });

      // Should return 400 (validation error) or empty result
      // Should NOT return 500 or cause SQL error
      expect([200, 400]).toContain(response.status);
      
      if (response.status === 200) {
        expect(response.body).toEqual([]);
      }
    });
  });
});
```

## Code Review Checklist

When reviewing code, check for:

- [ ] All Prisma queries use proper where clauses, not string concatenation
- [ ] Raw queries use tagged templates (`$queryRaw`) not `$queryRawUnsafe`
- [ ] No user input is directly interpolated into SQL strings
- [ ] Dynamic query building uses Prisma's type-safe methods
- [ ] Input validation is present for all user-provided data
- [ ] Column/table names from user input are whitelisted
- [ ] Unit tests include SQL injection attack scenarios

## Automated Detection

### ESLint Rule (Custom)

```javascript
// .eslintrc.js - Add custom rule to detect unsafe queries
module.exports = {
  rules: {
    'no-query-raw-unsafe': 'error',
  },
};

// eslint-plugin-local/no-query-raw-unsafe.js
module.exports = {
  meta: {
    type: 'problem',
    docs: {
      description: 'Disallow $queryRawUnsafe and $executeRawUnsafe',
    },
  },
  create(context) {
    return {
      MemberExpression(node) {
        if (
          node.property.name === '$queryRawUnsafe' ||
          node.property.name === '$executeRawUnsafe'
        ) {
          context.report({
            node,
            message: 'Use $queryRaw or $executeRaw with tagged templates instead',
          });
        }
      },
    };
  },
};
```

### Git Pre-commit Hook

```bash
#!/bin/bash
# .git/hooks/pre-commit

# Check for dangerous SQL patterns
if git diff --cached --name-only | grep -E '\.(ts|js)$' | xargs grep -E '\$queryRawUnsafe|\$executeRawUnsafe' ; then
  echo "ERROR: Found $queryRawUnsafe or $executeRawUnsafe in staged files"
  echo "Use $queryRaw with tagged templates instead"
  exit 1
fi
```

## Exception Process

If you believe you need to use `$queryRawUnsafe`:

1. Document the reason in code comments
2. Implement extensive input validation
3. Get security review approval
4. Add comprehensive tests
5. Document in security audit log

```typescript
// Example of documented exception
/**
 * SECURITY EXCEPTION: Using $queryRawUnsafe
 * Reason: Dynamic table name for multi-tenant architecture
 * Approved by: Security Team (Ticket #SEC-123)
 * Date: 2025-11-14
 * Mitigation: Strict whitelist validation of table names
 */
async function queryTenantTable(tenantId: string, tableName: string) {
  // Strict whitelist validation
  const ALLOWED_TABLES = ['tenant_users', 'tenant_settings', 'tenant_data'];
  
  if (!ALLOWED_TABLES.includes(tableName)) {
    throw new ForbiddenException('Invalid table name');
  }
  
  // Additional validation of tenantId
  if (!isUUID(tenantId)) {
    throw new BadRequestException('Invalid tenant ID');
  }
  
  // Log for audit
  logger.warn(`Using $queryRawUnsafe for table: ${tableName}, tenant: ${tenantId}`);
  
  return prisma.$queryRawUnsafe(
    `SELECT * FROM ${tableName} WHERE tenant_id = $1`,
    tenantId
  );
}
```

## Training Resources

- [OWASP SQL Injection](https://owasp.org/www-community/attacks/SQL_Injection)
- [Prisma Security Best Practices](https://www.prisma.io/docs/guides/performance-and-optimization/query-optimization-performance)
- [SQL Injection Prevention Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/SQL_Injection_Prevention_Cheat_Sheet.html)

## Incident Response

If SQL injection vulnerability is discovered:

1. **Immediate**: Disable affected endpoint or service
2. **Assess**: Determine scope of vulnerability and potential data access
3. **Fix**: Implement proper parameterization
4. **Test**: Verify fix with security tests
5. **Review**: Check for similar patterns across codebase
6. **Audit**: Review logs for exploitation attempts
7. **Report**: Document in security incident log
8. **Learn**: Update training and review processes

---

**Version**: 1.0.0  
**Last Updated**: November 14, 2025  
**Review Frequency**: Quarterly  
**Rule Owner**: Security Team

