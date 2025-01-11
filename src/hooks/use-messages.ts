'use client';

import { useEffect, useState, useCallback } from 'react';
import { useSocket } from '@/providers/socket-provider';
import { Message, MessageListResponse, MessageEvent, MessageDeliveryStatus } from '@/types/message';
import { nanoid } from 'nanoid';

export function useMessages(channelId: string) {
  const { socket, isConnected } = useSocket();
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    const fetchMessages = async () => {
      try {
        setIsLoading(true);
        setError(null);

        if (!socket) {
          return;
        }

        if (!isConnected) {
          return;
        }

        socket.emit('messages:list', { channelId }, (response: MessageListResponse) => {
          if (response.success && response.data) {
            setMessages(response.data);
          }
          setIsLoading(false);
        });
      } catch (error) {
        console.error('Error fetching messages:', error instanceof Error ? error.message : 'Unknown error');
        setError(error instanceof Error ? error : new Error('Failed to fetch messages'));
        setIsLoading(false);
      }
    };

    fetchMessages();

    // Handle real-time message events
    const handleMessageDelivered = (data: { messageId: string }) => {
      setMessages(prev => prev.map(msg => {
        if (msg.id === data.messageId) {
          return {
            ...msg,
            status: MessageEvent.DELIVERED,
            deliveryStatus: MessageDeliveryStatus.DELIVERED
          };
        }
        return msg;
      }));
    };

    const handleNewMessage = (message: Message) => {
      if (message.channelId === channelId) {
        setMessages(prev => {
          // Check if message already exists (e.g., from optimistic update)
          const exists = prev.some(m => m.id === message.id || m.tempId === message.id);
          if (exists) {
            return prev.map(m => {
              if (m.tempId === message.id) {
                return {
                  ...message,
                  status: MessageEvent.NEW,
                  deliveryStatus: MessageDeliveryStatus.SENT
                };
              }
              return m;
            });
          }
          // Add new message
          return [...prev, {
            ...message,
            status: MessageEvent.NEW,
            deliveryStatus: MessageDeliveryStatus.SENT
          }];
        });
      }
    };

    socket?.on('message:delivered', handleMessageDelivered);
    socket?.on('message:new', handleNewMessage);

    return () => {
      socket?.off('message:delivered', handleMessageDelivered);
      socket?.off('message:new', handleNewMessage);
    };
  }, [socket, isConnected, channelId]);

  const sendMessage = useCallback(async (content: string) => {
    if (!socket || !isConnected || !content.trim()) return;

    const tempId = nanoid();
    const tempMessage: Message = {
      tempId,
      content,
      channelId,
      userId: socket.auth?.userId,
      createdAt: new Date().toISOString(),
      status: MessageEvent.SEND,
      deliveryStatus: MessageDeliveryStatus.SENDING
    };

    // Optimistic update
    setMessages(prev => [...prev, tempMessage]);

    try {
      socket.emit('message:send', { channelId, content, tempId });
    } catch (error) {
      console.error('Failed to send message:', error);
      // Update message status to failed
      setMessages(prev => prev.map(msg => {
        if (msg.tempId === tempId) {
          return {
            ...msg,
            deliveryStatus: MessageDeliveryStatus.FAILED
          };
        }
        return msg;
      }));
    }
  }, [socket, isConnected, channelId]);

  const retryMessage = useCallback(async (messageId: string) => {
    const message = messages.find(m => m.id === messageId || m.tempId === messageId);
    if (!message) return;

    // Remove the failed message
    setMessages(prev => prev.filter(m => m.id !== messageId && m.tempId !== messageId));
    
    // Try sending again
    await sendMessage(message.content);
  }, [messages, sendMessage]);

  return {
    messages,
    isLoading,
    error,
    sendMessage,
    retryMessage
  };
} 