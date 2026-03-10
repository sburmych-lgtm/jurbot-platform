import { useState, useEffect } from 'react';
import { FileText, Upload } from 'lucide-react';
import { PageContainer } from '@/components/layout/PageContainer';
import { DocumentCard } from '@/components/documents/DocumentCard';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import { Spinner } from '@/components/ui/Spinner';
import { useToast } from '@/components/ui/Toast';
import { api } from '@/lib/api';

interface DocItem {
  id: string;
  name: string;
  status: string;
  createdAt: string;
  size?: string;
}

export function ClientDocumentsPage() {
  const [docs, setDocs] = useState<DocItem[]>([]);
  const [loading, setLoading] = useState(true);
  const { showToast } = useToast();

  useEffect(() => {
    (async () => {
      try {
        const res = await api.get<DocItem[]>('/v1/documents');
        setDocs(res.data ?? []);
      } catch { setDocs([]); }
      finally { setLoading(false); }
    })();
  }, []);

  return (
    <PageContainer>
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-navy-900">Документи</h1>
          <Button size="sm" onClick={() => showToast('Функція завантаження файлу')}>
            <Upload size={14} /> Завантажити
          </Button>
        </div>

        {loading ? (
          <Spinner />
        ) : docs.length === 0 ? (
          <EmptyState icon={FileText} title="Документів немає" description="Документи з'являться тут після їх створення юристом" />
        ) : (
          <div className="space-y-3">
            {docs.map(d => (
              <DocumentCard
                key={d.id}
                name={d.name}
                status={d.status}
                date={d.createdAt}
                size={d.size}
                onDownload={() => showToast('Завантаження...')}
              />
            ))}
          </div>
        )}
      </div>
    </PageContainer>
  );
}
