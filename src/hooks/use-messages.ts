'use client';

import { useEffect, useState, useCallback } from 'react';
import { useSocket } from '@/providers/socket-provider';
import { Message, MessageListResponse, MessageDeliveryStatus } from '@/types/message';
import { nanoid } from 'nanoid';
import { SOCKET_EVENTS } from '@/constants/socket-events';

export function useMessages(channelId: string) {
  const [messages, setMessages] = useState<Message[]>([]);
  const { socket } = useSocket();

  useEffect(() => {
    if (!socket || !channelId) return;

    const handleMessageDelivered = (messageId: string) => {
      setMessages(prev => prev.map(msg => 
        msg.id === messageId ? { ...msg, status: MessageDeliveryStatus.DELIVERED } : msg
      ));
    };

    const handleNewMessage = (message: Message) => {
      setMessages(prev => {
        if (prev.some(m => m.id === message.id)) {
          return prev;
        }
        return [...prev, message];
      });
    };

    socket?.on(SOCKET_EVENTS.MESSAGE.DELIVERED, handleMessageDelivered);
    socket?.on(SOCKET_EVENTS.MESSAGE.NEW, handleNewMessage);

    return () => {
      socket?.off(SOCKET_EVENTS.MESSAGE.DELIVERED, handleMessageDelivered);
      socket?.off(SOCKET_EVENTS.MESSAGE.NEW, handleNewMessage);
    };
  }, [socket, channelId]);

  const sendMessage = useCallback(async (content: string) => {
    if (!socket || !channelId) return;

    const tempId = nanoid();
    const message: Message = {
      id: tempId,
      content,
      channelId,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      status: MessageDeliveryStatus.SENDING,
      userId: socket.auth?.userId,
      user: {
        id: socket.auth?.userId || '',
        name: 'You'
      },
      reactions: [],
      isRead: false,
      isDelivered: false,
      replyToId: null
    };

    setMessages(prev => [...prev, message]);
    socket.emit(SOCKET_EVENTS.MESSAGE.SEND, { channelId, content, tempId });
  }, [socket, channelId]);

  return { messages, sendMessage };
} 