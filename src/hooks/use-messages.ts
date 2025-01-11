'use client';

import { useState, useCallback, useEffect } from 'react';
import { useSocket } from '@/providers/socket-provider';
import { Message, MessageEvent, MessageDeliveryStatus } from '@/types/message';
import { nanoid } from 'nanoid';

export function useMessages(channelId: string) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { socket, isConnected, isConnecting } = useSocket();

  // Load initial messages
  useEffect(() => {
    console.log('[Messages] Loading messages for channel:', channelId, {
      hasSocket: !!socket,
      isConnected,
      isConnecting
    });

    const loadMessages = async () => {
      try {
        if (!socket) {
          console.log('[Messages] No socket available');
          setIsLoading(false);
          return;
        }

        if (!isConnected) {
          console.log('[Messages] Socket not connected, waiting...');
          return;
        }

        console.log('[Messages] Fetching messages via socket');
        socket.emit('messages:list', { channelId }, (response: any) => {
          console.log('[Messages] Socket response:', response);
          if (response.success && response.data) {
            setMessages(response.data);
          } else {
            console.error('[Messages] Failed to load messages:', response.error);
          }
          setIsLoading(false);
        });
      } catch (error) {
        console.error('[Messages] Error loading messages:', error);
        setIsLoading(false);
      }
    };

    loadMessages();
  }, [channelId, socket, isConnected, isConnecting]);

  // Handle real-time message events
  useEffect(() => {
    if (!socket || !isConnected) {
      console.log('[Messages] Socket not ready for real-time events');
      return;
    }

    console.log('[Messages] Setting up real-time message handlers');

    const handleNewMessage = (message: Message) => {
      console.log('[Messages] New message received:', message);
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
      console.log('[Messages] Message sent confirmation:', data);
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
      console.log('[Messages] Cleaning up message handlers');
      socket.off(MessageEvent.NEW, handleNewMessage);
      socket.off(MessageEvent.SENT, handleMessageSent);
    };
  }, [socket, channelId, isConnected, isConnecting]);

  const sendMessage = useCallback(async (content: string) => {
    if (!socket) {
      console.error('[Messages] Cannot send message: Socket not initialized');
      throw new Error('Socket not initialized');
    }

    if (!isConnected) {
      console.error('[Messages] Cannot send message: Socket not connected');
      throw new Error('Socket not connected');
    }

    console.log('[Messages] Sending message:', { channelId, content });

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

    try {
      const result = await socket.sendMessage(channelId, content, tempId);
      console.log('[Messages] Send result:', result);
      
      if (!result.success) {
        throw new Error(result.error || 'Failed to send message');
      }
      return result;
    } catch (error) {
      console.error('[Messages] Send error:', error);
      // Revert optimistic update on error
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