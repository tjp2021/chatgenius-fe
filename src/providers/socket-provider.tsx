'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import { io as ClientIO } from 'socket.io-client';
import { useAuth } from '@clerk/nextjs';

type SocketContextType = {
  socket: any | null;
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
  const [socket, setSocket] = useState<any>(null);
  const [isConnected, setIsConnected] = useState(false);
  const { getToken } = useAuth();

  useEffect(() => {
    const initializeSocket = async () => {
      try {
        const token = await getToken();
        console.log('Initializing socket connection...');

        const socketInstance = ClientIO('http://localhost:3000', {
          path: '/api/socket/io',
          addTrailingSlash: false,
          auth: {
            token
          },
          transports: ['polling', 'websocket']
        });

        socketInstance.on('connect', () => {
          console.log('Socket connected!');
          setIsConnected(true);
        });

        socketInstance.on('disconnect', () => {
          console.log('Socket disconnected!');
          setIsConnected(false);
        });

        socketInstance.on('error', (error: any) => {
          console.error('Socket error:', error);
        });

        socketInstance.on('connect_error', (error) => {
          console.error('Socket connection error details:', error);
        });

        setSocket(socketInstance);

        return () => {
          console.log('Cleaning up socket connection...');
          socketInstance.disconnect();
        };
      } catch (error) {
        console.error('Socket initialization error:', error);
      }
    };

    initializeSocket();
  }, [getToken]);

  return (
    <SocketContext.Provider value={{ socket, isConnected }}>
      {children}
    </SocketContext.Provider>
  );
};