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
} from '@/components/ui/dialog';
import { Hash, Users, Search, AlertCircle } from 'lucide-react';
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
      // Invalidate both queries to refresh the lists
      queryClient.invalidateQueries({ queryKey: ['channels', 'all-public'] });
      queryClient.invalidateQueries({ queryKey: ['channels', 'joined'] });
      
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
      let errorMessage = 'Failed to join channel. Please try again.';
      if (error.response?.status === 403) {
        errorMessage = 'You do not have permission to join this channel.';
      } else if (error.response?.status === 409) {
        errorMessage = 'You are already a member of this channel.';
      } else if (error.response?.data?.message) {
        errorMessage = error.response.data.message;
      }
      toast({
        title: 'Error',
        description: errorMessage,
        variant: 'destructive',
      });
    }
  });

  // Leave channel mutation
  const leaveChannelMutation = useMutation({
    mutationFn: ({ channelId, shouldDelete }: { channelId: string; shouldDelete?: boolean }) => 
      api.delete<void>(`/channels/${channelId}/leave${shouldDelete !== undefined ? `?shouldDelete=${shouldDelete}` : ''}`),
    onSuccess: (_, { channelId }) => {
      // Invalidate both queries to refresh the lists
      queryClient.invalidateQueries({ queryKey: ['channels', 'all-public'] });
      queryClient.invalidateQueries({ queryKey: ['channels', 'joined'] });
      
      if (socket) {
        socket.emit('channel:leave', channelId);
      }

      toast({
        title: 'Success',
        description: 'Successfully left the channel',
      });

      // Navigate to the next available channel or home
      const remainingChannels = joinedChannels.filter(c => c.id !== channelId);
      if (remainingChannels.length > 0) {
        router.push(`/channels/${remainingChannels[0].id}`);
      } else {
        router.push('/');
      }
      onOpenChange(false);
    },
    onError: (error: any) => {
      console.error('Failed to leave channel:', error);
      let errorMessage = 'Failed to leave channel. Please try again.';
      if (error.response?.status === 403) {
        errorMessage = 'You do not have permission to leave this channel.';
      } else if (error.response?.status === 401) {
        errorMessage = 'You must be logged in to leave a channel.';
      } else if (error.response?.data?.message) {
        errorMessage = error.response.data.message;
      }
      toast({
        title: 'Error',
        description: errorMessage,
        variant: 'destructive',
      });
    }
  });

  const handleLeaveChannel = (channel: ChannelWithDetails) => {
    if (!userId) {
      toast({
        title: 'Error',
        description: 'You must be logged in to leave a channel.',
        variant: 'destructive',
      });
      return;
    }

    if (channel.isOwner) {
      // Show confirmation modal for owners
      setChannelToLeave(channel);
    } else {
      // Regular members can leave directly
      setLeavingChannelId(channel.id);
      leaveChannelMutation.mutate({ channelId: channel.id });
    }
  };

  const handleConfirmLeave = (shouldDelete: boolean) => {
    if (!channelToLeave) return;

    setLeavingChannelId(channelToLeave.id);
    
    if (shouldDelete) {
      // Delete the channel
      leaveChannelMutation.mutate({ 
        channelId: channelToLeave.id, 
        shouldDelete: true 
      });
    } else {
      // Leave and transfer ownership
      leaveChannelMutation.mutate({ 
        channelId: channelToLeave.id, 
        shouldDelete: false 
      });
    }
    
    setChannelToLeave(null);
  };

  const handleJoinChannel = (channelId: string) => {
    if (!userId) {
      toast({
        title: 'Error',
        description: 'You must be logged in to join a channel.',
        variant: 'destructive',
      });
      return;
    }
    joinChannelMutation.mutate(channelId);
  };

  const ChannelList = ({ channels, showJoinButton }: { channels: ChannelWithDetails[], showJoinButton: boolean }) => (
    <div className="space-y-4">
      {channels.map((channel) => (
        <div
          key={channel.id}
          className="bg-white p-4 rounded-lg shadow-sm border flex items-center justify-between"
        >
          <div className="flex items-center gap-4 flex-1 min-w-0">
            <div className="bg-emerald-100 p-2 rounded-lg flex-shrink-0">
              <Hash className="h-5 w-5 text-emerald-600" />
            </div>
            <div className="min-w-0 flex-1">
              <h3 className="font-semibold truncate">{channel.name}</h3>
              <p className="text-sm text-gray-500 truncate">{channel.description}</p>
              <div className="flex items-center gap-4 mt-1 text-xs text-gray-400">
                <span className="flex items-center gap-1">
                  <Users className="h-3 w-3" />
                  {channel._count?.members || 0} members
                </span>
                <span>•</span>
                <span>{channel._count?.messages || 0} messages</span>
              </div>
            </div>
          </div>
          <div className="flex-shrink-0 ml-4">
            {showJoinButton ? (
              <Button
                onClick={() => handleJoinChannel(channel.id)}
                size="sm"
                disabled={joinChannelMutation.isPending}
              >
                {joinChannelMutation.isPending ? 'Joining...' : 'Join Channel'}
              </Button>
            ) : (
              <Button
                onClick={() => handleLeaveChannel(channel)}
                variant="outline"
                size="sm"
                disabled={leaveChannelMutation.isPending && leavingChannelId === channel.id}
              >
                {leaveChannelMutation.isPending && leavingChannelId === channel.id ? 'Leaving...' : 'Leave Channel'}
              </Button>
            )}
          </div>
        </div>
      ))}
      
      {(isLoadingPublic || isLoadingJoined) && (
        <div className="text-center py-8 text-gray-500">
          Loading channels...
        </div>
      )}

      {!isLoadingPublic && !isLoadingJoined && channels.length === 0 && (
        <div className="text-center py-8 text-gray-500">
          {showJoinButton ? 'No public channels available' : 'You haven\'t joined any channels yet'}
        </div>
      )}
    </div>
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[800px] h-[80vh] flex flex-col p-0">
        <div className="p-6 border-b">
          <DialogHeader>
            <DialogTitle>Browse Channels</DialogTitle>
            <DialogDescription>
              Join public channels or manage your channel memberships
            </DialogDescription>
          </DialogHeader>

          <div className="relative mt-4">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            <Input
              placeholder="Search channels..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>

        <Tabs defaultValue="public" className="flex-1 flex flex-col min-h-0">
          <div className="px-6 border-b">
            <TabsList className="mb-4">
              <TabsTrigger value="public">Public Channels</TabsTrigger>
              <TabsTrigger value="joined">Joined Channels</TabsTrigger>
            </TabsList>
          </div>
          
          <div className="flex-1 overflow-y-auto px-6 py-4">
            <TabsContent value="public" className="mt-0 h-full">
              <ChannelList channels={availablePublicChannels} showJoinButton={true} />
            </TabsContent>
            
            <TabsContent value="joined" className="mt-0 h-full">
              <ChannelList channels={joinedChannels} showJoinButton={false} />
            </TabsContent>
          </div>
        </Tabs>

        {/* Owner Leave Confirmation Modal */}
        <Dialog 
          open={!!channelToLeave} 
          onOpenChange={(open) => !open && setChannelToLeave(null)}
        >
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>Leave Channel</DialogTitle>
              <DialogDescription>
                As the owner of <span className="font-medium">{channelToLeave?.name}</span>, what would you like to do?
              </DialogDescription>
            </DialogHeader>
            <div className="flex flex-col gap-4 mt-4">
              <Button
                onClick={() => handleConfirmLeave(false)}
                variant="outline"
                disabled={leaveChannelMutation.isPending}
              >
                Leave and Transfer Ownership
                <span className="text-sm text-muted-foreground ml-2">
                  (Ownership will be transferred to another member)
                </span>
              </Button>
              <Button
                onClick={() => handleConfirmLeave(true)}
                variant="destructive"
                disabled={leaveChannelMutation.isPending}
              >
                Delete Channel
                <span className="text-sm text-destructive-foreground ml-2">
                  (This action cannot be undone)
                </span>
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </DialogContent>
    </Dialog>
  );
} 