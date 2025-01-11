'use client';

import { nanoid } from 'nanoid';
import { useState, useEffect, useCallback } from 'react';
import { useSocket } from '@/providers/socket-provider';
import type { Message } from '@/types/message';
import { MessageEvent } from '@/types/message';

export function useSocketMessages(channelId: string) {
  const [messages, setMessages] = useState<Message[]>([]);
  const { socket } = useSocket();

  useEffect(() => {
    if (!socket || !channelId) return;

    socket.on('message:new', (message: Message) => {
      setMessages(prev => [...prev, message]);
    });

    socket.on('message:delivered', (messageId: string) => {
      setMessages(prev => prev.map(msg => 
        msg.id === messageId ? { ...msg, status: MessageEvent.DELIVERED } : msg
      ));
    });

    socket.on('message:read', (messageId: string) => {
      setMessages(prev => prev.map(msg => 
        msg.id === messageId ? { ...msg, status: MessageEvent.READ } : msg
      ));
    });

    return () => {
      socket.off('message:new');
      socket.off('message:delivered');
      socket.off('message:read');
    };
  }, [socket, channelId]);

  const sendMessage = useCallback((content: string) => {
    if (!socket || !channelId) return;

    const message: Message = {
      id: nanoid(),
      content,
      channelId,
      createdAt: new Date().toISOString(),
      status: MessageEvent.SENT,
      userId: socket.auth?.userId
    };

    setMessages(prev => [...prev, message]);
    socket.emit('message:send', { channelId, content });
  }, [socket, channelId]);

  return { messages, sendMessage };
} 