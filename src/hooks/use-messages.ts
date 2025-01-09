import { useEffect, useRef, useCallback, useState } from 'react';
import { useSocket } from '@/providers/socket-provider';
import { Message, MessageEvent, MessageDeliveryStatus, MessagePayload, MessageResponse } from '@/types/message';
import { useToast } from '@/components/ui/use-toast';
import { api } from '@/lib/axios';
import { useQuery, useQueryClient } from '@tanstack/react-query';

interface OptimisticMessage extends Message {
  isPending: boolean;
  isFailed: boolean;
  tempId?: string;
}

// Keep track of initialized channels globally with socket IDs
const channelSocketMap = new Map<string, string>(); // channelId -> socketId

// Track active socket subscriptions globally
const activeSubscriptions = new Map<string, Set<string>>(); // channelId -> Set<eventName>

// Channel join queue
const channelJoinQueue = new Map<string, {
  timestamp: number;
  retryCount: number;
  timeoutId?: NodeJS.Timeout;
}>();

// Connection states
type ConnectionState = 'disconnected' | 'connecting' | 'connected' | 'error';

const MAX_JOIN_RETRIES = 3;
const JOIN_RETRY_DELAY = 2000;
const JOIN_TIMEOUT = 5000;

// Keep track of socket events globally to prevent duplicates
const socketEventMap = new Map<string, {
  socketId: string;
  channelId: string;
  lastEventTime: number;
}>();

