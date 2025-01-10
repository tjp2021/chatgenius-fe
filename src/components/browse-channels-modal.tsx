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
import { Channel } from '@/types/channel';
import { useQuery, useQueryClient } from '@tanstack/react-query';

interface BrowseChannelsModalProps {
  isOpen: boolean;
  onClose: Dispatch<SetStateAction<boolean>>;
}

export function BrowseChannelsModal({ isOpen, onClose }: BrowseChannelsModalProps) {
  const { userId, getToken } = useAuth();
  const { joinChannel, leaveChannel } = useChannelContext();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isLeaving, setIsLeaving] = useState<string | null>(null);
  const [isJoining, setIsJoining] = useState<string | null>(null);

  // Fetch all channels
  const { data: allChannels = [], isLoading } = useQuery<Channel[]>({
    queryKey: ['all-channels'],
    queryFn: async () => {
      const token = await getToken();
      if (!token) {
        throw new Error('No authentication token available');
      }

      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/channels?include=members.user`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      if (!response.ok) throw new Error('Failed to fetch channels');
      return response.json();
    }
  });

  // Filter channels based on membership and type
  const publicChannels = allChannels.filter(channel => 
    channel.type === 'PUBLIC' && 
    !channel.members?.some(member => member.userId === userId)
  );

  const joinedChannels = allChannels.filter(channel => 
    channel.members?.some(member => member.userId === userId)
  );

  const handleJoinChannel = async (channelId: string) => {
    try {
      setIsJoining(channelId);
      await joinChannel(channelId);
      // Invalidate both queries to refresh the lists
      await queryClient.invalidateQueries({ queryKey: ['all-channels'] });
      await queryClient.invalidateQueries({ queryKey: ['channels'] });
      // Force an immediate refetch
      await queryClient.refetchQueries({ queryKey: ['channels'] });
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
      
      // Invalidate both queries to refresh the lists
      await queryClient.invalidateQueries({ queryKey: ['all-channels'] });
      await queryClient.invalidateQueries({ queryKey: ['channels'] });
      
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

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
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
              ) : publicChannels.length === 0 ? (
                <p className="text-center text-sm text-muted-foreground">No public channels available</p>
              ) : (
                <div className="space-y-4">
                  {publicChannels.map((channel) => (
                    <div key={channel.id} className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium"># {channel.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {channel.members?.length || 0} members
                        </p>
                      </div>
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
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>
          </TabsContent>
          <TabsContent value="joined">
            <ScrollArea className="mt-4 h-[300px] rounded-md border p-4">
              {isLoading ? (
                <div className="flex justify-center items-center h-full">
                  <Loader2 className="h-6 w-6 animate-spin" />
                </div>
              ) : joinedChannels.length === 0 ? (
                <p className="text-center text-sm text-muted-foreground">You haven't joined any channels yet</p>
              ) : (
                <div className="space-y-4">
                  {joinedChannels.map((channel) => (
                    <div key={channel.id} className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium"># {channel.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {channel.members?.length || 0} members
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