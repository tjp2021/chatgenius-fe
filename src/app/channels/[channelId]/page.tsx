import { MessageList } from '@/components/message-list';
import { MessageInput } from '@/components/message-input';

export default function ChannelPage({
  params,
}: {
  params: { channelId: string };
}) {
  return (
    <div className="h-full flex flex-col">
      <div className="flex-1 overflow-y-auto">
        <MessageList channelId={params.channelId} />
      </div>
      <MessageInput channelId={params.channelId} />
    </div>
  );
} 