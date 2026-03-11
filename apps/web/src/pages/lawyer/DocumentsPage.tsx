import { useState, useEffect } from 'react';
import { FileText, Sparkles, ArrowLeft } from 'lucide-react';
import { api } from '@/lib/api';
import { PageContainer } from '@/components/layout/PageContainer';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { DocumentCard } from '@/components/documents/DocumentCard';
import { TemplateCard } from '@/components/documents/TemplateCard';
import { DynamicForm } from '@/components/documents/DynamicForm';
import { DocumentPreview } from '@/components/documents/DocumentPreview';
import { EmptyState } from '@/components/ui/EmptyState';
import { Spinner } from '@/components/ui/Spinner';
import type { DocumentTemplate } from '@jurbot/shared';

type ViewState = 'list' | 'templates' | 'form' | 'generating' | 'preview';

interface DocItem {
  id: string;
  name: string;
  type: string;
  status: string;
  createdAt: string;
}

export function LawyerDocumentsPage() {
  const [view, setView] = useState<ViewState>('list');
  const [docs, setDocs] = useState<DocItem[]>([]);
  const [templates, setTemplates] = useState<DocumentTemplate[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<DocumentTemplate | null>(null);
  const [formValues, setFormValues] = useState<Record<string, string>>({});
  const [preview, setPreview] = useState('');
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

  const loadTemplates = async () => {
    try {
      const res = await api.get<DocumentTemplate[]>('/v1/documents/templates');
      setTemplates(res.data ?? []);
    } catch {}
    setView('templates');
  };

  const selectTemplate = (t: DocumentTemplate) => {
    setSelectedTemplate(t);
    setFormValues({});
    setView('form');
  };

  const generate = async () => {
    if (!selectedTemplate) return;
    setView('generating');
    try {
      const res = await api.post<{ content: string }>('/v1/documents/generate', {
        templateId: selectedTemplate.id,
        data: formValues,
      });
      setPreview(res.data?.content ?? '');
      setView('preview');
    } catch {
      setView('form');
    }
  };

  if (loading) return <Spinner />;

  if (view === 'templates') {
    return (
      <PageContainer>
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <button onClick={() => setView('list')} className="p-1.5 rounded-[10px] hover:bg-bg-hover">
              <ArrowLeft size={20} className="text-text-secondary" />
            </button>
            <h1 className="text-xl font-bold text-text-primary">Шаблони</h1>
          </div>
          <div className="grid grid-cols-2 gap-3">
            {templates.map(t => (
              <TemplateCard key={t.id} template={t} onClick={() => selectTemplate(t)} />
            ))}
          </div>
        </div>
      </PageContainer>
    );
  }

  if (view === 'form' && selectedTemplate) {
    return (
      <PageContainer>
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <button onClick={() => setView('templates')} className="p-1.5 rounded-[10px] hover:bg-bg-hover">
              <ArrowLeft size={20} className="text-text-secondary" />
            </button>
            <h1 className="text-xl font-bold text-text-primary">{selectedTemplate.name}</h1>
          </div>
          <DynamicForm template={selectedTemplate} values={formValues} onChange={(f, v) => setFormValues(p => ({ ...p, [f]: v }))} />
          <Button size="lg" className="w-full" onClick={generate}>
            <Sparkles size={18} />
            Згенерувати
          </Button>
        </div>
      </PageContainer>
    );
  }

  if (view === 'generating') {
    return <Spinner text="Генерація документу..." subtext="AI працює" />;
  }

  if (view === 'preview') {
    return (
      <PageContainer>
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <button onClick={() => setView('list')} className="p-1.5 rounded-[10px] hover:bg-bg-hover">
              <ArrowLeft size={20} className="text-text-secondary" />
            </button>
            <h1 className="text-xl font-bold text-text-primary">Перегляд</h1>
          </div>
          <DocumentPreview content={preview} />
          <Button size="lg" className="w-full" onClick={() => setView('list')}>
            Зберегти
          </Button>
        </div>
      </PageContainer>
    );
  }

  return (
    <PageContainer>
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-bold text-text-primary">AI Документи</h1>
          <Button size="sm" onClick={loadTemplates}>
            <Sparkles size={16} />
            Створити
          </Button>
        </div>

        {docs.length === 0 ? (
          <EmptyState
            icon={FileText}
            title="Документів немає"
            description="Створіть перший AI-документ"
            actionLabel="Створити"
            onAction={loadTemplates}
          />
        ) : (
          <div className="space-y-3">
            {docs.map(d => (
              <DocumentCard key={d.id} name={d.name} status={d.status} date={d.createdAt} />
            ))}
          </div>
        )}
      </div>
    </PageContainer>
  );
}
