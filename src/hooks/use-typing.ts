'use client';

import { useCallback } from 'react';
import { useSocket } from '@/providers/socket-provider';

const TYPING_EVENTS = {
  START: 'typing:start',
  STOP: 'typing:stop'
} as const;

export type TypingActions = {
  startTyping: () => void;
  stopTyping: () => void;
  isTypingEnabled: boolean;
};

export function useTyping(channelId: string): TypingActions {
  const { socket, isConnected } = useSocket();

  const startTyping = useCallback(() => {
    if (!socket || !isConnected) return;
    socket.emit(TYPING_EVENTS.START, { channelId });
  }, [socket, channelId, isConnected]);

  const stopTyping = useCallback(() => {
    if (!socket || !isConnected) return;
    socket.emit(TYPING_EVENTS.STOP, { channelId });
  }, [socket, channelId, isConnected]);

  return {
    startTyping,
    stopTyping,
    isTypingEnabled: Boolean(socket && isConnected)
  };
} 