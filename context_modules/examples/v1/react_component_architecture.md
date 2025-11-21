# React Component Architecture for Nx Workspaces

## Overview

This guide outlines component architecture patterns and best practices for React applications in the Bobo Nx monorepo.

## Project Structure

```
apps/
  frontend/
    src/
      app/
      pages/
      components/
      hooks/
      contexts/
      utils/
      types/
libs/
  ui-components/
    src/
      lib/
        Button/
        Input/
        Modal/
  feature-users/
    src/
      lib/
        components/
        hooks/
        services/
```

## Component Patterns

### 1. Functional Components with TypeScript

```typescript
// libs/ui-components/src/lib/Button/Button.tsx
import React from 'react';
import styles from './Button.module.css';

export interface ButtonProps {
  variant?: 'primary' | 'secondary' | 'danger';
  size?: 'small' | 'medium' | 'large';
  disabled?: boolean;
  loading?: boolean;
  onClick?: (event: React.MouseEvent<HTMLButtonElement>) => void;
  children: React.ReactNode;
  type?: 'button' | 'submit' | 'reset';
  className?: string;
}

export const Button: React.FC<ButtonProps> = ({
  variant = 'primary',
  size = 'medium',
  disabled = false,
  loading = false,
  onClick,
  children,
  type = 'button',
  className,
}) => {
  const classNames = [
    styles.button,
    styles[variant],
    styles[size],
    loading && styles.loading,
    className,
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <button
      type={type}
      className={classNames}
      disabled={disabled || loading}
      onClick={onClick}
    >
      {loading ? <Spinner size={size} /> : children}
    </button>
  );
};
```

### 2. Custom Hooks Pattern

```typescript
// libs/feature-users/src/lib/hooks/useUsers.ts
import { useState, useEffect } from 'react';
import { User } from '../types/user.types';
import { userService } from '../services/user.service';

export interface UseUsersResult {
  users: User[];
  loading: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
}

export const useUsers = (): UseUsersResult => {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await userService.getAll();
      setUsers(data);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Unknown error'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  return {
    users,
    loading,
    error,
    refetch: fetchUsers,
  };
};
```

### 3. Context Provider Pattern

```typescript
// apps/frontend/src/contexts/AuthContext.tsx
import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';

interface User {
  id: string;
  email: string;
  role: string;
}

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(false);

  const login = useCallback(async (email: string, password: string) => {
    try {
      setLoading(true);
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      
      if (!response.ok) throw new Error('Login failed');
      
      const userData = await response.json();
      setUser(userData);
    } finally {
      setLoading(false);
    }
  }, []);

  const logout = useCallback(() => {
    setUser(null);
    // Clear tokens, redirect, etc.
  }, []);

  const value = {
    user,
    isAuthenticated: !!user,
    login,
    logout,
    loading,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
```

### 4. Compound Component Pattern

```typescript
// libs/ui-components/src/lib/Card/Card.tsx
import React, { createContext, useContext, ReactNode } from 'react';
import styles from './Card.module.css';

interface CardContextType {
  variant: 'default' | 'outlined' | 'elevated';
}

const CardContext = createContext<CardContextType>({ variant: 'default' });

interface CardProps {
  variant?: 'default' | 'outlined' | 'elevated';
  children: ReactNode;
  className?: string;
}

export const Card: React.FC<CardProps> & {
  Header: typeof CardHeader;
  Body: typeof CardBody;
  Footer: typeof CardFooter;
} = ({ variant = 'default', children, className }) => {
  return (
    <CardContext.Provider value={{ variant }}>
      <div className={`${styles.card} ${styles[variant]} ${className || ''}`}>
        {children}
      </div>
    </CardContext.Provider>
  );
};

const CardHeader: React.FC<{ children: ReactNode }> = ({ children }) => {
  return <div className={styles.header}>{children}</div>;
};

const CardBody: React.FC<{ children: ReactNode }> = ({ children }) => {
  return <div className={styles.body}>{children}</div>;
};

const CardFooter: React.FC<{ children: ReactNode }> = ({ children }) => {
  return <div className={styles.footer}>{children}</div>;
};

Card.Header = CardHeader;
Card.Body = CardBody;
Card.Footer = CardFooter;

// Usage:
// <Card variant="elevated">
//   <Card.Header>Title</Card.Header>
//   <Card.Body>Content</Card.Body>
//   <Card.Footer>Footer</Card.Footer>
// </Card>
```

### 5. Render Props Pattern

