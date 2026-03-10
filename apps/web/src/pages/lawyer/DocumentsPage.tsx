import { useState, useEffect } from 'react';
import { FileText, Sparkles, ArrowLeft } from 'lucide-react';
import { PageContainer } from '@/components/layout/PageContainer';
import { DocumentCard } from '@/components/documents/DocumentCard';
import { TemplateCard } from '@/components/documents/TemplateCard';
import { DynamicForm } from '@/components/documents/DynamicForm';
import { DocumentPreview } from '@/components/documents/DocumentPreview';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import { Spinner } from '@/components/ui/Spinner';
import { api } from '@/lib/api';
import { TEMPLATES, type DocumentTemplate } from '@jurbot/shared';

interface DocItem {
  id: string;
  name: string;
  status: string;
  createdAt: string;
  size?: string;
}

type View = 'list' | 'templates' | 'form' | 'generating' | 'preview';

export function LawyerDocumentsPage() {
  const [view, setView] = useState<View>('list');
  const [docs, setDocs] = useState<DocItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTemplate, setSelectedTemplate] = useState<DocumentTemplate | null>(null);
  const [formValues, setFormValues] = useState<Record<string, string>>({});
  const [preview, setPreview] = useState('');

  useEffect(() => {
    (async () => {
      try {
        const res = await api.get<DocItem[]>('/v1/documents');
        setDocs(res.data ?? []);
      } catch { setDocs([]); }
      finally { setLoading(false); }
    })();
  }, []);

  const handleSelectTemplate = (t: DocumentTemplate) => {
    setSelectedTemplate(t);
    setFormValues({});
    setView('form');
  };

  const handleGenerate = async () => {
    if (!selectedTemplate) return;
    setView('generating');
    try {
      const res = await api.post<{ content: string }>('/v1/documents/generate', {
        templateId: selectedTemplate.id,
        data: formValues,
      });
      setPreview(res.data?.content ?? 'Документ згенеровано');
      setView('preview');
    } catch {
      setPreview('Помилка генерації документа. Спробуйте ще раз.');
      setView('preview');
    }
  };

  if (view === 'templates') {
    return (
      <PageContainer>
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <button onClick={() => setView('list')} className="p-2 rounded-lg hover:bg-navy-100">
              <ArrowLeft size={20} className="text-navy-600" />
            </button>
            <h1 className="text-xl font-bold text-navy-900">Шаблони документів</h1>
          </div>
          <div className="grid grid-cols-2 gap-3">
            {TEMPLATES.map(t => (
              <TemplateCard key={t.id} template={t} onClick={() => handleSelectTemplate(t)} />
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
            <button onClick={() => setView('templates')} className="p-2 rounded-lg hover:bg-navy-100">
              <ArrowLeft size={20} className="text-navy-600" />
            </button>
            <div>
              <h1 className="text-lg font-bold text-navy-900">{selectedTemplate.name}</h1>
              <p className="text-xs text-navy-400">{selectedTemplate.description}</p>
            </div>
          </div>
          <DynamicForm
            template={selectedTemplate}
            values={formValues}
            onChange={(field, value) => setFormValues(prev => ({ ...prev, [field]: value }))}
          />
          <Button onClick={handleGenerate} className="w-full" size="lg">
            <Sparkles size={18} /> Згенерувати документ
          </Button>
        </div>
      </PageContainer>
    );
  }

  if (view === 'generating') {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <Spinner text="AI генерує документ..." subtext="Аналіз даних та формування тексту" />
      </div>
    );
  }

  if (view === 'preview') {
    return (
      <PageContainer>
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <button onClick={() => setView('list')} className="p-2 rounded-lg hover:bg-navy-100">
              <ArrowLeft size={20} className="text-navy-600" />
            </button>
            <h1 className="text-lg font-bold text-navy-900">{selectedTemplate?.name ?? 'Документ'}</h1>
          </div>
          <DocumentPreview content={preview} />
          <div className="flex gap-3">
            <Button variant="secondary" className="flex-1" onClick={() => setView('form')}>Редагувати</Button>
            <Button className="flex-1" onClick={() => setView('list')}>Зберегти</Button>
          </div>
        </div>
      </PageContainer>
    );
  }

  // Default: list view
  return (
    <PageContainer>
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-navy-900">Документи</h1>
          <Button size="sm" onClick={() => setView('templates')}>
            <Sparkles size={14} /> Створити
          </Button>
        </div>

        {loading ? (
          <Spinner />
        ) : docs.length === 0 ? (
          <EmptyState
            icon={FileText}
            title="Документів немає"
            description="Створіть документ з шаблону"
            actionLabel="Обрати шаблон"
            onAction={() => setView('templates')}
          />
        ) : (
          <div className="space-y-3">
            {docs.map(d => (
              <DocumentCard
                key={d.id}
                name={d.name}
                status={d.status}
                date={d.createdAt}
                size={d.size}
              />
            ))}
          </div>
        )}
      </div>
    </PageContainer>
  );
}
