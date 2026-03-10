import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, FileText, MessageSquare, CheckSquare, Info } from 'lucide-react';
import { PageContainer } from '@/components/layout/PageContainer';
import { CaseProgress } from '@/components/case/CaseProgress';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Spinner } from '@/components/ui/Spinner';
import { SummaryRow } from '@/components/ui/SummaryRow';
import { api } from '@/lib/api';

interface CaseDetail {
  id: string;
  caseNumber: string;
  title: string;
  category: string;
  status: string;
  urgency: string;
  description?: string;
  courtName?: string;
  courtDate?: string;
  nextAction?: string;
  nextDate?: string;
  client?: { user: { name: string; email: string; phone?: string } };
  createdAt: string;
}

const TABS = [
  { id: 'info', label: 'Інфо', icon: Info },
  { id: 'docs', label: 'Документи', icon: FileText },
  { id: 'msgs', label: 'Чат', icon: MessageSquare },
  { id: 'checklist', label: 'Чекліст', icon: CheckSquare },
] as const;

const categoryLabels: Record<string, string> = {
  FAMILY: 'Сімейне', CIVIL: 'Цивільне', COMMERCIAL: 'Господарське',
  CRIMINAL: 'Кримінальне', MIGRATION: 'Міграційне', REALESTATE: 'Нерухомість',
  LABOR: 'Трудове', OTHER: 'Інше',
};

export function CaseDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [caseData, setCaseData] = useState<CaseDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<string>('info');

  useEffect(() => {
    if (!id) return;
    (async () => {
      try {
        const res = await api.get<CaseDetail>(`/v1/cases/${id}`);
        setCaseData(res.data ?? null);
      } catch { /* ignore */ }
      finally { setLoading(false); }
    })();
  }, [id]);

  if (loading) return <Spinner />;
  if (!caseData) return <PageContainer><p className="text-center text-navy-500">Справу не знайдено</p></PageContainer>;

  return (
    <PageContainer>
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate('/lawyer/cases')} className="p-2 rounded-lg hover:bg-navy-100 transition">
            <ArrowLeft size={20} className="text-navy-600" />
          </button>
          <div className="flex-1">
            <h1 className="text-lg font-bold text-navy-900">{caseData.title}</h1>
            <p className="text-xs text-navy-400 font-mono">{caseData.caseNumber}</p>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 bg-navy-100 rounded-xl p-1">
          {TABS.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-medium transition ${
                activeTab === tab.id ? 'bg-white text-navy-900 shadow-sm' : 'text-navy-500 hover:text-navy-700'
              }`}
            >
              <tab.icon size={14} />
              {tab.label}
            </button>
          ))}
        </div>

        {activeTab === 'info' && (
          <div className="space-y-4">
            <Card>
              <h3 className="font-semibold text-navy-800 mb-3">Прогрес справи</h3>
              <CaseProgress currentStatus={caseData.status} />
            </Card>

            {caseData.nextAction && (
              <div className="bg-gold-50 border border-gold-200 rounded-xl p-4">
                <p className="text-xs text-gold-700 font-medium mb-1">Наступний крок</p>
                <p className="font-semibold text-navy-900 text-sm">{caseData.nextAction}</p>
                {caseData.nextDate && (
                  <p className="text-xs text-navy-500 mt-1">
                    {new Date(caseData.nextDate).toLocaleDateString('uk-UA')}
                  </p>
                )}
              </div>
            )}

            <Card>
              <h3 className="font-semibold text-navy-800 mb-3">Деталі справи</h3>
              <div className="space-y-2">
                <SummaryRow label="Категорія" value={categoryLabels[caseData.category] ?? caseData.category} />
                <SummaryRow label="Терміновість" value={caseData.urgency} />
                {caseData.courtName && <SummaryRow label="Суд" value={caseData.courtName} />}
                {caseData.courtDate && <SummaryRow label="Дата суду" value={new Date(caseData.courtDate).toLocaleDateString('uk-UA')} />}
                <SummaryRow label="Створено" value={new Date(caseData.createdAt).toLocaleDateString('uk-UA')} />
              </div>
            </Card>

            {caseData.client && (
              <Card>
                <h3 className="font-semibold text-navy-800 mb-3">Клієнт</h3>
                <div className="space-y-2">
                  <SummaryRow label="Ім'я" value={caseData.client.user.name} />
                  <SummaryRow label="Email" value={caseData.client.user.email} />
                  {caseData.client.user.phone && <SummaryRow label="Телефон" value={caseData.client.user.phone} />}
                </div>
              </Card>
            )}

            {caseData.description && (
              <Card>
                <h3 className="font-semibold text-navy-800 mb-2">Опис</h3>
                <p className="text-sm text-navy-600">{caseData.description}</p>
              </Card>
            )}
          </div>
        )}

        {activeTab === 'docs' && (
          <Card>
            <p className="text-sm text-navy-500 text-center py-8">Документи завантажуються з сервера...</p>
          </Card>
        )}

        {activeTab === 'msgs' && (
          <Card>
            <p className="text-sm text-navy-500 text-center py-8">Повідомлення завантажуються...</p>
          </Card>
        )}

        {activeTab === 'checklist' && (
          <Card>
            <p className="text-sm text-navy-500 text-center py-8">Чекліст завантажується...</p>
          </Card>
        )}
      </div>
    </PageContainer>
  );
}
