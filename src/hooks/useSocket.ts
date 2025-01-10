'use client';

import { useEffect, useRef, useCallback, useState } from 'react';
import { useAuth } from '@clerk/nextjs';
import { ChatSocketClient } from '@/lib/socket-client';
import { socketLogger } from '@/lib/socket-logger';

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

  const handleAuthError = useCallback((error: Error) => {
    socketLogger.error(error, { type: 'auth' });
    setError(error);
    setIsConnected(false);
    // Trigger token refresh and reconnection
    initSocket();
  }, []);

  const handleConnectionError = useCallback((error: Error) => {
    socketLogger.error(error, { type: 'connection' });
    setError(error);
    setIsConnected(false);
    setReconnectAttempts(prev => prev + 1);
  }, []);

  const handleReconnect = useCallback(() => {
    socketLogger.info('Reconnected successfully');
    setError(null);
    setIsConnected(true);
    setReconnectAttempts(0);
  }, []);

  const handleDisconnect = useCallback((reason: string) => {
    socketLogger.warn(`Disconnected: ${reason}`);
    setIsConnected(false);
    if (reason === 'io server disconnect') {
      // Server initiated disconnect, attempt reconnect
      initSocket();
    }
  }, []);

  const establishInitialConnection = useCallback(async () => {
    if (!socketRef.current) {
      throw new Error('Socket not initialized');
    }

    return new Promise<void>((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('Connection timeout'));
      }, CONNECTION_TIMEOUT);

      const checkConnection = () => {
        if (socketRef.current?.isConnected) {
          clearTimeout(timeout);
          setIsConnected(true);
          resolve();
        } else if (!socketRef.current) {
          clearTimeout(timeout);
          reject(new Error('Socket initialization failed'));
        } else {
          setTimeout(checkConnection, 100);
        }
      };

      checkConnection();
    });
  }, []);

  const handleInitializationError = useCallback((err: unknown) => {
    const error = err instanceof Error ? err : new Error('Socket initialization failed');
    socketLogger.error(error, { phase: 'initialization' });
    setError(error);
    setIsConnected(false);
  }, []);

  const getSocketUrl = useCallback((url: string) => {
    try {
      const parsedUrl = new URL(url);
      // Force WebSocket protocol
      return parsedUrl.protocol === 'https:' 
        ? `wss://${parsedUrl.host}` 
        : `ws://${parsedUrl.host}`;
    } catch (error) {
      throw new Error(`Invalid socket URL: ${url}`);
    }
  }, []);

  const initSocket = useCallback(async () => {
    try {
      setIsConnecting(true);
      setError(null);

      const token = await getToken();
      if (!token || !userId) {
        throw new Error('Authentication not ready');
      }

      await cleanupExistingSocket();

      const rawUrl = process.env.NEXT_PUBLIC_SOCKET_URL || 'ws://localhost:3001';
      const socketUrl = getSocketUrl(rawUrl);
      socketLogger.debug('Initializing connection to:', socketUrl);

      socketRef.current = new ChatSocketClient({
        url: socketUrl,
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
  }, [userId, getToken, handleAuthError, handleConnectionError, handleReconnect, handleDisconnect, establishInitialConnection, handleInitializationError, getSocketUrl]);

  const cleanupExistingSocket = useCallback(async () => {
    if (socketRef.current) {
      socketLogger.debug('Cleaning up existing connection');
      await socketRef.current.disconnect();
      socketRef.current = undefined;
    }
  }, []);

  useEffect(() => {
    initSocket();

    return () => {
      cleanupExistingSocket();
      setIsConnected(false);
      setError(null);
    };
  }, [userId, initSocket, cleanupExistingSocket]);

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