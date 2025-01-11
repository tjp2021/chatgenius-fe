'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Icons } from '@/components/ui/icons';
import { useSocketMessages } from '@/hooks/use-socket-messages';
import { cn } from '@/lib/utils';

interface MessageInputProps {
  channelId: string;
  className?: string;
}

export function MessageInput({ channelId, className }: MessageInputProps) {
  const [content, setContent] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout>();

  const { sendMessage } = useSocketMessages(channelId);

  const handleTyping = useCallback(() => {
    if (!isTyping) {
      setIsTyping(true);
    }

    // Clear existing timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    // Set new timeout
    typingTimeoutRef.current = setTimeout(() => {
      setIsTyping(false);
    }, 2000);
  }, [isTyping]);

  // Cleanup on unmount or channel change
  useEffect(() => {
    return () => {
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
    };
  }, []);

  const handleSubmit = async () => {
    if (!content.trim()) return;

    try {
      // Stop typing indicator before sending
      if (isTyping) {
        setIsTyping(false);
      }

      await sendMessage(content);
      setContent('');
      textareaRef.current?.focus();
    } catch (error) {
      console.error('Failed to send message:', error);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  return (
    <div className={cn("space-y-2", className)}>
      <form 
        onSubmit={(e) => {
          e.preventDefault();
          handleSubmit();
        }} 
        className="flex gap-2 p-4 border-t"
      >
        <Textarea
          ref={textareaRef}
          value={content}
          onChange={(e) => {
            const newContent = e.target.value;
            setContent(newContent);
            if (newContent.trim()) {
              handleTyping();
            }
          }}
          onKeyDown={handleKeyDown}
          onBlur={() => {
            if (isTyping) {
              setIsTyping(false);
            }
          }}
          placeholder="Type a message..."
          className="min-h-[60px] resize-none"
          aria-label="Message input"
        />
        <Button 
          type="submit" 
          disabled={!content.trim()}
          aria-label="Send message"
        >
          <Icons.send className="h-4 w-4" />
        </Button>
      </form>
    </div>
  );
} 