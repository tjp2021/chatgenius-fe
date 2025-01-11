'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import { io } from 'socket.io-client';
import { useAuth } from '@clerk/nextjs';
import { CustomSocket, SocketResponse } from '@/types/socket';
import { Message, MessageEvent } from '@/types/message';

interface SocketContextType {
  socket: CustomSocket | null;
  isConnected: boolean;
  isAuthReady: boolean;
  isSocketReady: boolean;
  isConnecting: boolean;
  error: Error | null;
  sendMessage: (channelId: string, content: string) => Promise<void>;
  markAsRead: (messageId: string, channelId: string) => void;
}

const defaultContext: SocketContextType = {
  socket: null,
  isConnected: false,
  isAuthReady: false,
  isSocketReady: false,
  isConnecting: false,
  error: null,
  sendMessage: async (_channelId: string, _content: string) => {
    throw new Error('Socket context not initialized');
  },
  markAsRead: (_messageId: string, _channelId: string) => {
    throw new Error('Socket context not initialized');
  }
};

const SocketContext = createContext<SocketContextType>(defaultContext);

export const useSocket = () => {
  return useContext(SocketContext);
};

export function SocketProvider({ children }: { children: React.ReactNode }) {
  const [socket, setSocket] = useState<CustomSocket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const { userId, isLoaded: isAuthReady } = useAuth();
  const isSocketReady = Boolean(socket);

  useEffect(() => {
    if (!userId) return;

    const socketUrl = process.env.NEXT_PUBLIC_SOCKET_URL;
    if (!socketUrl) {
      setError(new Error('Socket URL not configured'));
      return;
    }

    setIsConnecting(true);
    const socketInstance = io(socketUrl, {
      auth: { userId }
    }) as CustomSocket;

    socketInstance.isConnected = false;

    socketInstance.sendMessage = (channelId: string, content: string, tempId: string) => {
      return new Promise((resolve, reject) => {
        socketInstance.emit(MessageEvent.SEND, {
          channelId,
          content,
          tempId
        }, (response: SocketResponse<Message>) => {
          if (response.success) {
            resolve(response);
          } else {
            reject(new Error(response.error || 'Failed to send message'));
          }
        });
      });
    };

    socketInstance.on('connect', () => {
      console.log('Socket connected');
      socketInstance.isConnected = true;
      setIsConnected(true);
      setIsConnecting(false);
      setError(null);
    });

    socketInstance.on('connect_error', (err) => {
      console.error('Socket connection error:', err);
      setError(err instanceof Error ? err : new Error('Connection failed'));
      setIsConnecting(false);
    });

    socketInstance.on('disconnect', () => {
      console.log('Socket disconnected');
      socketInstance.isConnected = false;
      setIsConnected(false);
      setIsConnecting(false);
    });

    setSocket(socketInstance);

    return () => {
      socketInstance.disconnect();
      setSocket(null);
      setIsConnected(false);
      setIsConnecting(false);
    };
  }, [userId]);

  const sendMessage = async (channelId: string, content: string) => {
    if (!socket || !isConnected) {
      throw new Error('Socket not connected');
    }
    const tempId = Math.random().toString(36).substring(7);
    await socket.sendMessage(channelId, content, tempId);
  };

  const markAsRead = (messageId: string, channelId: string) => {
    if (!socket || !isConnected) return;
    socket.emit(MessageEvent.READ, { messageId, channelId });
  };

  return (
    <SocketContext.Provider value={{
      socket,
      isConnected,
      isAuthReady,
      isSocketReady,
      isConnecting,
      error,
      sendMessage,
      markAsRead
    }}>
      {children}
    </SocketContext.Provider>
  );
}