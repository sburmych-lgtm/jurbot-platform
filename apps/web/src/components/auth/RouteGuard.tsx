import { type ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/lib/auth';
import { resolveUiRole, logModeResolution } from '@/lib/telegram';
import { Spinner } from '@/components/ui/Spinner';

interface RouteGuardProps {
  children: ReactNode;
  role?: 'LAWYER' | 'CLIENT';
}

export function RouteGuard({ children, role }: RouteGuardProps) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-bg-primary flex items-center justify-center">
        <Spinner />
      </div>
    );
  }

  if (!user) return <Navigate to="/login" replace />;

  if (role) {
    const resolved = resolveUiRole(user.role);
    logModeResolution({ reason: 'route_guard', pathname: window.location.pathname, userRole: user.role });

    if (resolved.role !== role) {
      const redirect = resolved.role === 'LAWYER' ? '/lawyer' : '/client';
      return <Navigate to={redirect} replace />;
    }
  }

  return <>{children}</>;
}
