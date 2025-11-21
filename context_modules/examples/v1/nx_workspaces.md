# Nx Workspace Structure Guidelines

## Overview

This document defines the structure and organization principles for the Bobo Nx monorepo, covering apps, libraries, and shared code.

## Workspace Structure

```
bobo/
├── apps/
│   ├── gateway/              # API Gateway (NestJS)
│   ├── user-service/         # User Management Service (NestJS)
│   ├── notification-service/ # Notification Service (NestJS)
│   └── frontend/             # Main React Application
│
├── libs/
│   ├── shared/
│   │   ├── config/          # Shared configuration
│   │   ├── prisma/          # Prisma service & module
│   │   ├── utils/           # Utility functions
│   │   └── types/           # Common TypeScript types
│   │
│   ├── kafka-events/        # Kafka event schemas
│   │   ├── user-events/
│   │   ├── notification-events/
│   │   └── order-events/
│   │
│   ├── ui-components/       # Shared React components
│   │   ├── Button/
│   │   ├── Input/
│   │   ├── Modal/
│   │   └── Layout/
│   │
│   ├── feature-users/       # User feature library
│   │   ├── components/
│   │   ├── hooks/
│   │   └── services/
│   │
│   └── api-client/          # API client for frontend
│       ├── auth/
│       ├── users/
│       └── common/
│
├── context_modules/         # AI directives & guidelines
├── tools/                   # Custom Nx generators & executors
├── .mcp.json               # MCP configuration
├── constitution.md         # Development principles
├── nx.json                 # Nx configuration
├── package.json
└── tsconfig.base.json
```

## App Categories

### Backend Apps (NestJS)

```typescript
// apps/user-service/src/main.ts
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app/app.module';
import { getKafkaConfig } from '@bobo/shared/config';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  
  // Connect Kafka microservice
  app.connectMicroservice(getKafkaConfig());
  
  await app.startAllMicroservices();
  await app.listen(3001);
}

bootstrap();
```

**Port Assignment:**
- Gateway: 3000
- User Service: 3001
- Notification Service: 3002
- Additional services: 3003+

### Frontend Apps (React)

```typescript
// apps/frontend/src/main.tsx
import { StrictMode } from 'react';
import * as ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './app/app';

const root = ReactDOM.createRoot(
  document.getElementById('root') as HTMLElement
);

root.render(
  <StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </StrictMode>
);
```

**Port Assignment:**
- Frontend: 4200
- Admin Panel: 4201
- Additional UIs: 4202+

## Library Categories

### 1. Shared Libraries (`libs/shared/*`)

For code used across multiple apps (both backend and frontend).

**Creating a shared library:**

```bash
nx g @nx/js:library shared-utils --directory=shared/utils --importPath=@bobo/shared/utils
```

**Example: Configuration Library**

```typescript
// libs/shared/config/src/lib/environment.ts
export interface EnvironmentConfig {
  production: boolean;
  apiUrl: string;
  kafkaBrokers: string[];
  databaseUrl: string;
}

export const getEnvironment = (): EnvironmentConfig => ({
  production: process.env.NODE_ENV === 'production',
  apiUrl: process.env.API_URL || 'http://localhost:3000',
  kafkaBrokers: (process.env.KAFKA_BROKERS || 'localhost:9092').split(','),
  databaseUrl: process.env.DATABASE_URL || '',
});
```

### 2. Domain Libraries (`libs/kafka-events/*`)

For domain-specific event schemas and types.

```bash
nx g @nx/js:library user-events --directory=kafka-events/user-events --importPath=@bobo/kafka-events/users
```

```typescript
// libs/kafka-events/user-events/src/lib/user.events.ts
export interface BaseEvent {
  eventId: string;
  timestamp: string;
  version: string;
}

export interface UserCreatedEvent extends BaseEvent {
  userId: string;
  email: string;
  firstName?: string;
  lastName?: string;
}

export const USER_TOPICS = {
  CREATED: 'bobo.users.created',
  UPDATED: 'bobo.users.updated',
  DELETED: 'bobo.users.deleted',
} as const;
```

### 3. UI Libraries (`libs/ui-components/*`)

For shared React components.

```bash
nx g @nx/react:library ui-components --directory=ui-components --importPath=@bobo/ui-components
```

```typescript
// libs/ui-components/src/index.ts
export * from './lib/Button/Button';
export * from './lib/Input/Input';
export * from './lib/Modal/Modal';
export * from './lib/Card/Card';
```

### 4. Feature Libraries (`libs/feature-*`)

For feature-specific code (components, hooks, services).

```bash
nx g @nx/react:library feature-users --directory=feature-users --importPath=@bobo/feature-users
```

```typescript
// libs/feature-users/src/lib/components/UserList.tsx
import { Button } from '@bobo/ui-components';
import { useUsers } from '../hooks/useUsers';

export const UserList = () => {
  const { users, loading, error } = useUsers();
  
  if (loading) return <div>Loading...</div>;
  if (error) return <div>Error: {error.message}</div>;
  
  return (
    <div>
      {users.map(user => (
        <div key={user.id}>
          {user.email}
          <Button onClick={() => handleEdit(user.id)}>Edit</Button>
        </div>
      ))}
    </div>
  );
};
```

## Dependency Graph Rules

### Library Types & Dependencies

