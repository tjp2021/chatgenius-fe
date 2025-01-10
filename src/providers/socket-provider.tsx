'use client';

import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { io as ClientIO } from 'socket.io-client';
import { useAuth } from '@clerk/nextjs';
import type { Socket } from 'socket.io-client';
import { Message, MessageEvent } from '@/types/message';
import type { MessagePayload } from '@/types/message';

interface SocketAuth {
  userId: string;
  token: string;
}

interface CustomSocket extends Socket {
  auth: SocketAuth | { [key: string]: any };
}

interface MessageState {
  isLoading: boolean;
  error: Error | null;
}

type SocketContextType = {
  socket: CustomSocket | null;
  isConnected: boolean;
  isAuthReady: boolean;
  isSocketReady: boolean;
  isConnecting: boolean;
  error: Error | null;
  // Message methods
  sendMessage: (channelId: string, content: string) => Promise<void>;
  markAsRead: (messageId: string, channelId: string) => void;
};

const SocketContext = createContext<SocketContextType>({
  socket: null,
  isConnected: false,
  isAuthReady: false,
  isSocketReady: false,
  isConnecting: false,
  error: null,
  sendMessage: async () => {},
  markAsRead: () => {}
});

export const useSocket = () => {
  return useContext(SocketContext);
};

interface AuthState {
  isLoaded: boolean;
  isSignedIn: boolean;
  token: string | null;
  userId: string | null;
  error: Error | null;
}

interface SocketState {
  isInitialized: boolean;
  isConnecting: boolean;
  error: Error | null;
}

