'use client';

import { useEffect, useRef } from 'react';
import { useUser } from '@clerk/nextjs';
import { useMessages } from '@/hooks/use-messages';
import { MessageItem } from '@/components/chat/message-item';
import { LoadingSpinner } from '@/components/ui/loading-spinner';

interface MessageListProps {
  channelId: string;
}

export function MessageList({ channelId }: MessageListProps) {
  const { messages, isLoading } = useMessages(channelId);
  const { user } = useUser();
  const bottomRef = useRef<HTMLDivElement>(null);

  console.log('[Message List] Rendering message list', {
    channelId,
    messageCount: messages.length,
    messages,
    isLoading,
    userId: user?.id
  });

  useEffect(() => {
    console.log('[Message List] Messages updated', {
      messageCount: messages.length,
      messages
    });
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  if (isLoading) {
    console.log('[Message List] Showing loading state');
    return (
      <div className="flex h-full items-center justify-center">
        <LoadingSpinner />
      </div>
    );
  }

  console.log('[Message List] Rendering messages:', messages);

  return (
    <div className="flex flex-col space-y-4 p-4">
      {messages.map((message) => {
        console.log('[Message List] Rendering message:', message);
        return (
          <MessageItem
            key={message.id || message.tempId}
            message={message}
            isOwnMessage={message.userId === user?.id}
          />
        );
      })}
      <div ref={bottomRef} />
    </div>
  );
} 