import { ChannelList } from '@/components/channel-list';

export default function ChatLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="h-screen flex">
      <div className="w-64 border-r">
        <ChannelList />
      </div>
      <div className="flex-1">
        {children}
      </div>
    </div>
  );
} 