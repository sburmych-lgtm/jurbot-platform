import { useState, useEffect } from 'react';
import { FolderOpen } from 'lucide-react';
import { api } from '@/lib/api';
import { PageContainer } from '@/components/layout/PageContainer';
import { DocumentCard } from '@/components/documents/DocumentCard';
import { EmptyState } from '@/components/ui/EmptyState';
import { Spinner } from '@/components/ui/Spinner';

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

  useEffect(() => {
    (async () => {
      try {
        const res = await api.get<DocItem[]>('/v1/documents');
        setDocs(res.data ?? []);
      } catch {}
      setLoading(false);
    })();
  }, []);

  if (loading) return <Spinner />;

  return (
    <PageContainer>
      <div className="space-y-4">
        <h1 className="text-xl font-bold text-text-primary">Файли</h1>
        {docs.length === 0 ? (
          <EmptyState icon={FolderOpen} title="Файлів немає" description="Документи по вашій справі з'являться тут" />
        ) : (
          <div className="space-y-3">
            {docs.map(d => (
              <DocumentCard key={d.id} name={d.name} status={d.status} date={d.createdAt} size={d.size} />
            ))}
          </div>
        )}
      </div>
    </PageContainer>
  );
}
