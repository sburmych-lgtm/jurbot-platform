import { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, FileUp, Plus, Sparkles } from 'lucide-react';
import { TEMPLATES, type DocumentTemplate } from '@jurbot/shared';
import { api } from '@/lib/api';
import { PageContainer } from '@/components/layout/PageContainer';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { DocumentCard } from '@/components/documents/DocumentCard';
import { DynamicForm } from '@/components/documents/DynamicForm';
import { DocumentPreview } from '@/components/documents/DocumentPreview';
import { EmptyState } from '@/components/ui/EmptyState';
import { Spinner } from '@/components/ui/Spinner';
import { useToast } from '@/components/ui/Toast';

type ViewState =
  | 'home'
  | 'aiTemplates'
  | 'aiForm'
  | 'upload'
  | 'customFill'
  | 'preview';

interface DocItem {
  id: string;
  name: string;
  type: string;
  status: string;
  createdAt: string;
}

interface CustomTemplate {
  id: string;
  name: string;
  fileName: string;
  content: string;
  fields: string[];
  source: 'LOCAL' | 'AI';
  createdAt: string;
}

const CUSTOM_TEMPLATES_KEY = 'jurbot_custom_templates_v1';

function extractFields(content: string): string[] {
  const result = new Set<string>();
  const regexp = /{{\s*([A-Za-z0-9_\u0400-\u04FF]+)\s*}}/g;
  let match = regexp.exec(content);
  while (match) {
    const value = match[1];
    if (value) {
      result.add(value);
    }
    match = regexp.exec(content);
  }
  return [...result];
}

function applyFieldValues(content: string, values: Record<string, string>): string {
  return content.replace(/{{\s*([A-Za-z0-9_\u0400-\u04FF]+)\s*}}/g, (_raw, field) => {
    const key = String(field);
    return values[key] ?? '';
  });
}

