'use client';

import { createContext, useEffect, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import { useAuth } from '@clerk/nextjs';

interface SocketContextType {
  socket: Socket | null;
}

export const SocketContext = createContext<SocketContextType | null>(null);

export function SocketProvider({ children }: { children: React.ReactNode }) {
  const [socket, setSocket] = useState<Socket | null>(null);
  const { getToken } = useAuth();

  useEffect(() => {
    const initSocket = async () => {
      try {
        const token = await getToken();
        if (!token) return;

        const socketInstance = io(process.env.NEXT_PUBLIC_SOCKET_URL!, {
          auth: {
            token
          },
          transports: ['websocket'],
          autoConnect: false
        });

        socketInstance.on('connect', () => {
          console.log('Socket connected:', socketInstance.id);
        });

        socketInstance.on('connect_error', (error) => {
          console.error('Socket connection error:', error);
        });

        socketInstance.connect();
        setSocket(socketInstance);

        return () => {
          socketInstance.disconnect();
        };
      } catch (error) {
        console.error('Socket initialization error:', error);
      }
    };

    initSocket();
  }, [getToken]);

  return (
    <SocketContext.Provider value={{ socket }}>
      {children}
    </SocketContext.Provider>
  );
} 