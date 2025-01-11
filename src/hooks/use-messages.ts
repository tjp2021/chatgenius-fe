'use client';

import { useState, useCallback, useEffect } from 'react';
import { useSocket } from '@/providers/socket-provider';
import { Message, MessageEvent, MessageDeliveryStatus } from '@/types/message';
import { nanoid } from 'nanoid';

export function useMessages(channelId: string) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { socket, isConnected } = useSocket();

  // Load initial messages
  useEffect(() => {
    const loadMessages = async () => {
      try {
        if (!socket) {
          setIsLoading(false);
          return;
        }

        if (!isConnected) {
          return;
        }

        socket.emit('messages:list', { channelId }, (response: any) => {
          if (response.success && response.data) {
            setMessages(response.data);
          }
          setIsLoading(false);
        });
      } catch (error) {
        setIsLoading(false);
      }
    };

    loadMessages();
  }, [channelId, socket, isConnected]);

  // Handle real-time message events
  useEffect(() => {
    if (!socket || !isConnected) {
      return;
    }

    const handleNewMessage = (message: Message) => {
      if (message.channelId !== channelId) return;

      setMessages(prev => {
        const exists = prev.some(m => 
          m.id === message.id || 
          m.tempId === message.id
        );

        if (exists) return prev;
        return [...prev, message];
      });

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
  }, [socket, channelId, isConnected]);

  const sendMessage = useCallback(async (content: string) => {
    if (!socket) {
      throw new Error('Socket not initialized');
    }

    if (!isConnected) {
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

    setMessages(prev => [...prev, tempMessage]);

    try {
      const result = await socket.sendMessage(channelId, content, tempId);
      
      if (!result.success) {
        throw new Error(result.error || 'Failed to send message');
      }
      return result;
    } catch (error) {
      setMessages(prev => prev.filter(msg => msg.tempId !== tempId));
      throw error;
    }
  }, [socket, channelId, isConnected]);

  return {
    messages,
    isLoading,
    sendMessage
  };
} 