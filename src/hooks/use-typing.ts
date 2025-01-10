'use client';

import { useCallback, useEffect, useRef } from 'react';
import { useSocket } from '@/providers/socket-provider';
import { MessageEvent } from '@/types';
import { FEATURES } from '@/config/features';

export function useTyping(channelId: string) {
  const { socket } = useSocket();
  const typingTimeoutRef = useRef<NodeJS.Timeout>();

  const sendTypingStart = useCallback(() => {
    if (!socket || !FEATURES.ENABLE_REAL_TIME_FEATURES) return;
    
    socket.emit(MessageEvent.TYPING_START, { channelId });
    
    // Clear existing timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    // Set new timeout to stop typing indicator
    typingTimeoutRef.current = setTimeout(() => {
      socket.emit(MessageEvent.TYPING_STOP, { channelId });
    }, 2000);
  }, [socket, channelId]);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
    };
  }, []);

  return { sendTypingStart };
} 