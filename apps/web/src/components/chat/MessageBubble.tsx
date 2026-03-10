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
            ? 'bg-navy-800 text-white rounded-br-md'
            : 'bg-white border border-navy-100 text-navy-800 rounded-bl-md'
        }`}
      >
        {senderName && !isOwn && (
          <p className="text-xs font-semibold text-gold-600 mb-1">{senderName}</p>
        )}
        <p className="text-sm">{text}</p>
        <p className={`text-xs mt-1 ${isOwn ? 'text-navy-300' : 'text-navy-400'}`}>{time}</p>
      </div>
    </div>
  );
}
