import { createFileRoute, redirect } from '@tanstack/react-router';

export const Route = createFileRoute('/_protected')({
  beforeLoad: ({ context }) => {
    if (!context.auth.isAuthenticated) {
      throw redirect({
        to: '/auth/login',
        search: {
          redirect: location.pathname,
        },
      });
    }
  },
  component: () => <Outlet />,
});

// Import Outlet for nested routes
import { Outlet } from '@tanstack/react-router';