```typescript
// libs/ui-components/src/lib/DataFetcher/DataFetcher.tsx
import React, { useState, useEffect, ReactNode } from 'react';

interface DataFetcherProps<T> {
  url: string;
  children: (data: {
    data: T | null;
    loading: boolean;
    error: Error | null;
  }) => ReactNode;
}

export function DataFetcher<T>({ url, children }: DataFetcherProps<T>) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const response = await fetch(url);
        if (!response.ok) throw new Error('Fetch failed');
        const result = await response.json();
        setData(result);
      } catch (err) {
        setError(err instanceof Error ? err : new Error('Unknown error'));
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [url]);

  return <>{children({ data, loading, error })}</>;
}

// Usage:
// <DataFetcher<User[]> url="/api/users">
//   {({ data, loading, error }) => {
//     if (loading) return <Spinner />;
//     if (error) return <Error message={error.message} />;
//     return <UserList users={data} />;
//   }}
// </DataFetcher>
```

### 6. Higher-Order Component (HOC) Pattern

```typescript
// libs/ui-components/src/lib/hoc/withAuth.tsx
import React, { ComponentType } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { Navigate } from 'react-router-dom';

export interface WithAuthProps {
  isAuthenticated: boolean;
}

export function withAuth<P extends WithAuthProps>(
  Component: ComponentType<P>
) {
  return (props: Omit<P, keyof WithAuthProps>) => {
    const { isAuthenticated, loading } = useAuth();

    if (loading) {
      return <div>Loading...</div>;
    }

    if (!isAuthenticated) {
      return <Navigate to="/login" />;
    }

    return <Component {...(props as P)} isAuthenticated={isAuthenticated} />;
  };
}

// Usage:
// const ProtectedDashboard = withAuth(Dashboard);
```

## State Management Patterns

### 1. Local State with useState

```typescript
const [count, setCount] = useState(0);
const increment = () => setCount(prev => prev + 1);
```

### 2. Complex State with useReducer

```typescript
// libs/feature-users/src/lib/hooks/useUserForm.ts
import { useReducer } from 'react';

interface FormState {
  values: Record<string, any>;
  errors: Record<string, string>;
  touched: Record<string, boolean>;
  isSubmitting: boolean;
}

type FormAction =
  | { type: 'SET_FIELD'; field: string; value: any }
  | { type: 'SET_ERROR'; field: string; error: string }
  | { type: 'SET_TOUCHED'; field: string }
  | { type: 'SET_SUBMITTING'; isSubmitting: boolean }
  | { type: 'RESET' };

const formReducer = (state: FormState, action: FormAction): FormState => {
  switch (action.type) {
    case 'SET_FIELD':
      return {
        ...state,
        values: { ...state.values, [action.field]: action.value },
      };
    case 'SET_ERROR':
      return {
        ...state,
        errors: { ...state.errors, [action.field]: action.error },
      };
    case 'SET_TOUCHED':
      return {
        ...state,
        touched: { ...state.touched, [action.field]: true },
      };
    case 'SET_SUBMITTING':
      return { ...state, isSubmitting: action.isSubmitting };
    case 'RESET':
      return {
        values: {},
        errors: {},
        touched: {},
        isSubmitting: false,
      };
    default:
      return state;
  }
};

export const useUserForm = () => {
  const [state, dispatch] = useReducer(formReducer, {
    values: {},
    errors: {},
    touched: {},
    isSubmitting: false,
  });

  return { state, dispatch };
};
```

## Testing Patterns

```typescript
// libs/ui-components/src/lib/Button/Button.spec.tsx
import { render, screen, fireEvent } from '@testing-library/react';
import { Button } from './Button';

describe('Button', () => {
  it('renders with children', () => {
    render(<Button>Click me</Button>);
    expect(screen.getByText('Click me')).toBeInTheDocument();
  });

  it('calls onClick when clicked', () => {
    const handleClick = jest.fn();
    render(<Button onClick={handleClick}>Click me</Button>);
    
    fireEvent.click(screen.getByText('Click me'));
    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  it('is disabled when loading', () => {
    render(<Button loading>Click me</Button>);
    expect(screen.getByRole('button')).toBeDisabled();
  });

  it('applies variant classes correctly', () => {
    const { container } = render(<Button variant="danger">Delete</Button>);
    expect(container.firstChild).toHaveClass('danger');
  });
});
```

## Best Practices

### 1. Component Organization
- One component per file
- Co-locate styles and tests
- Export from index files

### 2. Props Design
- Use TypeScript interfaces
- Provide sensible defaults
- Make optional what should be optional

### 3. Performance
- Use `React.memo` for expensive components
- Memoize callbacks with `useCallback`
- Memoize values with `useMemo`
- Code-split with `React.lazy`

### 4. Accessibility
- Use semantic HTML
- Include ARIA labels
- Support keyboard navigation
- Test with screen readers

### 5. Styling
- Use CSS Modules for component styles
- Follow BEM naming convention
- Create design tokens in shared library
- Support theming

## Additional Resources

- [React Documentation](https://react.dev)
- [TypeScript + React](https://react-typescript-cheatsheet.netlify.app/)
- [Testing Library](https://testing-library.com/react)

