'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import { io, Socket } from 'socket.io-client';
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
    if (!userId) return;

    const initSocket = async () => {
      const token = await getToken();
      console.log('Initializing socket connection to:', process.env.NEXT_PUBLIC_SOCKET_URL);
      const socketInstance = io(process.env.NEXT_PUBLIC_SOCKET_URL!, {
        auth: { token, userId },
      });

      socketInstance.on('connect', () => {
        console.log('Socket connected successfully');
        setIsConnected(true);
      });

      socketInstance.on('connect_error', (error) => {
        console.error('Socket connection error:', error.message);
        setIsConnected(false);
      });

      socketInstance.on('disconnect', () => {
        console.log('Socket disconnected');
        setIsConnected(false);
      });

      setSocket(socketInstance);

      return () => {
        socketInstance.disconnect();
      };
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