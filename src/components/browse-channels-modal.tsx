'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Channel, ChannelType, ChannelWithDetails, ChannelMember } from '@/types/channel';
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
import { Hash, Users, Search, AlertCircle, X } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface BrowseChannelsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface ChannelResponse {
  channels: ChannelWithDetails[];
}

export function BrowseChannelsModal({ open, onOpenChange }: BrowseChannelsModalProps) {
  const router = useRouter();
  const { socket } = useSocket();
  const { toast } = useToast();
  const { userId, isAuthenticated, isSyncChecking } = useAuth();
  const [search, setSearch] = useState('');
  const [channelToLeave, setChannelToLeave] = useState<ChannelWithDetails | null>(null);
  const [leavingChannelId, setLeavingChannelId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('public');
  const queryClient = useQueryClient();

  // Fetch all public channels and joined channels
  const { data: publicChannelsResponse, isLoading: isLoadingPublic } = useQuery({
    queryKey: ['channels', 'all-public', search],
    queryFn: () => api.get<ChannelResponse>('/channels/browse/public', {
      params: {
        search,
        sort_by: 'member_count',
        sort_order: 'desc'
      }
    }).then(response => response.data),
    enabled: open && isAuthenticated && !isSyncChecking
  });

  const { data: joinedChannelsResponse, isLoading: isLoadingJoined } = useQuery({
    queryKey: ['channels', 'joined', search],
    queryFn: () => api.get<ChannelResponse>('/channels/browse/joined', {
      params: {
        search,
        sort_by: 'created_at',
        sort_order: 'desc'
      }
    }).then(response => response.data),
    enabled: open && isAuthenticated && !isSyncChecking
  });

  const allPublicChannels = publicChannelsResponse?.channels ?? [];
  const joinedChannels = joinedChannelsResponse?.channels ?? [];

  // Filter public channels to only show those not joined
  const joinedChannelIds = new Set(joinedChannels.map(channel => channel.id));
  const availablePublicChannels = allPublicChannels.filter(
    channel => !joinedChannelIds.has(channel.id)
  );

  // Join channel mutation
  const joinChannelMutation = useMutation({
    mutationFn: (channelId: string) => api.post<void>(`/channels/${channelId}/join`),
    onSuccess: (_, channelId) => {
      queryClient.invalidateQueries({ queryKey: ['channels'] });
      
      if (socket) {
        socket.emit('channel:join', channelId);
      }
      
      toast({
        title: 'Success',
        description: 'Successfully joined the channel',
      });
      
      router.push(`/channels/${channelId}`);
      onOpenChange(false);
    },
    onError: (error: any) => {
      console.error('Failed to join channel:', error);
      toast({
        title: 'Error',
        description: error.response?.data?.message || 'Failed to join channel',
        variant: 'destructive',
      });
    }
  });

  // Leave channel mutation
  const leaveChannelMutation = useMutation({
    mutationFn: async ({ channelId, shouldDelete }: { channelId: string; shouldDelete?: boolean }) => {
      // Only try socket check if socket is connected
      if (socket?.connected) {
        try {
          // Emit and wait for acknowledgment
          await new Promise((resolve, reject) => {
            socket.emit('channel:leave:check', { channelId }, (response: { error?: string }) => {
              if (response.error) {
                reject(new Error(response.error));
              } else {
                resolve(response);
              }
            });
          });
        } catch (error) {
          console.error('Socket check failed:', error);
          // Don't block the HTTP request if socket check fails
          console.warn('Proceeding with HTTP request despite socket check failure');
        }
      }

      // Proceed with HTTP request
      return api.delete(`/channels/${channelId}/leave${shouldDelete ? '?shouldDelete=true' : ''}`);
    },
    onSuccess: (_, { channelId, shouldDelete }) => {
      // Invalidate all relevant queries
      queryClient.invalidateQueries({ queryKey: ['channels'] });
      queryClient.invalidateQueries({ queryKey: ['channels', 'all-public'] });
      queryClient.invalidateQueries({ queryKey: ['channels', 'joined'] });
      queryClient.invalidateQueries({ queryKey: ['channels', 'navigation'] });
      
      if (shouldDelete) {
        queryClient.invalidateQueries({ queryKey: ['messages', channelId] });
      }
      
      // Only emit socket event if socket is connected
      if (socket?.connected) {
        socket.emit('channel:leave', { channelId, shouldDelete });
      }

      toast({
        title: 'Success',
        description: shouldDelete ? 'Successfully deleted the channel' : 'Successfully left the channel',
      });

      const remainingChannels = joinedChannels.filter(c => c.id !== channelId);
      if (remainingChannels.length > 0) {
        router.push(`/channels/${remainingChannels[0].id}`);
      } else {
        router.push('/channels');
      }
      
      setChannelToLeave(null);
      onOpenChange(false);
    },
    onError: (error: any) => {
      console.error('Failed to leave channel:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to leave channel',
        variant: 'destructive',
      });
      setChannelToLeave(null);
    }
  });

  const handleLeaveChannel = (channel: ChannelWithDetails) => {
    if (!userId) return;

    if (channel.isOwner) {
      setChannelToLeave(channel);
    } else {
      setLeavingChannelId(channel.id);
      leaveChannelMutation.mutate({ channelId: channel.id });
    }
  };

  const handleConfirmLeave = (shouldDelete: boolean) => {
    if (!channelToLeave) return;
    
    setLeavingChannelId(channelToLeave.id);
    leaveChannelMutation.mutate({ 
      channelId: channelToLeave.id, 
      shouldDelete 
    });
    setChannelToLeave(null);
  };

  const handleJoinChannel = (channelId: string) => {
    if (!userId) return;
    joinChannelMutation.mutate(channelId);
  };

  const ChannelList = ({ channels, showJoinButton }: { channels: ChannelWithDetails[], showJoinButton: boolean }) => (
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
                <Hash className="h-5 w-5 text-emerald-600" />
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
            <div className="flex-shrink-0 ml-4">
              {showJoinButton ? (
                <Button
                  onClick={() => handleJoinChannel(channel.id)}
                  disabled={joinChannelMutation.isPending && leavingChannelId === channel.id}
                >
                  Join
                </Button>
              ) : (
                <Button
                  onClick={() => handleLeaveChannel(channel)}
                  variant="outline"
                  disabled={leaveChannelMutation.isPending && leavingChannelId === channel.id}
                >
                  Leave
                </Button>
              )}
            </div>
          </div>
        ))
      )}
    </div>
  );

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>Browse Channels</DialogTitle>
            <DialogDescription>
              Join existing channels or leave channels you're already a member of.
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
                ) : (
                  <ChannelList
                    channels={joinedChannels}
                    showJoinButton={false}
                  />
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
              You are the owner of <span className="font-medium">{channelToLeave?.name}</span>. What would you like to do?
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6 pt-4">
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
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
} 