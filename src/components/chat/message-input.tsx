'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useMessages } from '@/hooks/useMessages';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Icons } from '@/components/ui/icons';
import { useTyping } from '@/hooks/use-typing';

interface MessageInputProps {
  channelId: string;
}

export function MessageInput({ channelId }: MessageInputProps) {
  console.log('[Message Input] Initializing MessageInput component', { channelId });
  const [content, setContent] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout>();
  const { sendMessage } = useMessages(channelId);
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

  // Cleanup on unmount or channel change
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

  const handleSubmit = async () => {
    console.log('[Message Input] Handling message submit', { content, channelId });
    if (!content.trim()) {
      console.log('[Message Input] Empty content, skipping send');
      return;
    }

    try {
      console.log('[Message Input] Attempting to send message');
      // Stop typing indicator before sending
      if (isTyping && isTypingEnabled) {
        console.log('[Message Input] Stopping typing indicator');
        setIsTyping(false);
        stopTyping();
      }

      await sendMessage(content);
      console.log('[Message Input] Message sent successfully');
      setContent('');
      textareaRef.current?.focus();
    } catch (error) {
      console.error('[Message Input] Failed to send message:', error);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      console.log('[Message Input] Enter key pressed, submitting message');
      e.preventDefault();
      handleSubmit();
    }
  };

  return (
    <form 
      onSubmit={(e) => {
        console.log('[Message Input] Form submit triggered');
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
          console.log('[Message Input] Content changed', { newContent });
          setContent(newContent);
          if (newContent.trim()) {
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
        className="min-h-[60px] resize-none"
      />
      <Button 
        type="submit" 
        disabled={!content.trim()}
      >
        <Icons.send className="h-4 w-4" />
      </Button>
    </form>
  );
} 