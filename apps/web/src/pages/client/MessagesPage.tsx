import { useState, useEffect } from 'react';
import { MessageSquare } from 'lucide-react';
import { useAuth } from '@/lib/auth';
import { api } from '@/lib/api';
import { PageContainer } from '@/components/layout/PageContainer';
import { ChatWindow } from '@/components/chat/ChatWindow';
import { EmptyState } from '@/components/ui/EmptyState';
import { Spinner } from '@/components/ui/Spinner';

interface Msg {
  id: string;
  text: string;
  senderId: string;
  senderName?: string;
  createdAt: string;
}

export function MessagesPage() {
  const { user } = useAuth();
  const [messages, setMessages] = useState<Msg[]>([]);
  const [caseId, setCaseId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const casesRes = await api.get<{ id: string }[]>('/v1/cases');
        const cases = casesRes.data ?? [];
        if (cases.length > 0) {
          const first = cases[0];
          if (!first) { setLoading(false); return; }
          const id = first.id;
          setCaseId(id);
          const msgRes = await api.get<Msg[]>(`/v1/cases/${id}/messages`);
          setMessages(msgRes.data ?? []);
        }
      } catch {}
      setLoading(false);
    })();
  }, []);

  const sendMessage = async (text: string) => {
    if (!caseId) return;
    try {
      const res = await api.post<Msg>(`/v1/cases/${caseId}/messages`, { text });
      if (res.data) setMessages(prev => [...prev, res.data!]);
    } catch {}
  };

  if (loading) return <Spinner />;
  if (!caseId) return <EmptyState icon={MessageSquare} title="Немає активної справи" />;

  return (
    <PageContainer>
      <ChatWindow messages={messages} currentUserId={user?.id ?? ''} onSend={sendMessage} />
    </PageContainer>
  );
}
