import { Sidebar } from '@/components/chat/sidebar';
import { ChatHeader } from '@/components/chat/chat-header';

export default function ChatLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="h-screen flex">
      <Sidebar />
      <main className="flex-1 flex flex-col">
        <ChatHeader />
        {children}
      </main>
    </div>
  );
} 