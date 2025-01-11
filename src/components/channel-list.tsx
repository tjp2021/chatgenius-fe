'use client';

import { Channel } from '@/types/channel';
import { UserAvatar } from '@/components/user-avatar';
import { cn } from '@/lib/utils';

interface ChannelListProps {
  channels: Channel[];
  selectedChannelId?: string;
  onChannelSelect: (channelId: string) => void;
}

export function ChannelList({ channels, selectedChannelId, onChannelSelect }: ChannelListProps) {
  if (!channels.length) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-muted-foreground">No channels available</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {channels.map((channel) => (
        <button
          key={channel.id}
          onClick={() => onChannelSelect(channel.id)}
          className={cn(
            "w-full flex items-center gap-2 rounded-lg p-2 hover:bg-accent",
            selectedChannelId === channel.id && "bg-accent"
          )}
        >
          {channel.members?.[0] && (
            <UserAvatar userId={channel.members[0].userId} />
          )}
          <div className="flex-1 text-left truncate">
            <p className="font-medium truncate">{channel.name}</p>
            {channel.description && (
              <p className="text-sm text-muted-foreground truncate">
                {channel.description}
              </p>
            )}
          </div>
        </button>
      ))}
    </div>
  );
} 