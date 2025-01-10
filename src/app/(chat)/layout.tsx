'use client';

import { useClerkToken } from '@/hooks/useClerkToken';
import { ChannelSidebar } from '@/components/channel-sidebar';

export default function ChatLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Initialize token exchange
  useClerkToken();

  return (
    <div className="h-screen flex bg-white">
      <ChannelSidebar />
      <main className="flex-1 flex flex-col bg-white">
        {children}
      </main>
    </div>
  );
} 