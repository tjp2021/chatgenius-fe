'use client';

import { useState, useCallback, useEffect } from 'react';
import { useSocket } from '@/hooks/useSocket';
import { useQueryClient } from '@tanstack/react-query';
import { nanoid } from 'nanoid';

interface Message {
  id?: string;
  tempId?: string;
  content: string;
  userId: string;
  channelId: string;
  createdAt: string;
  isPending?: boolean;
  isFailed?: boolean;
}

export function useMessages(channelId: string) {
  const [messages, setMessages] = useState<Message[]>([]);
  const socket = useSocket();
  const queryClient = useQueryClient();

  // Mock initial messages for development
  useEffect(() => {
    setMessages([
      {
        id: '1',
        content: 'Hello World',
        userId: 'user1',
        channelId,
        createdAt: new Date().toISOString()
      },
      {
        id: '2',
        content: 'This is a test message',
        userId: 'user2',
        channelId,
        createdAt: new Date().toISOString()
      }
    ]);
  }, [channelId]);

  const sendMessage = useCallback(async (content: string) => {
    const tempId = nanoid();
    const tempMessage: Message = {
      tempId,
      content,
      userId: 'currentUser', // We'll get this from auth context later
      channelId,
      createdAt: new Date().toISOString(),
      isPending: true
    };

    // Optimistically add message
    setMessages(prev => [...prev, tempMessage]);

    try {
      // This will be replaced with actual socket emit when BE is ready
      await new Promise(resolve => setTimeout(resolve, 1000)); // Simulate network delay
      
      // Simulate successful message send
      setMessages(prev => 
        prev.map(msg => 
          msg.tempId === tempId 
            ? { ...msg, id: nanoid(), isPending: false }
            : msg
        )
      );
    } catch (error) {
      setMessages(prev => 
        prev.map(msg => 
          msg.tempId === tempId 
            ? { ...msg, isPending: false, isFailed: true }
            : msg
        )
      );
    }
  }, [channelId]);

  const retryMessage = useCallback(async (tempId: string) => {
    const message = messages.find(m => m.tempId === tempId);
    if (!message) return;

    setMessages(prev => 
      prev.map(msg => 
        msg.tempId === tempId 
          ? { ...msg, isPending: true, isFailed: false }
          : msg
      )
    );

    try {
      // This will be replaced with actual socket emit
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      setMessages(prev => 
        prev.map(msg => 
          msg.tempId === tempId 
            ? { ...msg, id: nanoid(), isPending: false }
            : msg
        )
      );
    } catch (error) {
      setMessages(prev => 
        prev.map(msg => 
          msg.tempId === tempId 
            ? { ...msg, isPending: false, isFailed: true }
            : msg
        )
      );
    }
  }, [messages]);

  return {
    messages,
    isLoading: false,
    sendMessage,
    retryMessage
  };
} 