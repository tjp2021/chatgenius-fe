'use client';

import {
  createContext,
  useContext,
  useEffect,
  useState
} from 'react';
import { default as socketIOClient } from 'socket.io-client';
import { useAuth } from '@/hooks/useAuth';
import { createSocket } from '@/lib/socket-config';

type SocketContextType = {
  socket: ReturnType<typeof socketIOClient> | null;
  isConnected: boolean;
};

const SocketContext = createContext<SocketContextType>({
  socket: null,
  isConnected: false
});

export const useSocket = () => {
  return useContext(SocketContext);
};

export const SocketProvider = ({ 
  children 
}: { 
  children: React.ReactNode 
}) => {
  const [socket, setSocket] = useState<ReturnType<typeof socketIOClient> | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const { token, isAuthenticated, userId } = useAuth();

  useEffect(() => {
    if (!isAuthenticated || !token || !userId) {
      if (socket) {
        socket.disconnect();
        socket.removeAllListeners();
        setSocket(null);
        setIsConnected(false);
      }
      return;
    }

    // Create socket instance with auth data
    const newSocket = createSocket(token, userId);

    // Socket event handlers
    const onConnect = () => {
      console.log('🔌 Socket connected!', newSocket.id);
      setIsConnected(true);
    };

    const onDisconnect = (reason: string) => {
      console.log('🔌 Socket disconnected:', reason);
      setIsConnected(false);
    };

    const onError = (error: Error) => {
      console.error('🔌 Socket error:', error);
      setIsConnected(false);
    };

    const onReconnect = (attempt: number) => {
      console.log('🔌 Socket reconnected after', attempt, 'attempts');
      if (newSocket.connected) {
        newSocket.emit('authenticate', { token, userId });
      }
    };

    // Attach event listeners
    newSocket.on('connect', onConnect);
    newSocket.on('disconnect', onDisconnect);
    newSocket.on('error', onError);
    newSocket.on('reconnect', onReconnect);

    // Connect socket
    newSocket.connect();
    setSocket(newSocket);

    // Cleanup
    return () => {
      if (newSocket) {
        newSocket.off('connect', onConnect);
        newSocket.off('disconnect', onDisconnect);
        newSocket.off('error', onError);
        newSocket.off('reconnect', onReconnect);
        newSocket.disconnect();
        setSocket(null);
        setIsConnected(false);
      }
    };
  }, [isAuthenticated, token, userId]);

  return (
    <SocketContext.Provider value={{ socket, isConnected }}>
      {children}
    </SocketContext.Provider>
  );
}; 