```
┌─────────────────────────────────────────┐
│ Feature Libraries (feature-*)           │
│ - Can depend on: UI, shared, domain     │
│ - Cannot depend on: other features, apps│
└─────────────────────────────────────────┘
              ↓
┌─────────────────────────────────────────┐
│ UI Libraries (ui-components)            │
│ - Can depend on: shared                 │
│ - Cannot depend on: features, apps      │
└─────────────────────────────────────────┘
              ↓
┌─────────────────────────────────────────┐
│ Domain Libraries (kafka-events)         │
│ - Can depend on: shared                 │
│ - Cannot depend on: UI, features, apps  │
└─────────────────────────────────────────┘
              ↓
┌─────────────────────────────────────────┐
│ Shared Libraries (shared/*)             │
│ - Cannot depend on anything else        │
│ - Pure utilities and types only         │
└─────────────────────────────────────────┘
```

### Enforcing Boundaries

Configure in `nx.json`:

```json
{
  "targetDefaults": {
    "lint": {
      "options": {
        "lintFilePatterns": [
          "{projectRoot}/**/*.{ts,tsx,js,jsx}"
        ]
      }
    }
  },
  "namedInputs": {
    "default": ["{projectRoot}/**/*"],
    "production": ["!{projectRoot}/**/*.spec.ts"]
  }
}
```

Add to `.eslintrc.json`:

```json
{
  "overrides": [
    {
      "files": ["*.ts", "*.tsx"],
      "rules": {
        "@nx/enforce-module-boundaries": [
          "error",
          {
            "depConstraints": [
              {
                "sourceTag": "type:feature",
                "onlyDependOnLibsWithTags": ["type:ui", "type:shared", "type:domain"]
              },
              {
                "sourceTag": "type:ui",
                "onlyDependOnLibsWithTags": ["type:shared"]
              },
              {
                "sourceTag": "type:shared",
                "onlyDependOnLibsWithTags": []
              }
            ]
          }
        ]
      }
    }
  ]
}
```

## Nx Commands

### Common Operations

```bash
# Run an app
nx serve frontend
nx serve gateway

# Build an app
nx build frontend --prod
nx build user-service

# Test
nx test ui-components
nx test feature-users
nx test-all

# Lint
nx lint gateway
nx lint-all

# See affected projects
nx affected:graph

# Run affected tests
nx affected:test

# Run affected builds
nx affected:build
```

### Generating New Code

```bash
# Generate NestJS app
nx g @nx/nest:application notification-service

# Generate NestJS library
nx g @nx/nest:library shared-auth --directory=shared/auth

# Generate React app
nx g @nx/react:application admin-panel

# Generate React library
nx g @nx/react:library feature-orders

# Generate component in library
nx g @nx/react:component UserCard --project=feature-users

# Generate service in NestJS app
nx g @nx/nest:service users --project=user-service
```

## Project Configuration

Each project has a `project.json`:

```json
{
  "name": "user-service",
  "sourceRoot": "apps/user-service/src",
  "projectType": "application",
  "targets": {
    "build": {
      "executor": "@nx/webpack:webpack",
      "options": {
        "outputPath": "dist/apps/user-service",
        "main": "apps/user-service/src/main.ts",
        "tsConfig": "apps/user-service/tsconfig.app.json"
      }
    },
    "serve": {
      "executor": "@nx/js:node",
      "options": {
        "buildTarget": "user-service:build"
      }
    },
    "test": {
      "executor": "@nx/jest:jest",
      "options": {
        "jestConfig": "apps/user-service/jest.config.ts"
      }
    }
  },
  "tags": ["type:app", "scope:backend"]
}
```

## Best Practices

### 1. Import Path Aliases
Always use `@bobo/*` imports, never relative paths across projects:

```typescript
// ✅ Good
import { Button } from '@bobo/ui-components';
import { UserCreatedEvent } from '@bobo/kafka-events/users';

// ❌ Bad
import { Button } from '../../../../libs/ui-components/src/lib/Button';
```

### 2. Tagging Projects
Tag projects for dependency management:

```json
{
  "tags": ["type:app", "scope:backend", "platform:node"]
}
```

### 3. Caching
Leverage Nx caching for builds and tests:

```json
{
  "tasksRunnerOptions": {
    "default": {
      "runner": "nx/tasks-runners/default",
      "options": {
        "cacheableOperations": ["build", "lint", "test", "e2e"]
      }
    }
  }
}
```

### 4. Affected Commands
Use affected commands in CI/CD:

```bash
# Only test what changed
nx affected:test --base=origin/main

# Only build what changed
nx affected:build --base=origin/main --configuration=production
```

### 5. Library Naming
- `shared-*`: Cross-cutting utilities
- `feature-*`: Feature-specific code
- `ui-*`: UI components
- `data-access-*`: API/data layer
- `util-*`: Pure utility functions

## Migration & Refactoring

### Moving Code Between Libraries

```bash
# Generate new location
nx g @nx/js:library new-location

# Move files manually
# Update imports
# Remove old library
nx g @nx/workspace:remove old-library
```

### Splitting Large Libraries

```bash
# Create new focused libraries
nx g @nx/js:library feature-users-list
nx g @nx/js:library feature-users-profile

# Move code incrementally
# Update imports across workspace
# Remove old library when empty
```

## Additional Resources

- [Nx Documentation](https://nx.dev)
- [Nx Cloud](https://nx.app)
- [Monorepo Best Practices](https://nx.dev/concepts/more-concepts/monorepo-nx-enterprise)

