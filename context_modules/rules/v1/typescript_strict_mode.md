# Development Rule: TypeScript Strict Mode

## Rule Overview

**Severity**: HIGH  
**Category**: Code Quality  
**Applies To**: All TypeScript files in the monorepo

## Rule Statement

All TypeScript projects MUST enable strict mode and related strict compiler options. All code MUST compile without errors or warnings when strict mode is enabled.

## Rationale

TypeScript strict mode catches common programming errors at compile time, improving:
- **Type Safety**: Prevents type-related runtime errors
- **Code Quality**: Enforces explicit handling of null/undefined
- **Maintainability**: Makes code intent clearer and refactoring safer
- **Developer Experience**: Better IDE autocomplete and error detection

## Configuration

### Required tsconfig.json Settings

```json
{
  "compilerOptions": {
    // Strict Mode (Master Switch)
    "strict": true,
    
    // Strict Mode Includes (redundant but explicit):
    "alwaysStrict": true,                  // Parse in strict mode and emit "use strict"
    "strictNullChecks": true,              // null/undefined must be explicit
    "strictBindCallApply": true,           // Check bind/call/apply arguments
    "strictFunctionTypes": true,           // Strict function type checking
    "strictPropertyInitialization": true,  // Class properties must be initialized
    "noImplicitAny": true,                 // Error on expressions with implied 'any'
    "noImplicitThis": true,                // Error on 'this' with implied 'any'
    
    // Additional Strict Checks (Recommended)
    "noUnusedLocals": true,                // Report unused local variables
    "noUnusedParameters": true,            // Report unused parameters
    "noImplicitReturns": true,             // All code paths must return a value
    "noFallthroughCasesInSwitch": true,    // Report fallthrough in switch statements
    "noUncheckedIndexedAccess": true,      // Index signatures return T | undefined
    "noImplicitOverride": true,            // Require 'override' keyword
    "noPropertyAccessFromIndexSignature": true, // Require bracket access for dynamic properties
    
    // Modern Target
    "target": "ES2022",
    "module": "commonjs",
    "lib": ["ES2022"],
    
    // Module Resolution
    "moduleResolution": "node",
    "resolveJsonModule": true,
    "esModuleInterop": true,
    "allowSyntheticDefaultImports": true,
    
    // Emit
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true,
    "removeComments": true,
    "importHelpers": true,
    
    // Interop
    "forceConsistentCasingInFileNames": true,
    "skipLibCheck": true
  }
}
```

### Workspace Configuration

```json
// tsconfig.base.json (root level)
{
  "compilerOptions": {
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noImplicitReturns": true,
    "noFallthroughCasesInSwitch": true,
    // ... other shared options
  }
}

// Apps and libs extend from base
// apps/backend/tsconfig.json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "outDir": "../../dist/apps/backend"
  }
}
```

## Compliance Guidelines

### ✅ CORRECT: Explicit Type Annotations

```typescript
// ✅ Function parameters and return types
function calculateTotal(items: CartItem[]): number {
  return items.reduce((sum, item) => sum + item.price, 0);
}

// ✅ Variable declarations
const userName: string = 'John Doe';
const userAge: number = 30;
const isActive: boolean = true;

// ✅ Object types
interface User {
  id: string;
  email: string;
  name: string;
}

const user: User = {
  id: '123',
  email: 'user@example.com',
  name: 'John Doe',
};

// ✅ Array types
const numbers: number[] = [1, 2, 3, 4, 5];
const users: User[] = [];

// ✅ Generic types
function identity<T>(value: T): T {
  return value;
}

// ✅ Promise types
async function fetchUser(id: string): Promise<User> {
  const response = await fetch(`/api/users/${id}`);
  return response.json();
}
```

### ❌ INCORRECT: Implicit any

```typescript
// ❌ No parameter types
function processData(data) { // Error: implicit any
  return data.map(item => item.value);
}

// ❌ No return type (when not obvious)
function complexCalculation(a: number, b: number) { // Warning: add return type
  if (a > b) return a - b;
  if (b > a) return b - a;
  // Missing return statement
}

// ❌ Untyped variables
let result; // Error: implicit any
result = calculateSomething();

// ❌ Untyped object properties
const config = {
  timeout: 5000,
  handler: (data) => { // Error: implicit any
    console.log(data);
  },
};
```

### ✅ CORRECT: Null/Undefined Handling