export const useMessages = (channelId: string) => {
  const { socket, isConnected } = useSocket();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const currentSocketId = socket?.id;
  
  // Track connection state
  const [connectionState, setConnectionState] = useState<ConnectionState>('disconnected');
  const connectionAttempts = useRef(0);
  const MAX_RECONNECT_ATTEMPTS = 3;

  // Track socket changes
  const socketRef = useRef<{
    id: string | undefined;
    channelId: string;
  }>({
    id: undefined,
    channelId
  });

  // Stable event handlers
  const handlersRef = useRef<{
    handleNewMessage: ((message: Message) => void) | null;
    handleMessageSent: ((response: MessageResponse) => void) | null;
    handleMessageError: ((data: { messageId: string; error: string }) => void) | null;
  }>({
    handleNewMessage: null,
    handleMessageSent: null,
    handleMessageError: null
  });

  // Use React Query for messages
  const { data: messages = [], isLoading } = useQuery<OptimisticMessage[], Error>({
    queryKey: ['messages', channelId],
    queryFn: async () => {
      console.log('[useMessages:query] Fetching messages for channel:', channelId);
      try {
        const response = await api.get<Message[]>(`/messages/channel/${channelId}`);
        console.log('[useMessages:query] Fetched messages:', {
          channelId,
          count: response.data.length
        });
        return response.data.map(msg => ({
          ...msg,
          isPending: false,
          isFailed: false
        }));
      } catch (error) {
        console.error('[useMessages:query] Failed to fetch messages:', error);
        throw error;
      }
    },
    staleTime: Infinity,
    gcTime: Infinity,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    retry: false
  });

  // Track message operations
  const messageOpsRef = useRef(new Set<string>());

  // Cleanup function that removes ALL listeners
  const cleanup = useCallback(() => {
    if (!socket) return;
    
    // Remove ALL listeners for this socket
    socket.removeAllListeners();
    
    // Clear any tracked events for this channel
    socketEventMap.delete(channelId);
    channelSocketMap.delete(channelId);
    activeSubscriptions.delete(channelId);
    
    console.log('[useMessages] Performed full cleanup for channel:', channelId);
  }, [socket, channelId]);

  // Enhanced message handling with strict deduplication
  const handleNewMessage = useCallback((message: Message) => {
    console.log('[useMessages] Received new message:', {
      messageId: message.id,
      channelId: message.channelId,
      content: message.content.substring(0, 20) + '...'
    });

    // Only process messages for our channel
    if (message.channelId !== channelId) {
      console.log('[useMessages] Ignoring message for different channel');
      return;
    }

    queryClient.setQueryData(['messages', channelId], (prev: OptimisticMessage[] = []) => {
      // Check for any version of this message (optimistic or confirmed)
      const exists = prev.some(m => 
        m.id === message.id || 
        m.tempId === message.id ||
        (m.content === message.content && 
         m.userId === message.userId && 
         Math.abs(new Date(m.createdAt).getTime() - new Date(message.createdAt).getTime()) < 5000)
      );

      if (exists) {
        console.log('[useMessages] Message already exists in cache:', message.id);
        // Update any pending versions of this message
        return prev.map(msg => {
          if (msg.content === message.content && 
              msg.userId === message.userId && 
              msg.isPending) {
            return {
              ...message,
              id: message.id,
              tempId: undefined,
              isPending: false,
              isFailed: false
            };
          }
          return msg;
        });
      }

      // If message doesn't exist, add it
      return [...prev, { ...message, isPending: false, isFailed: false }];
    });

    // Send delivery acknowledgment
    socket?.emit(MessageEvent.DELIVERED, {
      messageId: message.id,
      channelId: message.channelId,
      status: MessageDeliveryStatus.DELIVERED
    });
  }, [channelId, queryClient, socket]);

  // Enhanced message sent confirmation
  const handleMessageSent = useCallback((response: MessageResponse) => {
    console.log('[useMessages] Message sent confirmation received:', response.messageId);
    
    queryClient.setQueryData(['messages', channelId], (prev: OptimisticMessage[] = []) => {
      // First, find any messages with this id (either as id or tempId)
      const messageExists = prev.some(m => m.id === response.messageId || m.tempId === response.messageId);
      
      if (!messageExists) {
        console.warn('[useMessages] Received confirmation for unknown message:', response.messageId);
        return prev;
      }

      // Update all instances of this message to be confirmed
      return prev.map(msg => {
        if (msg.id === response.messageId || msg.tempId === response.messageId) {
          return {
            ...msg,
            id: response.messageId, // Ensure consistent ID
            tempId: undefined,      // Clear tempId after confirmation
            isPending: false,
            isFailed: false
          };
        }
        return msg;
      });
    });

    // Send delivery acknowledgment
    socket?.emit(MessageEvent.DELIVERED, {
      messageId: response.messageId,
      channelId: channelId,
      status: MessageDeliveryStatus.DELIVERED
    });
  }, [channelId, queryClient, socket]);

  // Initialize handlers with enhanced message handling
  useEffect(() => {
    if (!socket) return;

    handlersRef.current = {
      handleNewMessage,
      handleMessageSent,
      handleMessageError: (data: { messageId: string; error: string }) => {
        const opId = `error-${data.messageId}`;
        if (messageOpsRef.current.has(opId)) return;
        messageOpsRef.current.add(opId);

        queryClient.setQueryData(['messages', channelId], (prev: OptimisticMessage[] = []) =>
          prev.map(msg =>
            msg.tempId === data.messageId
              ? { ...msg, isPending: false, isFailed: true }
              : msg
          )
        );

        toast({
          variant: "destructive",
          title: "Failed to send message",
          description: data.error
        });

        setTimeout(() => {
          messageOpsRef.current.delete(opId);
        }, 5000);
      }
    };

    return () => {
      handlersRef.current = {
        handleNewMessage: null,
        handleMessageSent: null,
        handleMessageError: null
      };
    };
  }, [socket, channelId, queryClient, toast, handleNewMessage, handleMessageSent]);

  // Handle connection state changes
  useEffect(() => {
    if (!socket) {
      setConnectionState('disconnected');
      return;
    }

    if (!isConnected) {
      setConnectionState('connecting');
      connectionAttempts.current += 1;
      
      if (connectionAttempts.current > MAX_RECONNECT_ATTEMPTS) {
        setConnectionState('error');
        toast({
          variant: "destructive",
          title: "Connection Error",
          description: "Failed to connect after multiple attempts"
        });
        return;
      }
    } else {
      setConnectionState('connected');
      connectionAttempts.current = 0;
    }
  }, [socket, isConnected, toast]);

  // Queue channel join with retries
  const queueChannelJoin = useCallback((socket: any, channelId: string) => {
    const existing = channelJoinQueue.get(channelId);
    if (existing) {
      if (existing.timeoutId) {
        clearTimeout(existing.timeoutId);
      }
      if (existing.retryCount >= MAX_JOIN_RETRIES) {
        console.error('[useMessages] Max join retries exceeded for channel:', channelId);
        channelJoinQueue.delete(channelId);
        setConnectionState('error');
        return;
      }
    }

    const joinWithTimeout = () => {
      const timeoutId = setTimeout(() => {
        console.error('[useMessages] Channel join timed out:', channelId);
        const queueItem = channelJoinQueue.get(channelId);
        if (queueItem && queueItem.retryCount < MAX_JOIN_RETRIES) {
          queueItem.retryCount++;
          queueItem.timestamp = Date.now();
          console.log('[useMessages] Retrying channel join:', {
            channelId,
            attempt: queueItem.retryCount
          });
          joinWithTimeout();
        } else {
          channelJoinQueue.delete(channelId);
          cleanup();
          channelSocketMap.delete(channelId);
          setConnectionState('error');
        }
      }, JOIN_TIMEOUT);

      socket.emit('channel:join', { channelId }, (response: { error?: string }) => {
        const queueItem = channelJoinQueue.get(channelId);
        if (queueItem?.timeoutId === timeoutId) {
          clearTimeout(timeoutId);
          if (response?.error) {
            console.error('[useMessages] Failed to join channel:', response.error);
            if (queueItem.retryCount < MAX_JOIN_RETRIES) {
              queueItem.retryCount++;
              queueItem.timestamp = Date.now();
              setTimeout(joinWithTimeout, JOIN_RETRY_DELAY);
            } else {
              channelJoinQueue.delete(channelId);
              cleanup();
              channelSocketMap.delete(channelId);
              setConnectionState('error');
            }
            return;
          }
          console.log('[useMessages] Successfully joined channel:', channelId);
          channelJoinQueue.delete(channelId);
        }
      });

      channelJoinQueue.set(channelId, {
        timestamp: Date.now(),
        retryCount: existing ? existing.retryCount : 0,
        timeoutId
      });
    };

    joinWithTimeout();
  }, [cleanup, setConnectionState]);

  // Handle socket connection and events
  useEffect(() => {
    if (!socket || !isConnected || !currentSocketId) return;

    // Always clean up first, but only remove channel-specific listeners
    const cleanupChannelListeners = () => {
      if (!socket) return;
      socket.off(MessageEvent.NEW);
      socket.off(MessageEvent.SENT);
      socket.off(MessageEvent.ERROR);
      console.log('[useMessages] Cleaned up channel listeners');
    };

    cleanupChannelListeners();

    console.log('[useMessages] Setting up new socket connection:', {
      channelId,
      socketId: currentSocketId
    });

    // Set up handlers
    const handlers = {
      handleNewMessage,
      handleMessageSent,
      handleMessageError: handlersRef.current.handleMessageError
    };

    // Bind handlers BEFORE joining channel
    console.log('[useMessages] Binding event handlers');
    socket.on(MessageEvent.NEW, handlers.handleNewMessage);
    socket.on(MessageEvent.SENT, handlers.handleMessageSent);
    socket.on(MessageEvent.ERROR, handlers.handleMessageError);

    // Join channel after handlers are bound
    socket.emit('channel:join', { channelId }, (response: { error?: string }) => {
      if (response?.error) {
        console.error('[useMessages] Failed to join channel:', response.error);
        cleanupChannelListeners();
        return;
      }
      
      console.log('[useMessages] Successfully joined channel:', channelId);
    });

    return () => {
      console.log('[useMessages] Cleaning up socket effect');
      cleanupChannelListeners();
    };
  }, [socket, isConnected, currentSocketId, channelId, handleNewMessage, handleMessageSent]);

  const sendMessage = (content: string) => {
    if (!socket) return;

    // Create temporary ID for optimistic update
    const tempId = `temp-${Date.now()}`;
    
    // Create optimistic message
    const optimisticMessage: OptimisticMessage = {
      id: tempId,
      tempId,
      content,
      channelId,
      userId: (socket as any).auth?.userId || 'unknown',
      userName: (socket as any).auth?.userName || 'You',
      createdAt: new Date().toISOString(),
      isPending: true,
      isFailed: false
    };

    console.log('[useMessages] Sending message with tempId:', tempId);

    // Add optimistic message to query cache
    queryClient.setQueryData(['messages', channelId], (prev: OptimisticMessage[] = []) => 
      [...prev, optimisticMessage]
    );

    // Send the actual message
    socket.emit(MessageEvent.SEND, {
      content,
      channelId,
      tempId
    } as MessagePayload, (response: { error?: string }) => {
      // Handle immediate send error
      if (response?.error) {
        console.error('[useMessages] Failed to send message:', response.error);
        queryClient.setQueryData(['messages', channelId], (prev: OptimisticMessage[] = []) =>
          prev.map(msg =>
            msg.tempId === tempId
              ? { ...msg, isPending: false, isFailed: true }
              : msg
          )
        );
        
        toast({
          variant: "destructive",
          title: "Failed to send message",
          description: response.error
        });
      }
    });
  };

  const retryMessage = (tempId: string) => {
    const currentMessages = queryClient.getQueryData<OptimisticMessage[]>(['messages', channelId]) || [];
    const failedMessage = currentMessages.find(m => m.tempId === tempId);
    if (!failedMessage || !socket) return;

    // Update message status in cache
    queryClient.setQueryData(['messages', channelId], (prev: OptimisticMessage[] = []) =>
      prev.map(msg =>
        msg.tempId === tempId
          ? { ...msg, isPending: true, isFailed: false }
          : msg
      )
    );

    // Retry sending
    socket.emit(MessageEvent.SEND, {
      content: failedMessage.content,
      channelId,
      tempId
    } as MessagePayload);
  };

  return {
    messages: messages || [],
    isLoading,
    sendMessage,
    retryMessage
  };
}; 