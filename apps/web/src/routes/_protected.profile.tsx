import { createFileRoute } from '@tanstack/react-router';

export const Route = createFileRoute('/_protected/profile')({
  component: ProfilePage,
});

function ProfilePage() {
  const { user } = Route.useRouteContext().auth;

  if (!user) {
    return <div>Loading...</div>;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          <div className="bg-white shadow rounded-lg">
            <div className="px-4 py-5 sm:p-6">
              <h1 className="text-2xl font-bold text-gray-900 mb-6">Profile</h1>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Email</label>
                  <div className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm bg-gray-50 text-gray-500">
                    {user.email}
                  </div>
                </div>

                {user.firstName && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700">First Name</label>
                    <div className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm bg-gray-50 text-gray-500">
                      {user.firstName}
                    </div>
                  </div>
                )}

                {user.lastName && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Last Name</label>
                    <div className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm bg-gray-50 text-gray-500">
                      {user.lastName}
                    </div>
                  </div>
                )}

                {user.tenantId && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Tenant ID</label>
                    <div className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm bg-gray-50 text-gray-500">
                      {user.tenantId}
                    </div>
                  </div>
                )}

                {user.roles && user.roles.length > 0 && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Roles</label>
                    <div className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm bg-gray-50 text-gray-500">
                      {user.roles.join(', ')}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
