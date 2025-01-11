'use client';

import { useAuth } from '@clerk/nextjs';
import { cn } from '@/lib/utils';
import type { Message } from '@/types/message';

interface MessageItemProps {
  message: Message;
}

export function MessageItem({ message }: MessageItemProps) {
  const { userId } = useAuth();
  const isOwn = message.userId === userId;

  return (
    <div className={cn(
      "flex gap-2 p-4",
      isOwn ? "justify-end" : "justify-start"
    )}>
      {/* Message content */}
    </div>
  );
} 