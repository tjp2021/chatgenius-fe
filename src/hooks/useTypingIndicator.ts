import { useEffect, useCallback, useState } from 'react';
import { useSocket } from '@/providers/socket-provider';
import { SocketEvent } from '@/lib/socket-config';
import { TypingUser } from '@/types/channel';
import debounce from 'lodash/debounce';

export function useTypingIndicator(channelId: string) {
  const { socket, isConnected } = useSocket();
  const [typingUsers, setTypingUsers] = useState<TypingUser[]>([]);

  // Debounced stop typing function
  const debouncedStopTyping = useCallback(
    debounce(() => {
      if (socket && isConnected) {
        socket.emit(SocketEvent.TYPING_STOP, { channelId });
      }
    }, 1000),
    [socket, isConnected, channelId]
  );

  // Start typing function
  const startTyping = useCallback(() => {
    if (socket && isConnected) {
      socket.emit(SocketEvent.TYPING_START, { channelId });
    }
    debouncedStopTyping();
  }, [socket, isConnected, channelId, debouncedStopTyping]);

  // Handle typing events
  useEffect(() => {
    if (!socket || !isConnected) return;

    const handleTypingUpdate = (data: { channelId: string; typingUser: TypingUser }) => {
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

    socket.on(SocketEvent.TYPING_UPDATE, handleTypingUpdate);
    socket.on(SocketEvent.TYPING_STOP, handleTypingStop);

    return () => {
      socket.off(SocketEvent.TYPING_UPDATE, handleTypingUpdate);
      socket.off(SocketEvent.TYPING_STOP, handleTypingStop);
      debouncedStopTyping.cancel();
    };
  }, [socket, isConnected, channelId, debouncedStopTyping]);

  return {
    typingUsers,
    startTyping
  };
} 