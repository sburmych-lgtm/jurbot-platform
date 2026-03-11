import { type ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/lib/auth';
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

  if (role && user.role !== role) {
    const redirect = user.role === 'LAWYER' ? '/lawyer' : '/client';
    return <Navigate to={redirect} replace />;
  }

  return <>{children}</>;
}
