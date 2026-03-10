import { useState, useEffect } from 'react';
import { MessageSquare } from 'lucide-react';
import { PageContainer } from '@/components/layout/PageContainer';
import { ChatWindow } from '@/components/chat/ChatWindow';
import { EmptyState } from '@/components/ui/EmptyState';
import { Spinner } from '@/components/ui/Spinner';
import { useAuth } from '@/lib/auth';
import { api } from '@/lib/api';

interface Message {
  id: string;
  text: string;
  senderId: string;
  senderName?: string;
  createdAt: string;
}

export function MessagesPage() {
  const { user } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [caseId, setCaseId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        // Get first case, then its messages
        const casesRes = await api.get<{ id: string }[]>('/v1/cases');
        const firstCase = casesRes.data?.[0];
        if (firstCase) {
          setCaseId(firstCase.id);
          const msgsRes = await api.get<Message[]>(`/v1/cases/${firstCase.id}/messages`);
          setMessages(msgsRes.data ?? []);
        }
      } catch { /* ignore */ }
      finally { setLoading(false); }
    })();
  }, []);

  const handleSend = async (text: string) => {
    if (!caseId || !user) return;
    try {
      const res = await api.post<Message>(`/v1/cases/${caseId}/messages`, { text });
      if (res.data) {
        setMessages(prev => [...prev, res.data!]);
      }
    } catch { /* ignore */ }
  };

  if (loading) return <Spinner />;

  if (!caseId) {
    return (
      <PageContainer>
        <EmptyState icon={MessageSquare} title="Немає активних чатів" description="Чат стане доступний після створення справи" />
      </PageContainer>
    );
  }

  return (
    <PageContainer>
      <h1 className="text-xl font-bold text-navy-900 mb-3">Повідомлення</h1>
      <ChatWindow
        messages={messages}
        currentUserId={user?.id ?? ''}
        onSend={handleSend}
      />
    </PageContainer>
  );
}
