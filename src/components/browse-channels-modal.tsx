'use client';

import { useState, type Dispatch, type SetStateAction } from 'react';
import { useAuth } from '@clerk/nextjs';
import { useChannelContext } from '@/contexts/channel-context';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { Loader2 } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { Channel, ChannelType } from '@/types/channel';
import { useQuery, useQueryClient } from '@tanstack/react-query';

interface BrowseChannelsModalProps {
  isOpen: boolean;
  onClose: Dispatch<SetStateAction<boolean>>;
}

export function BrowseChannelsModal({ isOpen, onClose }: BrowseChannelsModalProps) {
  const { userId, getToken } = useAuth();
  const { joinChannel, leaveChannel, channels: contextChannels, refreshChannels } = useChannelContext();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isLeaving, setIsLeaving] = useState<string | null>(null);
  const [isJoining, setIsJoining] = useState<string | null>(null);

  // Fetch channels based on view type
  const { data: channels = [], isLoading, error } = useQuery({
    queryKey: ['channels', 'browse', isOpen],
    queryFn: async () => {
      console.log('[BrowseChannels] Query running, modal open:', isOpen);
      const token = await getToken();
      if (!token) throw new Error('No authentication token available');

      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/channels?view=browse`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (!response.ok) throw new Error('Failed to fetch channels');
      const data = await response.json();
      console.log('[BrowseChannels] Got data:', data);
      return data;
    },
    enabled: isOpen && !!userId,
    refetchOnMount: true
  });

  console.log('[BrowseChannels] Component state:', {
    isOpen,
    userId,
    isLoading,
    error,
    channelsLength: channels?.length,
    firstChannel: channels?.[0]
  });

  // Fetch joined channels for the Joined tab
  const { data: joinedChannels = [], isLoading: isLoadingJoined } = useQuery({
    queryKey: ['channels-joined', isOpen],
    queryFn: async () => {
      const token = await getToken();
      if (!token) throw new Error('No authentication token available');

      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/channels?view=leave`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (!response.ok) throw new Error('Failed to fetch joined channels');
      return response.json();
    },
    enabled: isOpen
  });

  const handleJoinChannel = async (channelId: string) => {
    try {
      setIsJoining(channelId);
      await joinChannel(channelId);
      
      // Refresh both queries to update the UI
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['channels', 'browse'] }),
        queryClient.invalidateQueries({ queryKey: ['channels-joined'] }),
        refreshChannels()
      ]);
      
      toast({
        title: 'Success',
        description: 'You have joined the channel',
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to join channel',
        variant: 'destructive',
      });
    } finally {
      setIsJoining(null);
    }
  };

  const handleLeaveChannel = async (channelId: string) => {
    try {
      setIsLeaving(channelId);
      await leaveChannel(channelId);
      
      // Refresh both queries to update the UI
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['channels', 'browse'] }),
        queryClient.invalidateQueries({ queryKey: ['channels-joined'] }),
        refreshChannels()
      ]);
      
      toast({
        title: 'Success',
        description: 'You have left the channel',
      });
    } catch (error) {
      console.error('Failed to leave channel:', error);
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to leave channel',
        variant: 'destructive',
      });
    } finally {
      setIsLeaving(null);
    }
  };

  if (error) {
    console.error('[BrowseChannels] Error fetching channels:', error);
  }

  return (
    <Dialog 
      open={isOpen} 
      onOpenChange={(open) => onClose(open)}
    >
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Browse Channels</DialogTitle>
        </DialogHeader>
        <Tabs defaultValue="public" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="public">Public Channels</TabsTrigger>
            <TabsTrigger value="joined">Joined Channels</TabsTrigger>
          </TabsList>
          <TabsContent value="public">
            <ScrollArea className="mt-4 h-[300px] rounded-md border p-4">
              {isLoading ? (
                <div className="flex justify-center items-center h-full">
                  <Loader2 className="h-6 w-6 animate-spin" />
                </div>
              ) : channels.length === 0 ? (
                <p className="text-center text-sm text-muted-foreground">No public channels available</p>
              ) : (
                <div className="space-y-4">
                  {channels.map((channel: Channel) => (
                    <div key={channel.id} className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium"># {channel.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {channel._count.members} members
                        </p>
                      </div>
                      {channel.isJoined ? (
                        <Button variant="secondary" disabled>
                          Joined
                        </Button>
                      ) : (
                        <Button 
                          onClick={() => handleJoinChannel(channel.id)}
                          disabled={isJoining === channel.id}
                        >
                          {isJoining === channel.id ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            'Join'
                          )}
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>
          </TabsContent>
          <TabsContent value="joined">
            <ScrollArea className="mt-4 h-[300px] rounded-md border p-4">
              {isLoadingJoined ? (
                <div className="flex justify-center items-center h-full">
                  <Loader2 className="h-6 w-6 animate-spin" />
                </div>
              ) : joinedChannels.length === 0 ? (
                <p className="text-center text-sm text-muted-foreground">You haven&apos;t joined any channels yet</p>
              ) : (
                <div className="space-y-4">
                  {joinedChannels.map((channel: Channel) => (
                    <div key={channel.id} className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium"># {channel.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {channel._count.members} members
                        </p>
                      </div>
                      <Button 
                        variant="destructive"
                        onClick={() => handleLeaveChannel(channel.id)}
                        disabled={isLeaving === channel.id}
                      >
                        {isLeaving === channel.id ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          'Leave'
                        )}
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
} 