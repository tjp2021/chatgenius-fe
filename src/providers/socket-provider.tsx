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
  const [socket, setSocket] = useState<Socket | null>(null);
  const { getToken } = useAuth();

  useEffect(() => {
    const initializeSocket = async () => {
      try {
        const token = await getToken();
        console.log('Initializing socket connection...');

        const socketInstance = ClientIO(process.env.NEXT_PUBLIC_API_URL!, {
          auth: {
            token
          }
        });

        socketInstance.on('connect', () => {
          console.log('Socket connected!', socketInstance.id);
        });

        socketInstance.on('disconnect', () => {
          console.log('Socket disconnected');
        });

        setSocket(socketInstance);

      } catch (error) {
        console.error('Socket initialization error:', error);
      }
    };

    initializeSocket();
  }, [getToken]);

  return (
    <SocketContext.Provider value={{ socket }}>
      {children}
    </SocketContext.Provider>
  );
};