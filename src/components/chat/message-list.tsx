'use client';

import { useEffect, useRef } from 'react';
import { useMessages } from '@/hooks/useMessages';
import { MessageItem } from './message-item';
import { Loader2 } from 'lucide-react';

interface MessageListProps {
  channelId: string;
}

export function MessageList({ channelId }: MessageListProps) {
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { messages, isLoading, sendMessage } = useMessages(channelId);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <Loader2 className="h-7 w-7 text-muted-foreground animate-spin" />
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col gap-4 p-4">
      {messages.map((message) => (
        <MessageItem
          key={message.id}
          message={message}
        />
      ))}
      <div ref={messagesEndRef} />
    </div>
  );
} 