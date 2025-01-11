'use client';

import { useParams } from 'next/navigation';
import { MessageList } from '@/components/chat/message-list';
import { MessageInput } from '@/components/chat/message-input';
import { ChannelProvider } from '@/contexts/channel-context';

export default function ChannelPage() {
  const params = useParams();
  const channelId = params?.channelId;

  if (!channelId || typeof channelId !== 'string') {
    return <div>Invalid channel ID</div>;
  }

  return (
    <div className="flex h-full flex-col">
      <ChannelProvider>
        <div className="flex-1 overflow-y-auto">
          <MessageList channelId={channelId} />
        </div>
        <MessageInput channelId={channelId} />
      </ChannelProvider>
    </div>
  );
} 