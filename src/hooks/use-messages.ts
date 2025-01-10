'use client';

import { useState, useCallback, useEffect } from 'react';
import { useSocket } from '@/providers/socket-provider';
import { useQueryClient } from '@tanstack/react-query';
import { nanoid } from 'nanoid';
import { Message, MessageEvent, MessageDeliveryStatus, MessagePayload } from '@/types/message';
import { messageStorage } from '@/lib/message-storage';

interface MessageSentEvent {
  tempId: string;
  messageId: string;
}

export function useMessages(channelId: string) {
  console.log('[Messages Hook] Initializing useMessages hook', { channelId });
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { socket, isConnected } = useSocket();
  const queryClient = useQueryClient();

  console.log('[Messages Hook] Current socket state:', { 
    hasSocket: !!socket, 
    isConnected,
    socketId: socket?.id
  });

  // Load initial messages
  useEffect(() => {
    console.log('[Messages Hook] Starting initial messages load for channel:', channelId);
    const loadMessages = async () => {
      try {
        setIsLoading(true);
        console.log('[Messages Hook] Fetching messages from API');
        const response = await fetch(`/api/messages/channel/${channelId}`, {
          credentials: 'include',
          headers: {
            'Content-Type': 'application/json'
          }
        });
        console.log('[Messages Hook] API response status:', response.status);
        
        if (!response.ok) {
          console.error('[Messages Hook] API error response:', await response.text());
          throw new Error('Failed to fetch messages');
        }
        
        const data = await response.json();
        console.log('[Messages Hook] Received messages from API:', {
          messageCount: data.messages?.length || 0,
          firstMessage: data.messages?.[0],
          lastMessage: data.messages?.[data.messages?.length - 1]
        });
        
        setMessages(data.messages || []);
      } catch (error) {
        console.error('[Messages Hook] Failed to load messages:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadMessages();
  }, [channelId]);

  // Log whenever messages state changes
  useEffect(() => {
    console.log('[Messages Hook] Messages state updated:', { 
      messageCount: messages.length,
      messages: messages
    });
  }, [messages]);

  const sendMessage = useCallback(async (content: string) => {
    if (!socket) {
      console.error('[Message Flow] Cannot send message: Socket not initialized');
      throw new Error('Socket not initialized');
    }

    if (!isConnected) {
      console.error('[Message Flow] Cannot send message: Socket not connected');
      throw new Error('Socket not connected');
    }

    console.log('[Message Flow] Starting message send process', { 
      content, 
      channelId,
      socketId: socket.id,
      isConnected
    });

    const tempId = nanoid();
    const tempMessage: Message = {
      tempId,
      content,
      userId: socket?.auth?.userId || '',
      channelId,
      createdAt: new Date().toISOString(),
      deliveryStatus: MessageDeliveryStatus.SENDING,
      readBy: []
    };

    console.log('[Message Flow] Created temp message', { tempMessage });

    // Optimistic update
    setMessages(prev => [...prev, tempMessage]);
    console.log('[Message Flow] Added optimistic update to messages state');

    // Prepare message payload
    const payload: MessagePayload = {
      content,
      channelId,
      tempId
    };

    console.log('[Message Flow] Prepared message payload', { payload });

    try {
      if (!socket?.connected) {
        console.log('[Message Flow] Socket not connected, saving to offline storage');
        messageStorage.saveMessage(channelId, payload);
        throw new Error('Socket not connected');
      }

      console.log('[Message Flow] Socket connected, emitting message:send event');
      // Send message
      socket.emit(MessageEvent.SEND, payload);

      // Wait for sent confirmation
      console.log('[Message Flow] Waiting for message:sent confirmation');
      await new Promise((resolve, reject) => {
        const timeout = setTimeout(() => {
          socket.off(MessageEvent.SENT);
          console.log('[Message Flow] Message send timeout reached');
          reject(new Error('Message send timeout'));
        }, 5000);

        socket.once(MessageEvent.SENT, (data: MessageSentEvent) => {
          if (data.tempId === tempId) {
            console.log('[Message Flow] Received message:sent confirmation', { data });
            clearTimeout(timeout);
            resolve(true);
          }
        });
      });

    } catch (error) {
      console.error('[Message Flow] Failed to send message:', error);
      setMessages(prev => prev.map(msg => 
        msg.tempId === tempId ? {
          ...msg,
          deliveryStatus: MessageDeliveryStatus.FAILED,
          error: error instanceof Error ? error.message : 'Unknown error'
        } : msg
      ));
      throw error;
    }
  }, [channelId, socket, isConnected]);

  // Process offline messages when connecting
  useEffect(() => {
    if (!isConnected || !socket) return;

    const offlineMessages = messageStorage.getMessages(channelId);
    offlineMessages.forEach(async (storedMessage) => {
      try {
        await sendMessage(storedMessage.payload.content);
        messageStorage.removeMessage(channelId, storedMessage.timestamp);
      } catch (error) {
        console.error('Failed to send offline message:', error);
      }
    });
  }, [isConnected, socket, channelId, sendMessage]);

  // Handle real-time message events
  useEffect(() => {
    if (!socket) return;

    const handleNewMessage = (message: Message) => {
      console.log('[Message Flow] Received new message event', { message });
      if (message.channelId !== channelId) {
        console.log('[Message Flow] Message for different channel, ignoring');
        return;
      }

      setMessages(prev => {
        // Check if we already have this message (e.g., from optimistic update)
        const exists = prev.some(m => 
          m.id === message.id || 
          m.tempId === message.id ||
          (m.content === message.content && 
           m.userId === message.userId && 
           Math.abs(new Date(m.createdAt).getTime() - new Date(message.createdAt).getTime()) < 5000)
        );

        console.log('[Message Flow] Message exists check:', { exists, message });

        if (exists) return prev;
        console.log('[Message Flow] Adding new message to state');
        return [...prev, message];
      });

      // Send delivery confirmation
      console.log('[Message Flow] Sending delivery confirmation');
      socket.emit(MessageEvent.DELIVERED, {
        messageId: message.id,
        channelId: message.channelId
      });
    };

    const handleMessageSent = (data: MessageSentEvent) => {
      console.log('[Message Flow] Handling message:sent event', { data });
      setMessages(prev => prev.map(msg => 
        msg.tempId === data.tempId ? {
          ...msg,
          id: data.messageId,
          deliveryStatus: MessageDeliveryStatus.SENT
        } : msg
      ));
    };

    const handleMessageDelivered = (data: { messageId: string, userId: string }) => {
      console.log('[Message Flow] Handling message:delivered event', { data });
      setMessages(prev => prev.map(msg => 
        msg.id === data.messageId ? {
          ...msg,
          deliveryStatus: MessageDeliveryStatus.DELIVERED
        } : msg
      ));
    };

    const handleMessageRead = (data: { messageId: string, userId: string, readAt: string }) => {
      setMessages(prev => prev.map(msg => 
        msg.id === data.messageId ? {
          ...msg,
          deliveryStatus: MessageDeliveryStatus.READ,
          readBy: [...(msg.readBy || []), { userId: data.userId, readAt: data.readAt }]
        } : msg
      ));
    };

    const handleMessageFailed = (data: { tempId: string, error: string }) => {
      setMessages(prev => prev.map(msg => 
        msg.tempId === data.tempId ? {
          ...msg,
          deliveryStatus: MessageDeliveryStatus.FAILED,
          error: data.error
        } : msg
      ));
    };

    socket.on(MessageEvent.NEW, handleNewMessage);
    socket.on(MessageEvent.SENT, handleMessageSent);
    socket.on(MessageEvent.DELIVERED, handleMessageDelivered);
    socket.on(MessageEvent.READ, handleMessageRead);
    socket.on(MessageEvent.FAILED, handleMessageFailed);

    return () => {
      socket.off(MessageEvent.NEW, handleNewMessage);
      socket.off(MessageEvent.SENT, handleMessageSent);
      socket.off(MessageEvent.DELIVERED, handleMessageDelivered);
      socket.off(MessageEvent.READ, handleMessageRead);
      socket.off(MessageEvent.FAILED, handleMessageFailed);
    };
  }, [socket, channelId]);

  const retryMessage = useCallback(async (tempId: string) => {
    const message = messages.find(m => m.tempId === tempId);
    if (!message) return;

    // Reset message state
    setMessages(prev => prev.map(msg => 
      msg.tempId === tempId ? {
        ...msg,
        deliveryStatus: MessageDeliveryStatus.SENDING,
        error: undefined
      } : msg
    ));

    // Retry sending
    try {
      await sendMessage(message.content);
    } catch (error) {
      console.error('Failed to retry message:', error);
    }
  }, [messages, sendMessage]);

  const markAsRead = useCallback((messageId: string) => {
    if (!socket?.connected || !messageId) return;

    socket.emit(MessageEvent.READ, {
      messageId,
      channelId,
      readAt: new Date().toISOString()
    });
  }, [socket, channelId]);

  // Auto-mark messages as read
  useEffect(() => {
    const unreadMessages = messages
      .filter(m => 
        m.deliveryStatus === MessageDeliveryStatus.DELIVERED &&
        !m.readBy?.some(r => r.userId === socket?.auth?.userId)
      )
      .map(m => m.id)
      .filter(Boolean) as string[];

    unreadMessages.forEach(markAsRead);
  }, [messages, markAsRead, socket?.auth?.userId]);

  return {
    messages,
    isLoading,
    sendMessage,
    retryMessage,
    markAsRead
  };
} 