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
        // Sort messages by creation date, newest at bottom
        setMessages(response.data.sort((a: MessageWithUser, b: MessageWithUser) => 
          new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
        ));
      } catch (error) {
        console.error('Failed to fetch messages:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchMessages();
  }, [channelId]);

  // Handle socket events
  useEffect(() => {
    if (!socket || !isConnected) return;

    const joinChannel = () => {
      console.log('Joining channel:', channelId);
      socket.emit('channel:join', channelId);
    };

    // Join channel on initial connection
    joinChannel();

    // Listen for new messages
    const onNewMessage = (message: MessageWithUser) => {
      console.log('New message received:', message);
      setMessages((prev) => {
        // Check if message already exists to prevent duplicates
        const messageExists = prev.some(m => m.id === message.id);
        if (messageExists) {
          return prev;
        }
        return [...prev, message];
      });
    };

    // Handle reconnection
    socket.on('connect', () => {
      console.log('Socket reconnected, rejoining channel');
      joinChannel();
    });

    socket.on('message:new', onNewMessage);

    return () => {
      console.log('Leaving channel:', channelId);
      socket.emit('channel:leave', channelId);
      socket.off('message:new', onNewMessage);
      socket.off('connect');
    };
  }, [socket, isConnected, channelId]);

  // Auto-scroll to bottom when new messages arrive
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
    <div id="message-container" className="flex-1 p-4 space-y-4 bg-white overflow-y-auto">
      {!messages?.length ? (
        <div className="flex items-center justify-center h-full text-muted-foreground">
          No messages yet. Start the conversation!
        </div>
      ) : (
        <div className="space-y-4">
          {messages.map((message) => {
            const isCurrentUser = message.userId === currentUser?.id;
            
            return (
              <div 
                key={message.id} 
                className={cn(
                  "flex items-start gap-3",
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