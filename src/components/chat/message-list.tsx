'use client';

import { useEffect, useRef } from 'react';
import { useUser } from '@clerk/nextjs';
import { useMessages } from '@/hooks/useMessages';
import { MessageItem } from '@/components/chat/message-item';
import { LoadingSpinner } from '@/components/ui/loading-spinner';

interface MessageListProps {
  channelId: string;
}

export function MessageList({ channelId }: MessageListProps) {
  const { messages, isLoading, error } = useMessages(channelId);
  const { user } = useUser();
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center">
        <LoadingSpinner />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex h-full items-center justify-center text-red-500">
        {error.message}
      </div>
    );
  }

  return (
    <div className="flex flex-col space-y-4 p-4">
      {messages.map((message) => (
        <MessageItem
          key={message.id}
          message={message}
          isOwnMessage={message.userId === user?.id}
        />
      ))}
      <div ref={bottomRef} />
    </div>
  );
} 