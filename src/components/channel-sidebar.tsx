'use client';

import { useState } from 'react';
import { useSocket } from '@/providers/socket-provider';
import { useChannelContext } from '@/contexts/channel-context';
import { Channel } from '@/types/channel';
import { UserAvatar } from './user-avatar';
import { Button } from './ui/button';
import { cn } from '@/lib/utils';
import { BrowseChannelsModal } from './browse-channels-modal';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from './ui/dialog';

export function ChannelSidebar() {
  const [channelToLeave, setChannelToLeave] = useState<Channel | null>(null);
  const { channels, isLoading: isLoadingChannels, leaveChannel } = useChannelContext();
  const { isConnected } = useSocket();

  const [isOpen, setIsOpen] = useState(false);

  const handleLeaveChannel = async () => {
    if (!channelToLeave) return;

    try {
      await leaveChannel(channelToLeave.id);
      setChannelToLeave(null);
    } catch (error) {
      console.error('Failed to leave channel:', error);
    }
  };

  return (
    <div className="flex flex-col h-full">
      <div className="p-4 border-b">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold">Channels</h2>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsOpen(true)}
            disabled={!isConnected}
          >
            Browse
          </Button>
        </div>
        <div className="flex items-center gap-2">
          <div className={cn(
            "w-2 h-2 rounded-full",
            isConnected ? "bg-green-500" : "bg-red-500"
          )} />
          <span className="text-sm text-muted-foreground">
            {isConnected ? "Connected" : "Disconnected"}
          </span>
        </div>
      </div>

      {isLoadingChannels ? (
        <div className="flex-1 flex items-center justify-center">
          <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto p-4">
          {channels.map((channel) => (
            <div
              key={channel.id}
              className="flex items-center justify-between p-2 rounded-lg hover:bg-accent/50 group"
            >
              <div className="flex items-center gap-2">
                {channel.members?.[0]?.user && (
                  <UserAvatar userId={channel.members[0].user.id} />
                )}
                <div>
                  <p className="font-medium">{channel.name}</p>
                  {channel.description && (
                    <p className="text-sm text-muted-foreground truncate">
                      {channel.description}
                    </p>
                  )}
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <span>{channel._count?.members || 0} members</span>
                    <span>•</span>
                    <span>{channel._count?.messages || 0} messages</span>
                  </div>
                </div>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setChannelToLeave(channel)}
                className="opacity-0 group-hover:opacity-100"
                disabled={!isConnected}
              >
                Leave
              </Button>
            </div>
          ))}
        </div>
      )}

      <BrowseChannelsModal
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
      />

      <Dialog open={!!channelToLeave} onOpenChange={() => setChannelToLeave(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Leave Channel</DialogTitle>
            <DialogDescription>
              Are you sure you want to leave {channelToLeave?.name}? You&apos;ll need to be invited back to rejoin.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setChannelToLeave(null)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleLeaveChannel}>
              Leave Channel
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
} 