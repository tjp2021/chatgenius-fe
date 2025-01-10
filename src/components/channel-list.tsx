'use client';

import { useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useChannelContext } from '@/contexts/channel-context';
import { UserAvatar } from '@/components/user-avatar';
import { cn } from '@/lib/utils';

export function ChannelList() {
  const router = useRouter();
  const { channels, isLoading } = useChannelContext();

  const handleChannelClick = useCallback((channelId: string) => {
    router.push(`/channels/${channelId}`);
  }, [router]);

  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  if (channels.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <p className="text-sm text-muted-foreground">No channels available</p>
      </div>
    );
  }

  return (
    <div className="space-y-2 px-2">
      {channels.map((channel) => (
        <button
          key={channel.id}
          onClick={() => handleChannelClick(channel.id)}
          className={cn(
            "w-full flex items-center gap-3 p-2 rounded-lg hover:bg-accent transition-colors",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          )}
        >
          <UserAvatar userId={channel.ownerId} />
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