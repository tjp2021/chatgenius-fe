'use client';

import { useRouter } from 'next/navigation';
import { Channel, ChannelType } from '@/types/channel';
import { Hash, Lock, MessageSquare } from 'lucide-react';
import { cn } from '@/lib/utils';
import { api } from '@/lib/axios';
import { useSocket } from '@/providers/socket-provider';
import { CreateChannelDialog } from './create-channel-dialog';
import { useAuth } from '@clerk/nextjs';
import { useQuery, useQueryClient, UseQueryOptions } from '@tanstack/react-query';
import { useToast } from '@/components/ui/use-toast';
import { useState, useEffect } from 'react';

interface ChannelResponse {
  channels: ChannelWithMemberCount[];
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

    const handleMembershipChange = (data: { channelId: string }) => {
      queryClient.invalidateQueries({ queryKey: ['channels'] });
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
              'w-full flex items-center gap-2 rounded-lg px-3 py-2 hover:bg-muted/50 transition',
              channel.id === selectedChannel && 'bg-muted'
            )}
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
          </button>
        ))}
      </div>
    </div>
  );
} 