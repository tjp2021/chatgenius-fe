import { ChannelSidebar } from '@/components/channel-sidebar';
import { ChatHeader } from '@/components/chat/chat-header';
import { ChannelProvider } from '@/contexts/channel-context';

export default function ChatLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ChannelProvider>
      <div className="h-screen flex bg-white">
        <ChannelSidebar />
        <main className="flex-1 flex flex-col bg-white">
          {children}
        </main>
      </div>
    </ChannelProvider>
  );
} 