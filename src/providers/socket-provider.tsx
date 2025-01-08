'use client';

import { createContext, useContext, useEffect, useState, useRef, useCallback } from 'react';
import { Manager } from 'socket.io-client';
import { useAuth } from '@clerk/nextjs';

interface ChannelState {
  id: string;
  subscriptionStatus: 'subscribing' | 'subscribed' | 'unsubscribing' | 'unsubscribed';
  lastEventTimestamp: number;
  retryCount: number;
}

type SocketType = ReturnType<(typeof Manager)['prototype']['socket']>;

interface SocketContextType {
  socket: SocketType | null;
  isConnected: boolean;
  channelStates: Map<string, ChannelState>;
  subscribeToChannel: (channelId: string) => Promise<void>;
  unsubscribeFromChannel: (channelId: string) => Promise<void>;
}

const SocketContext = createContext<SocketContextType>({
  socket: null,
  isConnected: false,
  channelStates: new Map(),
  subscribeToChannel: async () => { throw new Error('Not implemented') },
  unsubscribeFromChannel: async () => { throw new Error('Not implemented') },
});

export const useSocket = () => {
  return useContext(SocketContext);
};

export const SocketProvider = ({ children }: { children: React.ReactNode }) => {
  const [socket, setSocket] = useState<SocketType | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [channelStates, setChannelStates] = useState<Map<string, ChannelState>>(new Map());
  const { getToken, userId } = useAuth();
  const channelStatesRef = useRef(channelStates);

  // Keep ref in sync with state
  useEffect(() => {
    channelStatesRef.current = channelStates;
  }, [channelStates]);

  // Load persisted channel states
  useEffect(() => {
    const savedStates = localStorage.getItem('channelStates');
    if (savedStates) {
      try {
        const parsed = JSON.parse(savedStates);
        setChannelStates(new Map(parsed));
      } catch (error) {
        console.error('Failed to parse saved channel states:', error);
        localStorage.removeItem('channelStates');
      }
    }
  }, []);

  // Save channel states
  useEffect(() => {
    try {
      const entries: [string, ChannelState][] = [];
      channelStates.forEach((value, key) => {
        entries.push([key, value]);
      });
      localStorage.setItem('channelStates', JSON.stringify(entries));
    } catch (error) {
      console.error('Failed to save channel states:', error);
    }
  }, [channelStates]);

  const subscribeToChannel = useCallback(async (channelId: string) => {
    if (!socket || !isConnected) {
      throw new Error('Socket not connected');
    }

    // Check if already subscribed or subscribing
    const currentState = channelStatesRef.current.get(channelId);
    if (currentState?.subscriptionStatus === 'subscribed' || 
        currentState?.subscriptionStatus === 'subscribing') {
      return;
    }

    setChannelStates(prev => {
      const newMap = new Map(prev);
      newMap.set(channelId, {
        id: channelId,
        subscriptionStatus: 'subscribing',
        lastEventTimestamp: Date.now(),
        retryCount: (currentState?.retryCount ?? 0) + 1
      });
      return newMap;
    });

    return new Promise<void>((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('Subscription timeout'));
      }, 5000);

      socket.emit('channel:subscribe', { channelId }, (response: { error?: string }) => {
        clearTimeout(timeout);
        
        if (response.error) {
          setChannelStates(prev => {
            const newMap = new Map(prev);
            const current = prev.get(channelId);
            newMap.set(channelId, {
              id: channelId,
              subscriptionStatus: 'unsubscribed',
              lastEventTimestamp: Date.now(),
              retryCount: (current?.retryCount ?? 0)
            });
            return newMap;
          });
          reject(new Error(response.error));
        } else {
          setChannelStates(prev => {
            const newMap = new Map(prev);
            newMap.set(channelId, {
              id: channelId,
              subscriptionStatus: 'subscribed',
              lastEventTimestamp: Date.now(),
              retryCount: 0
            });
            return newMap;
          });
          resolve();
        }
      });
    });
  }, [socket, isConnected]);

  const unsubscribeFromChannel = useCallback(async (channelId: string) => {
    if (!socket || !isConnected) {
      throw new Error('Socket not connected');
    }

    const currentState = channelStatesRef.current.get(channelId);
    if (!currentState || currentState.subscriptionStatus === 'unsubscribed' || 
        currentState.subscriptionStatus === 'unsubscribing') {
      return;
    }

    setChannelStates(prev => {
      const newMap = new Map(prev);
      newMap.set(channelId, {
        ...currentState,
        subscriptionStatus: 'unsubscribing',
        lastEventTimestamp: Date.now()
      });
      return newMap;
    });

    return new Promise<void>((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('Unsubscribe timeout'));
      }, 5000);

      socket.emit('channel:unsubscribe', { channelId }, (response: { error?: string }) => {
        clearTimeout(timeout);
        
        if (response.error) {
          setChannelStates(prev => {
            const newMap = new Map(prev);
            newMap.set(channelId, {
              ...currentState,
              subscriptionStatus: 'subscribed',
              lastEventTimestamp: Date.now()
            });
            return newMap;
          });
          reject(new Error(response.error));
        } else {
          setChannelStates(prev => {
            const newMap = new Map(prev);
            newMap.set(channelId, {
              id: channelId,
              subscriptionStatus: 'unsubscribed',
              lastEventTimestamp: Date.now(),
              retryCount: 0
            });
            return newMap;
          });
          resolve();
        }
      });
    });
  }, [socket, isConnected]);

  useEffect(() => {
    if (!userId) {
      console.log('No user ID, skipping socket connection');
      return;
    }

    const socketUrl = process.env.NEXT_PUBLIC_SOCKET_URL;
    if (!socketUrl) {
      console.error('Socket URL not configured');
      return;
    }

    const initSocket = async () => {
      try {
        const token = await getToken();
        console.log('Initializing socket connection to:', socketUrl);
        
        const manager = new Manager(socketUrl, {
          auth: { token, userId },
          transports: ['websocket', 'polling'],
          reconnection: true,
          reconnectionAttempts: 5,
          reconnectionDelay: 1000,
          reconnectionDelayMax: 5000,
          timeout: 20000,
        });

        const socketInstance = manager.socket('/');

        socketInstance.on('connect', () => {
          console.log('Socket connected successfully');
          setIsConnected(true);

          // Resubscribe to channels
          const subscribedChannels: string[] = [];
          channelStatesRef.current.forEach((state, channelId) => {
            if (state.subscriptionStatus === 'subscribed') {
              subscribedChannels.push(channelId);
            }
          });

          subscribedChannels.forEach(channelId => {
            subscribeToChannel(channelId).catch(error => {
              console.error(`Failed to resubscribe to channel ${channelId}:`, error);
            });
          });
        });

        socketInstance.on('connect_error', (error: Error) => {
          console.error('Socket connection error:', error.message);
          setIsConnected(false);
        });

        socketInstance.on('disconnect', (reason: string) => {
          console.log('Socket disconnected:', reason);
          setIsConnected(false);

          // Mark all channels as unsubscribed
          setChannelStates(prev => {
            const newMap = new Map(prev);
            prev.forEach((state, channelId) => {
              if (state.subscriptionStatus === 'subscribed') {
                newMap.set(channelId, {
                  ...state,
                  subscriptionStatus: 'unsubscribed',
                  lastEventTimestamp: Date.now()
                });
              }
            });
            return newMap;
          });
        });

        socketInstance.on('error', (error: Error) => {
          console.error('Socket error:', error);
          setIsConnected(false);
        });

        setSocket(socketInstance);

        return () => {
          console.log('Cleaning up socket connection');
          socketInstance.disconnect();
        };
      } catch (error) {
        console.error('Failed to initialize socket:', error);
        return () => {};
      }
    };

    const cleanup = initSocket();
    return () => {
      cleanup.then(cleanupFn => cleanupFn?.());
    };
  }, [getToken, userId, subscribeToChannel]);

  return (
    <SocketContext.Provider value={{ 
      socket, 
      isConnected, 
      channelStates,
      subscribeToChannel,
      unsubscribeFromChannel
    }}>
      {children}
    </SocketContext.Provider>
  );
}; 