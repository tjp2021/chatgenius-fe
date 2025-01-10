'use client';

import { useState, useRef, KeyboardEvent } from 'react';
import { Send } from 'lucide-react';
import { Button } from './ui/button';
import { Textarea } from './ui/textarea';
import { useTyping } from '@/hooks/use-typing';

interface MessageInputProps {
  channelId: string;
  onSend: (content: string) => void;
}

export function MessageInput({ channelId, onSend }: MessageInputProps) {
  const [content, setContent] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const { sendTypingStart } = useTyping(channelId);

  const handleSend = () => {
    if (!content.trim()) return;
    onSend(content);
    setContent('');
    textareaRef.current?.focus();
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    } else {
      sendTypingStart();
    }
  };

  return (
    <div className="p-4 border-t">
      <div className="flex gap-2">
        <Textarea
          ref={textareaRef}
          value={content}
          onChange={(e) => {
            setContent(e.target.value);
            sendTypingStart();
          }}
          onKeyDown={handleKeyDown}
          placeholder="Type a message..."
          className="min-h-[20px] max-h-[200px] resize-none"
          rows={1}
        />
        <Button 
          onClick={handleSend}
          disabled={!content.trim()}
          size="icon"
        >
          <Send className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
} 