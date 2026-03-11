import { File, Download } from 'lucide-react';
import { Badge } from '@/components/ui/Badge';

interface DocumentCardProps {
  name: string;
  status: string;
  date: string;
  size?: string;
  onDownload?: () => void;
  onClick?: () => void;
}

const statusColors: Record<string, 'green' | 'yellow' | 'orange' | 'gray'> = {
  DRAFT: 'gray',
  PENDING_SIGNATURE: 'orange',
  READY: 'green',
  ARCHIVED: 'gray',
};

const statusLabels: Record<string, string> = {
  DRAFT: 'Чернетка',
  PENDING_SIGNATURE: 'На підписі',
  READY: 'Готовий',
  ARCHIVED: 'Архів',
};

export function DocumentCard({ name, status, date, size, onDownload, onClick }: DocumentCardProps) {
  return (
    <div
      className="bg-bg-card rounded-[14px] border border-border-default p-4 flex items-center gap-3 cursor-pointer active:scale-[0.98] transition"
      onClick={onClick}
    >
      <div className="w-10 h-10 bg-accent-red/15 rounded-[10px] flex items-center justify-center shrink-0">
        <File size={20} className="text-accent-red" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-text-primary truncate">{name}</p>
        <div className="flex items-center gap-2 mt-0.5">
          <span className="text-xs text-text-muted">{new Date(date).toLocaleDateString('uk-UA')}</span>
          {size && <span className="text-xs text-text-muted">{size}</span>}
          <Badge color={statusColors[status] ?? 'gray'}>{statusLabels[status] ?? status}</Badge>
        </div>
      </div>
      {onDownload && (
        <button
          onClick={e => { e.stopPropagation(); onDownload(); }}
          className="text-text-muted hover:text-accent-teal transition p-1"
        >
          <Download size={18} />
        </button>
      )}
    </div>
  );
}
