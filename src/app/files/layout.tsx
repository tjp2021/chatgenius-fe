'use client';

import { TopNav } from "@/components/nav/top-nav";

export default function FilesLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-gray-50">
      <TopNav />
      <div className="flex h-[calc(100vh-4rem)] pt-16">
        <main className="flex-1 overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  );
} 