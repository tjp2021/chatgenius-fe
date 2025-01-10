'use client';

import { useState, useCallback, useEffect } from 'react';
import { useSocket } from '@/providers/socket-provider';
import { Message, MessageEvent, MessageDeliveryStatus } from '@/types/message';
import { nanoid } from 'nanoid';

export function useMessages(channelId: string) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const { socket } = useSocket();

  // Load initial messages via socket
  useEffect(() => {
    if (!socket || !socket.isConnected) return;

    setIsLoading(true);
    socket.emit('messages:get', { channelId }, (response: { messages: Message[] }) => {
      setMessages(response.messages || []);
      setIsLoading(false);
    });
  }, [channelId, socket]);

  // Handle real-time message events
  useEffect(() => {
    if (!socket) return;

    const handleNewMessage = (message: Message) => {
      if (message.channelId !== channelId) return;

      setMessages(prev => {
        // Check if we already have this message
        const exists = prev.some(m => 
          m.id === message.id || 
          m.tempId === message.id
        );

        if (exists) return prev;
        return [...prev, message];
      });

      // Send delivery confirmation
      socket.emit(MessageEvent.DELIVERED, {
        messageId: message.id,
        channelId: message.channelId
      });
    };

    const handleMessageSent = (data: { tempId: string, messageId: string }) => {
      setMessages(prev => prev.map(msg => 
        msg.tempId === data.tempId ? {
          ...msg,
          id: data.messageId,
          deliveryStatus: MessageDeliveryStatus.SENT
        } : msg
      ));
    };

    socket.on(MessageEvent.NEW, handleNewMessage);
    socket.on(MessageEvent.SENT, handleMessageSent);

    return () => {
      socket.off(MessageEvent.NEW, handleNewMessage);
      socket.off(MessageEvent.SENT, handleMessageSent);
    };
  }, [socket, channelId]);

  const sendMessage = useCallback(async (content: string) => {
    if (!socket || !socket.isConnected) {
      throw new Error('Socket not connected');
    }

    const tempId = nanoid();
    const tempMessage: Message = {
      tempId,
      content,
      userId: socket.auth.userId,
      channelId,
      createdAt: new Date().toISOString(),
      deliveryStatus: MessageDeliveryStatus.SENDING
    };

    // Optimistic update
    setMessages(prev => [...prev, tempMessage]);

    return socket.sendMessage(channelId, content, tempId);
  }, [socket, channelId]);

  return {
    messages,
    isLoading,
    sendMessage
  };
} 