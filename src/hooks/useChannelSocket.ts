'use client';

import { useCallback, useEffect } from 'react';
import { useSocket } from '@/providers/socket-provider';
import { useToast } from '@/components/ui/use-toast';
import { useQueryClient } from '@tanstack/react-query';
import type { Channel } from '@/types/channel';

interface ChannelEvent {
  type?: 'member_left' | 'member_joined';
  channelId?: string;
  userId?: string;
  member?: any;
  channel?: Channel;
  error?: string;
}

export function useChannelSocket() {
  const { socket, isConnected } = useSocket();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Handle channel events
  const handleChannelEvent = useCallback((event: ChannelEvent) => {
    console.log('Channel event received:', event);

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
      // For member_left event
      if (event.type === 'member_left' && event.channelId && event.userId) {
        console.log('Member left event:', event);
        // If current user left, remove the channel
        if (event.userId === socket?.auth?.userId) {
          return old.filter(ch => ch.id !== event.channelId);
        }
        // If another user left, update the members list
        return old.map(ch => {
          if (ch.id === event.channelId) {
            return {
              ...ch,
              members: (ch.members || []).filter(m => m.userId !== event.userId)
            };
          }
          return ch;
        });
      }

      // For member_joined event
      if (event.type === 'member_joined' && event.channelId && event.member) {
        console.log('Member joined event:', event);
        return old.map(ch => {
          if (ch.id === event.channelId) {
            return {
              ...ch,
              members: [...(ch.members || []), event.member]
            };
          }
          return ch;
        });
      }

      // For channel updates (created, updated)
      if (event.channel) {
        console.log('Channel update event:', event);
        const channelWithMembers = {
          ...event.channel,
          members: event.channel.members || []
        };

        const exists = old.some(ch => ch.id === channelWithMembers.id);
        if (!exists) {
          return [...old, channelWithMembers];
        }
        return old.map(ch => ch.id === channelWithMembers.id ? channelWithMembers : ch);
      }

      return old;
    });
  }, [toast, queryClient, socket?.auth?.userId]);

  // Subscribe to channel events when socket is connected
  useEffect(() => {
    if (!socket || !isConnected) return;

    console.log('Setting up channel event listeners');

    socket.on('channel:created', handleChannelEvent);
    socket.on('channel:updated', handleChannelEvent);
    socket.on('channel:member_joined', handleChannelEvent);
    socket.on('channel:member_left', handleChannelEvent);
    socket.on('channel:error', handleChannelEvent);

    return () => {
      console.log('Cleaning up channel event listeners');
      socket.off('channel:created', handleChannelEvent);
      socket.off('channel:updated', handleChannelEvent);
      socket.off('channel:member_joined', handleChannelEvent);
      socket.off('channel:member_left', handleChannelEvent);
      socket.off('channel:error', handleChannelEvent);
    };
  }, [socket, isConnected, handleChannelEvent]);

  return {
    socket,
    isConnected
  };
} 