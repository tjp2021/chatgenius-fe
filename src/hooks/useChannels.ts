'use client';

import { useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useApi } from '@/hooks/useApi';
import { useSocket } from '@/providers/socket-provider';
import type { Channel, ChannelMutationResponse } from '@/types/channel';

interface APIResponse<T> {
  data: T;
  success: boolean;
  error?: string;
}

export function useChannels() {
  const queryClient = useQueryClient();
  const { socket } = useSocket();
  const api = useApi();

  // Fetch channels
  const { data: channels = [], isLoading } = useQuery({
    queryKey: ['channels'],
    queryFn: async () => {
      const response = await api.getChannels() as APIResponse<Channel[]>;
      console.log('Raw API response:', response); // Log entire response
      
      // Handle both possible response formats
      let channelData: Channel[] = [];
      
      // If response itself is the array
      if (Array.isArray(response)) {
        console.log('Response is array, length:', response.length);
        channelData = response;
      }
      // If response.data is the array
      else if (Array.isArray(response.data)) {
        console.log('Response.data is array, length:', response.data.length);
        channelData = response.data;
      }
      // If response is array-like object with numeric keys
      else if (response && typeof response === 'object' && 'length' in response) {
        console.log('Response is array-like object, length:', (response as any).length);
        const length = Number((response as any).length);
        if (!isNaN(length)) {
          channelData = Array.from({ length }, (_, i) => (response as any)[i] as Channel);
        }
      }
      // If response.data is array-like object with numeric keys
      else if (response?.data && typeof response.data === 'object' && 'length' in response.data) {
        console.log('Response.data is array-like object, length:', (response.data as any).length);
        const length = Number((response.data as any).length);
        if (!isNaN(length)) {
          channelData = Array.from({ length }, (_, i) => (response.data as any)[i] as Channel);
        }
      }

      console.log('Final processed channel data:', channelData);
      return channelData;
    }
  });

  // Log whenever channels update
  useEffect(() => {
    console.log('Channels updated in useChannels:', channels);
  }, [channels]);

  // Join channel mutation
  const joinChannelMutation = useMutation<ChannelMutationResponse, Error, string>({
    mutationFn: async (channelId: string) => {
      const response = await api.joinChannel(channelId);
      // After successful API call, emit socket event
      if (response.success && socket?.connected) {
        socket.emit('channel:join', { channelId });
      }
      return response;
    },
    onSuccess: (response) => {
      if (response.success && response.channel) {
        queryClient.setQueryData(['channels'], (old: Channel[] = []) => {
          const exists = old.some(ch => ch.id === response.channel!.id);
          if (exists) {
            return old.map(ch => ch.id === response.channel!.id ? response.channel! : ch);
          }
          return [...old, response.channel];
        });
      }
    }
  });

  // Leave channel mutation
  const leaveChannelMutation = useMutation<ChannelMutationResponse, Error, string>({
    mutationFn: async (channelId: string) => {
      const response = await api.leaveChannel(channelId);
      // After successful API call, emit socket event
      if (response.success && socket?.connected) {
        socket.emit('channel:leave', { channelId });
      }
      return response;
    },
    onSuccess: (response, channelId) => {
      if (response.success) {
        queryClient.setQueryData(['channels'], (old: Channel[] = []) => {
          return old.filter(ch => ch.id !== channelId);
        });
      }
    }
  });

  // Socket event handlers
  useEffect(() => {
    if (!socket) return;

    const handleChannelCreated = (data: { channel: Channel }) => {
      console.log('Channel created event:', data); // Debug log
      queryClient.setQueryData(['channels'], (old: Channel[] = []) => {
        const exists = old.some(ch => ch.id === data.channel.id);
        if (exists) return old;
        return [...old, data.channel];
      });
    };

    const handleChannelUpdated = (data: { channel: Channel }) => {
      console.log('Channel updated event:', data); // Debug log
      queryClient.setQueryData(['channels'], (old: Channel[] = []) => {
        return old.map(ch => ch.id === data.channel.id ? data.channel : ch);
      });
    };

    const handleChannelDeleted = (data: { channelId: string }) => {
      console.log('Channel deleted event:', data); // Debug log
      queryClient.setQueryData(['channels'], (old: Channel[] = []) => {
        return old.filter(ch => ch.id !== data.channelId);
      });
    };

    socket.on('channel:created', handleChannelCreated);
    socket.on('channel:updated', handleChannelUpdated);
    socket.on('channel:deleted', handleChannelDeleted);

    return () => {
      socket.off('channel:created', handleChannelCreated);
      socket.off('channel:updated', handleChannelUpdated);
      socket.off('channel:deleted', handleChannelDeleted);
    };
  }, [socket, queryClient]);

  console.log('Current channels:', channels); // Debug log

  return {
    channels,
    isLoading,
    joinChannel: joinChannelMutation.mutateAsync,
    leaveChannel: leaveChannelMutation.mutateAsync
  };
} 