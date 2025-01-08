'use client';

import { Message } from '@prisma/client';
import { useUser } from '@clerk/nextjs';
import { formatDistanceToNow } from 'date-fns';
import { cn } from '@/lib/utils';
import { useEffect, useState } from 'react';
import { api } from '@/lib/axios';
import { useSocket } from '@/providers/socket-provider';
import { User } from 'lucide-react';

interface MessageWithUser extends Message {
  user: {
    id: string;
    name: string;
    imageUrl: string;
  };
}

interface MessageListProps {
  channelId: string;
}

export function MessageList({ channelId }: MessageListProps) {
  const { user: currentUser } = useUser();
  const { socket, isConnected } = useSocket();
  const [messages, setMessages] = useState<MessageWithUser[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Fetch initial messages
  useEffect(() => {
    const fetchMessages = async () => {
      try {
        const response = await api.get(`/messages/channel/${channelId}`);
        setMessages(response.data);
      } catch (error) {
        console.error('Failed to fetch messages:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchMessages();
  }, [channelId]);

  // Listen for new messages
  const onNewMessage = (message: MessageWithUser) => {
    console.log('New message received:', message);
    if (message.channelId === channelId) {
      setMessages(prev => [...prev, message]);
    }
  };

  // Handle socket events
  useEffect(() => {
    if (!socket || !isConnected) return;

    socket.emit('channel:subscribe', { channelId });

    const handleNewMessage = (message: MessageWithUser) => {
      console.log('New message received:', message);
      if (message.channelId === channelId) {
        setMessages(prev => [...prev, message]);
      }
    };

    socket.on('message:new', handleNewMessage);
    socket.on('connect', () => {
      socket.emit('channel:subscribe', { channelId });
    });

    return () => {
      console.log('Leaving channel:', channelId);
      socket.emit('channel:unsubscribe', { channelId });
      socket.off('message:new', handleNewMessage);
      socket.off('connect', () => {
        socket.emit('channel:subscribe', { channelId });
      });
    };
  }, [socket, isConnected, channelId]);

  // Auto-scroll when messages change
  useEffect(() => {
    const messageContainer = document.getElementById('message-container');
    if (messageContainer) {
      messageContainer.scrollTop = messageContainer.scrollHeight;
    }
  }, [messages]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full text-muted-foreground">
        Loading messages...
      </div>
    );
  }

  return (
    <div 
      id="message-container" 
      className="flex-1 p-4 space-y-4 bg-white overflow-y-auto"
      style={{ 
        height: 'calc(100vh - 110px)',
        overflowX: 'hidden'
      }}
    >
      {!messages?.length ? (
        <div className="flex items-center justify-center h-full text-muted-foreground">
          No messages yet. Start the conversation!
        </div>
      ) : (
        <div className="space-y-4 w-full">
          {messages.map((message) => {
            const isCurrentUser = message.userId === currentUser?.id;
            
            return (
              <div 
                key={message.id} 
                className={cn(
                  "flex items-start gap-3 w-full",
                  isCurrentUser && "flex-row-reverse"
                )}
              >
                <div className="flex-shrink-0">
                  {message.user.imageUrl ? (
                    <img
                      src={message.user.imageUrl}
                      alt={message.user.name || 'User'}
                      className="w-8 h-8 rounded-full"
                    />
                  ) : (
                    <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center">
                      <User className="w-4 h-4 text-gray-500" />
                    </div>
                  )}
                </div>
                <div className={cn(
                  "space-y-1 max-w-[70%]",
                  isCurrentUser && "items-end"
                )}>
                  <div className={cn(
                    "flex items-center gap-2",
                    isCurrentUser && "flex-row-reverse"
                  )}>
                    <span className="font-medium text-gray-900">
                      {message.user.name || 'Unknown User'}
                    </span>
                    <span className="text-xs text-gray-500">
                      {formatDistanceToNow(new Date(message.createdAt), { addSuffix: true })}
                    </span>
                  </div>
                  <div className={cn(
                    "rounded-lg px-4 py-2",
                    isCurrentUser 
                      ? "bg-emerald-600 text-white ml-auto" 
                      : "bg-gray-100 text-gray-800"
                  )}>
                    {message.content}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
} 