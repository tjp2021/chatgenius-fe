'use client';

import { useTyping } from '@/hooks/use-typing';
import { cn } from '@/lib/utils';

interface TypingIndicatorDisplayProps {
  channelId: string;
  className?: string;
}

export function TypingIndicatorDisplay({ 
  channelId,
  className 
}: TypingIndicatorDisplayProps) {
  const { typingUsers } = useTyping(channelId);

  if (!typingUsers.length) return null;

  return (
    <div className={cn(
      "px-4 py-2 text-sm text-muted-foreground animate-pulse",
      className
    )}>
      {typingUsers.length === 1 ? (
        <p>{typingUsers[0].userId} is typing...</p>
      ) : typingUsers.length === 2 ? (
        <p>{typingUsers[0].userId} and {typingUsers[1].userId} are typing...</p>
      ) : (
        <p>Several people are typing...</p>
      )}
    </div>
  );
} 