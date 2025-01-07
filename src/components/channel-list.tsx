'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Channel, ChannelType } from '@prisma/client';
import { Hash, Lock, MessageSquare } from 'lucide-react';
import { cn } from '@/lib/utils';
import { api } from '@/lib/axios';
import { useSocket } from '@/providers/socket-provider';
import { CreateChannelDialog } from './create-channel-dialog';
import { useAuth } from '@clerk/nextjs';

interface ChannelWithMemberCount extends Channel {
  _count: {
    members: number;
    messages: number;
  };
}

export function ChannelList() {
  const router = useRouter();
  const { socket } = useSocket();
  const { isSignedIn, isLoaded } = useAuth();
  const [channels, setChannels] = useState<ChannelWithMemberCount[]>([]);
  const [selectedChannel, setSelectedChannel] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (isLoaded && isSignedIn) {
      fetchChannels();
    }
  }, [isLoaded, isSignedIn]);

  const fetchChannels = async () => {
    try {
      setIsLoading(true);
      const response = await api.get('/channels');
      setChannels(response.data);
    } catch (error) {
      console.error('Failed to fetch channels:', error);
    } finally {
      setIsLoading(false);
    }
  };

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

  return (
    <div className="space-y-4 p-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Channels</h2>
        <CreateChannelDialog onChannelCreated={fetchChannels} />
      </div>
      <div className="space-y-2">
        {channels.map((channel) => (
          <button
            key={channel.id}
            onClick={() => router.push(`/channels/${channel.id}`)}
            className={cn(
              'w-full flex items-center gap-2 rounded-lg px-3 py-2 hover:bg-muted/50 transition',
              channel.id === selectedChannel && 'bg-muted'
            )}
          >
            {channel.type === ChannelType.PUBLIC ? (
              <Hash className="h-4 w-4" />
            ) : (
              <Lock className="h-4 w-4" />
            )}
            <span>{channel.name}</span>
            <span className="ml-auto text-xs text-muted-foreground">
              {channel._count.messages} messages
            </span>
          </button>
        ))}
      </div>
    </div>
  );
} 