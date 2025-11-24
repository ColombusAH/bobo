import { createFileRoute } from '@tanstack/react-router';

export const Route = createFileRoute('/_protected/')({
  component: DashboardPage,
});

function DashboardPage() {
  const { user } = Route.useRouteContext().auth;

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          <div className="border-4 border-dashed border-gray-200 rounded-lg p-8">
            <div className="text-center">
              <h1 className="text-3xl font-bold text-gray-900 mb-4">Dashboard</h1>
              {user && (
                <div className="text-lg text-gray-600">
                  Welcome back, {user.firstName || user.email}!
                </div>
              )}
              <div className="mt-8 text-gray-500">
                This is a protected dashboard page. You are successfully authenticated.
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
