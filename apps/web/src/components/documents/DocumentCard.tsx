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
  DRAFT: '\u0427\u0435\u0440\u043d\u0435\u0442\u043a\u0430',
  PENDING_SIGNATURE: '\u041d\u0430 \u043f\u0456\u0434\u043f\u0438\u0441\u0456',
  READY: '\u0413\u043e\u0442\u043e\u0432\u0438\u0439',
  ARCHIVED: '\u0410\u0440\u0445\u0456\u0432',
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
