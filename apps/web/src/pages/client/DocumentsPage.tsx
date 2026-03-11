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
        <h1 className="text-xl font-bold text-text-primary">\u0424\u0430\u0439\u043b\u0438</h1>
        {docs.length === 0 ? (
          <EmptyState icon={FolderOpen} title="\u0424\u0430\u0439\u043b\u0456\u0432 \u043d\u0435\u043c\u0430\u0454" description="\u0414\u043e\u043a\u0443\u043c\u0435\u043d\u0442\u0438 \u043f\u043e \u0432\u0430\u0448\u0456\u0439 \u0441\u043f\u0440\u0430\u0432\u0456 \u0437'\u044f\u0432\u043b\u044f\u0442\u044c\u0441\u044f \u0442\u0443\u0442" />
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
