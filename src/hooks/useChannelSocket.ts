'use client';

import { useEffect, useState } from 'react';
import { useSocket } from '@/hooks/useSocket';
import { Message } from '@/types/message';
import { SocketResponse } from '@/types/socket';
import { useToast } from '@/components/ui/use-toast';

interface UseChannelSocketProps {
  channelId: string;
  userId: string;
  onNewMessage?: (message: Message) => void;
  onMessageDelivered?: (messageId: string) => void;
  onMessageRead?: (messageId: string) => void;
  onJoinSuccess?: () => void;
  onLeaveSuccess?: () => void;
  onError?: (error: Error) => void;
  onTypingStart?: (userId: string) => void;
  onTypingStop?: (userId: string) => void;
}

interface UseChannelSocketReturn {
  joinChannel: () => Promise<void>;
  leaveChannel: () => Promise<void>;
  sendMessage: (content: string) => Promise<void>;
  markAsRead: (messageId: string) => Promise<void>;
  startTyping: () => void;
  stopTyping: () => void;
  isConnected: boolean;
  error: Error | null;
}

export function useChannelSocket(props: UseChannelSocketProps): UseChannelSocketReturn {
  const { socket, isConnected, error } = useSocket();
  const { toast } = useToast();
  const [typingTimeout, setTypingTimeout] = useState<NodeJS.Timeout>();

  useEffect(() => {
    if (!socket || !props.channelId) return;

    const handleNewMessage = (message: Message) => {
      if (message.channelId === props.channelId) {
        props.onNewMessage?.(message);
      }
    };

    const handleMessageDelivered = (data: { messageId: string }) => {
      props.onMessageDelivered?.(data.messageId);
    };

    const handleMessageRead = (data: { messageId: string }) => {
      props.onMessageRead?.(data.messageId);
    };

    const handleTypingStart = (data: { userId: string, channelId: string }) => {
      if (data.channelId === props.channelId && data.userId !== props.userId) {
        props.onTypingStart?.(data.userId);
      }
    };

    const handleTypingStop = (data: { userId: string, channelId: string }) => {
      if (data.channelId === props.channelId && data.userId !== props.userId) {
        props.onTypingStop?.(data.userId);
      }
    };

    socket.on('message:new', handleNewMessage);
    socket.on('message:delivered', handleMessageDelivered);
    socket.on('message:read', handleMessageRead);
    socket.on('typing:start', handleTypingStart);
    socket.on('typing:stop', handleTypingStop);

    return () => {
      socket.off('message:new', handleNewMessage);
      socket.off('message:delivered', handleMessageDelivered);
      socket.off('message:read', handleMessageRead);
      socket.off('typing:start', handleTypingStart);
      socket.off('typing:stop', handleTypingStop);
    };
  }, [socket, props.channelId, props.userId]);

  const joinChannel = async () => {
    if (!socket) {
      toast({
        title: "Error",
        description: "Socket not connected",
        variant: "destructive"
      });
      return;
    }

    try {
      const response = await socket.joinChannel(props.channelId);

      if (response.success) {
        props.onJoinSuccess?.();
      } else {
        props.onError?.(new Error(response.error || 'Failed to join channel'));
        toast({
          title: "Error",
          description: response.error || 'Failed to join channel',
          variant: "destructive"
        });
      }
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to join channel');
      props.onError?.(error);
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive"
      });
    }
  };

  const leaveChannel = async () => {
    if (!socket) {
      toast({
        title: "Error",
        description: "Socket not connected",
        variant: "destructive"
      });
      return;
    }

    try {
      const response = await socket.leaveChannel(props.channelId);

      if (response.success) {
        props.onLeaveSuccess?.();
      } else {
        props.onError?.(new Error(response.error || 'Failed to leave channel'));
        toast({
          title: "Error",
          description: response.error || 'Failed to leave channel',
          variant: "destructive"
        });
      }
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to leave channel');
      props.onError?.(error);
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive"
      });
    }
  };

  const sendMessage = async (content: string) => {
    if (!socket) {
      toast({
        title: "Error",
        description: "Socket not connected",
        variant: "destructive"
      });
      return;
    }

    try {
      const response = await socket.sendMessage<Message>(props.channelId, content);

      if (!response.success) {
        props.onError?.(new Error(response.error || 'Failed to send message'));
        toast({
          title: "Error",
          description: response.error || 'Failed to send message',
          variant: "destructive"
        });
      }
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to send message');
      props.onError?.(error);
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive"
      });
    }
  };

  const markAsRead = async (messageId: string) => {
    if (!socket) {
      toast({
        title: "Error",
        description: "Socket not connected",
        variant: "destructive"
      });
      return;
    }

    try {
      const response = await socket.emit<void>('message:read', {
        messageId
      });

      if (!response.success) {
        props.onError?.(new Error(response.error || 'Failed to mark message as read'));
        toast({
          title: "Error",
          description: response.error || 'Failed to mark message as read',
          variant: "destructive"
        });
      }
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to mark message as read');
      props.onError?.(error);
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive"
      });
    }
  };

  const startTyping = () => {
    if (!socket) return;

    socket.emit('typing:start', {
      channelId: props.channelId,
      userId: props.userId
    });

    // Clear existing timeout
    if (typingTimeout) {
      clearTimeout(typingTimeout);
    }

    // Set new timeout to stop typing after 3 seconds
    const timeout = setTimeout(() => {
      stopTyping();
    }, 3000);

    setTypingTimeout(timeout);
  };

  const stopTyping = () => {
    if (!socket) return;

    socket.emit('typing:stop', {
      channelId: props.channelId,
      userId: props.userId
    });

    if (typingTimeout) {
      clearTimeout(typingTimeout);
    }
  };

  return {
    joinChannel,
    leaveChannel,
    sendMessage,
    markAsRead,
    startTyping,
    stopTyping,
    isConnected,
    error
  };
} 