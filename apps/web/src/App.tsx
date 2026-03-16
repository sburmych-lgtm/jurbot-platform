import { Routes, Route, Navigate } from 'react-router-dom';
import { AppShell } from '@/components/layout/AppShell';
import { RouteGuard } from '@/components/auth/RouteGuard';
import { useAuth } from '@/lib/auth';
import { isTelegramWebApp, getBotSource } from '@/lib/telegram';

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
import { SettingsPage } from '@/pages/lawyer/SettingsPage';

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

  if (!user) {
    // In Telegram: auth already resolved (loading=false) but user not found
    if (isTelegramWebApp()) {
      const botSource = getBotSource();
      const roleLabel = botSource === 'lawyer' ? 'адвокатського' : 'клієнтського';
      return (
        <div className="min-h-screen px-6 py-10">
          <div className="mx-auto flex min-h-[calc(100vh-5rem)] max-w-md items-center justify-center">
            <div className="glass-panel hero-panel rounded-[30px] p-8 text-center">
              <p className="section-kicker mb-3">Mini App</p>
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-[18px] bg-[linear-gradient(135deg,rgba(91,124,250,0.92),rgba(0,200,180,0.82))] text-2xl text-[#050810] shadow-[0_20px_44px_rgba(0,0,0,0.28)]">
                ⚖️
              </div>
              <h1 className="font-display text-4xl text-text-primary">ЮрБот</h1>
              <p className="mt-3 text-sm leading-6 text-text-secondary">
                Для доступу до {roleLabel} Mini App спочатку завершіть реєстрацію через Telegram-бота.
              </p>
              <div className="mt-6 rounded-[20px] border border-white/10 bg-white/5 p-4 text-left">
                <p className="section-kicker mb-2">Що зробити</p>
                <p className="text-sm text-text-primary">1. Поверніться в бот.</p>
                <p className="mt-1 text-sm text-text-primary">2. Натисніть <span className="font-semibold text-accent-teal">Почати</span>.</p>
                <p className="mt-1 text-sm text-text-primary">3. Завершіть реєстрацію і знову відкрийте Mini App.</p>
              </div>
            </div>
          </div>
        </div>
      );
    }
    return <Navigate to="/login" replace />;
  }

  // Bot source (from Telegram ?startapp= param) overrides DB role.
  // This lets a LAWYER access client UI via @YurBotClientBot.
  const botSource = getBotSource();
  if (botSource === 'client') return <Navigate to="/client" replace />;
  if (botSource === 'lawyer' || user.role === 'LAWYER') return <Navigate to="/lawyer" replace />;
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
        <Route path="settings" element={<SettingsPage />} />
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
