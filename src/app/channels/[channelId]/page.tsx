'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { Message } from '@prisma/client';
import { api } from '@/lib/axios';
import { useSocket } from '@/providers/socket-provider';
import { MessageInput } from '@/components/message-input';
import { MessageList } from '@/components/message-list';
import { TypingIndicator } from '@/components/typing-indicator';

interface MessageWithUser extends Message {
  user: {
    id: string;
    name: string;
    imageUrl: string;
  };
}

export default function ChannelPage() {
  const params = useParams();
  const { socket } = useSocket();
  const [messages, setMessages] = useState<MessageWithUser[]>([]);
  const [typingUsers, setTypingUsers] = useState<Set<string>>(new Set());
  const channelId = params.channelId as string;

  useEffect(() => {
    fetchMessages();
    
    // Join channel socket room
    socket?.emit('channel:join', channelId);

    // Listen for new messages
    socket?.on('message:new', (message: MessageWithUser) => {
      setMessages(prev => [message, ...prev]);
    });

    // Listen for typing indicators
    socket?.on('channel:typing', ({ userId }) => {
      setTypingUsers(prev => new Set(prev).add(userId));
    });

    socket?.on('channel:stop_typing', ({ userId }) => {
      setTypingUsers(prev => {
        const next = new Set(prev);
        next.delete(userId);
        return next;
      });
    });

    return () => {
      socket?.off('message:new');
      socket?.off('channel:typing');
      socket?.off('channel:stop_typing');
      socket?.emit('channel:leave', channelId);
    };
  }, [channelId, socket]);

  const fetchMessages = async () => {
    try {
      const response = await api.get(`/messages/channel/${channelId}`);
      setMessages(response.data);
    } catch (error) {
      console.error('Failed to fetch messages:', error);
    }
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-y-auto">
        <MessageList messages={messages} />
      </div>
      <div className="mt-auto">
        <TypingIndicator users={Array.from(typingUsers)} />
        <MessageInput 
          channelId={channelId} 
          onMessageSent={fetchMessages}
        />
      </div>
    </div>
  );
} 