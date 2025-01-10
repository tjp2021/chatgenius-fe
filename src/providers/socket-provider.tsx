'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import { io as ClientIO } from 'socket.io-client';
import { useAuth } from '@clerk/nextjs';
import type { Socket } from 'socket.io-client';

interface SocketAuth {
  userId: string;
  token: string;
}

interface CustomSocket extends Socket {
  auth: SocketAuth | { [key: string]: any };
}

type SocketContextType = {
  socket: CustomSocket | null;
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
  const [socket, setSocket] = useState<CustomSocket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const { getToken, userId } = useAuth();

  useEffect(() => {
    const initializeSocket = async () => {
      try {
        const token = await getToken();
        if (!token || !userId) {
          console.log('No token or userId available for socket connection');
          return;
        }

        console.log('Initializing socket connection...');

        // Clean up existing socket if it exists
        if (socket) {
          socket.disconnect();
          socket.removeAllListeners();
        }

        const socketInstance = ClientIO(process.env.NEXT_PUBLIC_API_URL!, {
          path: '/socket.io/',
          auth: {
            token, // Raw token without Bearer prefix for socket
            userId
          },
          transports: ['websocket'],
          autoConnect: true,
          reconnection: true,
          reconnectionAttempts: 3,
          reconnectionDelay: 1000
        }) as CustomSocket;

        socketInstance.on('connect', () => {
          console.log('Socket connected!', socketInstance.id);
          setIsConnected(true);
        });

        socketInstance.on('disconnect', () => {
          console.log('Socket disconnected');
          setIsConnected(false);
        });

        socketInstance.on('error', (error: Error) => {
          console.error('Socket error:', error);
          setIsConnected(false);
        });

        setSocket(socketInstance);

      } catch (error) {
        console.error('Socket initialization error:', error);
        setIsConnected(false);
      }
    };

    initializeSocket();

    return () => {
      if (socket) {
        socket.disconnect();
        socket.removeAllListeners();
      }
    };
  }, [getToken, userId]);

  return (
    <SocketContext.Provider value={{ socket, isConnected }}>
      {children}
    </SocketContext.Provider>
  );
};