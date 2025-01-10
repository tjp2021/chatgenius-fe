'use client';

import { /* useEffect */ } from 'react';
import { useChannelContext } from '@/contexts/channel-context';
import { Channel } from '@/types/channel';

export function ChannelList() {
  const { channels } = useChannelContext();

  return (
    <div>
      {channels.map((channel: Channel) => (
        <div key={channel.id}>
          {channel.name}
        </div>
      ))}
    </div>
  );
} 