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
  INTAKE: 'Прийом',
  ANALYSIS: 'Аналіз',
  PREPARATION: 'Підготовка',
  FILED: 'Подано',
  AWAITING: 'Очікування',
  COMPLETED: 'Завершено',
};

const categoryLabels: Record<string, string> = {
  FAMILY: 'Сімейне',
  CIVIL: 'Цивільне',
  COMMERCIAL: 'Господарське',
  CRIMINAL: 'Кримінальне',
  MIGRATION: 'Міграційне',
  REALESTATE: 'Нерухомість',
  LABOR: 'Трудове',
  OTHER: 'Інше',
};

export function CaseCard({ caseNumber, title, category, status, clientName, updatedAt, onClick }: CaseCardProps) {
  return (
    <Card className="cursor-pointer hover:shadow-md transition" onClick={onClick}>
      <div className="flex items-start justify-between mb-2">
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-navy-800 text-sm truncate">{title}</p>
          <p className="text-xs text-navy-400 font-mono mt-0.5">{caseNumber}</p>
        </div>
        <Badge color={statusColors[status] ?? 'gray'}>{statusLabels[status] ?? status}</Badge>
      </div>
      <div className="flex items-center justify-between mt-2">
        <div className="flex items-center gap-2 text-xs text-navy-500">
          <span>{categoryLabels[category] ?? category}</span>
          {clientName && <><span>|</span><span>{clientName}</span></>}
          <span>|</span>
          <span>{new Date(updatedAt).toLocaleDateString('uk-UA')}</span>
        </div>
        <ChevronRight size={16} className="text-navy-300" />
      </div>
    </Card>
  );
}
