'use client';

import { useRef, useEffect } from 'react';
import { Channel } from '@/types/channel';
import { useVirtualizer } from '@tanstack/react-virtual';
import { UserAvatar } from '@/components/user-avatar';
import { cn } from '@/lib/utils';

interface VirtualizedChannelListProps {
  channels: Channel[];
  selectedChannelId?: string;
  onSelect: (channelId: string) => void;
}

export function VirtualizedChannelList({
  channels,
  selectedChannelId,
  onSelect
}: VirtualizedChannelListProps) {
  const parentRef = useRef<HTMLDivElement>(null);

  const virtualizer = useVirtualizer({
    count: channels.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 72,
    overscan: 5
  });

  useEffect(() => {
    if (parentRef.current) {
      const savedScrollPos = sessionStorage.getItem('channelListScrollPos');
      if (savedScrollPos) {
        parentRef.current.scrollTop = parseInt(savedScrollPos, 10);
      }
    }
  }, []);

  useEffect(() => {
    const handleBeforeUnload = () => {
      if (parentRef.current) {
        sessionStorage.setItem('channelListScrollPos', parentRef.current.scrollTop.toString());
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, []);

  return (
    <div
      ref={parentRef}
      className="h-full overflow-auto"
      style={{
        contain: 'strict'
      }}
    >
      <div
        style={{
          height: `${virtualizer.getTotalSize()}px`,
          width: '100%',
          position: 'relative'
        }}
      >
        {virtualizer.getVirtualItems().map((virtualItem) => {
          const channel = channels[virtualItem.index];
          return (
            <div
              key={channel.id}
              className={cn(
                "absolute top-0 left-0 w-full",
                "flex items-center gap-2 p-4 cursor-pointer hover:bg-accent/50",
                selectedChannelId === channel.id && "bg-accent"
              )}
              style={{
                height: `${virtualItem.size}px`,
                transform: `translateY(${virtualItem.start}px)`
              }}
              onClick={() => onSelect(channel.id)}
            >
              {channel.members?.[0]?.user && (
                <UserAvatar userId={channel.members[0].user.id} />
              )}
              <div className="flex-1 min-w-0">
                <p className="font-medium truncate">{channel.name}</p>
                {channel.description && (
                  <p className="text-sm text-muted-foreground truncate">
                    {channel.description}
                  </p>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
} 