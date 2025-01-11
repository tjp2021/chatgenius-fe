import { useEffect, useCallback, useState } from 'react';
import { useSocket } from '@/providers/socket-provider';
import type { TypingIndicator } from '@/types/message';
import debounce from 'lodash/debounce';

export function useTypingIndicator(channelId: string) {
  const { socket, isConnected } = useSocket();
  const [typingUsers, setTypingUsers] = useState<TypingIndicator[]>([]);

  // Debounced stop typing function
  const debouncedStopTyping = useCallback(() => {
    const stopTypingFn = () => {
      if (socket && isConnected) {
        socket.emit('typing:stop', { channelId });
      }
    };

    return debounce(stopTypingFn, 1000);
  }, [socket, isConnected, channelId])();

  // Start typing function
  const startTyping = useCallback(() => {
    if (socket && isConnected) {
      socket.emit('typing:start', { channelId });
    }
    debouncedStopTyping();
  }, [socket, isConnected, channelId, debouncedStopTyping]);

  // Handle typing events
  useEffect(() => {
    if (!socket || !isConnected) return;

    const handleTypingUpdate = (data: { channelId: string; typingUser: TypingIndicator }) => {
      if (data.channelId !== channelId) return;

      setTypingUsers(prev => {
        // Remove existing typing status for this user
        const filtered = prev.filter(u => u.userId !== data.typingUser.userId);
        // Add new typing status
        return [...filtered, data.typingUser];
      });

      // Remove typing status after timeout
      setTimeout(() => {
        setTypingUsers(prev => prev.filter(u => u.userId !== data.typingUser.userId));
      }, 3000);
    };

    const handleTypingStop = (data: { channelId: string; userId: string }) => {
      if (data.channelId !== channelId) return;

      setTypingUsers(prev => prev.filter(u => u.userId !== data.userId));
    };

    socket.on('typing:start', handleTypingUpdate);
    socket.on('typing:stop', handleTypingStop);

    return () => {
      socket.off('typing:start', handleTypingUpdate);
      socket.off('typing:stop', handleTypingStop);
      debouncedStopTyping.cancel();
    };
  }, [socket, isConnected, channelId, debouncedStopTyping]);

  return {
    typingUsers,
    startTyping
  };
} 