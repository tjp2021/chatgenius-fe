'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import { useUser, useAuth } from '@clerk/nextjs';
import { ChatSocketClient } from '@/lib/socket-client';
import { SocketResponse } from '@/types/socket';

interface SocketContextType {
  socket: ChatSocketClient | null;
  isConnected: boolean;
  error: Error | null;
}

const SocketContext = createContext<SocketContextType>({
  socket: null,
  isConnected: false,
  error: null
});

export function useSocket() {
  const context = useContext(SocketContext);
  if (!context) {
    throw new Error('useSocket must be used within a SocketProvider');
  }
  return context;
}

export function SocketProvider({ children }: { children: React.ReactNode }) {
  const [socket, setSocket] = useState<ChatSocketClient | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const { user, isLoaded } = useUser();
  const { getToken } = useAuth();

  useEffect(() => {
    if (!isLoaded || !user) return;

    const initializeSocket = async () => {
      try {
        // Get the socket URL from environment
        const socketUrl = process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:3002';
        console.log('[SocketProvider] Initializing with URL:', socketUrl);

        // Get JWT token from Clerk
        const token = await getToken();
        if (!token) {
          throw new Error('Failed to get authentication token');
        }

        /*******************************************************************
         * ⚠️ CRITICAL SOCKET CONFIGURATION - DO NOT MODIFY ⚠️
         * 
         * This socket configuration has been finalized and tested.
         * DO NOT change any of these settings or parameters.
         * DO NOT modify the authentication flow.
         * DO NOT alter the connection handling.
         * 
         * Any changes to this configuration may break the WebSocket
         * connection and real-time functionality.
         *******************************************************************/
        const socketClient = ChatSocketClient.getInstance({
          url: socketUrl,
          token: token,
          userId: user.id,
          onConnect: () => {
            console.log('[SocketProvider] Connected successfully to:', socketUrl);
            setIsConnected(true);
            setError(null);
          },
          onDisconnect: (reason) => {
            console.log('[SocketProvider] Disconnected from:', socketUrl, 'reason:', reason);
            setIsConnected(false);
          },
          onAuthError: (error) => {
            console.error('[SocketProvider] Auth error with:', socketUrl, error);
            setError(error);
            setIsConnected(false);
          },
          onConnectionError: (error) => {
            console.error('[SocketProvider] Connection error with:', socketUrl, error);
            setError(error);
            setIsConnected(false);
          }
        });
        /*******************************************************************/

        setSocket(socketClient);
      } catch (err) {
        console.error('[SocketProvider] Failed to initialize socket:', err);
        setError(err instanceof Error ? err : new Error('Failed to initialize socket'));
        setIsConnected(false);
      }
    };

    initializeSocket();

    return () => {
      socket?.disconnect();
    };
  }, [isLoaded, user, getToken]);

  return (
    <SocketContext.Provider value={{ socket, isConnected, error }}>
      {children}
    </SocketContext.Provider>
  );
}