import { useState, useEffect } from 'react';
import { CheckSquare, Check } from 'lucide-react';
import { PageContainer } from '@/components/layout/PageContainer';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { EmptyState } from '@/components/ui/EmptyState';
import { Spinner } from '@/components/ui/Spinner';
import { api } from '@/lib/api';

interface ChecklistItem {
  id: string;
  text: string;
  done: boolean;
  order: number;
}

export function ChecklistPage() {
  const [items, setItems] = useState<ChecklistItem[]>([]);
  const [caseId, setCaseId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const casesRes = await api.get<{ id: string }[]>('/v1/cases');
        const firstCase = casesRes.data?.[0];
        if (firstCase) {
          setCaseId(firstCase.id);
          const res = await api.get<ChecklistItem[]>(`/v1/cases/${firstCase.id}/checklist`);
          setItems(res.data ?? []);
        }
      } catch { /* ignore */ }
      finally { setLoading(false); }
    })();
  }, []);

  const toggle = async (itemId: string) => {
    if (!caseId) return;
    const item = items.find(i => i.id === itemId);
    if (!item) return;
    try {
      await api.patch(`/v1/cases/${caseId}/checklist/${itemId}`, { done: !item.done });
      setItems(prev => prev.map(i => i.id === itemId ? { ...i, done: !i.done } : i));
    } catch { /* ignore */ }
  };

  if (loading) return <Spinner />;

  if (!caseId || items.length === 0) {
    return (
      <PageContainer>
        <EmptyState icon={CheckSquare} title="Чекліст порожній" description="Юрист додасть пункти до чекліста" />
      </PageContainer>
    );
  }

  const done = items.filter(i => i.done).length;
  const pct = Math.round((done / items.length) * 100);

  return (
    <PageContainer>
      <div className="space-y-4">
        <h1 className="text-2xl font-bold text-navy-900">Чекліст</h1>

        <div className="bg-white rounded-xl border border-navy-100 p-4">
          <ProgressBar value={pct} label="Прогрес" />
          <p className="text-sm text-navy-600 mt-1">{done} з {items.length} виконано</p>
        </div>

        <div className="space-y-2">
          {items.sort((a, b) => a.order - b.order).map(item => (
            <button
              key={item.id}
              onClick={() => toggle(item.id)}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl border transition text-left ${
                item.done ? 'bg-green-50 border-green-200' : 'bg-white border-navy-100 hover:border-navy-200'
              }`}
            >
              <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center shrink-0 transition ${
                item.done ? 'bg-green-500 border-green-500' : 'border-navy-300'
              }`}>
                {item.done && <Check size={14} className="text-white" />}
              </div>
              <span className={`text-sm ${item.done ? 'line-through text-navy-400' : 'text-navy-800'}`}>
                {item.text}
              </span>
            </button>
          ))}
        </div>
      </div>
    </PageContainer>
  );
}
