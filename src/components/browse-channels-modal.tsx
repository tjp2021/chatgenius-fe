'use client';

import { useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import type { Channel } from '@/types/channel';
import { Button } from '@/components/ui/button';
import { useChannelContext } from '@/contexts/channel-context';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { UserAvatar } from '@/components/user-avatar';
import { useToast } from '@/components/ui/use-toast';

interface BrowseChannelsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function BrowseChannelsModal({ open, onOpenChange }: BrowseChannelsModalProps) {
  const router = useRouter();
  const { toast } = useToast();
  const { channels, joinChannel, isLoading } = useChannelContext();

  // Memoize filtered channels
  const publicChannels = useMemo(() => 
    channels.filter(channel => !channel.isPrivate),
    [channels]
  );

  const joinedChannels = useMemo(() => 
    channels.filter(channel => channel.isPrivate),
    [channels]
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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Browse Channels</DialogTitle>
        </DialogHeader>
        <ScrollArea className="mt-8 max-h-[420px] pr-6">
          {publicChannels.length === 0 ? (
            <p className="text-center text-muted-foreground">No public channels available</p>
          ) : (
            <div className="space-y-4">
              {publicChannels.map((channel) => (
                <div key={channel.id} className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <UserAvatar userId={channel.ownerId} />
                    <div>
                      <p className="font-medium">{channel.name}</p>
                      {channel.description && (
                        <p className="text-sm text-muted-foreground">{channel.description}</p>
                      )}
                    </div>
                  </div>
                  <Button
                    onClick={() => handleJoinChannel(channel.id)}
                    disabled={isLoading}
                    size="sm"
                  >
                    Join
                  </Button>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
} 