import { FileText } from 'lucide-react';
import type { DocumentTemplate } from '@jurbot/shared';

interface TemplateCardProps {
  template: DocumentTemplate;
  onClick: () => void;
}

export function TemplateCard({ template, onClick }: TemplateCardProps) {
  return (
    <button
      onClick={onClick}
      className="bg-bg-card rounded-[14px] p-4 text-left border border-border-default hover:border-accent-teal/50 transition active:scale-[0.98]"
    >
      <div className="w-10 h-10 rounded-[10px] bg-accent-blue/15 text-accent-blue flex items-center justify-center mb-3">
        <FileText size={20} />
      </div>
      <h3 className="font-semibold text-sm text-text-primary">{template.name}</h3>
      <p className="text-xs text-text-muted mt-1">{template.description}</p>
    </button>
  );
}
