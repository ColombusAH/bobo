# Contributing to Bobo

Thank you for your interest in contributing to the Bobo monorepo! This document provides guidelines and workflows for contributing to our Nx workspace with NestJS, React, Kafka, and Prisma.

## Table of Contents

- [Getting Started](#getting-started)
- [Development Workflow](#development-workflow)
- [Code Standards](#code-standards)
- [Technology-Specific Guidelines](#technology-specific-guidelines)
- [Testing Requirements](#testing-requirements)
- [Pull Request Process](#pull-request-process)
- [Context Modules Updates](#context-modules-updates)

## Getting Started

### Prerequisites

- Node.js 18+ and npm 9+
- Docker and Docker Compose (for Kafka and PostgreSQL)
- Git

### Initial Setup

```bash
# Clone the repository
git clone https://github.com/your-org/bobo.git
cd bobo

# Install dependencies
npm install

# Copy environment variables
cp .env.example .env

# Start local infrastructure
docker-compose up -d

# Run database migrations
npx prisma migrate dev

# Seed the database
npx prisma db seed
```

### Running the Development Environment

```bash
# Start all services
npm run dev

# Or start specific apps
nx serve gateway
nx serve frontend

# Run tests
nx test

# Run linting
nx lint
```

## Development Workflow

### 1. Branch Naming Convention

Use the following prefixes for branch names:

- `feature/` - New features
- `fix/` - Bug fixes
- `refactor/` - Code refactoring
- `docs/` - Documentation updates
- `test/` - Test additions or updates
- `chore/` - Maintenance tasks

Examples:
```
feature/user-authentication
fix/kafka-connection-retry
refactor/prisma-service-structure
docs/update-api-documentation
```

### 2. Commit Message Format

Follow the [Conventional Commits](https://www.conventionalcommits.org/) specification:

```
<type>(<scope>): <subject>

<body>

<footer>
```

**Types:**
- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation changes
- `style`: Code style changes (formatting, no logic change)
- `refactor`: Code refactoring
- `perf`: Performance improvements
- `test`: Adding or updating tests
- `chore`: Maintenance tasks

**Examples:**
```
feat(auth): implement JWT token refresh

Add refresh token endpoint and update auth service to support
token rotation with proper expiration handling.

Closes #123
```

```
fix(kafka): resolve connection timeout issue

Increase connection timeout and add retry logic for Kafka
producer initialization.

Fixes #456
```

### 3. Creating a Feature

```bash
# Create a new branch
git checkout -b feature/my-new-feature

# Make changes and commit
git add .
git commit -m "feat(scope): description"

# Push to remote
git push origin feature/my-new-feature

# Create pull request on GitHub
```

## Code Standards

### TypeScript

- **Strict Mode**: All TypeScript must compile with strict mode enabled
- **Type Safety**: No `any` types unless absolutely necessary (document why)
- **Explicit Types**: Always specify return types for functions
- **Naming Conventions**:
  - Classes: `PascalCase`
  - Functions/Variables: `camelCase`
  - Constants: `UPPER_SNAKE_CASE`
  - Interfaces: `PascalCase` (no `I` prefix)
  - Types: `PascalCase`

### Code Style

- **Formatting**: Prettier (enforced by pre-commit hook)
- **Linting**: ESLint (must pass with no errors)
- **Line Length**: Maximum 100 characters
- **Indentation**: 2 spaces
- **Quotes**: Single quotes for strings

### File Organization

```
feature-name/
├── index.ts                    # Public API
├── feature-name.service.ts     # Business logic
├── feature-name.controller.ts  # HTTP endpoints (NestJS)
├── feature-name.module.ts      # Module definition (NestJS)
├── feature-name.types.ts       # Type definitions
├── feature-name.spec.ts        # Tests
└── dto/                        # Data Transfer Objects
    ├── create-feature.dto.ts
    └── update-feature.dto.ts
```

## Technology-Specific Guidelines

### NestJS

#### Creating a New Service

```bash
# Generate a new app
nx g @nx/nest:application my-service

# Generate a module
nx g @nx/nest:module users --project=my-service

# Generate a service
nx g @nx/nest:service users --project=my-service

# Generate a controller
nx g @nx/nest:controller users --project=my-service
```

#### Best Practices

- Use dependency injection for all services
- Implement proper error handling with custom exceptions
- Use DTOs for input validation
- Follow RESTful API design principles
- Document endpoints with Swagger decorators

#### Example Service

```typescript
import { Injectable } from '@nestjs/common';
import { PrismaService } from '@bobo/shared/prisma';

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(): Promise<User[]> {
    return this.prisma.user.findMany({
      where: { deletedAt: null },
    });
  }

  async findById(id: string): Promise<User | null> {
    return this.prisma.user.findUnique({
      where: { id },
    });
  }
}
```

### Kafka

#### Event Schema Updates

When updating Kafka event schemas:

1. **Add New Fields**: Always make new fields optional
2. **Remove Fields**: Deprecated in v1, remove in v2
3. **Change Types**: Create new event version
4. **Version Events**: Include version in event payload

#### Example Event Update

```typescript
// libs/kafka-events/user-events/src/lib/user.events.ts

// v1 - Existing
export interface UserCreatedEvent_V1 extends BaseEvent {
  version: '1.0';
  userId: string;
  email: string;
  name: string;
}

// v2 - New version with breaking changes
export interface UserCreatedEvent_V2 extends BaseEvent {
  version: '2.0';
  userId: string;
  email: string;
  firstName: string;  // Split from name
  lastName: string;
  phoneNumber?: string; // New optional field
}
```

#### Publishing Events

- Always publish events after successful database operations
- Use transactions when coordinating database + Kafka
- Implement idempotency in consumers
- Log all event publications for debugging

### Prisma

#### Schema Changes

```bash
# Create a migration
npx prisma migrate dev --name add_user_profile

# Apply migrations (production)
npx prisma migrate deploy

# Generate Prisma Client
npx prisma generate

# Reset database (development only)
npx prisma migrate reset
```

#### Best Practices

- Use `@map()` for database field names (snake_case)
- Use `@@map()` for table names (plural)
- Add indexes for foreign keys and frequently queried fields
- Include audit fields (createdAt, updatedAt, deletedAt)
- Use transactions for multi-step operations

#### Example Migration

```prisma
// Add new table
model UserProfile {
  id        String   @id @default(uuid())
  userId    String   @unique @map("user_id")
  bio       String?
  avatarUrl String?  @map("avatar_url")
  
  user      User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  
  createdAt DateTime @default(now()) @map("created_at")
  updatedAt DateTime @updatedAt @map("updated_at")
  
  @@map("user_profiles")
}
```

### React

#### Creating Components

```bash
# Generate a component in a library
nx g @nx/react:component UserCard --project=feature-users

# Generate a custom hook
nx g @nx/react:hook useUsers --project=feature-users
```

#### Best Practices

- Use functional components with hooks
- Implement proper TypeScript types for props
- Use CSS Modules for styling
- Implement accessibility (ARIA labels, keyboard navigation)
- Optimize performance (React.memo, useMemo, useCallback)

#### Example Component

```typescript
import React from 'react';
import styles from './UserCard.module.css';

export interface UserCardProps {
  user: {
    id: string;
    name: string;
    email: string;
    avatarUrl?: string;
  };
  onEdit?: (userId: string) => void;
}

export const UserCard: React.FC<UserCardProps> = ({ user, onEdit }) => {
  return (
    <div className={styles.card}>
      <img src={user.avatarUrl || '/default-avatar.png'} alt={user.name} />
      <h3>{user.name}</h3>
      <p>{user.email}</p>
      {onEdit && (
        <button onClick={() => onEdit(user.id)}>Edit</button>
      )}
    </div>
  );
};
```

### Nx Workspace

#### Library Creation

```bash
# Shared utility library
nx g @nx/js:library utils --directory=shared/utils --importPath=@bobo/shared/utils

# React UI component library
nx g @nx/react:library ui-button --directory=ui-components/button --importPath=@bobo/ui-components/button

# Feature library
nx g @nx/react:library feature-users --importPath=@bobo/feature-users
```

#### Dependency Rules

- **Apps** can depend on any library
- **Feature libraries** can depend on UI libraries and shared libraries
- **UI libraries** can depend only on shared libraries
- **Shared libraries** should not depend on other libraries

#### Running Nx Commands

```bash
# Run specific app
nx serve frontend

# Build for production
nx build frontend --prod

# Test specific project
nx test feature-users

# Lint specific project
nx lint gateway

# Run affected tests
nx affected:test

# Show dependency graph
nx graph
```

## Testing Requirements

### Unit Tests

- Minimum 80% code coverage for business logic
- Use Jest for all tests
- Mock external dependencies
- Test error scenarios

```typescript
// Example unit test
describe('UsersService', () => {
  let service: UsersService;
  let prisma: PrismaService;

  beforeEach(() => {
    prisma = createMockPrismaService();
    service = new UsersService(prisma);
  });

  it('should find user by id', async () => {
    const mockUser = { id: '123', email: 'test@example.com' };
    prisma.user.findUnique = jest.fn().mockResolvedValue(mockUser);

    const result = await service.findById('123');

    expect(result).toEqual(mockUser);
    expect(prisma.user.findUnique).toHaveBeenCalledWith({
      where: { id: '123' },
    });
  });
});
```

### Integration Tests

- Test API endpoints end-to-end
- Use test database
- Test Kafka event flows
- Clean up after each test

```typescript
describe('Users API', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = module.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('should create a user', async () => {
    const response = await request(app.getHttpServer())
      .post('/users')
      .send({
        email: 'test@example.com',
        name: 'Test User',
      })
      .expect(201);

    expect(response.body).toHaveProperty('id');
    expect(response.body.email).toBe('test@example.com');
  });
});
```

### E2E Tests

- Test critical user flows
- Run in CI/CD pipeline
- Use realistic test data

## Pull Request Process

### Before Creating a PR

1. **Update from main**:
   ```bash
   git checkout main
   git pull origin main
   git checkout your-branch
   git rebase main
   ```

2. **Run tests**:
   ```bash
   nx affected:test
   nx affected:lint
   ```

3. **Build affected projects**:
   ```bash
   nx affected:build
   ```

4. **Check for type errors**:
   ```bash
   npx tsc --noEmit
   ```

### PR Template

```markdown
## Description
Brief description of changes

## Type of Change
- [ ] Bug fix
- [ ] New feature
- [ ] Breaking change
- [ ] Documentation update

## Related Issues
Closes #123

## Testing
- [ ] Unit tests added/updated
- [ ] Integration tests added/updated
- [ ] Manual testing completed

## Checklist
- [ ] Code follows style guidelines
- [ ] Self-review completed
- [ ] Documentation updated
- [ ] No new warnings
- [ ] Tests pass locally
- [ ] Dependent changes merged
```

### Review Process

1. **Automated Checks**: CI/CD pipeline must pass
2. **Code Review**: At least one approval required
3. **Testing**: All tests must pass
4. **Documentation**: Update relevant documentation
5. **Merge**: Squash and merge to main

### Review Guidelines

When reviewing code:

- **Correctness**: Does it work as intended?
- **Security**: Are there security vulnerabilities?
- **Performance**: Are there performance concerns?
- **Maintainability**: Is it readable and maintainable?
- **Tests**: Are tests adequate?
- **Documentation**: Is it properly documented?

## Context Modules Updates

### When to Update Context Modules

Update context modules when:

- Adding new design patterns
- Establishing new conventions
- Documenting architectural decisions
- Creating new personas
- Adding security rules
- Updating technology best practices

### Updating Guidelines

1. **Version Management**:
   - Minor updates: Update existing files in `v1/`
   - Breaking changes: Create new `v2/` directory
   - Document changes in git commit

2. **File Structure**:
   ```
   context_modules/
   ├── examples/v1/
   ├── personas/v1/
   ├── principles/v1/
   └── rules/v1/
   ```

3. **Update `.mcp.json`** when adding new modules

4. **Review Process**: Context module updates require team review

### Example Update

```bash
# Create new version
mkdir -p context_modules/examples/v2

# Copy and update
cp context_modules/examples/v1/nestjs_kafka_integration.md \
   context_modules/examples/v2/nestjs_kafka_integration.md

# Edit with breaking changes
vim context_modules/examples/v2/nestjs_kafka_integration.md

# Update .mcp.json to reference v2
vim .mcp.json

# Commit with clear message
git add context_modules/
git commit -m "docs(context): add v2 NestJS Kafka integration guide with new patterns"
```

## Getting Help

- **Documentation**: Check `/context_modules` for guidelines
- **Issues**: Search existing issues on GitHub
- **Discussions**: Use GitHub Discussions for questions
- **Slack**: Join our development Slack channel

## Code of Conduct

- Be respectful and inclusive
- Provide constructive feedback
- Focus on the code, not the person
- Assume good intentions
- Help others learn and grow

## License

By contributing, you agree that your contributions will be licensed under the same license as the project.

---

**Last Updated**: November 14, 2025  
**Version**: 1.0.0

Thank you for contributing to Bobo! 🚀

