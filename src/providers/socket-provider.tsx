'use client';

import React, { useEffect, useRef, useCallback } from 'react';
import { useAuth } from '@clerk/nextjs';
import { ChatSocketClient, SocketConfig } from '@/lib/socket-client';
import { useToast } from '@/components/ui/use-toast';

interface SocketContextType {
  socket: ChatSocketClient | null;
  isConnected: boolean;
}

const SocketContext = React.createContext<SocketContextType>({
  socket: null,
  isConnected: false
});

const RECONNECTION_CONFIG = {
  reconnection: true,
  reconnectionAttempts: 3,
  reconnectionDelay: 1000,
  reconnectionDelayMax: 5000,
  timeout: 10000
} as const;

export function SocketProvider({ children }: { children: React.ReactNode }) {
  const [socket, setSocket] = React.useState<ChatSocketClient | null>(null);
  const [isConnected, setIsConnected] = React.useState(false);
  const { getToken, userId } = useAuth();
  const { toast } = useToast();
  const socketRef = useRef<ChatSocketClient | null>(null);
  const reconnectAttemptsRef = useRef(0);
  const cleanupRef = useRef(false);
  const initializingRef = useRef(false);

  const cleanup = useCallback(() => {
    if (socketRef.current && !cleanupRef.current) {
      console.log('SOCKET CLEANUP - Starting cleanup', {
        socketId: socketRef.current.getSocketId(),
        timestamp: new Date().toISOString()
      });
      
      // Set cleanup flag first to prevent re-entry
      cleanupRef.current = true;
      
      // Update state before socket cleanup
      setIsConnected(false);
      setSocket(null);
      
      // Reset refs
      reconnectAttemptsRef.current = 0;
      initializingRef.current = false;
      
      // Finally cleanup the socket
      const socket = socketRef.current;
      socketRef.current = null;
      
      try {
        socket.disconnect();
      } catch (error) {
        console.error('SOCKET CLEANUP - Error during disconnect:', error);
      }
    }
  }, []);

  const validateAuth = useCallback(async () => {
    if (!userId) {
      console.log('AUTH CHECK - No userId available', {
        timestamp: new Date().toISOString()
      });
      return false;
    }

    try {
      const token = await getToken();
      if (!token) {
        console.log('AUTH CHECK - No token available', {
          userId,
          timestamp: new Date().toISOString()
        });
        return false;
      }
      return { userId, token };
    } catch (error) {
      console.error('AUTH CHECK - Token fetch failed', {
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      });
      return false;
    }
  }, [userId, getToken]);

  useEffect(() => {
    const initializeSocket = async () => {
      // Prevent multiple initialization attempts
      if (initializingRef.current || cleanupRef.current || socketRef.current) {
        return;
      }

      initializingRef.current = true;
      cleanupRef.current = false;

      try {
        // Validate auth
        const token = await getToken();
        if (!token || !userId) {
          console.error('SOCKET INIT - Missing auth credentials:', {
            hasToken: !!token,
            hasUserId: !!userId,
            timestamp: new Date().toISOString()
          });
          cleanup();
          return;
        }

        const socketUrl = process.env.NEXT_PUBLIC_SOCKET_URL;
        if (!socketUrl) {
          console.error('SOCKET INIT - Missing socket URL');
          cleanup();
          return;
        }

        console.log('SOCKET INIT - Creating new connection', {
          url: socketUrl,
          userId,
          hasToken: !!token,
          timestamp: new Date().toISOString()
        });

        const socketConfig: SocketConfig = {
          url: socketUrl,
          token,
          userId,
          reconnectionConfig: RECONNECTION_CONFIG,
          onAuthError: (error: Error) => {
            console.error('SOCKET AUTH - Error:', {
              error: error.message,
              userId,
              timestamp: new Date().toISOString()
            });
            toast({
              title: 'Socket Authentication Error',
              description: 'Failed to authenticate socket connection. Please try again.',
              variant: 'destructive'
            });
            setIsConnected(false);
            cleanup();
          },
          onConnectionError: (error: Error) => {
            console.error('SOCKET CONN - Error:', {
              error: error.message,
              userId,
              timestamp: new Date().toISOString()
            });
            setIsConnected(false);
          },
          onConnect: () => {
            console.log('SOCKET CONN - Connected:', {
              userId,
              timestamp: new Date().toISOString()
            });
            setIsConnected(true);
          },
          onDisconnect: (reason: string) => {
            console.log('SOCKET CONN - Disconnected:', {
              reason,
              userId,
              timestamp: new Date().toISOString()
            });
            setIsConnected(false);
            if (reason === 'io server disconnect') {
              cleanup();
            }
          }
        };

        const newSocketClient = ChatSocketClient.getInstance(socketConfig);
        socketRef.current = newSocketClient;
        setSocket(newSocketClient);

      } catch (error) {
        console.error('SOCKET INIT - Failed:', {
          error: error instanceof Error ? error.message : 'Unknown error',
          userId,
          timestamp: new Date().toISOString()
        });
        cleanup();
      } finally {
        initializingRef.current = false;
      }
    };

    if (userId && !socketRef.current && !cleanupRef.current && !initializingRef.current) {
      console.log('SOCKET INIT - Starting', {
        userId,
        timestamp: new Date().toISOString()
      });
      initializeSocket();
    }

    return () => {
      cleanup();
    };
  }, [userId, getToken, cleanup, toast]);

  return (
    <SocketContext.Provider value={{ socket, isConnected }}>
      {children}
    </SocketContext.Provider>
  );
}

export function useSocket() {
  return React.useContext(SocketContext);
}