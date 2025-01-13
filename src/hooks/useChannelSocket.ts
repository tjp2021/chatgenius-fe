'use client';

import { useEffect, useState, useCallback } from 'react';
import { useSocket } from '@/providers/socket-provider';
import { Message } from '@/types/message';
import { SocketResponse } from '@/types/socket';
import { useToast } from '@/components/ui/use-toast';
import { SOCKET_EVENTS } from '@/constants/socket-events';

interface UseChannelSocketProps {
  channelId: string;
  userId: string;
}

export function useChannelSocket({ channelId, userId }: UseChannelSocketProps) {
  const { socket } = useSocket();
  const { toast } = useToast();
  const [isJoined, setIsJoined] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [typingUsers, setTypingUsers] = useState<string[]>([]);

  useEffect(() => {
    if (!socket || !channelId) return;

    const handleNewMessage = (message: Message) => {
      // Handle new message
      if (message.channelId === channelId) {
        // Emit delivery confirmation
        socket.emit(SOCKET_EVENTS.MESSAGE.RECEIVED, {
          messageId: message.id,
          processed: true
        });
      }
    };

    const handleMessageDelivered = (messageId: string) => {
      // Handle message delivered
    };

    const handleMessageRead = (messageId: string) => {
      // Handle message read
    };

    const handleTypingStart = (data: { userId: string; channelId: string }) => {
      if (data.channelId === channelId && data.userId !== userId) {
        setTypingUsers(prev => Array.from(new Set([...prev, data.userId])));
      }
    };

    const handleTypingStop = (data: { userId: string; channelId: string }) => {
      if (data.channelId === channelId) {
        setTypingUsers(prev => prev.filter(id => id !== data.userId));
      }
    };

    socket.on(SOCKET_EVENTS.MESSAGE.NEW, handleNewMessage);
    socket.on(SOCKET_EVENTS.MESSAGE.DELIVERED, handleMessageDelivered);
    socket.on(SOCKET_EVENTS.MESSAGE.READ, handleMessageRead);
    socket.on(SOCKET_EVENTS.TYPING.START, handleTypingStart);
    socket.on(SOCKET_EVENTS.TYPING.STOP, handleTypingStop);

    return () => {
      socket.off(SOCKET_EVENTS.MESSAGE.NEW, handleNewMessage);
      socket.off(SOCKET_EVENTS.MESSAGE.DELIVERED, handleMessageDelivered);
      socket.off(SOCKET_EVENTS.MESSAGE.READ, handleMessageRead);
      socket.off(SOCKET_EVENTS.TYPING.START, handleTypingStart);
      socket.off(SOCKET_EVENTS.TYPING.STOP, handleTypingStop);
    };
  }, [socket, channelId, userId]);

  const joinChannel = useCallback(async () => {
    if (!socket || !channelId) return;

    try {
      const response = await socket.emit(SOCKET_EVENTS.CHANNEL.JOIN, { channelId });
      if (response.success) {
        setIsJoined(true);
      } else {
        toast({
          title: 'Error',
          description: response.error || 'Failed to join channel',
          variant: 'destructive'
        });
      }
    } catch (error) {
      console.error('Failed to join channel:', error);
      toast({
        title: 'Error',
        description: 'Failed to join channel',
        variant: 'destructive'
      });
    }
  }, [socket, channelId, toast]);

  const leaveChannel = useCallback(async () => {
    if (!socket || !channelId) return;

    try {
      const response = await socket.emit(SOCKET_EVENTS.CHANNEL.LEAVE, { channelId });
      if (response.success) {
        setIsJoined(false);
      }
    } catch (error) {
      console.error('Failed to leave channel:', error);
    }
  }, [socket, channelId]);

  const startTyping = useCallback(() => {
    if (!socket || !channelId || isTyping) return;

    setIsTyping(true);
    socket.emit(SOCKET_EVENTS.TYPING.START, { channelId });
  }, [socket, channelId, isTyping]);

  const stopTyping = useCallback(() => {
    if (!socket || !channelId || !isTyping) return;

    setIsTyping(false);
    socket.emit(SOCKET_EVENTS.TYPING.STOP, { channelId });
  }, [socket, channelId, isTyping]);

  return {
    isJoined,
    typingUsers,
    joinChannel,
    leaveChannel,
    startTyping,
    stopTyping
  };
} 