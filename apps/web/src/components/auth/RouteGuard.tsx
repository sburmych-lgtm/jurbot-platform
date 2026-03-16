import { type ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/lib/auth';
import { getBotSource } from '@/lib/telegram';
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

  // Bot source overrides DB role — allows LAWYER to access client UI via client bot
  if (role) {
    const botSource = getBotSource();
    const effectiveRole = botSource === 'client' ? 'CLIENT' : botSource === 'lawyer' ? 'LAWYER' : user.role;
    if (effectiveRole !== role) {
      const redirect = effectiveRole === 'LAWYER' ? '/lawyer' : '/client';
      return <Navigate to={redirect} replace />;
    }
  }

  return <>{children}</>;
}
