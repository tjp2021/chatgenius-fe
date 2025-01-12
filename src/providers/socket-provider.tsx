'use client';

import React from 'react';
import { ChatSocketClient, SocketConfig } from '@/lib/socket-client';
import { useAuth } from '@clerk/nextjs';
import { SocketResponse } from '@/types/socket';

interface SocketContextType {
  socket: ChatSocketClient | null;
  isConnected: boolean;
  error: Error | null;
}

const SocketContext = React.createContext<SocketContextType | undefined>(undefined);

export function SocketProvider({ children }: { children: React.ReactNode }) {
  const [socket, setSocket] = React.useState<ChatSocketClient | null>(null);
  const [isConnected, setIsConnected] = React.useState(false);
  const [error, setError] = React.useState<Error | null>(null);
  const { getToken, userId, isLoaded, isSignedIn } = useAuth();

  React.useEffect(() => {
    let socketClient: ChatSocketClient | null = null;
    let mounted = true;

    async function initializeSocket() {
      try {
        // Don't initialize until Clerk is fully loaded and user is signed in
        if (!isLoaded || !isSignedIn || !userId) {
          console.log('[Socket] Waiting for auth:', { isLoaded, isSignedIn, userId });
          return;
        }

        // Get a fresh token
        let token: string | null = null;
        try {
          token = await getToken();
          
          if (!token && mounted) {
            console.error('[Socket] Failed to get auth token');
            setError(new Error('Failed to get authentication token'));
            return;
          }

          console.log('[Socket] Successfully obtained auth token');
        } catch (tokenError) {
          console.error('[Socket] Token fetch error:', tokenError);
          if (mounted) {
            setError(tokenError instanceof Error ? tokenError : new Error('Failed to fetch auth token'));
          }
          return;
        }

        const socketUrl = process.env.NEXT_PUBLIC_SOCKET_URL;
        if (!socketUrl && mounted) {
          console.error('[Socket] Socket URL not configured');
          setError(new Error('Socket URL not configured'));
          return;
        }

        if (!mounted) return;

        console.log('[Socket] Initializing with config:', { 
          url: socketUrl,
          userId,
          hasToken: !!token,
          tokenLength: token?.length
        });

        const config: SocketConfig = {
          url: socketUrl!,
          token: token!,
          userId,
          onAuthError: (error) => {
            console.error('[Socket] Auth error:', error);
            if (mounted) {
              setError(error);
              setIsConnected(false);
              // Try to get a new token and reconnect
              initializeSocket();
            }
          },
          onConnectionError: (error) => {
            console.error('[Socket] Connection error:', {
              error,
              url: socketUrl,
              userId
            });
            if (mounted) {
              setError(error);
              setIsConnected(false);
            }
          },
          onReconnect: () => {
            console.log('[Socket] Reconnected');
            if (mounted) {
              setError(null);
              setIsConnected(true);
            }
          },
          onConnect: () => {
            console.log('[Socket] Connected');
            if (mounted) {
              setError(null);
              setIsConnected(true);
            }
          },
          onDisconnect: () => {
            console.log('[Socket] Disconnected');
            if (mounted) {
              setIsConnected(false);
            }
          }
        };

        socketClient = new ChatSocketClient(config);
        if (mounted) {
          setSocket(socketClient);
        }

      } catch (err) {
        console.error('[Socket] Initialization error:', err);
        if (mounted) {
          setError(err instanceof Error ? err : new Error('Failed to initialize socket'));
          setIsConnected(false);
        }
      }
    }

    initializeSocket();

    // Cleanup function
    return () => {
      mounted = false;
      if (socketClient) {
        console.log('[Socket] Cleaning up socket connection');
        socketClient.disconnect();
        setSocket(null);
        setIsConnected(false);
      }
    };
  }, [getToken, userId, isLoaded, isSignedIn]);

  return (
    <SocketContext.Provider value={{ socket, isConnected, error }}>
      {children}
    </SocketContext.Provider>
  );
}

export function useSocket() {
  const context = React.useContext(SocketContext);
  if (!context) {
    throw new Error('useSocket must be used within a SocketProvider');
  }
  return context;
}