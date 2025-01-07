'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import { useAuth } from '@clerk/nextjs';

type SocketContextType = {
  socket: Socket | null;
  isConnected: boolean;
};

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
  const { getToken } = useAuth();

  useEffect(() => {
    let socketInstance: Socket | null = null;

    const initSocket = async () => {
      try {
        const token = await getToken();
        if (!token) {
          console.error('No auth token available');
          return;
        }

        // Clean up existing socket if any
        if (socketInstance) {
          socketInstance.disconnect();
        }

        const socketUrl = process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, '');
        console.log('Connecting to socket URL:', socketUrl);

        socketInstance = io(socketUrl!, {
          auth: { token },
          transports: ['websocket', 'polling'],
          path: '/socket.io/',
          reconnection: true,
          reconnectionAttempts: 5,
          reconnectionDelay: 1000,
          timeout: 20000,
          withCredentials: true,
          autoConnect: true,
        });

        socketInstance.on('connect', () => {
          console.log('Socket connected successfully', {
            id: socketInstance?.id,
            connected: socketInstance?.connected,
          });
          setIsConnected(true);
        });

        socketInstance.on('disconnect', (reason) => {
          console.log('Socket disconnected:', {
            reason,
            id: socketInstance?.id,
            connected: socketInstance?.connected,
          });
          setIsConnected(false);
        });

        socketInstance.on('connect_error', (error) => {
          console.error('Socket connection error:', {
            message: error.message,
            name: error.name,
            stack: error.stack,
          });
          setIsConnected(false);
        });

        socketInstance.on('error', (error) => {
          console.error('Socket error:', error);
          setIsConnected(false);
        });

        setSocket(socketInstance);
      } catch (error) {
        console.error('Failed to initialize socket:', error);
        setIsConnected(false);
      }
    };

    initSocket();

    // Cleanup function
    return () => {
      if (socketInstance) {
        console.log('Cleaning up socket connection');
        socketInstance.disconnect();
        setSocket(null);
        setIsConnected(false);
      }
    };
  }, [getToken]);

  return (
    <SocketContext.Provider value={{ socket, isConnected }}>
      {children}
    </SocketContext.Provider>
  );
}; 