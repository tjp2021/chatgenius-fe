'use client';

import { useParams } from 'next/navigation';
import { MessageList } from '@/components/chat/message-list';
import { MessageInput } from '@/components/chat/message-input';

export default function ChannelPage() {
  const params = useParams();
  const channelId = params.channelId as string;

  return (
    <div className="flex h-full flex-col">
      <div className="flex-1 overflow-y-auto">
        <MessageList channelId={channelId} />
      </div>
      <MessageInput channelId={channelId} />
    </div>
  );
} 