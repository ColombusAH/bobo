import { createFileRoute } from '@tanstack/react-router';
import { TenantMembersPage } from '../components/tenants/TenantMembersPage';

export const Route = createFileRoute('/_protected/tenants')({
  component: TenantsPage,
  errorComponent: ({ error }) => (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="text-center">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Error</h1>
        <p className="text-gray-600">
          {error instanceof Error ? error.message : 'An unexpected error occurred'}
        </p>
      </div>
    </div>
  ),
});

function TenantsPage() {
  const routeContext = Route.useRouteContext();
  return <TenantMembersPage routeContext={routeContext} />;
}

