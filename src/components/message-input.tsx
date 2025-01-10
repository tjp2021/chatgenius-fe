'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { Send } from 'lucide-react';
import { Button } from './ui/button';
import { Textarea } from './ui/textarea';
import { useTyping } from '@/hooks/use-typing';
import { TypingIndicatorDisplay } from './typing-indicator';

interface MessageInputProps {
  channelId: string;
  onSend: (content: string) => void;
}

export function MessageInput({ channelId, onSend }: MessageInputProps) {
  const [content, setContent] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout>();
  const { startTyping, stopTyping, isTypingEnabled } = useTyping(channelId);

  const handleTyping = useCallback(() => {
    if (!isTyping && isTypingEnabled) {
      setIsTyping(true);
      startTyping();
    }

    // Clear existing timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    // Set new timeout
    typingTimeoutRef.current = setTimeout(() => {
      setIsTyping(false);
      if (isTypingEnabled) {
        stopTyping();
      }
    }, 2000);
  }, [isTyping, startTyping, stopTyping, isTypingEnabled]);

  useEffect(() => {
    return () => {
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
      if (isTyping && isTypingEnabled) {
        stopTyping();
      }
    };
  }, [isTyping, stopTyping, isTypingEnabled]);

  const handleSend = (e?: React.FormEvent) => {
    e?.preventDefault();
    
    if (!content.trim()) return;

    if (isTyping && isTypingEnabled) {
      setIsTyping(false);
      stopTyping();
    }
    
    onSend(content);
    setContent('');
    textareaRef.current?.focus();
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="flex flex-col gap-2">
      <TypingIndicatorDisplay 
        channelId={channelId}
        className="px-4"
      />
      <div className="p-4 border-t">
        <div className="flex gap-2">
          <Textarea
            ref={textareaRef}
            value={content}
            onChange={(e) => {
              setContent(e.target.value);
              if (e.target.value.trim()) {
                handleTyping();
              } else if (isTyping && isTypingEnabled) {
                setIsTyping(false);
                stopTyping();
              }
            }}
            onKeyDown={handleKeyDown}
            onBlur={() => {
              if (isTyping && isTypingEnabled) {
                setIsTyping(false);
                stopTyping();
              }
            }}
            placeholder="Type a message..."
            className="min-h-[20px] max-h-[200px] resize-none"
            rows={1}
          />
          <Button 
            onClick={() => handleSend()}
            disabled={!content.trim()}
            size="icon"
          >
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
} 