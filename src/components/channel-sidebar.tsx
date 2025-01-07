'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Channel, ChannelType } from '@prisma/client';
import { Hash, Lock, Users, ChevronDown, ChevronRight, MoreVertical } from 'lucide-react';
import { cn } from '@/lib/utils';
import { api } from '@/lib/axios';
import { useSocket } from '@/providers/socket-provider';
import { CreateChannelDialog } from './create-channel-dialog';
import { useAuth } from '@clerk/nextjs';
import { Button } from './ui/button';
import { toast } from '@/components/ui/use-toast';
import { Menu, MenuButton, MenuItems, MenuItem } from '@headlessui/react';

interface ChannelMember {
  userId: string;
  role: 'OWNER' | 'ADMIN' | 'MEMBER';
  user: {
    id: string;
    name: string;
    imageUrl: string;
  };
}

interface ChannelWithDetails extends Channel {
  _count: {
    members: number;
    messages: number;
  };
  members: ChannelMember[];
  isMember?: boolean;
}

interface ChannelGroups {
  public: ChannelWithDetails[];
  private: ChannelWithDetails[];
  dms: ChannelWithDetails[];
}

interface OnlineUsers {
  [userId: string]: boolean;
}

const STORAGE_KEY = 'channel_sections_state';

interface SectionState {
  publicExpanded: boolean;
  privateExpanded: boolean;
  dmsExpanded: boolean;
}

interface ChannelActionsDropdownProps {
  isMember: boolean;
  onJoin: () => void;
  onLeave: () => void;
}

const ChannelActionsDropdown: React.FC<ChannelActionsDropdownProps> = ({ isMember, onJoin, onLeave }) => (
  <Menu as="div" className="relative">
    <MenuButton className="flex items-center justify-center w-6 h-6 text-gray-300 hover:text-white">
      <MoreVertical className="w-4 h-4" />
    </MenuButton>
    <MenuItems className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none">
      {isMember ? (
        <MenuItem as="button" onClick={onLeave} className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100">
          Leave Public Channel
        </MenuItem>
      ) : (
        <MenuItem as="button" onClick={onJoin} className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100">
          Join Public Channel
        </MenuItem>
      )}
    </MenuItems>
  </Menu>
);

