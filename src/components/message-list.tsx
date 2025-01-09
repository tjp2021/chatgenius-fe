'use client';

import { useEffect, useRef, useState } from 'react';
import { useMessages } from '@/hooks/use-messages';
import { MessageInput } from './message-input';
import { MessageItem } from './message-item';

interface MessageListProps {
  channelId: string;
}

export const MessageList = ({ channelId }: MessageListProps) => {
  const { messages, isLoading, sendMessage, retryMessage } = useMessages(channelId);
  const bottomRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [shouldAutoScroll, setShouldAutoScroll] = useState(true);

  // Handle auto-scrolling
  useEffect(() => {
    if (!shouldAutoScroll || !bottomRef.current || !containerRef.current) return;

    const container = containerRef.current;
    const isScrolledToBottom = container.scrollHeight - container.scrollTop === container.clientHeight;
    
    if (isScrolledToBottom) {
      bottomRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, shouldAutoScroll]);

  // Monitor scroll position to determine if we should auto-scroll
  const handleScroll = () => {
    if (!containerRef.current) return;
    
    const container = containerRef.current;
    const isScrolledToBottom = 
      Math.abs(container.scrollHeight - container.scrollTop - container.clientHeight) < 50;
    
    setShouldAutoScroll(isScrolledToBottom);
  };

  if (isLoading) {
    return <div className="flex-1 p-4">Loading messages...</div>;
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
            onRetry={retryMessage}
          />
        ))}
        <div ref={bottomRef} />
      </div>
      <MessageInput onSend={sendMessage} />
    </div>
  );
}; 