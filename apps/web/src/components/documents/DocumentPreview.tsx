interface DocumentPreviewProps {
  content: string;
}

export function DocumentPreview({ content }: DocumentPreviewProps) {
  return (
    <div className="bg-bg-card rounded-[14px] border border-border-default p-5">
      <pre className="whitespace-pre-wrap text-sm text-text-primary font-mono leading-relaxed">
        {content}
      </pre>
    </div>
  );
}
