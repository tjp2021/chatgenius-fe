'use client';

import { useState, useCallback, useEffect } from 'react';
import { useSocket } from '@/hooks/useSocket';
import type { Message } from '@/types/message';

export function useMessages(channelId: string) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { socket, isConnected } = useSocket();

  useEffect(() => {
    const fetchMessages = async () => {
      try {
        const response = await fetch(`/api/channels/${channelId}/messages`);
        if (!response.ok) throw new Error('Failed to fetch messages');
        const data = await response.json();
        setMessages(data);
      } catch (error) {
        console.error('Error fetching messages:', error);
      } finally {
        setIsLoading(false);
      }
    };

    if (channelId) {
      fetchMessages();
    }
  }, [channelId]);

  const sendMessage = useCallback(async (content: string) => {
    if (!socket || !isConnected || !channelId) return;

    try {
      socket.emit('message:send', { channelId, content });
    } catch (error) {
      console.error('Error sending message:', error);
    }
  }, [socket, isConnected, channelId]);

  return {
    messages,
    isLoading,
    sendMessage
  };
} 