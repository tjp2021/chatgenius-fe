'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import { useAuth } from '@clerk/nextjs';
import { MessageResponse } from '@/types/message';

interface SocketResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
}

type SocketEmit = <T = any>(event: string, data: any) => Promise<SocketResponse<T>>;

interface CustomSocket extends Omit<Socket, 'emit'> {
  auth: {
    token: string;
    userId: string;
  };
  emit: SocketEmit;
  isConnected: boolean;
}

interface SocketConfig {
  url: string;
  options?: any;
}

export function useSocket(config?: SocketConfig) {
  const { getToken, userId } = useAuth();
  const [socket, setSocket] = useState<CustomSocket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const socketRef = useRef<CustomSocket | null>(null);

  const initSocket = useCallback(async () => {
    try {
      const token = await getToken();
      if (!token || !userId) return null;

      const socketInstance = io(config?.url || process.env.NEXT_PUBLIC_SOCKET_URL!, {
        auth: { token, userId },
        ...config?.options
      });

      // Create custom socket instance
      const customSocket = socketInstance as unknown as CustomSocket;
      customSocket.auth = { token, userId };

      // Override emit to handle promises
      const originalEmit = socketInstance.emit.bind(socketInstance);
      customSocket.emit = (<T = any>(event: string, data: any) => {
        return new Promise<SocketResponse<T>>((resolve) => {
          originalEmit(event, data, resolve);
        });
      });

      customSocket.on('connect', () => {
        setIsConnected(true);
        setIsConnecting(false);
      });

      customSocket.on('disconnect', () => {
        setIsConnected(false);
        setIsConnecting(false);
      });

      return customSocket;
    } catch (error) {
      setIsConnecting(false);
      return null;
    }
  }, [config, getToken, userId]);

  const connect = useCallback(async () => {
    setIsConnecting(true);
    const socketInstance = await initSocket();
    if (socketInstance) {
      socketRef.current = socketInstance;
      setSocket(socketInstance);
    } else {
      setIsConnecting(false);
    }
  }, [initSocket]);

  const disconnect = useCallback(() => {
    if (socketRef.current) {
      socketRef.current.disconnect();
      socketRef.current = null;
      setSocket(null);
      setIsConnected(false);
      setIsConnecting(false);
    }
  }, []);

  useEffect(() => {
    connect();
    return () => {
      disconnect();
    };
  }, [connect, disconnect]);

  return {
    socket,
    isConnected,
    isConnecting
  };
} 