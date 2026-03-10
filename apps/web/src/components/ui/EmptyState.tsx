import { type LucideIcon } from 'lucide-react';
import { Button } from './Button';

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
}

export function EmptyState({ icon: Icon, title, description, actionLabel, onAction }: EmptyStateProps) {
  return (
    <div className="text-center py-12">
      <Icon size={48} className="mx-auto text-navy-200 mb-3" />
      <p className="text-navy-500 font-medium">{title}</p>
      {description && <p className="text-navy-300 text-sm mt-1">{description}</p>}
      {actionLabel && onAction && (
        <Button variant="primary" size="sm" className="mt-4" onClick={onAction}>
          {actionLabel}
        </Button>
      )}
    </div>
  );
}
