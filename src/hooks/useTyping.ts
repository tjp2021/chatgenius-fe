'use client';

import { useEffect, useCallback, useState } from 'react';
import { useSocket } from '@/providers/socket-provider';
import { TypingIndicator, MessageEvent } from '@/types/message';
import { debounce } from '@/lib/utils';

const TYPING_DEBOUNCE = 500; // 500ms debounce
const TYPING_EXPIRATION = 5000; // 5s expiration

export function useTyping(channelId: string) {
  const { socket } = useSocket();
  const [typingUsers, setTypingUsers] = useState<TypingIndicator[]>([]);

  // Clean up expired typing indicators
  useEffect(() => {
    const interval = setInterval(() => {
      const now = Date.now();
      setTypingUsers(prev => 
        prev.filter(user => now - user.timestamp < TYPING_EXPIRATION)
      );
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  // Handle typing events from other users
  useEffect(() => {
    if (!socket) return;

    const handleTypingStart = (data: TypingIndicator) => {
      if (data.channelId !== channelId) return;

      setTypingUsers(prev => {
        // Remove existing typing indicator for this user if any
        const filtered = prev.filter(u => u.userId !== data.userId);
        return [...filtered, { ...data, timestamp: Date.now() }];
      });
    };

    const handleTypingStop = (data: { userId: string, channelId: string }) => {
      if (data.channelId !== channelId) return;

      setTypingUsers(prev => 
        prev.filter(user => user.userId !== data.userId)
      );
    };

    socket.on(MessageEvent.TYPING_START, handleTypingStart);
    socket.on(MessageEvent.TYPING_STOP, handleTypingStop);

    // Clean up typing indicators when leaving channel
    return () => {
      socket.off(MessageEvent.TYPING_START, handleTypingStart);
      socket.off(MessageEvent.TYPING_STOP, handleTypingStop);
      setTypingUsers([]);
    };
  }, [socket, channelId]);

  // Send typing start event (debounced)
  const sendTypingStart = useCallback(
    debounce(() => {
      if (!socket?.connected) return;

      socket.emit(MessageEvent.TYPING_START, {
        channelId,
        userId: socket.auth?.userId,
        username: socket.auth?.userName,
        timestamp: Date.now()
      });
    }, TYPING_DEBOUNCE),
    [socket, channelId]
  );

  // Send typing stop event
  const sendTypingStop = useCallback(() => {
    if (!socket?.connected) return;

    socket.emit(MessageEvent.TYPING_STOP, {
      channelId,
      userId: socket.auth?.userId
    });
  }, [socket, channelId]);

  // Handle text input
  const handleTyping = useCallback((callback: () => void) => {
    if (!isTyping && isTypingEnabled) {
      setIsTyping(true);
      callback();
    }
  }, [isTyping, isTypingEnabled, setIsTyping]);

  // Handle message send (clear typing indicator)
  const handleMessageSent = useCallback(() => {
    sendTypingStop();
  }, [sendTypingStop]);

  return {
    typingUsers: typingUsers.filter(user => user.userId !== socket?.auth?.userId),
    handleTyping,
    handleMessageSent
  };
} 