import { Sparkles } from 'lucide-react';

interface SpinnerProps {
  text?: string;
  subtext?: string;
}

export function Spinner({ text = 'Завантаження...', subtext }: SpinnerProps) {
  return (
    <div className="flex flex-col items-center justify-center py-16">
      <div className="relative w-16 h-16 mb-4">
        <div className="absolute inset-0 border-4 border-accent-teal/20 rounded-full" />
        <div className="absolute inset-0 border-4 border-transparent border-t-accent-teal rounded-full animate-spin" />
        <Sparkles className="absolute inset-0 m-auto text-accent-teal" size={24} />
      </div>
      <p className="text-text-primary font-semibold">{text}</p>
      {subtext && <p className="text-text-muted text-sm mt-1">{subtext}</p>}
    </div>
  );
}
