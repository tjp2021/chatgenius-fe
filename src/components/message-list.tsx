'use client';

import { useChannelMessages } from '@/hooks/use-messages';

export const MessageList = ({ channelId }: { channelId: string }) => {
  const { data: messages, isLoading } = useChannelMessages(channelId);

  if (isLoading) {
    return <div>Loading messages...</div>;
  }

  return (
    <div className="space-y-4">
      {messages?.map((message) => (
        <div key={message.id} className="p-2">
          <div className="font-bold">{message.user.name}</div>
          <div>{message.content}</div>
        </div>
      ))}
    </div>
  );
}; 