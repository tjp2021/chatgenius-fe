import { useCallback, useEffect, useState } from 'react';
import { useSocket } from '@/providers/socket-provider';
import type { Message } from '@/types/message';
import { MessageEvent } from '@/types/message';

interface UseSocketMessagesProps {
  channelId: string;
  onNewMessage?: (message: Message) => void;
  onMessageDelivered?: (messageId: string) => void;
  onMessageRead?: (messageId: string) => void;
  onTypingStart?: (userId: string) => void;
  onTypingStop?: (userId: string) => void;
}

interface UseSocketMessagesState {
  isLoading: boolean;
  error: Error | null;
  typingUsers: Set<string>;
}

export const useSocketMessages = ({
  channelId,
  onNewMessage,
  onMessageDelivered,
  onMessageRead,
  onTypingStart,
  onTypingStop
}: UseSocketMessagesProps) => {
  const { 
    socket,
    isConnected,
    sendMessage,
    markAsRead,
    startTyping: emitStartTyping,
    stopTyping: emitStopTyping,
    retryFailedMessage
  } = useSocket();

  const [state, setState] = useState<UseSocketMessagesState>({
    isLoading: false,
    error: null,
    typingUsers: new Set()
  });

  // Handle new messages
  useEffect(() => {
    if (!socket || !isConnected) return;

    const handleNewMessage = (message: Message) => {
      if (message.channelId === channelId) {
        onNewMessage?.(message);
      }
    };

    socket.on(MessageEvent.NEW, handleNewMessage);
    return () => {
      socket.off(MessageEvent.NEW, handleNewMessage);
    };
  }, [socket, isConnected, channelId, onNewMessage]);

  // Handle message delivery status
  useEffect(() => {
    if (!socket || !isConnected) return;

    const handleDelivered = (data: { messageId: string }) => {
      onMessageDelivered?.(data.messageId);
    };

    const handleRead = (data: { messageId: string }) => {
      onMessageRead?.(data.messageId);
    };

    socket.on(MessageEvent.DELIVERED, handleDelivered);
    socket.on(MessageEvent.READ, handleRead);

    return () => {
      socket.off(MessageEvent.DELIVERED, handleDelivered);
      socket.off(MessageEvent.READ, handleRead);
    };
  }, [socket, isConnected, onMessageDelivered, onMessageRead]);

  // Handle typing indicators
  useEffect(() => {
    if (!socket || !isConnected) return;

    const handleTypingStart = (data: { userId: string, channelId: string }) => {
      if (data.channelId === channelId) {
        setState(prev => ({
          ...prev,
          typingUsers: new Set(Array.from(prev.typingUsers).concat(data.userId))
        }));
        onTypingStart?.(data.userId);
      }
    };

    const handleTypingStop = (data: { userId: string, channelId: string }) => {
      if (data.channelId === channelId) {
        setState(prev => {
          const newTypingUsers = new Set(prev.typingUsers);
          newTypingUsers.delete(data.userId);
          return {
            ...prev,
            typingUsers: newTypingUsers
          };
        });
        onTypingStop?.(data.userId);
      }
    };

    socket.on(MessageEvent.TYPING_START, handleTypingStart);
    socket.on(MessageEvent.TYPING_STOP, handleTypingStop);

    return () => {
      socket.off(MessageEvent.TYPING_START, handleTypingStart);
      socket.off(MessageEvent.TYPING_STOP, handleTypingStop);
    };
  }, [socket, isConnected, channelId, onTypingStart, onTypingStop]);

  // Debounced typing indicator
  const startTyping = useCallback(() => {
    if (!channelId) return;
    emitStartTyping(channelId);
  }, [channelId, emitStartTyping]);

  const stopTyping = useCallback(() => {
    if (!channelId) return;
    emitStopTyping(channelId);
  }, [channelId, emitStopTyping]);

  // Send message with error handling
  const send = useCallback(async (content: string) => {
    try {
      setState(prev => ({ ...prev, isLoading: true, error: null }));
      await sendMessage(channelId, content);
      setState(prev => ({ ...prev, isLoading: false }));
    } catch (error) {
      setState(prev => ({
        ...prev,
        isLoading: false,
        error: error instanceof Error ? error : new Error('Failed to send message')
      }));
      throw error;
    }
  }, [channelId, sendMessage]);

  return {
    send,
    startTyping,
    stopTyping,
    markRead: markAsRead,
    retryFailed: retryFailedMessage,
    typingUsers: Array.from(state.typingUsers),
    isLoading: state.isLoading,
    error: state.error
  };
}; 