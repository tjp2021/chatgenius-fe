'use client';

import { useCallback, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import type { Channel } from '@/types/channel';
import { Button } from '@/components/ui/button';
import { useChannelContext } from '@/contexts/channel-context';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useToast } from '@/components/ui/use-toast';
import { Hash } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useUser } from '@clerk/nextjs';
import { useApi } from '@/hooks/useApi';
import { useQueryClient } from '@tanstack/react-query';

interface BrowseChannelsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function BrowseChannelsModal({ open, onOpenChange }: BrowseChannelsModalProps) {
  const router = useRouter();
  const { toast } = useToast();
  const { channels, joinChannel } = useChannelContext();
  const { user } = useUser();
  const api = useApi();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState('public');
  const [channelToDelete, setChannelToDelete] = useState<Channel | null>(null);

  // Memoize filtered channels
  const publicChannels = useMemo(() => 
    channels.filter(channel => 
      channel.type === 'PUBLIC' && 
      !channel.members?.some(m => m.userId === user?.id)
    ),
    [channels, user?.id]
  );

  const joinedChannels = useMemo(() => 
    channels.filter(channel => 
      channel.type === 'PUBLIC' && 
      channel.members?.some(m => m.userId === user?.id)
    ),
    [channels, user?.id]
  );

  const handleJoinChannel = useCallback(async (channelId: string) => {
    try {
      await joinChannel(channelId);
      router.push(`/channels/${channelId}`);
      onOpenChange(false);
      toast({
        title: 'Channel joined successfully',
        duration: 3000
      });
    } catch (error) {
      toast({
        title: 'Failed to join channel',
        variant: 'destructive',
        duration: 3000
      });
    }
  }, [joinChannel, router, onOpenChange, toast]);

  const handleLeaveChannel = useCallback(async (channel: Channel) => {
    // If user is the owner, show delete confirmation
    if (channel.ownerId === user?.id) {
      setChannelToDelete(channel);
      return;
    }

    try {
      await api.leaveChannel(channel.id, false);
      // Invalidate channels query to refresh the list
      await queryClient.invalidateQueries({ queryKey: ['channels'] });
      onOpenChange(false);
      router.push('/channels');
      toast({
        title: 'Left channel successfully',
        duration: 3000
      });
    } catch (error) {
      toast({
        title: 'Failed to leave channel',
        variant: 'destructive',
        duration: 3000
      });
    }
  }, [api, router, toast, user?.id, onOpenChange, queryClient]);

  const handleDeleteChannel = useCallback(async () => {
    if (!channelToDelete) return;

    try {
      await api.leaveChannel(channelToDelete.id, true);
      // Invalidate channels query to refresh the list
      await queryClient.invalidateQueries({ queryKey: ['channels'] });
      setChannelToDelete(null);
      onOpenChange(false);
      router.push('/channels');
      toast({
        title: 'Channel deleted successfully',
        duration: 3000
      });
    } catch (error) {
      toast({
        title: 'Failed to delete channel',
        variant: 'destructive',
        duration: 3000
      });
    }
  }, [channelToDelete, api, router, toast, onOpenChange, queryClient]);

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Browse Channels</DialogTitle>
          </DialogHeader>
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="public">Public Channels</TabsTrigger>
              <TabsTrigger value="joined">Joined Channels</TabsTrigger>
            </TabsList>
            <TabsContent value="public" className="mt-4">
              <ScrollArea className="max-h-[420px] pr-6">
                {publicChannels.length === 0 ? (
                  <p className="text-center text-muted-foreground">No public channels available</p>
                ) : (
                  <div className="space-y-4">
                    {publicChannels.map((channel) => (
                      <div key={channel.id} className="flex items-center justify-between py-2">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center">
                            <Hash className="w-4 h-4 text-emerald-900" />
                          </div>
                          <span className="font-medium">{channel.name}</span>
                        </div>
                        <Button 
                          variant="default" 
                          size="sm"
                          onClick={() => handleJoinChannel(channel.id)}
                        >
                          Join
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </ScrollArea>
            </TabsContent>
            <TabsContent value="joined" className="mt-4">
              <ScrollArea className="max-h-[420px] pr-6">
                {joinedChannels.length === 0 ? (
                  <p className="text-center text-muted-foreground">You haven't joined any channels yet</p>
                ) : (
                  <div className="space-y-4">
                    {joinedChannels.map((channel) => (
                      <div key={channel.id} className="flex items-center justify-between py-2">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center">
                            <Hash className="w-4 h-4 text-emerald-900" />
                          </div>
                          <span className="font-medium">{channel.name}</span>
                        </div>
                        <Button 
                          variant={channel.ownerId === user?.id ? "destructive" : "default"}
                          size="sm"
                          onClick={() => channel.ownerId === user?.id ? setChannelToDelete(channel) : handleLeaveChannel(channel)}
                        >
                          {channel.ownerId === user?.id ? "Delete" : "Leave"}
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

      <Dialog open={!!channelToDelete} onOpenChange={() => setChannelToDelete(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Channel</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete <span className="font-medium">{channelToDelete?.name}</span>? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setChannelToDelete(null)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDeleteChannel}>
              Delete Channel
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
} 