```typescript
// ✅ Optional parameters
interface User {
  id: string;
  email: string;
  firstName?: string; // Explicitly optional
  lastName?: string;
}

// ✅ Explicit null checks
function getUserName(user: User | null): string {
  if (user === null) {
    return 'Guest';
  }
  return user.firstName ?? 'Unknown';
}

// ✅ Nullish coalescing
const displayName = user.name ?? 'Anonymous';

// ✅ Optional chaining
const streetName = user?.address?.street ?? 'N/A';

// ✅ Type guards
function isUser(value: unknown): value is User {
  return (
    typeof value === 'object' &&
    value !== null &&
    'id' in value &&
    'email' in value
  );
}

if (isUser(data)) {
  // data is User here
  console.log(data.email);
}

// ✅ Non-null assertion (use sparingly!)
const element = document.getElementById('root')!; // We know it exists
```

### ❌ INCORRECT: Ignoring Null/Undefined

```typescript
// ❌ Assuming value exists
function getFirstName(user: User | undefined): string {
  return user.firstName; // Error: user might be undefined
}

// ❌ Not handling null
interface SearchResult {
  data: Item[] | null;
}

function processResults(result: SearchResult) {
  return result.data.map(item => item.id); // Error: data might be null
}

// ✅ Correct version
function processResults(result: SearchResult): string[] {
  if (result.data === null) {
    return [];
  }
  return result.data.map(item => item.id);
}
```

### ✅ CORRECT: Class Properties

```typescript
// ✅ Initialize in constructor
class UserService {
  private readonly prisma: PrismaService;
  private readonly cache: Map<string, User>;

  constructor(prisma: PrismaService) {
    this.prisma = prisma;
    this.cache = new Map();
  }
}

// ✅ Use definite assignment assertion (when injected)
@Injectable()
export class AuthService {
  private readonly jwtService!: JwtService; // Injected by NestJS

  constructor(jwtService: JwtService) {
    this.jwtService = jwtService;
  }
}

// ✅ Optional properties
class Config {
  timeout?: number;
  retries?: number;
}

// ✅ Default values
class Logger {
  private level: string = 'info';
  private timestamp: boolean = true;
}
```

### ❌ INCORRECT: Uninitialized Properties

```typescript
// ❌ Property not initialized
class UserService {
  private prisma: PrismaService; // Error: not initialized
  private cache: Map<string, User>; // Error: not initialized

  someMethod() {
    this.prisma.user.findMany(); // Runtime error: prisma is undefined
  }
}
```

### ✅ CORRECT: Function Types

```typescript
// ✅ Function type declarations
type Handler = (data: string) => void;
type AsyncHandler = (data: string) => Promise<void>;
type Predicate<T> = (value: T) => boolean;

// ✅ Callback types
function processItems(
  items: string[],
  callback: (item: string, index: number) => void
): void {
  items.forEach(callback);
}

// ✅ Event handlers
interface ClickHandler {
  (event: MouseEvent): void;
}

const handleClick: ClickHandler = (event) => {
  console.log(event.clientX, event.clientY);
};

// ✅ Generic constraints
function find<T>(
  array: T[],
  predicate: (item: T) => boolean
): T | undefined {
  return array.find(predicate);
}
```

### ✅ CORRECT: Enum and Union Types

```typescript
// ✅ Enums for fixed sets
enum UserRole {
  ADMIN = 'ADMIN',
  USER = 'USER',
  GUEST = 'GUEST',
}

// ✅ Union types for alternatives
type Status = 'pending' | 'approved' | 'rejected';

// ✅ Discriminated unions
type Result<T> =
  | { success: true; data: T }
  | { success: false; error: string };

function handleResult<T>(result: Result<T>): void {
  if (result.success) {
    console.log(result.data); // TypeScript knows data exists
  } else {
    console.error(result.error); // TypeScript knows error exists
  }
}
```

### ✅ CORRECT: Type Assertions (Use Sparingly)

```typescript
// ✅ Type assertion when you know better than TypeScript
const value = localStorage.getItem('config') as string;
const parsed = JSON.parse(value) as Config;

// ✅ Type guards are better
function isConfig(value: unknown): value is Config {
  return (
    typeof value === 'object' &&
    value !== null &&
    'timeout' in value
  );
}

const parsed = JSON.parse(value);
if (isConfig(parsed)) {
  // parsed is Config here
  console.log(parsed.timeout);
}

// ⚠️ Avoid 'as any'
const data = response as any; // Avoid! Defeats the purpose of TypeScript
```

### ✅ CORRECT: Index Signatures

