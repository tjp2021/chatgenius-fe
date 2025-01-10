'use client';

import { useEffect, useRef, useCallback, useState } from 'react';
import { useAuth } from '@clerk/nextjs';
import { ChatSocketClient } from '@/lib/socket-client';

export function useSocket() {
  const socketRef = useRef<ChatSocketClient>();
  const { getToken, userId } = useAuth();
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [reconnectAttempts, setReconnectAttempts] = useState(0);

  const MAX_RECONNECT_ATTEMPTS = 5;
  const RECONNECT_INTERVAL = 5000;
  const CONNECTION_TIMEOUT = 10000;

  useEffect(() => {
    const initSocket = async () => {
      try {
        setIsConnecting(true);
        setError(null);

        const token = await getToken();
        if (!token || !userId) {
          throw new Error('Authentication not ready');
        }

        await cleanupExistingSocket();

        const socketUrl = new URL(process.env.NEXT_PUBLIC_SOCKET_URL || 'ws://localhost:3001');
        console.log('[Socket] Initializing connection to:', socketUrl.toString());

        socketRef.current = new ChatSocketClient({
          url: socketUrl.toString(),
          token,
          userId,
          timeout: CONNECTION_TIMEOUT,
          reconnectOptions: {
            maxAttempts: MAX_RECONNECT_ATTEMPTS,
            interval: RECONNECT_INTERVAL
          },
          onAuthError: handleAuthError,
          onConnectionError: handleConnectionError,
          onReconnect: handleReconnect,
          onDisconnect: handleDisconnect
        });

        await establishInitialConnection();
      } catch (err) {
        handleInitializationError(err);
      } finally {
        setIsConnecting(false);
      }
    };

    initSocket();

    return () => {
      if (socketRef.current) {
        console.log('[Socket] Cleaning up socket connection');
        socketRef.current.disconnect();
        socketRef.current = undefined;
        setIsConnected(false);
        setError(null);
      }
    };
  }, [userId]);

  const cleanupExistingSocket = async () => {
    if (socketRef.current) {
      console.log('[Socket] Cleaning up existing connection');
      await socketRef.current.disconnect();
      socketRef.current = undefined;
    }
  };

  const sendMessage = useCallback(async (channelId: string, content: string) => {
    if (!socketRef.current?.isConnected) {
      throw new Error('Socket not connected');
    }
    return socketRef.current.sendMessage(channelId, content);
  }, []);

  const markAsRead = useCallback(async (messageId: string) => {
    if (!socketRef.current?.isConnected) {
      throw new Error('Socket not connected');
    }
    return socketRef.current.markAsRead(messageId);
  }, []);

  const confirmDelivery = useCallback(async (messageId: string) => {
    if (!socketRef.current?.isConnected) {
      throw new Error('Socket not connected');
    }
    return socketRef.current.confirmDelivery(messageId);
  }, []);

  return {
    socket: socketRef.current,
    isConnected,
    isConnecting,
    error,
    sendMessage,
    markAsRead,
    confirmDelivery
  };
} 