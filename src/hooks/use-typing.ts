'use client';

import { useCallback, useEffect, useState } from 'react';
import { useSocket } from '@/providers/socket-provider';
import { TypingIndicator, MessageEvent } from '@/types/message';

export type TypingActions = {
  startTyping: () => void;
  stopTyping: () => void;
  isTypingEnabled: boolean;
  typingUsers: TypingIndicator[];
};

export function useTyping(channelId: string): TypingActions {
  const { socket, isConnected } = useSocket();
  const [typingUsers, setTypingUsers] = useState<TypingIndicator[]>([]);

  const startTyping = useCallback(() => {
    if (!socket || !isConnected) return;
    socket.emit(MessageEvent.TYPING_START, { channelId });
  }, [socket, channelId, isConnected]);

  const stopTyping = useCallback(() => {
    if (!socket || !isConnected) return;
    socket.emit(MessageEvent.TYPING_STOP, { channelId });
  }, [socket, channelId, isConnected]);

  useEffect(() => {
    if (!socket || !isConnected) return;

    const handleTypingStart = (data: TypingIndicator) => {
      if (data.channelId !== channelId) return;
      setTypingUsers(prev => {
        const filtered = prev.filter(u => u.userId !== data.userId);
        return [...filtered, { ...data, timestamp: Date.now() }];
      });
    };

    const handleTypingStop = (data: { userId: string, channelId: string }) => {
      if (data.channelId !== channelId) return;
      setTypingUsers(prev => prev.filter(u => u.userId !== data.userId));
    };

    socket.on(MessageEvent.TYPING_START, handleTypingStart);
    socket.on(MessageEvent.TYPING_STOP, handleTypingStop);

    return () => {
      socket.off(MessageEvent.TYPING_START, handleTypingStart);
      socket.off(MessageEvent.TYPING_STOP, handleTypingStop);
      setTypingUsers([]);
    };
  }, [socket, isConnected, channelId]);

  // Clean up expired typing indicators
  useEffect(() => {
    const interval = setInterval(() => {
      const now = Date.now();
      setTypingUsers(prev => 
        prev.filter(user => now - user.timestamp < 5000) // 5 seconds expiration
      );
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  return {
    startTyping,
    stopTyping,
    isTypingEnabled: Boolean(socket && isConnected),
    typingUsers: typingUsers.filter(user => {
      const auth = socket?.auth as { userId: string } | undefined;
      return user.userId !== auth?.userId;
    })
  };
} 