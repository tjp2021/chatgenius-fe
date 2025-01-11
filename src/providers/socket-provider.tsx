'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import { ChatSocketClient, SocketConfig } from '@/lib/socket-client';
import { useAuth } from '@clerk/nextjs';
import { SocketResponse } from '@/types/socket';

interface SocketContextType {
  socket: ChatSocketClient | null;
  isConnected: boolean;
  error: Error | null;
}

const SocketContext = createContext<SocketContextType | undefined>(undefined);

export function SocketProvider({ children }: { children: React.ReactNode }) {
  const [socket, setSocket] = useState<ChatSocketClient | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const { getToken, userId } = useAuth();

  useEffect(() => {
    let socketClient: ChatSocketClient | null = null;

    async function initializeSocket() {
      try {
        const token = await getToken();
        if (!token || !userId) {
          setIsConnected(false);
          return;
        }

        const config: SocketConfig = {
          url: process.env.NEXT_PUBLIC_API_URL!,
          token,
          userId,
          onAuthError: (error) => {
            console.error('Socket auth error:', error);
            setError(error);
            setIsConnected(false);
          },
          onConnectionError: (error) => {
            console.error('Socket connection error:', error);
            setError(error);
            setIsConnected(false);
          },
          onReconnect: () => {
            console.log('Socket reconnected');
            setError(null);
            setIsConnected(true);
          },
          onConnect: () => {
            console.log('Socket connected');
            setError(null);
            setIsConnected(true);
          },
          onDisconnect: () => {
            console.log('Socket disconnected');
            setIsConnected(false);
          }
        };

        socketClient = new ChatSocketClient(config);
        setSocket(socketClient);

      } catch (err) {
        console.error('Error initializing socket:', err);
        setError(err instanceof Error ? err : new Error('Failed to initialize socket'));
        setIsConnected(false);
      }
    }

    initializeSocket();

    return () => {
      if (socketClient) {
        socketClient.disconnect();
        setSocket(null);
        setIsConnected(false);
      }
    };
  }, [getToken, userId]);

  return (
    <SocketContext.Provider value={{ socket, isConnected, error }}>
      {children}
    </SocketContext.Provider>
  );
}

export function useSocket() {
  const context = useContext(SocketContext);
  if (!context) {
    throw new Error('useSocket must be used within a SocketProvider');
  }
  return context;
}