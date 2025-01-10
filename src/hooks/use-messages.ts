'use client';

import { useState, useCallback, useEffect } from 'react';
import { useSocket } from '@/providers/socket-provider';
import { useQueryClient } from '@tanstack/react-query';
import { nanoid } from 'nanoid';
import { Message, MessageEvent, MessageDeliveryStatus, MessagePayload } from '@/types/message';
import { messageStorage } from '@/lib/message-storage';
import { debounce } from '@/lib/utils';

interface MessageSentEvent {
  tempId: string;
  messageId: string;
}

export function useMessages(channelId: string) {
  const [messages, setMessages] = useState<Message[]>([]);
  const { socket, isConnected } = useSocket();
  const queryClient = useQueryClient();

  // Process offline messages when connecting
  useEffect(() => {
    if (!isConnected || !socket) return;

    const offlineMessages = messageStorage.getMessages(channelId);
    offlineMessages.forEach(async ({ payload, timestamp }) => {
      try {
        await sendMessage(payload.content, payload.parentId);
        messageStorage.removeMessage(channelId, timestamp);
      } catch (error) {
        console.error('Failed to send offline message:', error);
      }
    });
  }, [isConnected, socket, channelId]);

  // Handle real-time message events
  useEffect(() => {
    if (!socket) return;

    const handleNewMessage = (message: Message) => {
      if (message.channelId !== channelId) return;

      setMessages(prev => {
        // Check if we already have this message (e.g., from optimistic update)
        const exists = prev.some(m => 
          m.id === message.id || 
          m.tempId === message.id ||
          (m.content === message.content && 
           m.userId === message.userId && 
           Math.abs(new Date(m.createdAt).getTime() - new Date(message.createdAt).getTime()) < 5000)
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

    const handleMessageSent = (data: MessageSentEvent) => {
      setMessages(prev => prev.map(msg => 
        msg.tempId === data.tempId ? {
          ...msg,
          id: data.messageId,
          deliveryStatus: MessageDeliveryStatus.SENT
        } : msg
      ));
    };

    const handleMessageDelivered = (data: { messageId: string, userId: string }) => {
      setMessages(prev => prev.map(msg => 
        msg.id === data.messageId ? {
          ...msg,
          deliveryStatus: MessageDeliveryStatus.DELIVERED
        } : msg
      ));
    };

    const handleMessageRead = (data: { messageId: string, userId: string, readAt: string }) => {
      setMessages(prev => prev.map(msg => 
        msg.id === data.messageId ? {
          ...msg,
          deliveryStatus: MessageDeliveryStatus.READ,
          readBy: [...(msg.readBy || []), { userId: data.userId, readAt: data.readAt }]
        } : msg
      ));
    };

    const handleMessageFailed = (data: { tempId: string, error: string }) => {
      setMessages(prev => prev.map(msg => 
        msg.tempId === data.tempId ? {
          ...msg,
          deliveryStatus: MessageDeliveryStatus.FAILED
        } : msg
      ));
    };

    socket.on(MessageEvent.NEW, handleNewMessage);
    socket.on(MessageEvent.SENT, handleMessageSent);
    socket.on(MessageEvent.DELIVERED, handleMessageDelivered);
    socket.on(MessageEvent.READ, handleMessageRead);
    socket.on(MessageEvent.FAILED, handleMessageFailed);

    return () => {
      socket.off(MessageEvent.NEW, handleNewMessage);
      socket.off(MessageEvent.SENT, handleMessageSent);
      socket.off(MessageEvent.DELIVERED, handleMessageDelivered);
      socket.off(MessageEvent.READ, handleMessageRead);
      socket.off(MessageEvent.FAILED, handleMessageFailed);
    };
  }, [socket, channelId]);

  const sendMessage = useCallback(async (content: string, parentId?: string) => {
    const tempId = nanoid();
    const tempMessage: Message = {
      tempId,
      content,
      userId: socket?.auth?.userId || '',
      channelId,
      createdAt: new Date().toISOString(),
      deliveryStatus: MessageDeliveryStatus.SENDING,
      readBy: [],
      parentId
    };

    // Optimistic update
    setMessages(prev => [...prev, tempMessage]);

    // Prepare message payload
    const payload: MessagePayload = {
      content,
      channelId,
      tempId,
      parentId
    };

    try {
      if (!socket?.connected) {
        // Store message for later if offline
        messageStorage.saveMessage(channelId, payload);
        throw new Error('Socket not connected');
      }

      // Send message
      socket.emit(MessageEvent.SEND, payload);

      // Wait for sent confirmation
      await new Promise((resolve, reject) => {
        const timeout = setTimeout(() => {
          socket.off(MessageEvent.SENT);
          reject(new Error('Message send timeout'));
        }, 5000);

        socket.once(MessageEvent.SENT, (data: MessageSentEvent) => {
          if (data.tempId === tempId) {
            clearTimeout(timeout);
            resolve(true);
          }
        });
      });

    } catch (error) {
      console.error('Failed to send message:', error);
      setMessages(prev => prev.map(msg => 
        msg.tempId === tempId ? {
          ...msg,
          deliveryStatus: MessageDeliveryStatus.FAILED
        } : msg
      ));
    }
  }, [channelId, socket]);

  const retryMessage = useCallback(async (tempId: string) => {
    const message = messages.find(m => m.tempId === tempId);
    if (!message) return;

    // Reset message state
    setMessages(prev => prev.map(msg => 
      msg.tempId === tempId ? {
        ...msg,
        deliveryStatus: MessageDeliveryStatus.SENDING
      } : msg
    ));

    // Retry sending
    try {
      await sendMessage(message.content, message.parentId);
    } catch (error) {
      console.error('Failed to retry message:', error);
    }
  }, [messages, sendMessage]);

  const markAsRead = useCallback((messageId: string) => {
    if (!socket?.connected || !messageId) return;

    socket.emit(MessageEvent.READ, {
      messageId,
      channelId,
      readAt: new Date().toISOString()
    });
  }, [socket, channelId]);

  // Auto-mark messages as read
  useEffect(() => {
    const unreadMessages = messages
      .filter(m => 
        m.deliveryStatus === MessageDeliveryStatus.DELIVERED &&
        !m.readBy?.some(r => r.userId === socket?.auth?.userId)
      )
      .map(m => m.id)
      .filter(Boolean) as string[];

    unreadMessages.forEach(markAsRead);
  }, [messages, markAsRead, socket?.auth?.userId]);

  return {
    messages,
    isLoading: false,
    sendMessage,
    retryMessage,
    markAsRead
  };
} 