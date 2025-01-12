'use client';

import React from 'react';
import { io, Socket } from 'socket.io-client';
import { useAuth } from '@clerk/nextjs';

interface SocketContextType {
  socket: Socket | null;
  isConnected: boolean;
}

const SocketContext = React.createContext<SocketContextType>({
  socket: null,
  isConnected: false
});

export function SocketProvider({ children }: { children: React.ReactNode }) {
  const [socket, setSocket] = React.useState<Socket | null>(null);
  const [isConnected, setIsConnected] = React.useState(false);
  const { getToken, userId } = useAuth();

  React.useEffect(() => {
    if (!userId) return;

    const socketInstance = io(process.env.NEXT_PUBLIC_SOCKET_URL!, {
      path: '/socket.io',
      transports: ['websocket'],
      autoConnect: false,
      withCredentials: true,
      auth: async (cb) => {
        try {
          const token = await getToken();
          cb({ token, userId });
        } catch (error) {
          console.error('Auth error:', error);
        }
      }
    });

    // Debug listeners
    socketInstance.on('connect', () => {
      console.log('Socket connected!', socketInstance.id);
      setIsConnected(true);
    });

    socketInstance.on('connect_error', (error) => {
      console.error('Socket connection error:', error);
      setIsConnected(false);
    });

    socketInstance.on('disconnect', () => {
      console.log('Socket disconnected');
      setIsConnected(false);
    });

    // Connect after setting up listeners
    socketInstance.connect();
    setSocket(socketInstance);

    return () => {
      socketInstance.disconnect();
    };
  }, [getToken, userId]);

  return (
    <SocketContext.Provider value={{ socket, isConnected }}>
      {children}
    </SocketContext.Provider>
  );
}

export function useSocket() {
  return React.useContext(SocketContext);
}