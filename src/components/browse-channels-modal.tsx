'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Channel, ChannelType } from '@/types/channel';
import { api } from '@/lib/axios';
import { cn } from '@/lib/utils';
import { useSocket } from '@/providers/socket-provider';
import { useToast } from '@/components/ui/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogClose,
} from '@/components/ui/dialog';
import { Hash, Users, Search, AlertCircle, X, MessageSquare, Lock } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useChannelSocket } from '@/hooks/useChannelSocket';

interface BrowseChannelsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface ChannelResponse {
  channels: Channel[];
}

interface ChannelLeaveResponse {
  nextChannel: {
    channelId: string;
    type: 'PUBLIC' | 'PRIVATE' | 'DM';
    lastViewedAt: string;
    unreadState: boolean;
  } | null;
}

export function BrowseChannelsModal({ open, onOpenChange }: BrowseChannelsModalProps) {
  const router = useRouter();
  const { socket } = useSocket();
  const { toast } = useToast();
  const { userId, isAuthenticated, isSyncChecking } = useAuth();
  const [search, setSearch] = useState('');
  const [channelToLeave, setChannelToLeave] = useState<Channel | null>(null);
  const [activeTab, setActiveTab] = useState('public');
  const queryClient = useQueryClient();

  // Handle channel state sync events
  useEffect(() => {
    if (!socket) return;

    const handleStateSync = (data: { type: string; userId: string }) => {
      if (data.type === 'REFRESH_CHANNELS' && data.userId === userId) {
        // Invalidate and refetch all channel-related queries
        queryClient.invalidateQueries({ queryKey: ['channels', 'browse'] });
        
        // If we were trying to leave a channel, close the modal
        if (channelToLeave) {
          setChannelToLeave(null);
          onOpenChange(false);
        }
      }
    };

    socket.on('channel:state_sync', handleStateSync);

    return () => {
      socket.off('channel:state_sync', handleStateSync);
    };
  }, [socket, userId, queryClient, channelToLeave, onOpenChange]);

  // Get joined channels
  const { 
    data: joinedChannelsData, 
    isLoading: isLoadingJoined,
    error: joinedError
  } = useQuery<ChannelResponse>({
    queryKey: ['channels', 'browse', 'joined'],
    queryFn: async () => {
      const response = await api.get<ChannelResponse>('/channels/browse/joined', {
        params: {
          sortBy: 'createdAt',
          sortOrder: 'desc'
        }
      });
      return response.data;
    }
  });

  // Get public channels
  const { 
    data: publicChannelsData, 
    isLoading: isLoadingPublic,
    error: publicError
  } = useQuery<ChannelResponse>({
    queryKey: ['channels', 'browse', 'public', search],
    queryFn: async () => {
      const response = await api.get<ChannelResponse>('/channels/browse/public', {
        params: {
          search,
          sortBy: 'memberCount',
          sortOrder: 'desc',
          includeJoined: false // Don't include channels we're already a member of
        }
      });
      return response.data;
    },
    enabled: open && isAuthenticated && !isSyncChecking
  });

  const publicChannels = publicChannelsData?.channels ?? [];
  const joinedChannels = joinedChannelsData?.channels ?? [];

  // Filter out joined channels from public channels list
  const availablePublicChannels = publicChannels.filter(
    channel => !joinedChannels.some(joined => joined.id === channel.id)
  );

  // Group joined channels by type
  const groupedChannels = {
    public: joinedChannels.filter((channel: Channel) => channel.type === 'PUBLIC'),
    private: joinedChannels.filter((channel: Channel) => channel.type === 'PRIVATE'),
    dms: joinedChannels.filter((channel: Channel) => channel.type === 'DM')
  };

  // Join channel mutation
  const joinChannelMutation = useMutation({
    mutationFn: async (channelId: string) => {
      // Check if already a member
      const isMember = joinedChannels.some(channel => channel.id === channelId);
      if (isMember) {
        // If already a member, just navigate
        return { alreadyMember: true };
      }

      // If not a member, join the channel
      const response = await api.post<void>(`/channels/${channelId}/join`);
      
      // Only emit socket event after successful join
      socket?.emit('channel:join', { channelId });
      
      return { alreadyMember: false };
    },
    onSuccess: (result, channelId) => {
      if (!result.alreadyMember) {
        toast({
          title: 'Success',
          description: 'Successfully joined the channel',
        });
      }
      
      router.push(`/channels/${channelId}`);
      onOpenChange(false);
    }
  });

  // Leave channel mutation
  const leaveChannelMutation = useMutation({
    mutationFn: async ({ channelId, shouldDelete }: { channelId: string; shouldDelete?: boolean }) => {
      const response = await api.delete<ChannelLeaveResponse>(`/channels/${channelId}/leave`, {
        params: { shouldDelete }
      });
      
      if (!response.data) {
        throw new Error('No response data');
      }
      
      return response.data;
    },
    onMutate: async ({ channelId }) => {
      // Cancel any outgoing refetches
      await Promise.all([
        queryClient.cancelQueries({ queryKey: ['channels', 'browse', 'joined'] }),
        queryClient.cancelQueries({ queryKey: ['channels', 'browse', 'public'] })
      ]);

      // Snapshot the previous values
      const previousData: {
        joined?: ChannelResponse;
        public?: ChannelResponse;
      } = {
        joined: queryClient.getQueryData(['channels', 'browse', 'joined']),
        public: queryClient.getQueryData(['channels', 'browse', 'public'])
      };

      // Optimistically update joined channels
      queryClient.setQueryData<ChannelResponse>(['channels', 'browse', 'joined'], (old) => {
        if (!old?.channels) return { channels: [] };
        return {
          ...old,
          channels: old.channels.filter(ch => ch.id !== channelId)
        };
      });

      return { previousData };
    },
    onSuccess: (data, { channelId, shouldDelete }) => {
      // Invalidate queries to get fresh data from backend
      queryClient.invalidateQueries({ queryKey: ['channels', 'browse', 'joined'] });
      queryClient.invalidateQueries({ queryKey: ['channels', 'browse', 'public'] });
      
      if (shouldDelete) {
        queryClient.invalidateQueries({ queryKey: ['messages', channelId] });
      }

      toast({
        title: 'Success',
        description: shouldDelete ? 'Successfully deleted the channel' : 'Successfully left the channel',
      });

      // Handle navigation after leaving/deleting
      if (data?.nextChannel) {
        router.push(`/channels/${data.nextChannel.channelId}`);
      } else {
        const currentChannels = queryClient.getQueryData(['channels', 'browse', 'joined']) as ChannelResponse;
        const remainingChannels = currentChannels?.channels ?? [];
        
        if (remainingChannels.length === 0) {
          router.push('/channels');
        } else {
          router.push(`/channels/${remainingChannels[0].id}`);
        }
      }
      
      setChannelToLeave(null);
      onOpenChange(false);
    },
    onError: (error: any, variables, context) => {
      console.error('Failed to leave channel:', error);
      
      if (error.response?.data?.message?.includes('Not a member')) {
        // Refresh both lists from backend
        queryClient.invalidateQueries({ queryKey: ['channels', 'browse', 'joined'] });
        queryClient.invalidateQueries({ queryKey: ['channels', 'browse', 'public'] });
        
        toast({
          title: 'Info',
          description: 'Channel list has been updated',
        });
      } else {
        // Revert optimistic updates
        if (context?.previousData) {
          Object.entries(context.previousData).forEach(([key, value]) => {
            if (value) {
              queryClient.setQueryData(['channels', 'browse', key], value);
            }
          });
        }
        
        toast({
          title: 'Error',
          description: error.response?.data?.message || 'Failed to leave channel',
          variant: 'destructive',
        });
      }
      
      setChannelToLeave(null);
    }
  });

  const handleJoinChannel = (channelId: string) => {
    if (!userId) return;
    joinChannelMutation.mutate(channelId);
  };

  const handleLeaveChannel = (channel: Channel) => {
    setChannelToLeave(channel);
  };

  const handleConfirmLeave = (shouldDelete: boolean) => {
    if (!channelToLeave) return;
    
    leaveChannelMutation.mutate({ 
      channelId: channelToLeave.id, 
      shouldDelete 
    });
  };

  const ChannelList = ({ channels, showJoinButton }: { channels: Channel[], showJoinButton: boolean }) => (
    <div className="space-y-4">
      {channels.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground">
          No channels found
        </div>
      ) : (
        channels.map((channel) => (
          <div
            key={channel.id}
            className="bg-white p-4 rounded-lg shadow-sm border flex items-center justify-between"
          >
            <div className="flex items-center gap-4 flex-1 min-w-0">
              <div className="bg-emerald-100 p-2 rounded-lg">
                {channel.type === 'DM' ? (
                  <MessageSquare className="h-5 w-5 text-emerald-600" />
                ) : channel.type === 'PRIVATE' ? (
                  <Lock className="h-5 w-5 text-emerald-600" />
                ) : (
                  <Hash className="h-5 w-5 text-emerald-600" />
                )}
              </div>
              <div className="min-w-0 flex-1">
                <h3 className="font-semibold truncate">{channel.name}</h3>
                {channel.description && (
                  <p className="text-sm text-gray-500 truncate">{channel.description}</p>
                )}
                <div className="flex items-center gap-4 mt-1 text-xs text-gray-400">
                  <span className="flex items-center gap-1">
                    <Users className="h-3 w-3" />
                    {channel._count?.members || 0} members
                  </span>
                </div>
              </div>
            </div>
            {showJoinButton ? (
              <Button
                size="sm"
                onClick={() => handleJoinChannel(channel.id)}
                disabled={joinChannelMutation.isPending}
              >
                Join
              </Button>
            ) : (
              <Button
                size="sm"
                variant="outline"
                onClick={() => handleLeaveChannel(channel)}
                disabled={leaveChannelMutation.isPending}
              >
                Leave
              </Button>
            )}
          </div>
        ))
      )}
    </div>
  );

  const JoinedChannelsSection = ({ title, channels, icon }: { title: string, channels: Channel[], icon: React.ReactNode }) => (
    <div className="space-y-2">
      <div className="flex items-center gap-2 text-sm font-medium text-gray-500">
        {icon}
        <h3>{title}</h3>
        <span className="text-xs">({channels.length})</span>
      </div>
      <ChannelList channels={channels} showJoinButton={false} />
    </div>
  );

  // Debug logging for render cycle
  useEffect(() => {
    if (open && activeTab === 'public') {
      console.log('Browse modal state:', {
        isLoadingPublic,
        publicChannelsCount: publicChannels.length,
        publicChannels: publicChannels.map(ch => ({
          id: ch.id,
          name: ch.name,
          memberCount: ch._count?.members
        })),
        joinedChannelsCount: joinedChannels.length,
        joinedChannels: joinedChannels.map(ch => ({
          id: ch.id,
          name: ch.name
        })),
        authState: {
          isAuthenticated,
          isSyncChecking,
          userId
        }
      });
    }
  }, [open, activeTab, isLoadingPublic, publicChannels, joinedChannels, isAuthenticated, isSyncChecking, userId]);

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Browse Channels</DialogTitle>
            <DialogDescription>
              Join existing channels or leave channels you're no longer interested in.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Search className="h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search channels..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="flex-1"
              />
            </div>

            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="public">Public Channels</TabsTrigger>
                <TabsTrigger value="joined">Joined Channels</TabsTrigger>
              </TabsList>

              <TabsContent value="public" className="mt-4">
                {isLoadingPublic ? (
                  <div className="text-center py-8">Loading channels...</div>
                ) : publicError instanceof Error ? (
                  <div className="text-center py-8 text-destructive">
                    Error loading channels: {publicError.message}
                  </div>
                ) : (
                  <ChannelList
                    channels={availablePublicChannels}
                    showJoinButton={true}
                  />
                )}
              </TabsContent>

              <TabsContent value="joined" className="mt-4">
                {isLoadingJoined ? (
                  <div className="text-center py-8">Loading channels...</div>
                ) : joinedError instanceof Error ? (
                  <div className="text-center py-8 text-destructive">
                    Error loading channels: {joinedError.message}
                  </div>
                ) : (
                  <div className="space-y-6">
                    {groupedChannels.public.length > 0 && (
                      <JoinedChannelsSection
                        title="Public Channels"
                        channels={groupedChannels.public}
                        icon={<Hash className="h-4 w-4" />}
                      />
                    )}
                    
                    {groupedChannels.private.length > 0 && (
                      <JoinedChannelsSection
                        title="Private Channels"
                        channels={groupedChannels.private}
                        icon={<Lock className="h-4 w-4" />}
                      />
                    )}
                    
                    {groupedChannels.dms.length > 0 && (
                      <JoinedChannelsSection
                        title="Direct Messages"
                        channels={groupedChannels.dms}
                        icon={<MessageSquare className="h-4 w-4" />}
                      />
                    )}

                    {joinedChannels.length === 0 && (
                      <div className="text-center py-8 text-muted-foreground">
                        No channels joined yet
                      </div>
                    )}
                  </div>
                )}
              </TabsContent>
            </Tabs>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={!!channelToLeave} onOpenChange={() => setChannelToLeave(null)}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader className="text-center">
            <div className="flex items-center justify-between">
              <DialogTitle>Leave Channel</DialogTitle>
              <DialogClose asChild>
                <Button variant="ghost" size="icon">
                  <X className="h-4 w-4" />
                </Button>
              </DialogClose>
            </div>
            <DialogDescription className="text-center">
              {channelToLeave?.isOwner ? (
                <>You are the owner of <span className="font-medium">{channelToLeave?.name}</span>. What would you like to do?</>
              ) : (
                <>Are you sure you want to leave <span className="font-medium">{channelToLeave?.name}</span>?</>
              )}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6 pt-4">
            {channelToLeave?.isOwner ? (
              <>
                <div className="space-y-2">
                  <p className="text-sm text-muted-foreground text-center">
                    Leave as participant while keeping the channel active. The channel will continue to exist and other members can still access it.
                  </p>
                  <Button
                    className="w-full bg-emerald-600 hover:bg-emerald-700"
                    onClick={() => handleConfirmLeave(false)}
                  >
                    Leave Channel
                  </Button>
                </div>
                
                <div className="space-y-2">
                  <p className="text-sm text-destructive text-center">
                    Permanently delete this channel and all its message history. This action cannot be undone.
                  </p>
                  <Button
                    variant="destructive"
                    className="w-full"
                    onClick={() => handleConfirmLeave(true)}
                  >
                    Delete Channel
                  </Button>
                </div>
              </>
            ) : (
              <Button
                className="w-full"
                onClick={() => handleConfirmLeave(false)}
              >
                Leave Channel
              </Button>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
} 