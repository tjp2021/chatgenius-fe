'use client';

import { nanoid } from 'nanoid';
import { useState, useEffect, useCallback } from 'react';
import { useSocket } from '@/providers/socket-provider';
import type { Message } from '@/types/message';
import { MessageDeliveryStatus } from '@/types/message';
import { SOCKET_EVENTS } from '@/constants/socket-events';

export function useSocketMessages(channelId: string) {
  const [messages, setMessages] = useState<Message[]>([]);
  const { socket } = useSocket();

  useEffect(() => {
    if (!socket || !channelId) return;

    const handleNewMessage = (message: Message) => {
      setMessages(prev => [...prev, message]);
    };

    const handleMessageDelivered = (messageId: string) => {
      setMessages(prev => prev.map(msg => 
        msg.id === messageId ? { ...msg, status: MessageDeliveryStatus.DELIVERED } : msg
      ));
    };

    const handleMessageRead = (messageId: string) => {
      setMessages(prev => prev.map(msg => 
        msg.id === messageId ? { ...msg, status: MessageDeliveryStatus.READ } : msg
      ));
    };

    socket.on(SOCKET_EVENTS.MESSAGE.NEW, handleNewMessage);
    socket.on(SOCKET_EVENTS.MESSAGE.DELIVERED, handleMessageDelivered);
    socket.on(SOCKET_EVENTS.MESSAGE.READ, handleMessageRead);

    return () => {
      socket.off(SOCKET_EVENTS.MESSAGE.NEW, handleNewMessage);
      socket.off(SOCKET_EVENTS.MESSAGE.DELIVERED, handleMessageDelivered);
      socket.off(SOCKET_EVENTS.MESSAGE.READ, handleMessageRead);
    };
  }, [socket, channelId]);

  const sendMessage = useCallback((content: string) => {
    if (!socket || !channelId) return;

    const message: Message = {
      id: nanoid(),
      content,
      channelId,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      status: MessageDeliveryStatus.SENT,
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
    socket.emit(SOCKET_EVENTS.MESSAGE.SEND, { channelId, content });
  }, [socket, channelId]);

  return { messages, sendMessage };
} 