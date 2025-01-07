'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Channel, ChannelType } from '@prisma/client';
import { Hash, Lock, MessageSquare } from 'lucide-react';
import { cn } from '@/lib/utils';
import { api } from '@/lib/axios';
import { useSocket } from '@/providers/socket-provider';
import { CreateChannelDialog } from './create-channel-dialog';

interface ChannelWithMemberCount extends Channel {
  _count: {
    members: number;
    messages: number;
  };
}

export function ChannelList() {
  const router = useRouter();
  const { socket } = useSocket();
  const [channels, setChannels] = useState<ChannelWithMemberCount[]>([]);
  const [selectedChannel, setSelectedChannel] = useState<string | null>(null);

  useEffect(() => {
    fetchChannels();
  }, []);

  const fetchChannels = async () => {
    try {
      const response = await api.get('/channels');
      setChannels(response.data);
    } catch (error) {
      console.error('Failed to fetch channels:', error);
    }
  };

  const handleChannelSelect = async (channelId: string) => {
    try {
      // Join the channel socket room
      socket?.emit('channel:join', channelId);
      
      // Update UI
      setSelectedChannel(channelId);
      router.push(`/channels/${channelId}`);
    } catch (error) {
      console.error('Failed to join channel:', error);
    }
  };

  const getChannelIcon = (type: ChannelType) => {
    switch (type) {
      case 'PUBLIC':
        return <Hash className="h-4 w-4" />;
      case 'PRIVATE':
        return <Lock className="h-4 w-4" />;
      case 'DM':
        return <MessageSquare className="h-4 w-4" />;
    }
  };

  return (
    <div className="flex flex-col h-full">
      <div className="p-4 border-b">
        <h2 className="text-lg font-semibold mb-4">Your Channels</h2>
        <CreateChannelDialog onChannelCreated={fetchChannels} />
      </div>
      <div className="flex-1 overflow-y-auto p-2">
        {channels.map((channel) => (
          <button
            key={channel.id}
            onClick={() => handleChannelSelect(channel.id)}
            className={cn(
              'w-full flex items-center gap-2 px-3 py-2 rounded-md text-sm',
              'hover:bg-accent/50 transition-colors',
              selectedChannel === channel.id && 'bg-accent'
            )}
          >
            {getChannelIcon(channel.type)}
            <span className="truncate">{channel.name}</span>
            {channel._count.messages > 0 && (
              <span className="ml-auto text-xs text-muted-foreground">
                {channel._count.messages}
              </span>
            )}
          </button>
        ))}
      </div>
    </div>
  );
} 