'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import { io } from 'socket.io-client';
import type { Socket } from 'socket.io-client';
import { useAuth } from '@clerk/nextjs';

interface SocketContextType {
  socket: Socket | null;
  isConnected: boolean;
}

const SocketContext = createContext<SocketContextType>({
  socket: null,
  isConnected: false,
});

export const useSocket = () => {
  return useContext(SocketContext);
};

export const SocketProvider = ({ children }: { children: React.ReactNode }) => {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const { getToken, userId } = useAuth();

  useEffect(() => {
    if (!userId) {
      console.log('No user ID, skipping socket connection');
      return;
    }

    const socketUrl = process.env.NEXT_PUBLIC_SOCKET_URL;
    if (!socketUrl) {
      console.error('Socket URL not configured');
      return;
    }

    const initSocket = async () => {
      try {
        const token = await getToken();
        console.log('Initializing socket connection to:', socketUrl);
        
        const socketInstance = io(socketUrl, {
          auth: { token, userId },
          transports: ['websocket', 'polling'],
          reconnection: true,
          reconnectionAttempts: 5,
          reconnectionDelay: 1000,
          reconnectionDelayMax: 5000,
          timeout: 20000,
        });

        socketInstance.on('connect', () => {
          console.log('Socket connected successfully');
          setIsConnected(true);
        });

        socketInstance.on('connect_error', (error: Error) => {
          console.error('Socket connection error:', error.message);
          setIsConnected(false);
        });

        socketInstance.on('disconnect', (reason: string) => {
          console.log('Socket disconnected:', reason);
          setIsConnected(false);
        });

        socketInstance.on('error', (error: Error) => {
          console.error('Socket error:', error);
          setIsConnected(false);
        });

        setSocket(socketInstance);

        return () => {
          console.log('Cleaning up socket connection');
          socketInstance.disconnect();
        };
      } catch (error) {
        console.error('Failed to initialize socket:', error);
        return () => {};
      }
    };

    const cleanup = initSocket();
    return () => {
      cleanup.then(cleanupFn => cleanupFn?.());
    };
  }, [getToken, userId]);

  return (
    <SocketContext.Provider value={{ socket, isConnected }}>
      {children}
    </SocketContext.Provider>
  );
}; 