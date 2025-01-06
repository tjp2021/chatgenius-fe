import { Sidebar } from '@/components/chat/sidebar';
import { ChatHeader } from '@/components/chat/chat-header';
import { ChannelProvider } from '@/contexts/channel-context';

export default function ChatLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ChannelProvider>
      <div className="h-screen flex">
        <Sidebar />
        <main className="flex-1 flex flex-col">
          <ChatHeader />
          {children}
        </main>
      </div>
    </ChannelProvider>
  );
} 