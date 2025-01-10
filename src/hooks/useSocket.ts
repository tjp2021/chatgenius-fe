import { useEffect, useRef, useCallback } from 'react';
import { useAuth } from '@clerk/nextjs';
import { ChatSocketClient } from '@/lib/socket-client';

export function useSocket() {
  const socketRef = useRef<ChatSocketClient>();
  const { getToken, userId } = useAuth();

  useEffect(() => {
    const initSocket = async () => {
      const token = await getToken();
      if (!token || !userId) return;

      socketRef.current = new ChatSocketClient({
        url: process.env.NEXT_PUBLIC_API_URL!,
        token,
        userId,
        onAuthError: async (error) => {
          // Get fresh token and reconnect
          const newToken = await getToken();
          if (newToken) {
            socketRef.current?.updateCredentials(newToken, userId);
          }
        },
        onConnectionError: (error) => {
          console.error('Socket connection error:', error);
        },
        onReconnect: () => {
          console.log('Socket reconnected successfully');
        }
      });
    };

    initSocket();

    return () => {
      socketRef.current?.disconnect();
    };
  }, [getToken, userId]);

  const sendMessage = useCallback(async (channelId: string, content: string) => {
    return socketRef.current?.sendMessage(channelId, content);
  }, []);

  const markAsRead = useCallback(async (messageId: string) => {
    return socketRef.current?.markAsRead(messageId);
  }, []);

  const confirmDelivery = useCallback(async (messageId: string) => {
    return socketRef.current?.confirmDelivery(messageId);
  }, []);

  return {
    socket: socketRef.current,
    sendMessage,
    markAsRead,
    confirmDelivery
  };
} 