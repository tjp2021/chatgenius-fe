'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import { useAuth, useUser } from '@clerk/nextjs';
import { default as socketIO } from 'socket.io-client';
import type { Socket as ClientSocket } from 'socket.io-client';
import { SocketContextType } from '@/types/socket';
import { createSocketConfig } from '@/lib/socket-config';
import { socketLogger } from '@/lib/socket-logger';

const SocketContext = createContext<SocketContextType>({
  socket: null,
  isConnected: false,
  isAuthReady: false
});

export const useSocket = () => {
  return useContext(SocketContext);
};

export const SocketProvider = ({ children }: { children: React.ReactNode }) => {
  const [socket, setSocket] = useState<ClientSocket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [isAuthReady, setIsAuthReady] = useState(false);
  const { getToken } = useAuth();
  const { user, isLoaded } = useUser();
  
  useEffect(() => {
    let socketInstance: ClientSocket | null = null;
    let reconnectTimer: NodeJS.Timeout | null = null;

    const initSocket = async () => {
      try {
        if (!isLoaded || !user) {
          socketLogger.auth.waiting();
          setIsAuthReady(false);
          return;
        }

        const token = await getToken();
        if (!token) {
          socketLogger.auth.noToken();
          setIsAuthReady(false);
          return;
        }

        socketLogger.auth.ready(user.id);
        setIsAuthReady(true);

        // Clean up existing socket if any
        if (socketInstance) {
          socketLogger.debug('Cleaning up existing socket connection');
          socketInstance.disconnect();
          socketInstance.removeAllListeners();
        }

        const config = createSocketConfig(token, user.id);
        socketInstance = socketIO(config.url, {
          path: config.path,
          auth: config.auth,
          ...config.options
        });

        // Setup event handlers
        socketInstance.on('connect', () => {
          socketLogger.connect(socketInstance?.id || 'unknown');
          setIsConnected(true);
          if (reconnectTimer) {
            clearTimeout(reconnectTimer);
            reconnectTimer = null;
          }
        });

        socketInstance.on('connect_error', (error: Error) => {
          socketLogger.error(error, {
            Auth: socketInstance?.auth,
            Transport: socketInstance?.io?.engine?.transport?.name,
            URL: socketInstance?.io?.uri,
            Path: socketInstance?.io?.opts?.path
          });
          setIsConnected(false);

          // Schedule a reconnect if not already scheduled
          if (!reconnectTimer) {
            reconnectTimer = setTimeout(() => {
              socketLogger.debug('Attempting to reconnect...');
              initSocket();
            }, 5000);
          }
        });

        socketInstance.on('disconnect', (reason: string) => {
          socketLogger.disconnect(reason);
          setIsConnected(false);

          // Handle specific disconnect reasons
          if (reason === 'io server disconnect' || reason === 'transport close') {
            // Schedule a reconnect if not already scheduled
            if (!reconnectTimer) {
              reconnectTimer = setTimeout(() => {
                socketLogger.debug('Attempting to reconnect after disconnect...');
                initSocket();
              }, 5000);
            }
          }
        });

        // Connect the socket
        socketInstance.connect();
        setSocket(socketInstance);
      } catch (error) {
        socketLogger.auth.error(error as Error);
        setIsConnected(false);
        setIsAuthReady(false);

        // Schedule a retry
        if (!reconnectTimer) {
          reconnectTimer = setTimeout(() => {
            socketLogger.debug('Retrying after error...');
            initSocket();
          }, 5000);
        }
      }
    };

    initSocket();

    return () => {
      if (reconnectTimer) {
        clearTimeout(reconnectTimer);
      }
      if (socketInstance) {
        socketInstance.disconnect();
        socketInstance.removeAllListeners();
      }
    };
  }, [isLoaded, user, getToken]);

  return (
    <SocketContext.Provider value={{ socket, isConnected, isAuthReady }}>
      {children}
    </SocketContext.Provider>
  );
}; 