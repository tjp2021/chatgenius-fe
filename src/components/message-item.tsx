'use client';

import { useAuth } from '@clerk/nextjs';
import { Loader2, AlertCircle } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';
import { Button } from './ui/button';
import { cn } from '@/lib/utils';

interface Message {
  id?: string;
  tempId?: string;
  content: string;
  userId: string;
  channelId: string;
  createdAt: string;
  isPending?: boolean;
  isFailed?: boolean;
}

interface MessageItemProps {
  message: Message;
  onRetry?: (tempId: string) => void;
}

export function MessageItem({ message, onRetry }: MessageItemProps) {
  const { userId } = useAuth();
  const isOwn = message.userId === userId;

  return (
    <div className={cn(
      "flex gap-3 items-start",
      isOwn && "flex-row-reverse"
    )}>
      <Avatar className="h-8 w-8">
        <AvatarImage src={`https://avatar.vercel.sh/${message.userId}`} />
        <AvatarFallback>U</AvatarFallback>
      </Avatar>

      <div className={cn(
        "flex flex-col",
        isOwn && "items-end"
      )}>
        <div className={cn(
          "px-4 py-2 rounded-lg",
          isOwn ? "bg-primary text-primary-foreground" : "bg-muted"
        )}>
          {message.content}
        </div>

        {message.isPending && (
          <div className="flex items-center gap-1 mt-1 text-xs text-muted-foreground">
            <Loader2 className="h-3 w-3 animate-spin" />
            Sending...
          </div>
        )}

        {message.isFailed && onRetry && (
          <div className="flex items-center gap-2 mt-1">
            <AlertCircle className="h-4 w-4 text-destructive" />
            <span className="text-xs text-destructive">Failed to send</span>
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => message.tempId && onRetry(message.tempId)}
              className="h-6 px-2 text-xs"
            >
              Retry
            </Button>
          </div>
        )}
      </div>
    </div>
  );
} 