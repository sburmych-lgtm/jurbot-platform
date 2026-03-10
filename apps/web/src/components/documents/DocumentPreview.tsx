interface DocumentPreviewProps {
  content: string;
}

export function DocumentPreview({ content }: DocumentPreviewProps) {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-navy-100 p-5">
      <pre className="whitespace-pre-wrap text-sm text-navy-800 font-mono leading-relaxed">
        {content}
      </pre>
    </div>
  );
}
