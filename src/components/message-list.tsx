'use client';

import { useEffect, useRef, useState } from 'react';
import { useMessages } from '@/hooks/useMessages';
import { MessageInput } from '@/components/chat/message-input';
import { MessageItem } from './message-item';
import { TypingIndicatorDisplay } from './typing-indicator';

interface MessageListProps {
  channelId: string;
}

export const MessageList = ({ channelId }: MessageListProps) => {
  const { messages, isLoading, sendMessage } = useMessages(channelId);
  const bottomRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [shouldAutoScroll, setShouldAutoScroll] = useState(true);

  useEffect(() => {
    if (!bottomRef.current || !containerRef.current) return;
    
    if (isLoading) {
      bottomRef.current.scrollIntoView();
      return;
    }

    if (shouldAutoScroll) {
      bottomRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, shouldAutoScroll, isLoading]);

  const handleScroll = () => {
    if (!containerRef.current) return;
    
    const isScrolledToBottom = 
      Math.abs(
        containerRef.current.scrollHeight - 
        containerRef.current.scrollTop - 
        containerRef.current.clientHeight
      ) < 50;
    
    setShouldAutoScroll(isScrolledToBottom);
  };

  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center p-4">
        <div className="flex flex-col items-center gap-2">
          <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
          <p className="text-sm text-muted-foreground">Loading messages...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <div 
        ref={containerRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto p-4 space-y-4"
      >
        {messages.map((message) => (
          <MessageItem 
            key={message.tempId || message.id} 
            message={message}
          />
        ))}
        <div ref={bottomRef} />
        <TypingIndicatorDisplay channelId={channelId} />
      </div>
      <MessageInput channelId={channelId} />
    </div>
  );
}; 