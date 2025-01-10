'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Icons } from '@/components/ui/icons';
import { useSocketMessages } from '@/hooks/use-socket-messages';
import { TypingIndicator } from '@/components/chat/typing-indicator';
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

  const {
    send: sendMessage,
    startTyping,
    stopTyping,
    typingUsers,
    isLoading,
    error
  } = useSocketMessages({
    channelId,
    onNewMessage: (message) => {
      // Auto-focus input after receiving a message
      if (message.channelId === channelId) {
        textareaRef.current?.focus();
      }
    }
  });

  const handleTyping = useCallback(() => {
    if (!isTyping) {
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
      stopTyping();
    }, 2000);
  }, [isTyping, startTyping, stopTyping]);

  // Cleanup on unmount or channel change
  useEffect(() => {
    return () => {
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
      if (isTyping) {
        stopTyping();
      }
    };
  }, [isTyping, stopTyping]);

  const handleSubmit = async () => {
    if (!content.trim()) return;

    try {
      // Stop typing indicator before sending
      if (isTyping) {
        setIsTyping(false);
        stopTyping();
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
      <TypingIndicator 
        userIds={typingUsers} 
        className="px-4"
      />
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
            } else if (isTyping) {
              setIsTyping(false);
              stopTyping();
            }
          }}
          onKeyDown={handleKeyDown}
          onBlur={() => {
            if (isTyping) {
              setIsTyping(false);
              stopTyping();
            }
          }}
          placeholder="Type a message..."
          className="min-h-[60px] resize-none"
          disabled={isLoading}
          aria-invalid={error ? 'true' : 'false'}
          aria-errormessage={error?.message}
        />
        <Button 
          type="submit" 
          disabled={!content.trim() || isLoading}
          aria-label="Send message"
        >
          <Icons.send className="h-4 w-4" />
        </Button>
      </form>
    </div>
  );
} 