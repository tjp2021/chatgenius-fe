'use client';

import { useChannels } from '@/hooks/use-channel';
import Link from 'next/link';
import { useParams } from 'next/navigation';

export const ChannelList = () => {
  const { data: channels, isLoading } = useChannels();
  const params = useParams();

  if (isLoading) {
    return <div className="p-4">Loading channels...</div>;
  }

  return (
    <div className="p-4 space-y-2">
      {channels?.map((channel) => (
        <Link 
          key={channel.id} 
          href={`/channels/${channel.id}`}
          className={`block p-2 rounded-lg hover:bg-gray-100 transition ${
            params.channelId === channel.id ? 'bg-gray-100' : ''
          }`}
        >
          {channel.name}
        </Link>
      ))}
    </div>
  );
}; 