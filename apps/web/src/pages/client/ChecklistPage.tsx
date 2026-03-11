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
        <h1 className="text-xl font-bold text-text-primary">\u0427\u0435\u043a\u043b\u0456\u0441\u0442</h1>
        {items.length === 0 ? (
          <EmptyState icon={CheckSquare} title="\u041f\u0443\u043d\u043a\u0442\u0456\u0432 \u043d\u0435\u043c\u0430\u0454" description="\u0410\u0434\u0432\u043e\u043a\u0430\u0442 \u0434\u043e\u0434\u0430\u0441\u0442\u044c \u0437\u0430\u0432\u0434\u0430\u043d\u043d\u044f" />
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
