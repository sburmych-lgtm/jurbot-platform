import { Routes, Route, Navigate } from 'react-router-dom';
import { AppShell } from '@/components/layout/AppShell';
import { RouteGuard } from '@/components/auth/RouteGuard';
import { useAuth } from '@/lib/auth';

// Public pages
import { LoginPage } from '@/pages/public/LoginPage';
import { IntakeFormPage } from '@/pages/public/IntakeFormPage';

// Lawyer pages
import { LawyerDashboardPage } from '@/pages/lawyer/DashboardPage';
import { CasesPage } from '@/pages/lawyer/CasesPage';
import { CaseDetailPage } from '@/pages/lawyer/CaseDetailPage';
import { IntakePage } from '@/pages/lawyer/IntakePage';
import { SchedulePage } from '@/pages/lawyer/SchedulePage';
import { LawyerDocumentsPage } from '@/pages/lawyer/DocumentsPage';
import { TimeLogsPage } from '@/pages/lawyer/TimeLogsPage';
import { ClientsPage } from '@/pages/lawyer/ClientsPage';

// Client pages
import { ClientDashboardPage } from '@/pages/client/DashboardPage';
import { ClientCasePage } from '@/pages/client/CasePage';
import { ClientDocumentsPage } from '@/pages/client/DocumentsPage';
import { MessagesPage } from '@/pages/client/MessagesPage';
import { ChecklistPage } from '@/pages/client/ChecklistPage';
import { BookingPage } from '@/pages/client/BookingPage';

// Shared pages
import { NotificationsPage } from '@/pages/shared/NotificationsPage';
import { ProfilePage } from '@/pages/shared/ProfilePage';

function HomeRedirect() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-[#050810]">
        <div className="text-[#a0aec0] text-lg">Завантаження...</div>
      </div>
    );
  }

  if (!user) return <Navigate to="/login" replace />;
  if (user.role === 'LAWYER') return <Navigate to="/lawyer" replace />;
  return <Navigate to="/client" replace />;
}

export function App() {
  return (
    <Routes>
      {/* Public */}
      <Route path="/intake" element={<IntakeFormPage />} />
      <Route path="/login" element={<LoginPage />} />

      {/* Lawyer routes */}
      <Route path="/lawyer" element={<RouteGuard role="LAWYER"><AppShell /></RouteGuard>}>
        <Route index element={<LawyerDashboardPage />} />
        <Route path="cases" element={<CasesPage />} />
        <Route path="cases/:id" element={<CaseDetailPage />} />
        <Route path="intake" element={<IntakePage />} />
        <Route path="schedule" element={<SchedulePage />} />
        <Route path="documents" element={<LawyerDocumentsPage />} />
        <Route path="timelogs" element={<TimeLogsPage />} />
        <Route path="clients" element={<ClientsPage />} />
        <Route path="notifications" element={<NotificationsPage />} />
        <Route path="profile" element={<ProfilePage />} />
      </Route>

      {/* Client routes */}
      <Route path="/client" element={<RouteGuard role="CLIENT"><AppShell /></RouteGuard>}>
        <Route index element={<ClientDashboardPage />} />
        <Route path="case" element={<ClientCasePage />} />
        <Route path="documents" element={<ClientDocumentsPage />} />
        <Route path="messages" element={<MessagesPage />} />
        <Route path="checklist" element={<ChecklistPage />} />
        <Route path="booking" element={<BookingPage />} />
        <Route path="notifications" element={<NotificationsPage />} />
        <Route path="profile" element={<ProfilePage />} />
      </Route>

      {/* Redirects */}
      <Route path="/" element={<HomeRedirect />} />
      <Route path="*" element={<HomeRedirect />} />
    </Routes>
  );
}
