'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Channel } from '@/types/channel';
import { api } from '@/lib/axios';
import { useSocket } from '@/providers/socket-provider';
import { useToast } from '@/components/ui/use-toast';

interface ChannelResponse {
  channels: Channel[];
}

interface ChannelMutationResponse {
  channel: Channel;
}

export function useChannels() {
  const { socket, subscribeToChannel, unsubscribeFromChannel } = useSocket();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Use React Query for REST API state
  const { data: channelsData, isLoading, error } = useQuery<ChannelResponse>({
    queryKey: ['channels', 'browse', 'joined'],
    queryFn: async () => {
      const response = await api.get<ChannelResponse>('/channels/browse/joined');
      return response.data;
    },
    staleTime: 30000, // 30 seconds
  });

  // Join channel mutation
  const joinChannelMutation = useMutation({
    mutationFn: async (channelId: string) => {
      const response = await api.post<ChannelMutationResponse>(`/channels/${channelId}/join`);
      return response.data;
    },
    onSuccess: async (data, channelId) => {
      // Update channels cache
      queryClient.setQueryData<ChannelResponse>(['channels', 'browse', 'joined'], 
        old => {
          if (!old) return { channels: [data.channel] };
          return {
            channels: [...old.channels, data.channel]
          };
        }
      );

      // Subscribe to channel events
      try {
        await subscribeToChannel(channelId);
        toast({
          title: 'Success',
          description: 'Successfully joined the channel',
        });
      } catch (error) {
        console.error('Failed to subscribe to channel:', error);
        toast({
          title: 'Warning',
          description: 'Joined channel but failed to subscribe to real-time updates',
          variant: 'destructive',
        });
      }
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: 'Failed to join channel',
        variant: 'destructive',
      });
    }
  });

  // Leave channel mutation
  const leaveChannelMutation = useMutation({
    mutationFn: async ({ channelId, shouldDelete }: { channelId: string; shouldDelete?: boolean }) => {
      const response = await api.delete(`/channels/${channelId}/leave`, {
        params: { shouldDelete }
      });
      return { channelId, shouldDelete };
    },
    onSuccess: async ({ channelId }) => {
      // Update channels cache
      queryClient.setQueryData<ChannelResponse>(['channels', 'browse', 'joined'], 
        old => {
          if (!old) return { channels: [] };
          return {
            channels: old.channels.filter(ch => ch.id !== channelId)
          };
        }
      );

      // Unsubscribe from channel events
      try {
        await unsubscribeFromChannel(channelId);
        toast({
          title: 'Success',
          description: 'Successfully left the channel',
        });
      } catch (error) {
        console.error('Failed to unsubscribe from channel:', error);
        toast({
          title: 'Warning',
          description: 'Left channel but failed to unsubscribe from real-time updates',
          variant: 'destructive',
        });
      }
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: 'Failed to leave channel',
        variant: 'destructive',
      });
    }
  });

  const joinChannel = (channelId: string) => {
    return joinChannelMutation.mutateAsync(channelId);
  };

  const leaveChannel = (channelId: string, shouldDelete?: boolean) => {
    return leaveChannelMutation.mutateAsync({ channelId, shouldDelete });
  };

  return {
    channels: channelsData?.channels ?? [],
    loading: isLoading,
    error: error as Error | null,
    joinChannel,
    leaveChannel,
    isJoining: joinChannelMutation.isPending,
    isLeaving: leaveChannelMutation.isPending
  };
} 