function loadCustomTemplates(): CustomTemplate[] {
  try {
    const raw = localStorage.getItem(CUSTOM_TEMPLATES_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as CustomTemplate[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function saveCustomTemplates(items: CustomTemplate[]): void {
  localStorage.setItem(CUSTOM_TEMPLATES_KEY, JSON.stringify(items));
}

export function LawyerDocumentsPage() {
  const { showToast } = useToast();

  const [view, setView] = useState<ViewState>('home');
  const [docs, setDocs] = useState<DocItem[]>([]);
  const [customTemplates, setCustomTemplates] = useState<CustomTemplate[]>([]);
  const [loading, setLoading] = useState(true);

  const [selectedAiTemplate, setSelectedAiTemplate] = useState<DocumentTemplate | null>(null);
  const [selectedCustomTemplate, setSelectedCustomTemplate] =
    useState<CustomTemplate | null>(null);
  const [formValues, setFormValues] = useState<Record<string, string>>({});
  const [preview, setPreview] = useState('');
  const [previewTitle, setPreviewTitle] = useState('');
  const [previewSource, setPreviewSource] = useState<'AI' | 'LOCAL'>('AI');

  const [uploadName, setUploadName] = useState('');
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [generating, setGenerating] = useState(false);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const res = await api.get<DocItem[]>('/v1/documents');
        setDocs(res.data ?? []);
      } catch {
        // ignore
      }

      setCustomTemplates(loadCustomTemplates());
      setLoading(false);
    })();
  }, []);

  const aiTemplates = TEMPLATES;
  const hasCustomTemplates = customTemplates.length > 0;

  const sortedCustomTemplates = useMemo(
    () =>
      [...customTemplates].sort(
        (left, right) =>
          new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime(),
      ),
    [customTemplates],
  );

  const resetBuilderState = () => {
    setSelectedAiTemplate(null);
    setSelectedCustomTemplate(null);
    setFormValues({});
    setPreview('');
    setPreviewTitle('');
  };

  const openAiTemplate = (template: DocumentTemplate) => {
    setSelectedAiTemplate(template);
    setSelectedCustomTemplate(null);
    setFormValues({});
    setView('aiForm');
  };

  const openCustomTemplate = (template: CustomTemplate) => {
    setSelectedCustomTemplate(template);
    setSelectedAiTemplate(null);
    const initialValues = template.fields.reduce<Record<string, string>>((acc, key) => {
      acc[key] = '';
      return acc;
    }, {});
    setFormValues(initialValues);
    setView('customFill');
  };

  const generateAiDocument = async () => {
    if (!selectedAiTemplate) return;

    setGenerating(true);
    try {
      const res = await api.post<{ content: string }>('/v1/documents/generate', {
        templateId: selectedAiTemplate.id,
        data: formValues,
      });
      setPreview(res.data?.content ?? '');
      setPreviewTitle(`${selectedAiTemplate.name}.doc`);
      setPreviewSource('AI');
      setView('preview');
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Не вдалося згенерувати документ';
      showToast(message);
    }
    setGenerating(false);
  };

  const generateFromCustomTemplate = () => {
    if (!selectedCustomTemplate) return;

    const content = applyFieldValues(selectedCustomTemplate.content, formValues);
    setPreview(content);
    setPreviewTitle(`${selectedCustomTemplate.name}.doc`);
    setPreviewSource('LOCAL');
    setView('preview');
  };

  const savePreviewAsTemplate = () => {
    const name = previewTitle.replace(/\.doc$/i, '').trim() || 'Шаблон';
    const template: CustomTemplate = {
      id: crypto.randomUUID(),
      name,
      fileName: `${name}.doc`,
      content: preview,
      fields: extractFields(preview),
      source: previewSource,
      createdAt: new Date().toISOString(),
    };

    const next = [template, ...customTemplates];
    setCustomTemplates(next);
    saveCustomTemplates(next);
    showToast('Документ збережено у "Мої шаблони"');
  };

  const handleUploadTemplate = async () => {
    if (!uploadName.trim()) {
      showToast('Вкажіть назву шаблону');
      return;
    }
    if (!uploadFile) {
      showToast('Оберіть файл шаблону');
      return;
    }

    setUploading(true);
    try {
      const content = await uploadFile.text();
      if (!content.trim()) {
        showToast('Файл порожній або не читається');
        setUploading(false);
        return;
      }

      const template: CustomTemplate = {
        id: crypto.randomUUID(),
        name: uploadName.trim(),
        fileName: uploadFile.name,
        content,
        fields: extractFields(content),
        source: 'LOCAL',
        createdAt: new Date().toISOString(),
      };

      const next = [template, ...customTemplates];
      setCustomTemplates(next);
      saveCustomTemplates(next);
      setUploadName('');
      setUploadFile(null);
      setView('home');
      showToast('Шаблон завантажено у "Мої шаблони"');
    } catch {
      showToast('Не вдалося обробити файл');
    }
    setUploading(false);
  };

  if (loading) {
    return <Spinner />;
  }

  if (view === 'aiTemplates') {
    return (
      <PageContainer>
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <button onClick={() => setView('home')} className="p-1.5 rounded-[10px] hover:bg-bg-hover">
              <ArrowLeft size={20} className="text-text-secondary" />
            </button>
            <h1 className="text-xl font-bold text-text-primary">AI генерація документа</h1>
          </div>

          <div className="grid grid-cols-2 gap-3">
            {aiTemplates.map((template) => (
              <button
                key={template.id}
                onClick={() => openAiTemplate(template)}
                className="bg-bg-card rounded-[14px] p-4 text-left border border-border-default hover:border-accent-teal/50 transition active:scale-[0.98]"
              >
                <p className="text-sm font-semibold text-text-primary">{template.name}</p>
                <p className="text-xs text-text-muted mt-1">{template.description}</p>
              </button>
            ))}
          </div>
        </div>
      </PageContainer>
    );
  }

  if (view === 'aiForm' && selectedAiTemplate) {
    return (
      <PageContainer>
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <button
              onClick={() => {
                resetBuilderState();
                setView('aiTemplates');
              }}
              className="p-1.5 rounded-[10px] hover:bg-bg-hover"
            >
              <ArrowLeft size={20} className="text-text-secondary" />
            </button>
            <h1 className="text-xl font-bold text-text-primary">{selectedAiTemplate.name}</h1>
          </div>

          <DynamicForm
            template={selectedAiTemplate}
            values={formValues}
            onChange={(field, value) => setFormValues((prev) => ({ ...prev, [field]: value }))}
          />

          <Button size="lg" className="w-full" loading={generating} onClick={generateAiDocument}>
            <Sparkles size={18} /> Згенерувати
          </Button>
        </div>
      </PageContainer>
    );
  }

  if (view === 'upload') {
    return (
      <PageContainer>
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <button onClick={() => setView('home')} className="p-1.5 rounded-[10px] hover:bg-bg-hover">
              <ArrowLeft size={20} className="text-text-secondary" />
            </button>
            <h1 className="text-xl font-bold text-text-primary">Завантажити свій шаблон документа</h1>
          </div>

          <Card>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium text-text-secondary mb-1 block">
                  Назва шаблону
                </label>
                <input
                  value={uploadName}
                  onChange={(event) => setUploadName(event.target.value)}
                  placeholder="Наприклад: Договір про надання послуг"
                  className="w-full px-4 py-3 rounded-[14px] border border-border-default bg-bg-tertiary text-text-primary placeholder-text-muted focus:border-accent-teal focus:outline-none text-sm"
                />
              </div>

              <div>
                <label className="text-sm font-medium text-text-secondary mb-1 block">
                  Файл шаблону
                </label>
                <input
                  type="file"
                  accept=".txt,.md,.html,.doc,.docx"
                  onChange={(event) => setUploadFile(event.target.files?.[0] ?? null)}
                  className="w-full text-sm text-text-secondary"
                />
                <p className="text-xs text-text-muted mt-2">
                  Використовуйте плейсхолдери у форматі <code>{'{{ПІБ_Клієнта}}'}</code>,
                  <code>{'{{Дата}}'}</code> для автозаповнення.
                </p>
                <p className="text-xs text-text-muted mt-1">
                  Для Google Drive: відкрийте файл у Drive, завантажте на пристрій і оберіть тут.
                </p>
                <a
                  href="https://drive.google.com"
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex mt-2 text-sm text-accent-teal hover:text-accent-teal/80"
                >
                  Відкрити Google Drive
                </a>
              </div>

              <Button size="lg" className="w-full" loading={uploading} onClick={handleUploadTemplate}>
                <FileUp size={18} /> Додати шаблон
              </Button>
            </div>
          </Card>
        </div>
      </PageContainer>
    );
  }

  if (view === 'customFill' && selectedCustomTemplate) {
    return (
      <PageContainer>
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <button onClick={() => setView('home')} className="p-1.5 rounded-[10px] hover:bg-bg-hover">
              <ArrowLeft size={20} className="text-text-secondary" />
            </button>
            <h1 className="text-xl font-bold text-text-primary">{selectedCustomTemplate.name}</h1>
          </div>

          <Card>
            {selectedCustomTemplate.fields.length === 0 ? (
              <p className="text-sm text-text-muted">
                У шаблоні не знайдено плейсхолдерів. Додайте у текст конструкції виду{' '}
                <code>{'{{Поле}}'}</code>, щоб система показала поля для заповнення.
              </p>
            ) : (
              <div className="space-y-3">
                {selectedCustomTemplate.fields.map((field) => (
                  <div key={field}>
                    <label className="text-sm font-medium text-text-secondary mb-1 block">
                      {field}
                    </label>
                    <input
                      value={formValues[field] ?? ''}
                      onChange={(event) =>
                        setFormValues((prev) => ({ ...prev, [field]: event.target.value }))
                      }
                      className="w-full px-4 py-3 rounded-[14px] border border-border-default bg-bg-tertiary text-text-primary placeholder-text-muted focus:border-accent-teal focus:outline-none text-sm"
                    />
                  </div>
                ))}
              </div>
            )}
          </Card>

          <Button size="lg" className="w-full" onClick={generateFromCustomTemplate}>
            Сформувати документ
          </Button>
        </div>
      </PageContainer>
    );
  }

  if (view === 'preview') {
    return (
      <PageContainer>
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <button onClick={() => setView('home')} className="p-1.5 rounded-[10px] hover:bg-bg-hover">
              <ArrowLeft size={20} className="text-text-secondary" />
            </button>
            <h1 className="text-xl font-bold text-text-primary">Перегляд документа</h1>
          </div>

          <DocumentPreview content={preview} />

          <div className="grid grid-cols-1 gap-2">
            <Button size="lg" className="w-full" onClick={savePreviewAsTemplate}>
              Зберегти у "Мої шаблони"
            </Button>
            <Button size="lg" variant="secondary" className="w-full" onClick={() => setView('home')}>
              Назад
            </Button>
          </div>
        </div>
      </PageContainer>
    );
  }

  return (
    <PageContainer>
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-bold text-text-primary">Генерація документів</h1>
        </div>

        <div className="grid grid-cols-1 gap-3">
          <Button size="lg" className="w-full" onClick={() => setView('aiTemplates')}>
            <Sparkles size={18} /> AI генерація документа
          </Button>
          <Button size="lg" variant="secondary" className="w-full" onClick={() => setView('upload')}>
            <FileUp size={18} /> Завантажити свій шаблон документа
          </Button>
        </div>

        <Card>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-semibold text-text-primary">Мої шаблони</h2>
            <button
              type="button"
              onClick={() => setView('upload')}
              className="text-sm text-accent-teal hover:text-accent-teal/80 flex items-center gap-1"
            >
              <Plus size={14} />
              Додати
            </button>
          </div>

          {!hasCustomTemplates ? (
            <p className="text-sm text-text-muted">
              Поки що немає шаблонів. Завантажте свій шаблон або збережіть AI-результат.
            </p>
          ) : (
            <div className="space-y-2">
              {sortedCustomTemplates.map((template) => (
                <DocumentCard
                  key={template.id}
                  name={template.name}
                  status="DRAFT"
                  date={template.createdAt}
                  size={template.source === 'AI' ? 'AI' : template.fileName}
                  onClick={() => openCustomTemplate(template)}
                />
              ))}
            </div>
          )}
        </Card>

        <Card>
          <h2 className="text-lg font-semibold text-text-primary mb-3">Згенеровані документи</h2>
          {docs.length === 0 ? (
            <EmptyState
              icon={Sparkles}
              title="Документів поки немає"
              description="Створіть документ через AI генерацію або з шаблону."
            />
          ) : (
            <div className="space-y-2">
              {docs.map((doc) => (
                <DocumentCard
                  key={doc.id}
                  name={doc.name}
                  status={doc.status}
                  date={doc.createdAt}
                />
              ))}
            </div>
          )}
        </Card>
      </div>
    </PageContainer>
  );
}
