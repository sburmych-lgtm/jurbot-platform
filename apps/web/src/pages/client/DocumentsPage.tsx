import { useState, useEffect, useRef } from 'react';
import { FileText, FileUp, FolderOpen, X } from 'lucide-react';
import { api } from '@/lib/api';
import { openGoogleDrive, pickFileFromDevice } from '@/lib/google-picker';
import { PageContainer } from '@/components/layout/PageContainer';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { DocumentCard } from '@/components/documents/DocumentCard';
import { EmptyState } from '@/components/ui/EmptyState';
import { Spinner } from '@/components/ui/Spinner';
import { useToast } from '@/components/ui/Toast';

interface DocItem {
  id: string;
  name: string;
  status: string;
  createdAt: string;
  size?: string;
}

export function ClientDocumentsPage() {
  const { showToast } = useToast();
  const [docs, setDocs] = useState<DocItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchDocs = async () => {
    try {
      const res = await api.get<DocItem[]>('/v1/documents');
      setDocs(res.data ?? []);
    } catch {
      // ignore
    }
  };

  useEffect(() => {
    (async () => {
      await fetchDocs();
      setLoading(false);
    })();
  }, []);

  const handleUpload = async () => {
    if (!selectedFile) {
      showToast('Оберіть файл для завантаження');
      return;
    }

    setUploading(true);
    try {
      await api.post('/v1/documents/upload', { name: selectedFile.name });

      showToast('Файл завантажено');
      setSelectedFile(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
      await fetchDocs();
    } catch {
      showToast('Помилка при завантаженні файлу');
    }
    setUploading(false);
  };

  const handlePickFromDrive = () => {
    openGoogleDrive();
    showToast('Google Drive відкрито. Завантажте файл, потім оберіть його з пристрою.');
  };

  if (loading) return <Spinner />;

  return (
    <PageContainer>
      <div className="space-y-4">
        <h1 className="text-xl font-bold text-text-primary">Файли та документи</h1>

        {/* Upload section */}
        <Card>
          <div className="space-y-3">
            <p className="text-sm font-medium text-text-secondary">Завантажити файл до справи</p>

            <input
              ref={fileInputRef}
              type="file"
              accept="*/*"
              onChange={(e) => setSelectedFile(e.target.files?.[0] ?? null)}
              className="hidden"
            />

            {selectedFile ? (
              <div className="flex items-center gap-3 rounded-[14px] border border-accent-teal/30 bg-accent-teal/5 px-4 py-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[10px] bg-accent-teal/15 text-accent-teal">
                  <FileText size={22} />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-text-primary truncate">{selectedFile.name}</p>
                  <p className="text-xs text-text-muted">{(selectedFile.size / 1024).toFixed(1)} KB</p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setSelectedFile(null);
                    if (fileInputRef.current) fileInputRef.current.value = '';
                  }}
                  className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white/10 text-text-secondary hover:bg-accent-red/20 hover:text-accent-red transition"
                  aria-label="Видалити файл"
                >
                  <X size={16} />
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-2">
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="flex w-full items-center justify-center gap-2 rounded-[14px] border border-dashed border-border-light bg-bg-tertiary px-4 py-3.5 text-sm font-medium text-text-secondary transition hover:border-accent-teal/50 hover:text-accent-teal active:scale-[0.98]"
                >
                  <FileUp size={18} />
                  Обрати файл з пристрою
                </button>

                <button
                  type="button"
                  onClick={handlePickFromDrive}
                  className="flex w-full items-center justify-center gap-2 rounded-[14px] border border-border-default bg-bg-tertiary px-4 py-3 text-sm font-medium text-accent-teal transition hover:border-accent-teal/40 hover:bg-accent-teal/5 active:scale-[0.98]"
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" className="shrink-0">
                    <path d="M4.433 22l-2.165-3.75L8.598 7.5h4.33L6.6 18.25z" fill="#0066DA"/>
                    <path d="M14.17 22H9.84l3.03-5.25h8.66l-2.17 3.75z" fill="#00AC47"/>
                    <path d="M7.268 7.5L5.1 3.75h8.66L15.93 7.5z" fill="#EA4335"/>
                    <path d="M19.365 16.75h-8.66l2.17-3.75 4.33-7.5 2.165 3.75z" fill="#00832D"/>
                    <path d="M15.928 7.5h-4.33l2.17 3.75z" fill="#2684FC"/>
                    <path d="M8.598 7.5l-1.33 2.31L5.1 3.75h4.33z" fill="#FFBA00"/>
                  </svg>
                  Відкрити Google Drive
                </button>
              </div>
            )}

            <Button
              size="lg"
              className="w-full"
              loading={uploading}
              disabled={!selectedFile}
              onClick={handleUpload}
            >
              <FileUp size={18} /> Завантажити
            </Button>
          </div>
        </Card>

        {/* Documents list */}
        <Card>
          <h2 className="text-sm font-semibold text-text-primary mb-3">Документи по справі</h2>
          {docs.length === 0 ? (
            <EmptyState icon={FolderOpen} title="Файлів немає" description="Документи по вашій справі з'являться тут" />
          ) : (
            <div className="space-y-2">
              {docs.map(d => (
                <DocumentCard key={d.id} name={d.name} status={d.status} date={d.createdAt} size={d.size} />
              ))}
            </div>
          )}
        </Card>
      </div>
    </PageContainer>
  );
}
