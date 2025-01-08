'use client';

import { TopNav } from "@/components/nav/top-nav";
import { ChannelSidebar } from "@/components/channel-sidebar";

export default function ChannelsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-background">
      <TopNav />
      <div className="flex h-[calc(100vh-4rem)] pt-16">
        <aside className="w-64 flex-shrink-0">
          <ChannelSidebar />
        </aside>
        <main className="flex-1">
          {children}
        </main>
      </div>
    </div>
  );
} 