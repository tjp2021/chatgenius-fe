'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import { useAuth } from '@clerk/nextjs';

const SocketContext = createContext<Socket | null>(null);

export const SocketProvider = ({ children }: { children: React.ReactNode }) => {
  const [socket, setSocket] = useState<Socket | null>(null);
  const { getToken } = useAuth();

  useEffect(() => {
    const initSocket = async () => {
      try {
        const token = await getToken();
        const socketInstance = io(process.env.NEXT_PUBLIC_API_URL!, {
          auth: { token },
          reconnection: true,
          reconnectionAttempts: 5,
          reconnectionDelay: 1000,
        });

        socketInstance.on('connect_error', (error) => {
          console.error('Socket connection error:', error);
        });

        socketInstance.on('connect', () => {
          console.log('Socket connected');
        });

        setSocket(socketInstance);
      } catch (error) {
        console.error('Failed to initialize socket:', error);
      }
    };

    initSocket();

    return () => {
      socket?.disconnect();
    };
  }, [getToken]);

  return (
    <SocketContext.Provider value={socket}>
      {children}
    </SocketContext.Provider>
  );
};

export const useSocket = () => useContext(SocketContext); 