'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import { useAuth, useUser } from '@clerk/nextjs';

type SocketType = any;

interface SocketContextType {
  socket: SocketType | null;
  isConnected: boolean;
  isAuthReady: boolean;
}

const SocketContext = createContext<SocketContextType>({
  socket: null,
  isConnected: false,
  isAuthReady: false
});

export const useSocket = () => {
  return useContext(SocketContext);
};

export const SocketProvider = ({ children }: { children: React.ReactNode }) => {
  const [socket, setSocket] = useState<SocketType | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [isAuthReady, setIsAuthReady] = useState(false);
  const { getToken } = useAuth();
  const { user, isLoaded } = useUser();
  
  useEffect(() => {
    let socketInstance: SocketType | null = null;

    const initSocket = async () => {
      try {
        if (!isLoaded || !user) {
          console.log('⏳ [SOCKET] Waiting for auth...');
          setIsAuthReady(false);
          return;
        }

        const token = await getToken();
        if (!token) {
          console.log('❌ [SOCKET] No token available');
          setIsAuthReady(false);
          return;
        }

        console.log('🔑 [SOCKET] Auth ready, initializing socket with userId:', user.id);
        setIsAuthReady(true);

        const socketIO = await import('socket.io-client');

        // Configure socket with exact path matching server
        socketInstance = socketIO.default('http://localhost:3001', {
          path: '/socket.io', // Changed: Remove /api prefix to match standard Socket.IO path
          auth: {
            token,
            userId: user.id
          },
          transports: ['polling', 'websocket'],
          autoConnect: true,
          reconnection: true,
          reconnectionAttempts: 3,
          reconnectionDelay: 1000,
          timeout: 10000
        });

        // Set auth headers after connection
        if (socketInstance.io?.opts) {
          socketInstance.io.opts.extraHeaders = {
            Authorization: `Bearer ${token}`
          };
        }

        socketInstance.on('connect', () => {
          console.log('✨ [SOCKET] Connected! ID:', socketInstance?.id);
          setIsConnected(true);
        });

        socketInstance.on('connect_error', (error: Error) => {
          console.error('❌ [SOCKET] Connection error:', error.message);
          console.error('🔑 [SOCKET] Auth:', socketInstance?.auth);
          console.error('🌐 [SOCKET] Transport:', socketInstance?.io?.engine?.transport?.name);
          console.error('🔍 [SOCKET] URL:', socketInstance?.io?.uri);
          console.error('📍 [SOCKET] Path:', socketInstance?.io?.opts?.path);
          setIsConnected(false);
        });

        socketInstance.on('disconnect', (reason: string) => {
          console.log('💔 [SOCKET] Disconnected:', reason);
          setIsConnected(false);
        });

        // Store socket in state for consumers
        setSocket(socketInstance);
      } catch (error) {
        console.error('❌ [SOCKET] Initialization error:', error);
        setIsConnected(false);
        setIsAuthReady(false);
      }
    };

    initSocket();

    return () => {
      if (socketInstance) {
        socketInstance.disconnect();
        socketInstance.removeAllListeners();
      }
    };
  }, [isLoaded, user, getToken]);

  return (
    <SocketContext.Provider value={{ socket, isConnected, isAuthReady }}>
      {children}
    </SocketContext.Provider>
  );
}; 