export const SocketProvider = ({ children }: { children: React.ReactNode }) => {
  const [socket, setSocket] = useState<CustomSocket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [socketState, setSocketState] = useState<SocketState>({
    isInitialized: false,
    isConnecting: false,
    error: null
  });
  const [authState, setAuthState] = useState<AuthState>({
    isLoaded: false,
    isSignedIn: false,
    token: null,
    userId: null,
    error: null
  });
  const [messageState, setMessageState] = useState<MessageState>({
    isLoading: false,
    error: null
  });
  
  const { getToken, userId, isLoaded, isSignedIn } = useAuth();

  // Auth initialization effect
  useEffect(() => {
    const initializeAuth = async () => {
      try {
        console.log('[Auth Debug] Starting auth initialization', {
          isLoaded,
          isSignedIn,
          hasUserId: !!userId
        });

        if (!isLoaded) {
          console.log('[Auth Debug] Auth not loaded yet');
          return;
        }

        if (!isSignedIn) {
          console.log('[Auth Debug] User not signed in');
          setAuthState(prev => ({
            ...prev,
            isLoaded: true,
            isSignedIn: false,
            error: new Error('User not authenticated')
          }));
          return;
        }

        const token = await getToken();
        
        console.log('[Auth Debug] Auth state check:', {
          hasToken: !!token,
          hasUserId: !!userId,
          isSignedIn
        });

        if (!token || !userId) {
          throw new Error('Missing auth credentials');
        }

        setAuthState({
          isLoaded: true,
          isSignedIn: true,
          token,
          userId,
          error: null
        });

        console.log('[Auth Debug] Auth initialization complete', {
          hasToken: !!token,
          hasUserId: !!userId
        });

      } catch (error) {
        console.error('[Auth Debug] Auth initialization failed:', error);
        setAuthState(prev => ({
          ...prev,
          isLoaded: true,
          error: error instanceof Error ? error : new Error('Auth initialization failed')
        }));
      }
    };

    initializeAuth();
  }, [isLoaded, isSignedIn, userId, getToken]);

  // Socket initialization effect
  useEffect(() => {
    if (!authState.isLoaded || !authState.isSignedIn || !authState.token || !authState.userId) {
      console.log('[Socket Debug] Waiting for auth to be ready', { authState });
      return;
    }

    const initializeSocket = async () => {
      try {
        setSocketState(prev => ({ ...prev, isConnecting: true, error: null }));
        
        // Clean up existing socket if it exists
        if (socket) {
          console.log('[Socket Debug] Cleaning up existing socket', { 
            socketId: socket.id,
            connected: socket.connected
          });
          socket.disconnect();
          socket.removeAllListeners();
          setSocket(null);
        }

        const socketUrl = process.env.NEXT_PUBLIC_API_URL;
        if (!socketUrl) {
          throw new Error('Missing API URL configuration');
        }

        // Get fresh token
        const freshToken = await getToken();
        if (!freshToken) {
          throw new Error('Failed to get fresh auth token');
        }

        console.log('[Socket Debug] Creating new socket connection', {
          url: socketUrl,
          auth: {
            hasToken: !!freshToken,
            hasUserId: !!authState.userId
          }
        });

        const socketInstance = ClientIO(socketUrl, {
          path: '/socket.io/',
          auth: {
            token: freshToken,
            userId: authState.userId
          },
          transports: ['websocket'],
          autoConnect: false,
          reconnection: true,
          reconnectionAttempts: 5,
          reconnectionDelay: 1000,
          timeout: 10000,
          forceNew: true,
          extraHeaders: {
            Authorization: `Bearer ${freshToken}`
          }
        }) as CustomSocket;

        // Add connection event handler first to catch early auth issues
        socketInstance.on('connect', () => {
          console.log('[Socket Debug] Connected successfully', {
            socketId: socketInstance.id,
            auth: socketInstance.auth
          });
          
          // Authenticate immediately after connection
          socketInstance.emit('authenticate', { 
            token: freshToken,
            userId: authState.userId 
          }, (response: any) => {
            console.log('[Socket Debug] Authentication response:', response);
            
            if (response?.error) {
              console.error('[Socket Debug] Authentication failed:', response.error);
              setSocketState(prev => ({
                ...prev,
                error: new Error(response.error)
              }));
              socketInstance.disconnect();
              return;
            }

            // Set the authenticated state
            setIsConnected(true);
            setSocketState(prev => ({
              ...prev,
              isInitialized: true,
              isConnecting: false,
              error: null
            }));
          });
        });

        // Add auth error handler
        socketInstance.on('connect_error', (error) => {
          console.error('[Socket Debug] Connection error:', {
            error,
            message: error.message,
            auth: socketInstance.auth
          });
          setIsConnected(false);
          setSocketState(prev => ({
            ...prev,
            isConnecting: false,
            error: error
          }));

          // If auth error, try to refresh token and reconnect
          if (error.message.includes('auth')) {
            getToken().then(newToken => {
              if (newToken) {
                console.log('[Socket Debug] Refreshing auth token');
                // Update socket auth
                socketInstance.auth = {
                  token: newToken,
                  userId: authState.userId
                };
                // Update headers
                socketInstance.io.opts.extraHeaders = {
                  Authorization: `Bearer ${newToken}`
                };
                // Reconnect with new token
                socketInstance.connect();
                // Re-authenticate after reconnection
                socketInstance.once('connect', () => {
                  socketInstance.emit('authenticate', {
                    token: newToken,
                    userId: authState.userId
                  });
                });
              }
            });
          }
        });

        socketInstance.on('disconnect', (reason) => {
          console.log('[Socket Debug] Disconnected:', {
            reason,
            wasConnected: socketInstance.connected
          });
          setIsConnected(false);
          
          if (reason === 'io server disconnect') {
            // Server initiated disconnect, attempt reconnect
            socketInstance.connect();
          }
        });

        // Reconnection handling
        socketInstance.on('reconnect_attempt', (attempt) => {
          console.log('[Socket Debug] Reconnection attempt:', { attempt });
          setSocketState(prev => ({ ...prev, isConnecting: true }));
          
          // Refresh auth token on reconnect
          getToken().then(newToken => {
            if (newToken && authState.userId) {
              socketInstance.auth = {
                token: newToken,
                userId: authState.userId
              };
              console.log('[Socket Debug] Updated auth for reconnection');
            }
          });
        });

        socketInstance.on('reconnect', (attempt) => {
          console.log('[Socket Debug] Reconnected after attempts:', { attempt });
          setIsConnected(true);
          setSocketState(prev => ({
            ...prev,
            isConnecting: false,
            error: null
          }));
        });

        socketInstance.on('reconnect_error', (error) => {
          console.error('[Socket Debug] Reconnection error:', { error });
          setSocketState(prev => ({
            ...prev,
            isConnecting: false,
            error: error
          }));
        });

        socketInstance.on('reconnect_failed', () => {
          const error = new Error('Failed to reconnect after all attempts');
          console.error('[Socket Debug] Reconnection failed:', { error });
          setSocketState(prev => ({
            ...prev,
            isConnecting: false,
            error: error
          }));
        });

        // Initialize connection
        console.log('[Socket Debug] Initializing connection...');
        socketInstance.connect();
        setSocket(socketInstance);

      } catch (error) {
        console.error('[Socket Debug] Initialization error:', error);
        setSocketState(prev => ({
          ...prev,
          isConnecting: false,
          error: error instanceof Error ? error : new Error('Socket initialization failed')
        }));
      }
    };

    initializeSocket();

    // Cleanup on unmount or auth change
    return () => {
      if (socket) {
        console.log('[Socket Debug] Cleaning up socket', {
          socketId: socket.id,
          connected: socket.connected
        });
        socket.disconnect();
        socket.removeAllListeners();
        setSocket(null);
      }
    };
  }, [authState, getToken]);

  // Message handling methods
  const sendMessage = useCallback(async (channelId: string, content: string) => {
    if (!socket || !isConnected) {
      throw new Error('Socket not connected');
    }

    if (!authState.userId) {
      throw new Error('User ID not available');
    }

    try {
      setMessageState(prev => ({ ...prev, isLoading: true, error: null }));
      
      console.log('[Message Debug] Sending message:', {
        channelId,
        content,
        userId: authState.userId,
        socketId: socket.id,
        socketAuth: socket.auth
      });

      // Emit message event with user ID
      socket.emit(MessageEvent.SEND, {
        channelId,
        content,
        userId: authState.userId,
        tempId: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
      } as MessagePayload);

      // Wait for sent confirmation
      await new Promise((resolve, reject) => {
        const timeout = setTimeout(() => {
          socket.off(MessageEvent.SENT);
          reject(new Error('Message send timeout'));
        }, 5000);

        socket.once(MessageEvent.SENT, (data: { messageId: string }) => {
          clearTimeout(timeout);
          console.log('[Message Debug] Message sent confirmation:', data);
          resolve(data);
        });

        // Also listen for error events
        socket.once('error', (error: any) => {
          clearTimeout(timeout);
          console.error('[Message Debug] Server error:', error);
          reject(new Error(error?.message || 'Server error'));
        });
      });

      setMessageState(prev => ({ ...prev, isLoading: false }));
    } catch (error) {
      console.error('[Message Debug] Send message error:', error);
      setMessageState(prev => ({
        ...prev,
        isLoading: false,
        error: error instanceof Error ? error : new Error('Failed to send message')
      }));
      throw error;
    }
  }, [socket, isConnected, authState.userId]);

  const markAsRead = useCallback((messageId: string, channelId: string) => {
    if (!socket?.connected || !messageId) return;

    console.log('[Message Debug] Marking message as read:', {
      messageId,
      channelId
    });

    socket.emit(MessageEvent.READ, {
      messageId,
      channelId,
      readAt: new Date().toISOString()
    });
  }, [socket]);

  // Add message event handlers to socket initialization
  useEffect(() => {
    if (!socket) return;

    const handleNewMessage = (message: Message) => {
      console.log('[Message Debug] New message received:', message);
      // Emit delivery confirmation
      socket.emit(MessageEvent.DELIVERED, {
        messageId: message.id,
        channelId: message.channelId
      });
    };

    const handleMessageDelivered = (data: { messageId: string, userId: string }) => {
      console.log('[Message Debug] Message delivered:', data);
    };

    const handleMessageRead = (data: { messageId: string, userId: string, readAt: string }) => {
      console.log('[Message Debug] Message read:', data);
    };

    socket.on(MessageEvent.NEW, handleNewMessage);
    socket.on(MessageEvent.DELIVERED, handleMessageDelivered);
    socket.on(MessageEvent.READ, handleMessageRead);

    return () => {
      socket.off(MessageEvent.NEW, handleNewMessage);
      socket.off(MessageEvent.DELIVERED, handleMessageDelivered);
      socket.off(MessageEvent.READ, handleMessageRead);
    };
  }, [socket]);

  // Update provider value with message methods
  const value = {
    socket,
    isConnected,
    isAuthReady: authState.isLoaded && authState.isSignedIn && !authState.error,
    isSocketReady: socketState.isInitialized && !socketState.error,
    isConnecting: socketState.isConnecting,
    error: socketState.error || authState.error || messageState.error,
    sendMessage,
    markAsRead
  };

  if (!authState.isLoaded) {
    console.log('[Provider Debug] Waiting for auth to load');
    return null;
  }

  console.log('[Provider Debug] Rendering with state:', {
    isAuthReady: value.isAuthReady,
    isSocketReady: value.isSocketReady,
    isConnected,
    hasError: !!value.error
  });

  return (
    <SocketContext.Provider value={value}>
      {children}
    </SocketContext.Provider>
  );
};