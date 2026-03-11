import { useState, useRef, useEffect } from 'react';
import { Send } from 'lucide-react';
import { MessageBubble } from './MessageBubble';

interface Message {
  id: string;
  text: string;
  senderId: string;
  senderName?: string;
  createdAt: string;
}

interface ChatWindowProps {
  messages: Message[];
  currentUserId: string;
  onSend: (text: string) => void;
  loading?: boolean;
}

export function ChatWindow({ messages, currentUserId, onSend, loading }: ChatWindowProps) {
  const [input, setInput] = useState('');
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = () => {
    if (!input.trim()) return;
    onSend(input.trim());
    setInput('');
  };

  return (
    <div className="flex flex-col" style={{ height: 'calc(100vh - 200px)' }}>
      <div className="flex-1 overflow-y-auto space-y-3 pb-2">
        {messages.map(m => (
          <MessageBubble
            key={m.id}
            text={m.text}
            time={new Date(m.createdAt).toLocaleString('uk-UA', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
            isOwn={m.senderId === currentUserId}
            senderName={m.senderName}
          />
        ))}
        <div ref={endRef} />
      </div>
      <div className="flex gap-2 pt-2 border-t border-border-default">
        <input
          value={input}
          onChange={e => setInput(e.target.value)}
          placeholder="Написати повідомлення..."
          className="flex-1 px-4 py-3 rounded-[14px] border border-border-default bg-bg-tertiary text-text-primary focus:border-accent-teal focus:outline-none text-sm"
          onKeyDown={e => { if (e.key === 'Enter') handleSend(); }}
          disabled={loading}
        />
        <button
          onClick={handleSend}
          disabled={!input.trim() || loading}
          className={`w-12 h-12 rounded-[14px] flex items-center justify-center transition ${
            input.trim() ? 'bg-accent-teal text-bg-primary' : 'bg-bg-elevated text-text-muted'
          }`}
        >
          <Send size={18} />
        </button>
      </div>
    </div>
  );
}