```typescript
// ✅ Explicit index signature
interface Dictionary {
  [key: string]: string | undefined; // With noUncheckedIndexedAccess
}

const dict: Dictionary = {
  name: 'John',
  email: 'john@example.com',
};

// ✅ Access with undefined check
const name = dict['name'];
if (name !== undefined) {
  console.log(name.toUpperCase());
}

// ✅ Or use optional chaining
console.log(dict['name']?.toUpperCase());

// ✅ Record utility type
type UserStatus = 'active' | 'inactive' | 'banned';
const statusColors: Record<UserStatus, string> = {
  active: 'green',
  inactive: 'gray',
  banned: 'red',
};
```

## Common Patterns

### API Response Handling

```typescript
// ✅ Type-safe API responses
interface ApiResponse<T> {
  data: T | null;
  error: string | null;
  status: number;
}

async function fetchUser(id: string): Promise<User> {
  const response = await fetch(`/api/users/${id}`);
  const json: ApiResponse<User> = await response.json();

  if (json.error !== null) {
    throw new Error(json.error);
  }

  if (json.data === null) {
    throw new Error('No data returned');
  }

  return json.data;
}
```

### Environment Variables

```typescript
// ✅ Type-safe environment variables
interface Environment {
  NODE_ENV: 'development' | 'production' | 'test';
  DATABASE_URL: string;
  JWT_SECRET: string;
  PORT: number;
}

function getEnv(): Environment {
  const env = process.env;

  if (!env.DATABASE_URL) {
    throw new Error('DATABASE_URL is required');
  }

  if (!env.JWT_SECRET) {
    throw new Error('JWT_SECRET is required');
  }

  return {
    NODE_ENV: (env.NODE_ENV as Environment['NODE_ENV']) || 'development',
    DATABASE_URL: env.DATABASE_URL,
    JWT_SECRET: env.JWT_SECRET,
    PORT: parseInt(env.PORT || '3000', 10),
  };
}
```

### Error Handling

```typescript
// ✅ Type-safe error handling
class AppError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly statusCode: number
  ) {
    super(message);
    this.name = 'AppError';
  }
}

function isAppError(error: unknown): error is AppError {
  return error instanceof AppError;
}

// Usage
try {
  await someOperation();
} catch (error) {
  if (isAppError(error)) {
    console.error(`[${error.code}] ${error.message}`);
    return { error: error.message, status: error.statusCode };
  }

  // Unknown error
  console.error('Unexpected error:', error);
  throw error;
}
```

## Migration Strategy

For existing codebases not using strict mode:

1. **Enable strict mode in tsconfig.json**
2. **Fix errors incrementally by module**
3. **Use `// @ts-expect-error` temporarily for complex issues**
4. **Document technical debt**
5. **Set deadline for full compliance**

```typescript
// Temporary exception (should be removed)
// @ts-expect-error - TODO: Fix type mismatch (Ticket #123)
const result = legacyFunction(data);
```

## Enforcement

### CI/CD Pipeline

```bash
# Build fails if TypeScript errors exist
nx build --skip-nx-cache

# Run type checking separately
nx run-many --target=typecheck --all
```

### Pre-commit Hook

```bash
#!/bin/bash
# .git/hooks/pre-commit

echo "Running TypeScript compiler..."
npx tsc --noEmit

if [ $? -ne 0 ]; then
  echo "TypeScript compilation failed. Please fix errors before committing."
  exit 1
fi
```

### IDE Configuration

```json
// .vscode/settings.json
{
  "typescript.tsdk": "node_modules/typescript/lib",
  "typescript.enablePromptUseWorkspaceTsdk": true,
  "editor.codeActionsOnSave": {
    "source.fixAll.eslint": true
  }
}
```

## Exceptions

Exceptions to strict mode are NOT ALLOWED except:

1. **Third-party type definitions**: When external libraries lack proper types
2. **Migration period**: Temporary `@ts-expect-error` with ticket reference
3. **Generated code**: Code generated by tools (must be in separate files)

## Resources

- [TypeScript Handbook - Strict Mode](https://www.typescriptlang.org/tsconfig#strict)
- [TypeScript Deep Dive - Strict Mode](https://basarat.gitbook.io/typescript/intro/strictness)
- [Nx TypeScript Configuration](https://nx.dev/recipes/tips-n-tricks/typescript)

---

**Version**: 1.0.0  
**Last Updated**: November 14, 2025  
**Review Frequency**: Semi-annually  
**Rule Owner**: Architecture Team

