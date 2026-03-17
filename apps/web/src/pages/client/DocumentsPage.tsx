import { useState, useEffect, useRef } from 'react';
import { Camera, FileImage, FileText, FileUp, FolderOpen, Images, X } from 'lucide-react';
import { api } from '@/lib/api';
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
  const [showSourcePicker, setShowSourcePicker] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  const fetchDocs = async () => {
    try {
      const res = await api.get<DocItem[]>('/v1/documents');
      setDocs(res.data ?? []);
    } catch (error) {
      console.error('[ClientDocumentsPage] Failed to fetch docs', error);
    }
  };

  useEffect(() => {
    (async () => {
      await fetchDocs();
      setLoading(false);
    })();
  }, []);

  const handleFileSelected = (file: File | null) => {
    setSelectedFile(file);
    setShowSourcePicker(false);
  };

  const handleUpload = async () => {
    if (!selectedFile) {
      showToast('Оберіть файл для завантаження');
      return;
    }

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', selectedFile);

      await api.postForm('/v1/documents/upload', formData);

      showToast('Файл завантажено');
      setSelectedFile(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
      if (galleryInputRef.current) galleryInputRef.current.value = '';
      if (cameraInputRef.current) cameraInputRef.current.value = '';
      await fetchDocs();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Помилка при завантаженні файлу';
      showToast(message);
      console.error('[ClientDocumentsPage] Upload failed', err);
    }
    setUploading(false);
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
      console.error('[ClientDocumentsPage] Download failed', err);
    }
  };

  if (loading) return <Spinner />;

  return (
    <PageContainer>
      <div className="space-y-4">
        <h1 className="text-xl font-bold text-text-primary">Файли та документи</h1>

        <Card>
          <div className="space-y-3">
            <p className="text-sm font-medium text-text-secondary">Завантажити файл до справи</p>

            <input
              ref={fileInputRef}
              type="file"
              accept="*/*"
              onChange={(e) => handleFileSelected(e.target.files?.[0] ?? null)}
              className="hidden"
            />
            <input
              ref={galleryInputRef}
              type="file"
              accept="image/*"
              onChange={(e) => handleFileSelected(e.target.files?.[0] ?? null)}
              className="hidden"
            />
            <input
              ref={cameraInputRef}
              type="file"
              accept="image/*"
              capture="environment"
              onChange={(e) => handleFileSelected(e.target.files?.[0] ?? null)}
              className="hidden"
            />

            {selectedFile ? (
              <div className="flex items-center gap-3 rounded-[14px] border border-accent-teal/30 bg-accent-teal/5 px-4 py-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[10px] bg-accent-teal/15 text-accent-teal">
                  {selectedFile.type.startsWith('image/') ? <FileImage size={22} /> : <FileText size={22} />}
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
                  onClick={() => setShowSourcePicker((prev) => !prev)}
                  className="flex w-full items-center justify-center gap-2 rounded-[14px] border border-dashed border-border-light bg-bg-tertiary px-4 py-3.5 text-sm font-medium text-text-secondary transition hover:border-accent-teal/50 hover:text-accent-teal active:scale-[0.98]"
                >
                  <FileUp size={18} />
                  Завантажити файл
                </button>

                {showSourcePicker ? (
                  <div className="grid grid-cols-1 gap-2 rounded-[14px] border border-border-default bg-bg-tertiary/60 p-2">
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="flex w-full items-center justify-center gap-2 rounded-[12px] border border-border-default bg-bg-tertiary px-3 py-2.5 text-sm text-text-secondary hover:border-accent-teal/40"
                    >
                      <FolderOpen size={16} /> Файли
                    </button>
                    <button
                      type="button"
                      onClick={() => galleryInputRef.current?.click()}
                      className="flex w-full items-center justify-center gap-2 rounded-[12px] border border-border-default bg-bg-tertiary px-3 py-2.5 text-sm text-text-secondary hover:border-accent-teal/40"
                    >
                      <Images size={16} /> Галерея / Фото
                    </button>
                    <button
                      type="button"
                      onClick={() => cameraInputRef.current?.click()}
                      className="flex w-full items-center justify-center gap-2 rounded-[12px] border border-border-default bg-bg-tertiary px-3 py-2.5 text-sm text-accent-teal hover:border-accent-teal/40"
                    >
                      <Camera size={16} /> Камера / фото документа
                    </button>
                  </div>
                ) : null}

                <p className="text-xs text-text-muted">
                  Кнопка відкриває камеру пристрою для фото документа (не нативний сканер).
                </p>
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

        <Card>
          <h2 className="text-sm font-semibold text-text-primary mb-3">Документи по справі</h2>
          {docs.length === 0 ? (
            <EmptyState icon={FolderOpen} title="Файлів немає" description="Документи по вашій справі з'являться тут" />
          ) : (
            <div className="space-y-2">
              {docs.map((d) => (
                <DocumentCard
                  key={d.id}
                  name={d.name}
                  status={d.status}
                  date={d.createdAt}
                  size={d.size}
                  onDownload={() => {
                    void downloadDocument(d);
                  }}
                />
              ))}
            </div>
          )}
        </Card>
      </div>
    </PageContainer>
  );
}
