import { Link, useMatchRoute, useLocation } from '@tanstack/react-router';

export function Navigation() {
  const matchRoute = useMatchRoute();
  const location = useLocation();
  const baseLinkClass = 'inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium';
  const activeClass = 'border-indigo-500 text-gray-900';
  const inactiveClass = 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700';

  // Check active routes
  const isDashboardActive = location.pathname === '/';
  const isTenantsActive = !!matchRoute({ to: '/tenants' });
  const isProfileActive = !!matchRoute({ to: '/profile' });

  return (
    <nav className="bg-white shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex">
            <div className="shrink-0 flex items-center">
              <Link to="/" className="text-xl font-bold text-indigo-600">
                Bobo
              </Link>
            </div>
            <div className="hidden sm:ml-6 sm:flex sm:space-x-8">
              <Link
                to="/"
                className={`${baseLinkClass} ${isDashboardActive ? activeClass : inactiveClass}`}
              >
                Dashboard
              </Link>
              <Link
                to="/tenants"
                className={`${baseLinkClass} ${isTenantsActive ? activeClass : inactiveClass}`}
              >
                Team
              </Link>
              <Link
                to="/profile"
                className={`${baseLinkClass} ${isProfileActive ? activeClass : inactiveClass}`}
              >
                Profile
              </Link>
            </div>
          </div>
        </div>
      </div>
    </nav>
  );
}

