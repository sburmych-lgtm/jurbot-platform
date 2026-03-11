interface MessageBubbleProps {
  text: string;
  time: string;
  isOwn: boolean;
  senderName?: string;
}

export function MessageBubble({ text, time, isOwn, senderName }: MessageBubbleProps) {
  return (
    <div className={`flex ${isOwn ? 'justify-end' : 'justify-start'}`}>
      <div
        className={`max-w-[80%] rounded-2xl px-4 py-2.5 ${
          isOwn
            ? 'bg-accent-teal/20 text-text-primary rounded-br-md'
            : 'bg-bg-card border border-border-default text-text-primary rounded-bl-md'
        }`}
      >
        {senderName && !isOwn && (
          <p className="text-xs font-semibold text-accent-teal mb-1">{senderName}</p>
        )}
        <p className="text-sm">{text}</p>
        <p className={`text-xs mt-1 ${isOwn ? 'text-text-muted' : 'text-text-muted'}`}>{time}</p>
      </div>
    </div>
  );
}