export function ChannelSidebar() {
  const router = useRouter();
  const { socket, isConnected } = useSocket();
  const { isSignedIn, isLoaded, userId } = useAuth();
  const [channels, setChannels] = useState<ChannelGroups>({
    public: [],
    private: [],
    dms: [],
  });
  const [onlineUsers, setOnlineUsers] = useState<OnlineUsers>({});
  const [isLoading, setIsLoading] = useState(true);
  const [selectedChannel, setSelectedChannel] = useState<string | null>(null);
  
  // Section collapse state
  const [sectionState, setSectionState] = useState<SectionState>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem(STORAGE_KEY);
      return saved ? JSON.parse(saved) : {
        publicExpanded: true,
        privateExpanded: true,
        dmsExpanded: true,
      };
    }
    return {
      publicExpanded: true,
      privateExpanded: true,
      dmsExpanded: true,
    };
  });

  useEffect(() => {
    if (isLoaded && isSignedIn) {
      fetchChannels();
    }
  }, [isLoaded, isSignedIn]);

  // Save section state to localStorage
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(sectionState));
    }
  }, [sectionState]);

  useEffect(() => {
    if (!socket || !isConnected) return;

    // Listen for user presence updates
    socket.on('presence:update', ({ userId, isOnline }: { userId: string; isOnline: boolean }) => {
      setOnlineUsers(prev => ({
        ...prev,
        [userId]: isOnline,
      }));
    });

    // Get initial online status
    socket.emit('presence:get_online_users', (users: OnlineUsers) => {
      setOnlineUsers(users);
    });

    return () => {
      socket.off('presence:update');
    };
  }, [socket, isConnected]);

  const fetchChannels = async () => {
    try {
      setIsLoading(true);
      const response = await api.get('/channels');
      const allChannels: ChannelWithDetails[] = response.data;
      
      // Group channels by type
      setChannels({
        public: allChannels.filter(c => c.type === ChannelType.PUBLIC),
        private: allChannels.filter(c => c.type === ChannelType.PRIVATE),
        dms: allChannels.filter(c => c.type === ChannelType.DM),
      });
    } catch (error) {
      console.error('Failed to fetch channels:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const toggleSection = (section: keyof SectionState) => {
    setSectionState(prev => ({
      ...prev,
      [section]: !prev[section],
    }));
  };

  const handleJoinChannel = async (channelId: string, type: ChannelType) => {
    try {
      if (type === ChannelType.PRIVATE) {
        await api.post(`/channels/${channelId}/request`);
        toast({
          title: 'Join Request Sent',
          description: 'The channel admins will review your request.',
        });
      } else {
        const response = await api.post(`/channels/${channelId}/join`);
        console.log('Join response:', response.data);

        setChannels(prevChannels => {
          const updatedChannels = prevChannels.public.map(channel =>
            channel.id === channelId ? { ...channel, isMember: true } : channel
          );
          console.log('Updated channels:', updatedChannels);
          return {
            ...prevChannels,
            public: updatedChannels,
          };
        });

        socket?.emit('channel:join', channelId);
        toast({
          title: 'Channel Joined',
          description: "You've successfully joined the channel.",
        });
      }
    } catch (error) {
      console.error('Failed to join channel:', error);
      toast({
        title: 'Error',
        description: 'Failed to join channel. Please try again.',
        variant: 'destructive',
      });
    }
  };

  const handleLeaveChannel = async (channelId: string) => {
    try {
      const response = await api.delete(`/channels/${channelId}/leave`);
      console.log('Leave response:', response.data);

      setChannels(prevChannels => {
        const updatedChannels = prevChannels.public.map(channel =>
          channel.id === channelId ? { ...channel, isMember: false } : channel
        );
        console.log('Updated channels:', updatedChannels);
        return {
          ...prevChannels,
          public: updatedChannels,
        };
      });

      socket?.emit('channel:leave', channelId);
      toast({
        title: 'Channel Left',
        description: "You've left the channel.",
      });
    } catch (error) {
      console.error('Failed to leave channel:', error);
      toast({
        title: 'Error',
        description: 'Failed to leave channel. Please try again.',
        variant: 'destructive',
      });
    }
  };

  // Determine if the user is a member of any public channel
  const isMemberOfAnyChannel = channels.public.some(channel => 
    channel.members.some(member => member.userId === userId)
  );

  // Select the top channel if the user is a member of multiple channels
  const defaultChannel = isMemberOfAnyChannel ? channels.public.find(channel => 
    channel.members.some(member => member.userId === userId)
  ) : null;

  // Set the selected channel to the default channel if not already set
  useEffect(() => {
    if (!selectedChannel && defaultChannel) {
      setSelectedChannel(defaultChannel.id);
      router.push(`/channels/${defaultChannel.id}`);
    }
  }, [defaultChannel, selectedChannel, router]);

  // Don't show anything while auth is loading
  if (!isLoaded) {
    return null;
  }

  // Redirect to login if not authenticated
  if (!isSignedIn) {
    router.push('/sign-in');
    return null;
  }

  if (isLoading) {
    return (
      <div className="p-4 text-muted-foreground">
        Loading channels...
      </div>
    );
  }

  const ChannelSection = ({ 
    title, 
    channels, 
    type,
    isExpanded,
    onToggle,
  }: { 
    title: string;
    channels: ChannelWithDetails[];
    type: ChannelType;
    isExpanded: boolean;
    onToggle: () => void;
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
            const otherUser = isDM ? channel.members.find(m => m.userId !== userId)?.user : null;
            const isOnline = otherUser ? onlineUsers[otherUser.id] : false;
            const isMember = channel.members.some(member => member.userId === userId);

            return (
              <div
                key={channel.id}
                className="group relative flex items-center"
              >
                <button
                  onClick={() => {
                    if (isMember) {
                      setSelectedChannel(channel.id);
                      router.push(`/channels/${channel.id}`);
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
                  {channel._count.messages > 0 && (
                    <span className="text-xs text-gray-400 mr-2">
                      {channel._count.messages}
                    </span>
                  )}
                </button>
                
                {!isDM && (
                  <ChannelActionsDropdown
                    isMember={isMember}
                    onJoin={() => handleJoinChannel(channel.id, type)}
                    onLeave={() => handleLeaveChannel(channel.id)}
                  />
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );

  return (
    <div className="h-full flex flex-col bg-emerald-900">
      <div className="px-6 py-4 border-b border-emerald-800">
        <div className="flex items-center justify-between gap-4">
          <h2 className="text-lg font-semibold text-white">Channels</h2>
          <CreateChannelDialog onChannelCreated={fetchChannels} />
        </div>
      </div>
      
      <div className="flex-1 overflow-y-auto p-2 space-y-4">
        <ChannelSection
          title="PUBLIC CHANNELS"
          channels={channels.public}
          type={ChannelType.PUBLIC}
          isExpanded={sectionState.publicExpanded}
          onToggle={() => toggleSection('publicExpanded')}
        />
        
        <ChannelSection
          title="PRIVATE CHANNELS"
          channels={channels.private}
          type={ChannelType.PRIVATE}
          isExpanded={sectionState.privateExpanded}
          onToggle={() => toggleSection('privateExpanded')}
        />
        
        <ChannelSection
          title="DIRECT MESSAGES"
          channels={channels.dms}
          type={ChannelType.DM}
          isExpanded={sectionState.dmsExpanded}
          onToggle={() => toggleSection('dmsExpanded')}
        />
      </div>
    </div>
  );
} 