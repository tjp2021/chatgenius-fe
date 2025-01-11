'use client';

import { ChannelType, ChannelWithDetails, OnlineUsers } from '@/types/channel';
import { cn } from '@/lib/utils';
import { Hash, Lock, Users, ChevronDown, ChevronRight, MoreVertical } from 'lucide-react';
import { Menu } from '@headlessui/react';
import Image from 'next/image';

interface ChannelSectionProps {
  title: string;
  channels: ChannelWithDetails[];
  type: ChannelType;
  isExpanded: boolean;
  onToggle: () => void;
  userId: string | null | undefined;
  onlineUsers: OnlineUsers;
  selectedChannel: string | null;
  onChannelSelect: (channelId: string) => void;
  onJoinChannel: (channelId: string, type: ChannelType) => void;
  onLeaveChannel: (channelId: string) => void;
}

interface ChannelActionsDropdownProps {
  isMember: boolean;
  onJoin: () => void;
  onLeave: () => void;
}

const ChannelActionsDropdown: React.FC<ChannelActionsDropdownProps> = ({ isMember, onJoin, onLeave }) => (
  <Menu as="div" className="relative">
    <Menu.Button className="flex items-center justify-center w-6 h-6 text-gray-300 hover:text-white">
      <MoreVertical className="w-4 h-4" />
    </Menu.Button>
    <Menu.Items className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none">
      {isMember ? (
        <Menu.Item>
          {({ active }) => (
            <button
              onClick={onLeave}
              className={cn(
                'block w-full text-left px-4 py-2 text-sm',
                active ? 'bg-gray-100 text-gray-900' : 'text-gray-700'
              )}
            >
              Leave Channel
            </button>
          )}
        </Menu.Item>
      ) : (
        <Menu.Item>
          {({ active }) => (
            <button
              onClick={onJoin}
              className={cn(
                'block w-full text-left px-4 py-2 text-sm',
                active ? 'bg-gray-100 text-gray-900' : 'text-gray-700'
              )}
            >
              Join Channel
            </button>
          )}
        </Menu.Item>
      )}
    </Menu.Items>
  </Menu>
);

export const ChannelSection: React.FC<ChannelSectionProps> = ({
  title,
  channels,
  type,
  isExpanded,
  onToggle,
  userId,
  onlineUsers,
  selectedChannel,
  onChannelSelect,
  onJoinChannel,
  onLeaveChannel
}) => (
  <div className="space-y-2">
    <button
      onClick={onToggle}
      className="w-full flex items-center gap-2 px-2 py-1 hover:bg-emerald-800/50 rounded-md text-gray-300"
    >
      {isExpanded ? (
        <ChevronDown className="h-4 w-4" />
      ) : (
        <ChevronRight className="h-4 w-4" />
      )}
      <span className="text-sm font-semibold text-gray-300">{title}</span>
      {channels.length > 0 && (
        <span className="ml-auto text-xs text-gray-400">
          {channels.length}
        </span>
      )}
    </button>
    
    {isExpanded && (
      <div className="space-y-1">
        {channels.map((channel) => {
          const isDM = type === ChannelType.DM;
          const members = channel.members || [];
          const otherUser = isDM ? members.find(m => m.userId !== userId)?.user : null;
          const isOnline = otherUser ? onlineUsers[otherUser.id] : false;
          const isMember = members.some(member => member.userId === userId);

          return (
            <div
              key={channel.id}
              className="group relative flex items-center"
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
                        <Image 
                          src={otherUser.imageUrl} 
                          alt={otherUser.name || 'User'}
                          width={24}
                          height={24}
                          className="rounded-full"
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
              
              {!isDM && (
                <ChannelActionsDropdown
                  isMember={isMember}
                  onJoin={() => onJoinChannel(channel.id, type)}
                  onLeave={() => onLeaveChannel(channel.id)}
                />
              )}
            </div>
          );
        })}
      </div>
    )}
  </div>
); 