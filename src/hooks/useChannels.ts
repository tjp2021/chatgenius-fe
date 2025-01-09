'use client';

import { useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Channel, ChannelType } from '@/types/channel';
import { api } from '@/lib/axios';
import { useSocket } from '@/providers/socket-provider';
import { useToast } from '@/components/ui/use-toast';

interface ChannelResponse {
  channels: Channel[];
}

interface ChannelMutationResponse {
  channel: Channel;
}

interface MembershipResponse {
  channelId: string;
  userId: string;
  role: string;
  joinedAt: string;
  channel: {
    id: string;
    name: string;
    description: string;
    type: ChannelType;
  };
}

export function useChannels() {
  const { socket, isConnected } = useSocket();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Use React Query for REST API state
  const { data: channelsData, isLoading, error } = useQuery<ChannelResponse>({
    queryKey: ['channels', 'browse', 'joined'],
    queryFn: async () => {
      console.log('🔄 [CHANNELS] Fetching joined channels');
      const response = await api.get<ChannelResponse>('/channels/browse/joined');
      return response.data;
    },
    staleTime: 0, // Always fetch fresh data on mount
    refetchOnMount: true, // Refetch when component mounts
    retry: 3, // Retry failed requests 3 times
  });

  // Join channel mutation
  const joinChannelMutation = useMutation({
    mutationFn: async (channelId: string) => {
      const response = await api.post<ChannelMutationResponse>(`/channels/${channelId}/join`);
      return response.data;
    },
    onSuccess: (data) => {
      console.log('✅ [JOIN] Successfully joined channel:', data.channel.id);
      
      // Update the public channels list
      queryClient.setQueryData(['channels', 'browse', 'public'], (old: any) => {
        if (!old?.channels) return old;
        return {
          ...old,
          channels: old.channels.map((ch: Channel) => 
            ch.id === data.channel.id ? { ...ch, isMember: true } : ch
          )
        };
      });

      // Trigger a refetch of joined channels instead of optimistic update
      queryClient.invalidateQueries({ queryKey: ['channels', 'browse', 'joined'] });

      toast({
        title: 'Success',
        description: 'Successfully joined the channel',
      });
    },
    onError: (error) => {
      console.error('❌ [JOIN] Failed to join channel:', error);
      toast({
        title: 'Error',
        description: 'Failed to join channel',
        variant: 'destructive',
      });
    }
  });

  // Leave channel mutation
  const leaveChannelMutation = useMutation({
    mutationFn: async (channelId: string) => {
      const response = await api.post(`/channels/${channelId}/leave`);
      return response.data;
    },
    onSuccess: (_, channelId) => {
      console.log('✅ [LEAVE] Successfully left channel:', channelId);
      
      // Update the public channels list
      queryClient.setQueryData(['channels', 'browse', 'public'], (old: any) => {
        if (!old?.channels) return old;
        return {
          ...old,
          channels: old.channels.map((ch: Channel) => 
            ch.id === channelId ? { ...ch, isMember: false } : ch
          )
        };
      });

      // Trigger a refetch of joined channels instead of optimistic update
      queryClient.invalidateQueries({ queryKey: ['channels', 'browse', 'joined'] });

      toast({
        title: 'Success',
        description: 'Successfully left the channel',
      });
    },
    onError: (error) => {
      console.error('❌ [LEAVE] Failed to leave channel:', error);
      toast({
        title: 'Error',
        description: 'Failed to leave channel',
        variant: 'destructive',
      });
    }
  });

  // Listen for channel updates
  useEffect(() => {
    if (!socket || !isConnected) return;

    console.log('🔌 [SOCKET] Setting up channel event listeners');

    const handleMemberJoined = (data: any) => {
      console.log('🎯 [SOCKET JOIN] Event received:', data);
      
      if (data.userId === socket.auth?.userId) {
        // Instead of complex cache manipulation, just refetch the data
        queryClient.invalidateQueries({ queryKey: ['channels', 'browse', 'joined'] });
      }
    };

    const handleMemberLeft = (data: any) => {
      console.log('🎯 [SOCKET LEAVE] Event received:', data);
      
      if (data.userId === socket.auth?.userId) {
        // Instead of complex cache manipulation, just refetch the data
        queryClient.invalidateQueries({ queryKey: ['channels', 'browse', 'joined'] });
      }
    };

    // Subscribe to events
    socket.on('channel:member_joined', handleMemberJoined);
    socket.on('channel:member_left', handleMemberLeft);

    // Cleanup
    return () => {
      console.log('🧹 [SOCKET] Cleaning up channel event listeners');
      socket.off('channel:member_joined', handleMemberJoined);
      socket.off('channel:member_left', handleMemberLeft);
    };
  }, [socket, isConnected, queryClient]);

  return {
    channels: channelsData?.channels ?? [],
    loading: isLoading,
    error: error as Error | null,
    joinChannel: (channelId: string) => joinChannelMutation.mutateAsync(channelId),
    leaveChannel: (channelId: string) => leaveChannelMutation.mutateAsync(channelId),
    isJoining: joinChannelMutation.isPending,
    isLeaving: leaveChannelMutation.isPending
  };
} 