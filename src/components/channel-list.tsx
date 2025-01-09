'use client';

import { useRouter } from 'next/navigation';
import { Channel, ChannelType } from '@/types/channel';
import { Hash, Lock, MessageSquare } from 'lucide-react';
import { cn } from '@/lib/utils';
import { api } from '@/lib/axios';
import { useSocket } from '@/providers/socket-provider';
import { CreateChannelDialog } from './create-channel-dialog';
import { useAuth } from '@clerk/nextjs';
import { useQuery, useQueryClient, UseQueryOptions, useMutation } from '@tanstack/react-query';
import { useToast } from '@/components/ui/use-toast';
import { useState, useEffect } from 'react';

interface ChannelResponse {
  channels: ChannelWithMemberCount[];
}

interface ChannelMutationResponse {
  channel: Channel;
}

interface ChannelWithMemberCount extends Channel {
  _count: {
    members: number;
    messages: number;
  }
}

export function ChannelList() {
  const router = useRouter();
  const { socket } = useSocket();
  const { isSignedIn, isLoaded } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedChannel, setSelectedChannel] = useState<string | null>(null);
  const [joiningChannel, setJoiningChannel] = useState<string | null>(null);
  const [leavingChannel, setLeavingChannel] = useState<string | null>(null);

  // Join channel mutation
  const joinChannelMutation = useMutation({
    mutationFn: async (channelId: string) => {
      console.log('🚀 [JOIN] Starting join mutation for channel:', channelId);
      
      // Wait for socket to be ready
      if (socket && !socket.connected) {
        console.log('⏳ [JOIN] Waiting for socket connection...');
        await new Promise<void>((resolve) => {
          const checkConnection = () => {
            if (socket.connected) {
              console.log('✅ [JOIN] Socket connected!');
              resolve();
            } else {
              setTimeout(checkConnection, 100);
            }
          };
          checkConnection();
        });
      }
      
      const response = await api.post<ChannelMutationResponse>(`/channels/${channelId}/join`);
      console.log('✅ [JOIN] API response received:', response.data);
      
      // Now we know socket is connected
      if (socket && socket.connected) {
        console.log('📡 [JOIN] Emitting socket event for channel:', channelId);
        socket.emit('channel:join', { channelId });
      } else {
        console.error('❌ [JOIN] Socket still not connected! Connected status:', socket?.connected);
      }
      
      return response.data;
    },
    onSuccess: (data) => {
      console.log('✨ [JOIN] Mutation success, channel data:', data);
      queryClient.setQueryData(['channels', 'browse', 'joined'], (old: any) => {
        if (!old?.channels) return { channels: [data.channel] };
        if (old.channels.some((ch: Channel) => ch.id === data.channel.id)) return old;
        console.log('🔄 [JOIN] Updating cache with new channel');
        return {
          ...old,
          channels: [...old.channels, data.channel]
        };
      });
    }
  });

  // Leave channel mutation
  const leaveChannelMutation = useMutation({
    mutationFn: async (channelId: string) => {
      console.log('🚀 [LEAVE] Starting leave mutation for channel:', channelId);
      await api.delete(`/channels/${channelId}/leave`);
      
      // Add socket emit here too for consistency!
      if (socket && socket.connected) {
        console.log('📡 [LEAVE] Emitting socket event for channel:', channelId);
        socket.emit('channel:leave', { channelId });
      } else {
        console.error('❌ [LEAVE] Socket not connected! Connected status:', socket?.connected);
      }
      
      return { channelId };
    },
    onSuccess: (data) => {
      console.log('✨ [LEAVE] Mutation success, removing channel:', data.channelId);
      queryClient.setQueryData(['channels', 'browse', 'joined'], (old: any) => {
        if (!old?.channels) return { channels: [] };
        console.log('🔄 [LEAVE] Updating cache by removing channel');
        return {
          ...old,
          channels: old.channels.filter((ch: Channel) => ch.id !== data.channelId)
        };
      });
    }
  });

  const queryOptions: UseQueryOptions<ChannelResponse, Error> = {
    queryKey: ['channels', 'browse', 'joined'],
    queryFn: async () => {
      try {
        const response = await api.get<ChannelResponse>('/channels/browse/joined', {
          params: {
            sortBy: 'createdAt',
            sortOrder: 'desc'
          }
        });
        return response.data;
      } catch (error: any) {
        console.error('Failed to fetch channels:', error);
        toast({
          title: 'Error',
          description: error.response?.data?.message || 'Failed to fetch channels',
          variant: 'destructive',
        });
        throw error;
      }
    },
    enabled: isLoaded && isSignedIn,
    retry: 3,
    retryDelay: 1000
  };

  const { data: channelsResponse, isLoading, error } = useQuery<ChannelResponse, Error>(queryOptions);

  useEffect(() => {
    if (!socket) return;

    const handleChannelUpdate = () => {
      queryClient.invalidateQueries({ queryKey: ['channels'] });
    };

    const handleMembershipChange = (data: { channelId: string, userId: string }) => {
      // Update UI state for join/leave actions
      if (data.userId === socket.auth?.userId) {
        setJoiningChannel(null);
        setLeavingChannel(null);
      }
    };

    socket.on('channel:update', handleChannelUpdate);
    socket.on('channel:delete', handleChannelUpdate);
    socket.on('channel:member_joined', handleMembershipChange);
    socket.on('channel:member_left', handleMembershipChange);

    return () => {
      socket.off('channel:update', handleChannelUpdate);
      socket.off('channel:delete', handleChannelUpdate);
      socket.off('channel:member_joined', handleMembershipChange);
      socket.off('channel:member_left', handleMembershipChange);
    };
  }, [socket, queryClient]);

  // Refetch on focus to ensure fresh data
  useEffect(() => {
    const handleFocus = () => {
      queryClient.invalidateQueries({ queryKey: ['channels'] });
    };

    window.addEventListener('focus', handleFocus);
    return () => window.removeEventListener('focus', handleFocus);
  }, [queryClient]);

  // Don't show anything while auth is loading
  if (!isLoaded) {
    return null;
  }

  // Redirect to login if not authenticated
  if (!isSignedIn) {
    router.push('/sign-in');
    return null;
  }

  if (isLoading) {
    return (
      <div className="p-4 text-muted-foreground">
        Loading channels...
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 text-destructive">
        Failed to load channels. Please try again.
      </div>
    );
  }

  const channels = channelsResponse?.channels ?? [];

  const handleJoinChannel = async (channelId: string) => {
    setJoiningChannel(channelId);
    try {
      await joinChannelMutation.mutateAsync(channelId);
      toast({
        title: 'Success',
        description: 'Successfully joined the channel',
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to join channel',
        variant: 'destructive',
      });
    } finally {
      setJoiningChannel(null);
    }
  };

  const handleLeaveChannel = async (channelId: string) => {
    setLeavingChannel(channelId);
    try {
      await leaveChannelMutation.mutateAsync(channelId);
      toast({
        title: 'Success',
        description: 'Successfully left the channel',
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to leave channel',
        variant: 'destructive',
      });
    } finally {
      setLeavingChannel(null);
    }
  };

  return (
    <div className="space-y-4 p-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Channels</h2>
        <CreateChannelDialog 
          onChannelCreated={() => queryClient.invalidateQueries({ queryKey: ['channels', 'browse'] })} 
        />
      </div>
      <div className="space-y-2">
        {channels.map((channel) => (
          <button
            key={channel.id}
            onClick={() => {
              setSelectedChannel(channel.id);
              router.push(`/channels/${channel.id}`);
            }}
            className={cn(
              'w-full flex items-center gap-2 rounded-lg px-3 py-2 hover:bg-muted/50 transition relative',
              channel.id === selectedChannel && 'bg-muted'
            )}
            disabled={joiningChannel === channel.id || leavingChannel === channel.id}
          >
            {channel.type === ChannelType.PUBLIC ? (
              <Hash className="h-4 w-4" />
            ) : channel.type === ChannelType.DM ? (
              <MessageSquare className="h-4 w-4" />
            ) : (
              <Lock className="h-4 w-4" />
            )}
            <span>{channel.name}</span>
            <span className="ml-auto text-xs text-muted-foreground">
              {channel._count.messages} messages
            </span>
            {(joiningChannel === channel.id || leavingChannel === channel.id) && (
              <div className="absolute inset-0 bg-background/50 flex items-center justify-center">
                <div className="animate-spin rounded-full h-4 w-4 border-2 border-primary border-t-transparent" />
              </div>
            )}
          </button>
        ))}
      </div>
    </div>
  );
} 