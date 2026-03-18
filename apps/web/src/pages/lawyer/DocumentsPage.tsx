import { useEffect, useMemo, useRef, useState } from 'react';
import { ArrowLeft, Camera, FileImage, FileText, FileUp, FolderOpen, Images, Plus, Sparkles, X } from 'lucide-react';
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
  size?: string;
}

interface CaseItem {
  id: string;
  title: string;
  caseNumber?: string;
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
  const [cases, setCases] = useState<CaseItem[]>([]);
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
  const [uploadingToCase, setUploadingToCase] = useState(false);
  const [uploadCaseId, setUploadCaseId] = useState('');
  const [uploadCaseFile, setUploadCaseFile] = useState<File | null>(null);
  const caseFileInputRef = useRef<HTMLInputElement>(null);
  const caseGalleryInputRef = useRef<HTMLInputElement>(null);
  const caseCameraInputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const [showTemplateSourcePicker, setShowTemplateSourcePicker] = useState(false);
  const [showCaseSourcePicker, setShowCaseSourcePicker] = useState(false);

  const fetchDocs = async () => {
    const res = await api.get<DocItem[]>('/v1/documents');
    setDocs(res.data ?? []);
  };

  useEffect(() => {
    (async () => {
      try {
        await Promise.all([
          fetchDocs(),
          api.get<CaseItem[]>('/v1/cases').then((res) => setCases(res.data ?? [])),
        ]);
      } catch (error) {
        console.error('[LawyerDocumentsPage] Initial fetch failed', error);
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

  const handleUploadToCase = async () => {
    if (!uploadCaseId) {
      showToast('Оберіть справу для завантаження');
      return;
    }
    if (!uploadCaseFile) {
      showToast('Оберіть файл');
      return;
    }

    setUploadingToCase(true);
    try {
      const formData = new FormData();
      formData.append('caseId', uploadCaseId);
      formData.append('file', uploadCaseFile);
      await api.postForm('/v1/documents/upload/lawyer', formData);

      showToast('Файл додано до справи');
      setUploadCaseFile(null);
      if (caseFileInputRef.current) caseFileInputRef.current.value = '';
      if (caseGalleryInputRef.current) caseGalleryInputRef.current.value = '';
      if (caseCameraInputRef.current) caseCameraInputRef.current.value = '';
      await fetchDocs();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Не вдалося завантажити файл';
      showToast(message);
      console.error('[LawyerDocumentsPage] Upload-to-case failed', err);
    }
    setUploadingToCase(false);
  };

  const downloadDocument = async (doc: DocItem) => {
    try {
      const blob = await api.download(`/v1/documents/${doc.id}/download`);
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = doc.name;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Не вдалося завантажити документ';
      showToast(message);
      console.error('[LawyerDocumentsPage] Download failed', err);
    }
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
                  className="w-full px-4 py-3 rounded-[14px] border border-border-default bg-bg-tertiary text-text-primary placeholder-text-muted focus:border-accent-teal focus:outline-none text-base"
                />
              </div>

              <div>
                <label className="text-sm font-medium text-text-secondary mb-2 block">
                  Файл шаблону
                </label>

                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".txt,.md,.html,.doc,.docx,application/pdf"
                  onChange={(event) => {
                    setUploadFile(event.target.files?.[0] ?? null);
                    setShowTemplateSourcePicker(false);
                  }}
                  className="hidden"
                />
                <input
                  ref={galleryInputRef}
                  type="file"
                  accept="image/*"
                  onChange={(event) => {
                    setUploadFile(event.target.files?.[0] ?? null);
                    setShowTemplateSourcePicker(false);
                  }}
                  className="hidden"
                />
                <input
                  ref={cameraInputRef}
                  type="file"
                  accept="image/*"
                  capture="environment"
                  onChange={(event) => {
                    setUploadFile(event.target.files?.[0] ?? null);
                    setShowTemplateSourcePicker(false);
                  }}
                  className="hidden"
                />

                {uploadFile ? (
                  <div className="flex items-center gap-3 rounded-[14px] border border-accent-teal/30 bg-accent-teal/5 px-4 py-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[10px] bg-accent-teal/15 text-accent-teal">
                      {uploadFile.type.startsWith('image/') ? <FileImage size={22} /> : <FileText size={22} />}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-text-primary truncate">{uploadFile.name}</p>
                      <p className="text-xs text-text-muted">
                        {(uploadFile.size / 1024).toFixed(1)} KB
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setUploadFile(null);
                        if (fileInputRef.current) fileInputRef.current.value = '';
                        if (galleryInputRef.current) galleryInputRef.current.value = '';
                        if (cameraInputRef.current) cameraInputRef.current.value = '';
                      }}
                      className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white/10 text-text-secondary hover:bg-accent-red/20 hover:text-accent-red transition"
                      aria-label="Видалити файл"
                    >
                      <X size={16} />
                    </button>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <button
                      type="button"
                      onClick={() => setShowTemplateSourcePicker((prev) => !prev)}
                      className="flex w-full items-center justify-center gap-2 rounded-[14px] border border-dashed border-border-light bg-bg-tertiary px-4 py-3.5 text-sm font-medium text-text-secondary transition hover:border-accent-teal/50 hover:text-accent-teal active:scale-[0.98]"
                    >
                      <FileUp size={18} />
                      Завантажити файл
                    </button>

                    {showTemplateSourcePicker ? (
                      <div className="grid grid-cols-1 gap-2 rounded-[14px] border border-border-default bg-bg-tertiary/60 p-2">
                        <button type="button" onClick={() => fileInputRef.current?.click()} className="flex w-full items-center justify-center gap-2 rounded-[12px] border border-border-default bg-bg-tertiary px-3 py-2.5 text-sm text-text-secondary hover:border-accent-teal/40"><FolderOpen size={16} /> Файли</button>
                        <button type="button" onClick={() => galleryInputRef.current?.click()} className="flex w-full items-center justify-center gap-2 rounded-[12px] border border-border-default bg-bg-tertiary px-3 py-2.5 text-sm text-text-secondary hover:border-accent-teal/40"><Images size={16} /> Галерея / Фото</button>
                        <button type="button" onClick={() => cameraInputRef.current?.click()} className="flex w-full items-center justify-center gap-2 rounded-[12px] border border-border-default bg-bg-tertiary px-3 py-2.5 text-sm text-accent-teal hover:border-accent-teal/40"><Camera size={16} /> Камера / фото документа</button>
                      </div>
                    ) : null}
                  </div>
                )}

                <p className="text-xs text-text-muted mt-2.5">
                  Використовуйте плейсхолдери у форматі <code className="text-accent-teal/70">{'{{ПІБ_Клієнта}}'}</code>,{' '}
                  <code className="text-accent-teal/70">{'{{Дата}}'}</code> для автозаповнення.
                </p>
                <p className="text-xs text-text-muted">
                  "Камера" відкриває камеру пристрою, а знімок завантажується у той самий пайплайн документа.
                </p>
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
                      className="w-full px-4 py-3 rounded-[14px] border border-border-default bg-bg-tertiary text-text-primary placeholder-text-muted focus:border-accent-teal focus:outline-none text-base"
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
                  size={doc.size}
                  onDownload={() => { void downloadDocument(doc); }}
                />
              ))}
            </div>
          )}
        </Card>

        <Card>
          <h2 className="text-lg font-semibold text-text-primary mb-3">Додати готовий файл у справу</h2>
          <div className="space-y-3">
            <select
              value={uploadCaseId}
              onChange={(event) => setUploadCaseId(event.target.value)}
              className="w-full px-4 py-3 rounded-[14px] border border-border-default bg-bg-tertiary text-text-primary focus:border-accent-teal focus:outline-none text-base"
            >
              <option value="">Оберіть справу</option>
              {cases.map((item) => (
                <option key={item.id} value={item.id}>
                  {(item.caseNumber ? `${item.caseNumber} — ` : '') + item.title}
                </option>
              ))}
            </select>

            <input
              ref={caseFileInputRef}
              type="file"
              accept="*/*"
              onChange={(event) => {
                setUploadCaseFile(event.target.files?.[0] ?? null);
                setShowCaseSourcePicker(false);
              }}
              className="hidden"
            />
            <input
              ref={caseGalleryInputRef}
              type="file"
              accept="image/*"
              onChange={(event) => {
                setUploadCaseFile(event.target.files?.[0] ?? null);
                setShowCaseSourcePicker(false);
              }}
              className="hidden"
            />
            <input
              ref={caseCameraInputRef}
              type="file"
              accept="image/*"
              capture="environment"
              onChange={(event) => {
                setUploadCaseFile(event.target.files?.[0] ?? null);
                setShowCaseSourcePicker(false);
              }}
              className="hidden"
            />

            {uploadCaseFile ? (
              <div className="flex items-center gap-3 rounded-[14px] border border-accent-teal/30 bg-accent-teal/5 px-4 py-3">
                {uploadCaseFile.type.startsWith('image/') ? <FileImage size={18} className="text-accent-teal" /> : <FileText size={18} className="text-accent-teal" />}
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-text-primary truncate">{uploadCaseFile.name}</p>
                  <p className="text-xs text-text-muted">{(uploadCaseFile.size / 1024).toFixed(1)} KB</p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setUploadCaseFile(null);
                    if (caseFileInputRef.current) caseFileInputRef.current.value = '';
                    if (caseGalleryInputRef.current) caseGalleryInputRef.current.value = '';
                    if (caseCameraInputRef.current) caseCameraInputRef.current.value = '';
                  }}
                  className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white/10 text-text-secondary hover:bg-accent-red/20 hover:text-accent-red transition"
                >
                  <X size={16} />
                </button>
              </div>
            ) : (
              <div className="space-y-2">
                <Button size="lg" variant="secondary" className="w-full" onClick={() => setShowCaseSourcePicker((prev) => !prev)}>
                  <FileUp size={18} /> Завантажити файл
                </Button>
                {showCaseSourcePicker ? (
                  <div className="grid grid-cols-1 gap-2 rounded-[14px] border border-border-default bg-bg-tertiary/60 p-2">
                    <button type="button" onClick={() => caseFileInputRef.current?.click()} className="flex w-full items-center justify-center gap-2 rounded-[12px] border border-border-default bg-bg-tertiary px-3 py-2.5 text-sm text-text-secondary hover:border-accent-teal/40"><FolderOpen size={16} /> Файли</button>
                    <button type="button" onClick={() => caseGalleryInputRef.current?.click()} className="flex w-full items-center justify-center gap-2 rounded-[12px] border border-border-default bg-bg-tertiary px-3 py-2.5 text-sm text-text-secondary hover:border-accent-teal/40"><Images size={16} /> Галерея / Фото</button>
                    <button type="button" onClick={() => caseCameraInputRef.current?.click()} className="flex w-full items-center justify-center gap-2 rounded-[12px] border border-border-default bg-bg-tertiary px-3 py-2.5 text-sm text-accent-teal hover:border-accent-teal/40"><Camera size={16} /> Камера / фото документа</button>
                  </div>
                ) : null}
              </div>
            )}

            <Button size="lg" className="w-full" loading={uploadingToCase} onClick={handleUploadToCase}>
              <FileUp size={18} /> Додати у справу
            </Button>
          </div>
        </Card>
      </div>
    </PageContainer>
  );
}
