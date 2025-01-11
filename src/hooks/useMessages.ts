'use client';

import { useState, useCallback } from 'react';
import { useSocket } from '@/hooks/useSocket';
import { Message, MessageDeliveryStatus } from '@/types/message';

export function useMessages(channelId: string) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { socket } = useSocket();

  const sendMessage = useCallback(async (content: string) => {
    if (!socket) {
      throw new Error('Socket not initialized');
    }

    const tempMessage: Message = {
      content,
      channelId,
      userId: socket.auth.userId,
      createdAt: new Date().toISOString(),
      deliveryStatus: MessageDeliveryStatus.SENDING
    };

    setMessages(prev => [...prev, tempMessage]);

    try {
      const response = await socket.emit('message:send', {
        content,
        channelId
      });

      if (!response.success) {
        throw new Error(response.error || 'Failed to send message');
      }

      setMessages(prev => prev.map(msg => 
        msg === tempMessage ? {
          ...msg,
          id: response.messageId,
          deliveryStatus: MessageDeliveryStatus.SENT
        } : msg
      ));

      return response;
    } catch (error) {
      setMessages(prev => prev.filter(msg => msg !== tempMessage));
      throw error;
    }
  }, [socket, channelId]);

  const retryMessage = useCallback(async (messageId: string) => {
    const message = messages.find(m => m.id === messageId);
    if (!message) {
      throw new Error('Message not found');
    }

    try {
      await sendMessage(message.content);
      setMessages(prev => prev.filter(m => m.id !== messageId));
    } catch (error) {
      throw error;
    }
  }, [messages, sendMessage]);

  return {
    messages,
    isLoading,
    sendMessage,
    retryMessage
  };
} 