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

interface MutationContext {
  previousChannels: Channel[] | undefined;
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
      try {
        const response = await fetch(`/api/channels/${channelId}/join`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          }
        });

        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.message || 'Failed to join channel');
        }

        const data = await response.json();
        return {
          success: true,
          channel: data.channel
        };
      } catch (error) {
        console.error('Error joining channel:', error);
        throw error;
      }
    },
    onSuccess: (response, channelId) => {
      // Force refetch to ensure we have the latest data
      queryClient.invalidateQueries({ queryKey: ['channels'] });

      // Emit the join event
      if (socket?.connected) {
        socket.emit('channel:join', { channelId });
      }
    }
  });

  // Leave channel mutation
  const leaveChannelMutation = useMutation<ChannelMutationResponse, Error, string, MutationContext>({
    mutationFn: async (channelId: string) => {
      try {
        const response = await fetch(`/api/channels/${channelId}/leave`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          }
        });

        const data = await response.json();
        
        if (!response.ok) {
          throw new Error(data.error || 'Failed to leave channel');
        }

        return {
          success: true,
          channel: data.channel
        };
      } catch (error) {
        console.error('Error leaving channel:', error);
        if (error instanceof Error) {
          throw error;
        }
        throw new Error('Failed to leave channel');
      }
    },
    onMutate: async (channelId) => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey: ['channels'] });

      // Snapshot the previous value
      const previousChannels = queryClient.getQueryData<Channel[]>(['channels']);

      // Optimistically update to the new value
      queryClient.setQueryData(['channels'], (old: Channel[] = []) => {
        return old.filter(channel => channel.id !== channelId);
      });

      // Return a context object with the snapshotted value
      return { previousChannels };
    },
    onError: (err, channelId, context) => {
      // If the mutation fails, use the context returned from onMutate to roll back
      if (context?.previousChannels) {
        queryClient.setQueryData(['channels'], context.previousChannels);
      }
    },
    onSettled: () => {
      // Refetch after error or success
      queryClient.invalidateQueries({ queryKey: ['channels'] });
    }
  });

  console.log('Current channels:', channels); // Debug log

  return {
    channels,
    isLoading,
    joinChannel: joinChannelMutation.mutateAsync,
    leaveChannel: leaveChannelMutation.mutateAsync
  };
} 