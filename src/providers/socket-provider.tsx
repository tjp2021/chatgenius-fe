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
  const { getToken, isSignedIn, isLoaded } = useAuth();

  useEffect(() => {
    let socketInstance: Socket | null = null;

    const initSocket = async () => {
      try {
        // Don't attempt connection if not signed in
        if (!isLoaded || !isSignedIn) {
          console.log('Socket init: Not authenticated, skipping connection');
          return;
        }

        const token = await getToken();
        if (!token) {
          console.error('Socket init: No auth token available');
          return;
        }

        // Clean up existing socket if any
        if (socketInstance) {
          console.log('Socket init: Cleaning up existing connection');
          socketInstance.disconnect();
        }

        const socketUrl = process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, '');
        console.log('Socket init: Attempting connection to:', socketUrl);

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
          console.log('Socket event: Connected', {
            id: socketInstance?.id,
            connected: socketInstance?.connected,
            transport: socketInstance?.io.engine.transport.name
          });
          setIsConnected(true);
        });

        socketInstance.on('disconnect', (reason) => {
          console.log('Socket event: Disconnected', {
            reason,
            id: socketInstance?.id,
            connected: socketInstance?.connected,
          });
          setIsConnected(false);
        });

        socketInstance.on('connect_error', (error) => {
          console.error('Socket event: Connection error', {
            message: error.message,
            name: error.name,
            context: {
              url: socketUrl,
              transport: socketInstance?.io.engine.transport.name,
            }
          });
          setIsConnected(false);
        });

        socketInstance.on('error', (error) => {
          console.error('Socket event: General error', {
            error,
            context: {
              id: socketInstance?.id,
              connected: socketInstance?.connected,
              transport: socketInstance?.io.engine.transport.name
            }
          });
          setIsConnected(false);
        });

        // Log all incoming events
        socketInstance.onAny((eventName, ...args) => {
          console.log('Socket incoming:', eventName, args);
        });

        // Log all outgoing events
        const emit = socketInstance.emit;
        socketInstance.emit = function (...args) {
          console.log('Socket outgoing:', args[0], args.slice(1));
          return emit.apply(this, args);
        };

        setSocket(socketInstance);
      } catch (error) {
        console.error('Socket init: Failed to initialize', error);
        setIsConnected(false);
      }
    };

    initSocket();

    return () => {
      if (socketInstance) {
        console.log('Socket cleanup: Disconnecting');
        socketInstance.disconnect();
        setSocket(null);
        setIsConnected(false);
      }
    };
  }, [getToken, isSignedIn, isLoaded]);

  return (
    <SocketContext.Provider value={{ socket, isConnected }}>
      {children}
    </SocketContext.Provider>
  );
}; 