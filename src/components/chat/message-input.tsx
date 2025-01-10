'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useMessages } from '@/hooks/useMessages';
import { useApi } from '@/hooks/useApi';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Icons } from '@/components/ui/icons';

interface MessageInputProps {
  channelId: string;
}

export function MessageInput({ channelId }: MessageInputProps) {
  const [content, setContent] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const { sendMessage } = useMessages(channelId);
  const { startTyping, stopTyping } = useApi();
  const typingTimeoutRef = useRef<NodeJS.Timeout>();

  const handleTyping = useCallback(() => {
    if (!isTyping) {
      setIsTyping(true);
      startTyping(channelId);
    }

    // Clear existing timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    // Set new timeout
    typingTimeoutRef.current = setTimeout(() => {
      setIsTyping(false);
      stopTyping(channelId);
    }, 2000);
  }, [channelId, isTyping, startTyping, stopTyping]);

  useEffect(() => {
    return () => {
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
    };
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!content.trim()) return;

    try {
      await sendMessage(content);
      setContent('');
      if (isTyping) {
        setIsTyping(false);
        stopTyping(channelId);
      }
    } catch (error) {
      console.error('Failed to send message:', error);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="flex gap-2 p-4">
      <Textarea
        value={content}
        onChange={(e) => {
          setContent(e.target.value);
          handleTyping();
        }}
        onKeyDown={handleKeyDown}
        placeholder="Type a message..."
        className="min-h-[60px] resize-none"
      />
      <Button type="submit" disabled={!content.trim()}>
        <Icons.send className="h-4 w-4" />
      </Button>
    </form>
  );
} 