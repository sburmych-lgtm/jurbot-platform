import { useState, useEffect } from 'react';
import { CheckSquare } from 'lucide-react';
import { api } from '@/lib/api';
import { PageContainer } from '@/components/layout/PageContainer';
import { Card } from '@/components/ui/Card';
import { EmptyState } from '@/components/ui/EmptyState';
import { Spinner } from '@/components/ui/Spinner';

interface CheckItem {
  id: string;
  text: string;
  done: boolean;
}

export function ChecklistPage() {
  const [items, setItems] = useState<CheckItem[]>([]);
  const [caseId, setCaseId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const casesRes = await api.get<{ id: string; checklist?: CheckItem[] }[]>('/v1/cases');
        const cases = casesRes.data ?? [];
        if (cases.length > 0) {
          const first = cases[0];
          if (first) {
            setCaseId(first.id);
            setItems(first.checklist ?? []);
          }
        }
      } catch {}
      setLoading(false);
    })();
  }, []);

  const toggle = async (itemId: string) => {
    if (!caseId) return;
    const item = items.find(i => i.id === itemId);
    if (!item) return;
    try {
      await api.patch(`/v1/cases/${caseId}/checklist/${itemId}`, { done: !item.done });
      setItems(prev => prev.map(i => i.id === itemId ? { ...i, done: !i.done } : i));
    } catch {}
  };

  if (loading) return <Spinner />;

  return (
    <PageContainer>
      <div className="space-y-4">
        <h1 className="text-xl font-bold text-text-primary">Чекліст</h1>
        {items.length === 0 ? (
          <EmptyState icon={CheckSquare} title="Пунктів немає" description="Адвокат додасть завдання" />
        ) : (
          <div className="space-y-2">
            {items.map(item => (
              <Card key={item.id} className="flex items-center gap-3 cursor-pointer" onClick={() => toggle(item.id)}>
                <div className={`w-6 h-6 rounded-[8px] border-2 flex items-center justify-center transition ${
                  item.done ? 'bg-accent-teal border-accent-teal' : 'border-border-light'
                }`}>
                  {item.done && <CheckSquare size={14} className="text-bg-primary" />}
                </div>
                <span className={`text-sm flex-1 ${item.done ? 'text-text-muted line-through' : 'text-text-primary'}`}>
                  {item.text}
                </span>
              </Card>
            ))}
          </div>
        )}
      </div>
    </PageContainer>
  );
}
