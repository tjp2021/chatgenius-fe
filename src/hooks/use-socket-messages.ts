'use client';

import { useState, useCallback, useEffect } from 'react';
import { useSocket } from '@/providers/socket-provider';
import { Message, MessageEvent, MessageDeliveryStatus } from '@/types/message';
import { nanoid } from 'nanoid';
import { debounce } from '@/lib/utils';

interface UseSocketMessagesProps {
  channelId: string;
  onNewMessage?: (message: Message) => void;
  onMessageDelivered?: (messageId: string) => void;
  onMessageRead?: (messageId: string) => void;
  onTypingStart?: (userId: string) => void;
  onTypingStop?: (userId: string) => void;
}

interface SocketMessagesState {
  typingUsers: Set<string>;
  isLoading: boolean;
  error: Error | null;
}

interface SocketMessageEvents {
  'message:new': (message: Message) => void;
  'message:delivered': (messageId: string) => void;
  'message:read': (messageId: string) => void;
}

/* const onNewMessage = (callback: (message: Message) => void) => {
  // Implementation
};

const onMessageDelivered = (callback: (messageId: string) => void) => {
  // Implementation
};

const onMessageRead = (callback: (messageId: string) => void) => {
  // Implementation
}; */

export function useSocketMessages({
  channelId,
  onNewMessage,
  onMessageDelivered,
  onMessageRead,
  onTypingStart,
  onTypingStop
}: UseSocketMessagesProps) {
  const { socket } = useSocket();
  const [state, setState] = useState<SocketMessagesState>({
    typingUsers: new Set(),
    isLoading: false,
    error: null
  });

  // Debounced typing functions
  const emitStartTyping = useCallback(
    debounce((channelId: string) => {
      if (!socket || !socket.isConnected) return;
      socket.emit(MessageEvent.TYPING_START, { channelId });
    }, 500),
    [socket]
  );

  const emitStopTyping = useCallback(
    debounce((channelId: string) => {
      if (!socket || !socket.isConnected) return;
      socket.emit(MessageEvent.TYPING_STOP, { channelId });
    }, 500),
    [socket]
  );

  // Handle typing indicators
  useEffect(() => {
    if (!socket) return;

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
  }, [socket, channelId, onTypingStart, onTypingStop]);

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
  const sendMessage = useCallback(async (content: string) => {
    if (!socket || !socket.isConnected) {
      throw new Error('Socket not connected');
    }

    const tempId = nanoid();
    const tempMessage: Message = {
      tempId,
      content,
      userId: socket.auth.userId,
      channelId,
      createdAt: new Date().toISOString(),
      deliveryStatus: MessageDeliveryStatus.SENDING
    };

    // Stop typing when sending a message
    stopTyping();

    return socket.sendMessage(channelId, content, tempId);
  }, [socket, channelId, stopTyping]);

  return {
    send: sendMessage,
    startTyping,
    stopTyping,
    typingUsers: Array.from(state.typingUsers),
    isLoading: state.isLoading,
    error: state.error
  };
} 