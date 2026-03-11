import { ChevronRight } from 'lucide-react';
import { Badge } from '@/components/ui/Badge';
import { Card } from '@/components/ui/Card';

interface CaseCardProps {
  caseNumber: string;
  title: string;
  category: string;
  status: string;
  clientName?: string;
  updatedAt: string;
  onClick?: () => void;
}

const statusColors: Record<string, 'green' | 'yellow' | 'blue' | 'orange' | 'gray' | 'purple'> = {
  INTAKE: 'blue',
  ANALYSIS: 'yellow',
  PREPARATION: 'orange',
  FILED: 'purple',
  AWAITING: 'yellow',
  COMPLETED: 'green',
};

const statusLabels: Record<string, string> = {
  INTAKE: '\u041f\u0440\u0438\u0439\u043e\u043c',
  ANALYSIS: '\u0410\u043d\u0430\u043b\u0456\u0437',
  PREPARATION: '\u041f\u0456\u0434\u0433\u043e\u0442\u043e\u0432\u043a\u0430',
  FILED: '\u041f\u043e\u0434\u0430\u043d\u043e',
  AWAITING: '\u041e\u0447\u0456\u043a\u0443\u0432\u0430\u043d\u043d\u044f',
  COMPLETED: '\u0417\u0430\u0432\u0435\u0440\u0448\u0435\u043d\u043e',
};

const categoryLabels: Record<string, string> = {
  FAMILY: '\u0421\u0456\u043c\u0435\u0439\u043d\u0435',
  CIVIL: '\u0426\u0438\u0432\u0456\u043b\u044c\u043d\u0435',
  COMMERCIAL: '\u0413\u043e\u0441\u043f\u043e\u0434\u0430\u0440\u0441\u044c\u043a\u0435',
  CRIMINAL: '\u041a\u0440\u0438\u043c\u0456\u043d\u0430\u043b\u044c\u043d\u0435',
  MIGRATION: '\u041c\u0456\u0433\u0440\u0430\u0446\u0456\u0439\u043d\u0435',
  REALESTATE: '\u041d\u0435\u0440\u0443\u0445\u043e\u043c\u0456\u0441\u0442\u044c',
  LABOR: '\u0422\u0440\u0443\u0434\u043e\u0432\u0435',
  OTHER: '\u0406\u043d\u0448\u0435',
};

export function CaseCard({ caseNumber, title, category, status, clientName, updatedAt, onClick }: CaseCardProps) {
  return (
    <Card className="cursor-pointer active:scale-[0.98] transition" onClick={onClick}>
      <div className="flex items-start justify-between mb-2">
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-text-primary text-sm truncate">{title}</p>
          <p className="text-xs text-text-muted font-mono mt-0.5">{caseNumber}</p>
        </div>
        <Badge color={statusColors[status] ?? 'gray'}>{statusLabels[status] ?? status}</Badge>
      </div>
      <div className="flex items-center justify-between mt-2">
        <div className="flex items-center gap-2 text-xs text-text-muted">
          <span>{categoryLabels[category] ?? category}</span>
          {clientName && <><span>|</span><span>{clientName}</span></>}
          <span>|</span>
          <span>{new Date(updatedAt).toLocaleDateString('uk-UA')}</span>
        </div>
        <ChevronRight size={16} className="text-text-muted" />
      </div>
    </Card>
  );
}
