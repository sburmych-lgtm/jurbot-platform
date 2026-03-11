import { useState } from 'react';
import { ChevronDown } from 'lucide-react';

interface AccordionItem {
  question: string;
  answer: string;
}

interface AccordionProps {
  items: readonly AccordionItem[];
  title?: string;
}

export function Accordion({ items, title }: AccordionProps) {
  const [open, setOpen] = useState<number | null>(null);

  return (
    <div className="space-y-2">
      {title && <h3 className="font-semibold text-text-primary text-sm mb-2">{title}</h3>}
      {items.map((item, i) => (
        <div key={i} className="bg-bg-card rounded-[14px] border border-border-default overflow-hidden">
          <button
            onClick={() => setOpen(open === i ? null : i)}
            className="w-full flex items-center justify-between px-4 py-3 text-left"
          >
            <span className="text-sm font-medium text-text-primary">{item.question}</span>
            <ChevronDown
              size={16}
              className={`text-text-muted transition-transform shrink-0 ${open === i ? 'rotate-180' : ''}`}
            />
          </button>
          {open === i && <div className="px-4 pb-3 text-sm text-text-secondary">{item.answer}</div>}
        </div>
      ))}
    </div>
  );
}
