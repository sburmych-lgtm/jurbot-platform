import { useState, useEffect } from 'react';
import { Plus, Search, Briefcase } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { api } from '@/lib/api';
import { PageContainer } from '@/components/layout/PageContainer';
import { CaseCard } from '@/components/case/CaseCard';
import { EmptyState } from '@/components/ui/EmptyState';
import { Spinner } from '@/components/ui/Spinner';

interface CaseItem {
  id: string;
  caseNumber: string;
  title: string;
  category: string;
  status: string;
  updatedAt: string;
  client?: { user: { name: string } };
}

const STATUSES = [
  { value: '', label: '\u0412\u0441\u0456' },
  { value: 'INTAKE', label: '\u041f\u0440\u0438\u0439\u043e\u043c' },
  { value: 'ANALYSIS', label: '\u0410\u043d\u0430\u043b\u0456\u0437' },
  { value: 'PREPARATION', label: '\u041f\u0456\u0434\u0433\u043e\u0442\u043e\u0432\u043a\u0430' },
  { value: 'FILED', label: '\u041f\u043e\u0434\u0430\u043d\u043e' },
  { value: 'AWAITING', label: '\u041e\u0447\u0456\u043a\u0443\u0432\u0430\u043d\u043d\u044f' },
  { value: 'COMPLETED', label: '\u0417\u0430\u0432\u0435\u0440\u0448\u0435\u043d\u043e' },
];

export function CasesPage() {
  const navigate = useNavigate();
  const [cases, setCases] = useState<CaseItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  useEffect(() => {
    (async () => {
      try {
        const q = statusFilter ? `?status=${statusFilter}` : '';
        const res = await api.get<{ items: CaseItem[] }>(`/v1/cases${q}`);
        setCases(res.data?.items ?? []);
      } catch { setCases([]); }
      setLoading(false);
    })();
  }, [statusFilter]);

  const filtered = cases.filter(c =>
    c.title.toLowerCase().includes(search.toLowerCase()) ||
    c.caseNumber.toLowerCase().includes(search.toLowerCase())
  );

  if (loading) return <Spinner />;

  return (
    <PageContainer>
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-bold text-text-primary">\u0421\u043f\u0440\u0430\u0432\u0438</h1>
        </div>

        {/* Search */}
        <div className="relative">
          <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="\u041f\u043e\u0448\u0443\u043a..."
            className="w-full pl-10 pr-4 py-2.5 bg-bg-card border border-border-default rounded-[14px] text-sm text-text-primary placeholder-text-muted focus:border-accent-teal focus:outline-none"
          />
        </div>

        {/* Filter chips */}
        <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1">
          {STATUSES.map(s => (
            <button
              key={s.value}
              onClick={() => setStatusFilter(s.value)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition ${
                statusFilter === s.value
                  ? 'bg-accent-teal text-bg-primary'
                  : 'bg-bg-card border border-border-default text-text-secondary'
              }`}
            >
              {s.label}
            </button>
          ))}
        </div>

        {/* List */}
        {filtered.length === 0 ? (
          <EmptyState icon={Briefcase} title="\u0421\u043f\u0440\u0430\u0432 \u043d\u0435 \u0437\u043d\u0430\u0439\u0434\u0435\u043d\u043e" />
        ) : (
          <div className="space-y-3">
            {filtered.map(c => (
              <CaseCard
                key={c.id}
                caseNumber={c.caseNumber}
                title={c.title}
                category={c.category}
                status={c.status}
                clientName={c.client?.user?.name}
                updatedAt={c.updatedAt}
                onClick={() => navigate(`/lawyer/cases/${c.id}`)}
              />
            ))}
          </div>
        )}
      </div>
    </PageContainer>
  );
}
