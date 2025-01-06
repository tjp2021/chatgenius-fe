'use client';

import { useEffect } from 'react';
import { useUser } from '@clerk/nextjs';
import { useChannels } from '@/contexts/channel-context';

export const ChannelList = () => {
  const { user } = useUser();
  const { channels, refreshChannels } = useChannels();

  useEffect(() => {
    if (user) refreshChannels();
  }, [user]);

  return (
    <div className="space-y-2">
      {channels.map((channel) => (
        <div 
          key={channel.id}
          className="px-3 py-2 hover:bg-gray-700 rounded-md cursor-pointer"
        >
          # {channel.name}
        </div>
      ))}
    </div>
  );
}; 