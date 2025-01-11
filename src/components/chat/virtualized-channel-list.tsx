'use client';

import { useVirtualizer } from '@tanstack/react-virtual';
import { useRef, useEffect } from 'react';
import { Channel, ChannelType, ChannelMember } from '@/types/channel';
import { Hash, Lock, Users } from 'lucide-react';
import { cn } from '@/lib/utils';
import Image from 'next/image';

interface ChannelWithDetails extends Channel {
  _count: {
    members: number;
    messages: number;
  };
  members: ChannelMember[];
  isMember?: boolean;
}

interface VirtualizedChannelListProps {
  channels: ChannelWithDetails[];
  type: ChannelType;
  userId: string | null | undefined;
  selectedChannel: string | null;
  onChannelSelect: (channelId: string) => void;
  onJoinChannel: (channelId: string, type: ChannelType) => void;
  onLeaveChannel: (channelId: string) => void;
  onlineUsers: { [userId: string]: boolean };
  className?: string;
}

const CHANNEL_HEIGHT = 40; // Height of each channel item in pixels

export function VirtualizedChannelList({
  channels,
  type,
  userId,
  selectedChannel,
  onChannelSelect,
  onJoinChannel,
  onLeaveChannel,
  onlineUsers,
  className
}: VirtualizedChannelListProps) {
  const parentRef = useRef<HTMLDivElement>(null);
  const scrollPositionRef = useRef(0);

  const virtualizer = useVirtualizer({
    count: channels.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => CHANNEL_HEIGHT,
    overscan: 5, // Number of items to render outside of the visible area
  });

  // Save scroll position before unmount
  useEffect(() => {
    return () => {
      if (parentRef.current) {
        scrollPositionRef.current = parentRef.current.scrollTop;
      }
    };
  }, []);

  // Restore scroll position on mount
  useEffect(() => {
    if (parentRef.current && scrollPositionRef.current) {
      parentRef.current.scrollTop = scrollPositionRef.current;
    }
  }, []);

  return (
    <div
      ref={parentRef}
      className={cn("overflow-auto", className)}
      style={{
        height: '100%',
        width: '100%',
        contain: 'strict',
      }}
    >
      <div
        style={{
          height: `${virtualizer.getTotalSize()}px`,
          width: '100%',
          position: 'relative',
        }}
      >
        {virtualizer.getVirtualItems().map((virtualItem) => {
          const channel = channels[virtualItem.index];
          const isDM = type === ChannelType.DM;
          const members = channel.members || [];
          const otherUser = isDM ? members.find(m => m.userId !== userId)?.user : null;
          const isOnline = otherUser ? onlineUsers[otherUser.id] : false;
          const isMember = members.some(member => member.userId === userId);

          return (
            <div
              key={channel.id}
              className={cn(
                'absolute top-0 left-0 w-full',
                'group relative flex items-center'
              )}
              style={{
                height: `${virtualItem.size}px`,
                transform: `translateY(${virtualItem.start}px)`,
              }}
            >
              <button
                onClick={() => {
                  if (isMember) {
                    onChannelSelect(channel.id);
                  }
                }}
                className={cn(
                  'w-full flex items-center gap-2 px-4 py-2 rounded-md text-sm',
                  'hover:bg-emerald-800/50 transition-colors text-gray-100',
                  channel.id === selectedChannel && 'bg-emerald-800',
                  !isMember && 'opacity-75'
                )}
              >
                <div className="relative flex-shrink-0">
                  {type === ChannelType.PUBLIC && <Hash className="h-4 w-4" />}
                  {type === ChannelType.PRIVATE && <Lock className="h-4 w-4" />}
                  {isDM && (
                    <>
                      {otherUser?.imageUrl ? (
                        <img 
                          src={otherUser.imageUrl} 
                          alt={otherUser.name || 'User'}
                          className="w-6 h-6 rounded-full"
                        />
                      ) : (
                        <Users className="h-4 w-4" />
                      )}
                      {isOnline && (
                        <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 bg-green-500 rounded-full border-2 border-emerald-900" />
                      )}
                    </>
                  )}
                </div>
                <span className="truncate flex-1">
                  {isDM ? (otherUser?.name || 'Unknown User') : channel.name}
                </span>
                {channel._count?.messages > 0 && (
                  <span className="text-xs text-gray-400 mr-2">
                    {channel._count.messages}
                  </span>
                )}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
} 