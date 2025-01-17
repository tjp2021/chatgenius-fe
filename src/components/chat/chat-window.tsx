'use client';

import { Icons } from '@/components/ui/icons';
import { cn } from '@/lib/utils';

interface MessageThreadProps {
  message: { replyCount?: number };
  hasReplies: boolean;
}

const MessageThread = ({ message, hasReplies }: MessageThreadProps) => {
  return (
    <button 
      className={cn(
        "hover:bg-accent/50 rounded-sm p-0.5",
        hasReplies ? "text-blue-500" : "text-muted-foreground"
      )}
    >
      <Icons.messageSquare className="h-4 w-4" />
    </button>
  );
};

export function ChatWindow() {
  const message = { replyCount: 0 };
  return (
    <MessageThread 
      message={message}
      hasReplies={message.replyCount > 0}
    />
  );
} 