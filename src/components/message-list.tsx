'use client';

import { useEffect, useRef } from 'react';
import { useMessages } from '@/hooks/use-messages';
import { MessageInput } from './message-input';
import { MessageItem } from './message-item';

interface MessageListProps {
  channelId: string;
}

export const MessageList = ({ channelId }: MessageListProps) => {
  const { messages, isLoading, sendMessage } = useMessages(channelId);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  if (isLoading) {
    return <div className="flex-1 p-4">Loading messages...</div>;
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((message) => (
          <MessageItem key={message.id} message={message} />
        ))}
        <div ref={bottomRef} />
      </div>
      <MessageInput onSend={sendMessage} />
    </div>
  );
}; 