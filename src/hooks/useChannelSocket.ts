'use client';

import { useCallback, useEffect } from 'react';
import { useSocket } from '@/providers/socket-provider';
import { useToast } from '@/components/ui/use-toast';
import { useQueryClient } from '@tanstack/react-query';
import type { Channel } from '@/types/channel';

export function useChannelSocket(currentChannelId?: string) {
  const { socket } = useSocket();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Handle channel events
  const handleChannelEvent = useCallback((event: any) => {
    if (event.error) {
      toast({
        title: 'Channel Error',
        description: event.error,
        variant: 'destructive'
      });
      return;
    }

    // Update channel data in cache
    queryClient.setQueryData(['channels'], (old: Channel[] = []) => {
      const index = old.findIndex(ch => ch.id === event.channel.id);
      if (index === -1) {
        return [...old, event.channel];
      }
      return old.map(ch => ch.id === event.channel.id ? event.channel : ch);
    });
  }, [toast, queryClient]);

  // Subscribe to channel events
  useEffect(() => {
    if (!socket) return;

    socket.on('channel:created', handleChannelEvent);
    socket.on('channel:updated', handleChannelEvent);
    socket.on('channel:member_joined', handleChannelEvent);
    socket.on('channel:member_left', handleChannelEvent);
    socket.on('channel:error', handleChannelEvent);

    return () => {
      socket.off('channel:created', handleChannelEvent);
      socket.off('channel:updated', handleChannelEvent);
      socket.off('channel:member_joined', handleChannelEvent);
      socket.off('channel:member_left', handleChannelEvent);
      socket.off('channel:error', handleChannelEvent);
    };
  }, [socket, handleChannelEvent]);

  return {
    socket
  };
} 