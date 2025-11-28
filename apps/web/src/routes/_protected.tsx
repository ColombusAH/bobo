import { createFileRoute, redirect } from '@tanstack/react-router';
import { Outlet } from '@tanstack/react-router';
import { tokenStorage } from '../api/client';
import { RouterContext } from '../router';

export const Route = createFileRoute('/_protected')({
  beforeLoad: ({ context, location }: { context: RouterContext; location: { pathname: string } }) => {
    // Check if we have tokens in storage (for page refresh scenarios)
    const hasStoredTokens = !!(
      tokenStorage.getAccessToken() && 
      tokenStorage.getRefreshToken()
    );

    // Priority 1: If authenticated, allow access
    if (context.auth.isAuthenticated) {
      return;
    }

    // Priority 2: If we have stored tokens (even if auth state hasn't loaded yet), allow access
    // This handles page refresh scenarios where tokens exist but auth state is still initializing
    if (hasStoredTokens) {
      return; // Allow access, tokens exist - auth state will sync
    }

    // Priority 3: If auth is still loading, wait a moment and check again
    // This handles the edge case where tokens might be set but not yet read
    if (context.auth.isLoading) {
      // Give auth state a moment to initialize from tokens
      return; // Allow access temporarily, will be re-checked
    }

    // Priority 4: No tokens and not authenticated - redirect to login
    throw redirect({
      to: '/auth/login',
      search: {
        redirect: location.pathname,
      },
    });
  },
  component: () => <Outlet />,
});
