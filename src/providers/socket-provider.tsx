'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from 'react';
import { Manager } from 'socket.io-client';
import type { Socket as ClientSocket } from 'socket.io-client';
import { useAuth } from '@clerk/nextjs';

interface SocketContextType {
  socket: ClientSocket | null;
  isConnected: boolean;
  error: Error | null;
}

const SocketContext = createContext<SocketContextType>({
  socket: null,
  isConnected: false,
  error: null,
});

export function SocketProvider({ children }: { children: React.ReactNode }) {
  const [socket, setSocket] = useState<ClientSocket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const { getToken, isLoaded, userId } = useAuth();

  const initSocket = useCallback(async () => {
    try {
      // Wait for auth to be loaded and userId to be available
      if (!isLoaded || !userId) {
        return;
      }

      // Get raw token - do NOT add 'Bearer ' prefix for WebSocket
      const token = await getToken();  // Get raw token without template
      if (!token) {
        console.error('No token available');
        return;
      }

      console.log('Initializing socket with token:', token.slice(0, 10) + '...');

      const manager = new Manager(process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001', {
        transports: ['websocket'],  // Only use websocket transport
        autoConnect: false,  // Manual connection control
        path: '/socket.io/',
        reconnection: true,
        reconnectionAttempts: 3,
        reconnectionDelay: 1000,
        reconnectionDelayMax: 5000,
        timeout: 10000,
        forceNew: true,  // Force new connection
        multiplex: false  // Prevent multiple connections
      });

      // Create socket and set auth before any connection attempt
      const socketInstance = manager.socket('/', {
        auth: {
          token,  // Raw token, no Bearer prefix
          userId
        }
      });

      // Debug auth before connection
      console.log('Socket auth configuration:', socketInstance.auth);

      // Now manually connect
      socketInstance.connect();

      socketInstance.on('connect', () => {
        console.log('Socket connected successfully');
        console.log('Socket ID:', socketInstance.id);
        console.log('Auth status:', socketInstance.auth);
        setIsConnected(true);
        setError(null);
      });

      socketInstance.on('disconnect', (reason) => {
        console.log('Socket disconnected:', reason);
        console.log('Last auth state:', socketInstance.auth);
        setIsConnected(false);
      });

      socketInstance.on('connect_error', (err: Error) => {
        console.error('Socket connection error:', {
          message: err.message,
          auth: socketInstance.auth,
          id: socketInstance.id,
          connected: socketInstance.connected
        });
        setError(err);
        setIsConnected(false);
      });

      socketInstance.on('error', (err: string | Error) => {
        const errorMsg = typeof err === 'string' ? err : err.message;
        console.error('Socket error:', errorMsg);
        setError(new Error(errorMsg));
      });

      setSocket(socketInstance);

      return () => {
        console.log('Cleaning up socket connection...');
        socketInstance.off('connect');
        socketInstance.off('disconnect');
        socketInstance.off('connect_error');
        socketInstance.off('error');
        socketInstance.disconnect();
      };
    } catch (err) {
      console.error('Socket initialization error:', err);
      setError(err instanceof Error ? err : new Error('Failed to initialize socket'));
      return () => {};
    }
  }, [getToken, isLoaded, userId]);

  useEffect(() => {
    let cleanup: (() => void) | undefined;
    
    initSocket().then(cleanupFn => {
      if (cleanupFn) {
        cleanup = cleanupFn;
      }
    });

    return () => {
      cleanup?.();
    };
  }, [initSocket]);

  return (
    <SocketContext.Provider value={{ socket, isConnected, error }}>
      {children}
    </SocketContext.Provider>
  );
}

export const useSocket = () => {
  const context = useContext(SocketContext);
  if (!context) {
    throw new Error('useSocket must be used within a SocketProvider');
  }
  return context;
};